"""
CarboNex Subsidence AI - Python REST API & Static File Server
=============================================================
Directly wraps subsidence_model.py (3-Layer Unsupervised Pipeline)
and serves the React Frontend Dashboard.
"""

import os
import io
import json
import math
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from subsidence_model import (
    SubsidenceSensorFusion,
    get_risk_band,
    BAND_NORMAL,
    BAND_WATCH,
    BAND_WARNING,
    BAND_CRITICAL,
    DEFAULT_WEIGHTS,
    SENSORS,
    DiagnosticReport
)

# Initialize Flask app
app = Flask(__name__, static_folder=os.path.join("frontend", "dist"))
CORS(app)

MODEL_PATH = os.path.join("models", "subsidence_model.joblib")
DATA_PATH = "subsidence_sensor_data_365.csv"
SCORED_DATA_PATH = "scored_subsidence_sensor_data.csv"

# Fixed mine-panel positions for the GIS map. Coordinates are real-world
# placements within the Raniganj coalfield (Paschim Bardhaman, West Bengal, India).
# No GPS is used on the nodes - coordinates are assigned at commissioning from the
# surveyed panel layout. `commissioned: False` marks hardware that is planned but
# not yet connected (shown as COMMISSIONING on the map).
NODE_POSITIONS = {
    "CarboNex Data Node": {
        "lat": 23.61850,
        "lng": 87.11850,
        "role": "Panel 7 extraction face",
        "commissioned": True,
        "hardware": "ESP32 + LoRa SX1278 / MPU6050 + strain"
    }
}

GATEWAY_POSITION = {"lat": 23.62100, "lng": 87.11500, "role": "Surface gateway / telemetry uplink"}

# Load or fit model
if os.path.exists(MODEL_PATH):
    model = SubsidenceSensorFusion.load(MODEL_PATH)
else:
    model = SubsidenceSensorFusion()
    if os.path.exists(DATA_PATH):
        df_init = pd.read_csv(DATA_PATH)
        model.fit(df_init, baseline_days=30)
        os.makedirs("models", exist_ok=True)
        model.save(MODEL_PATH)

# Load cached or full dataset for explorer
if os.path.exists(SCORED_DATA_PATH):
    df_history = pd.read_csv(SCORED_DATA_PATH)
elif os.path.exists(DATA_PATH):
    df_raw = pd.read_csv(DATA_PATH)
    df_history = model.predict_batch(df_raw)
    df_history.to_csv(SCORED_DATA_PATH, index=False)
else:
    df_history = pd.DataFrame()

available_nodes = ["CarboNex Data Node"]

# In-memory registry for live LoRa / ESP32 nodes & telemetry packets
latest_packet = {
    "received_at": None,
    "source": None,
    "payload": None,
    "content_type": None,
}

# Live nodes dictionary keyed by node_id
live_nodes = {}

# Rolling packet log buffer (max 100 packets)
live_packets_history = []


def process_esp_payload(payload, source_ip="127.0.0.1", content_type="application/json"):
    """
    Process raw or JSON ESP32 telemetry packet, update live state,
    and evaluate through the 3-Layer Subsidence Sensor Fusion model.
    """
    global latest_packet, live_nodes, live_packets_history

    received_time = datetime.now(timezone.utc).isoformat()
    latest_packet = {
        "received_at": received_time,
        "source": source_ip,
        "payload": payload,
        "content_type": content_type,
    }

    if not isinstance(payload, dict):
        live_packets_history.insert(0, {
            "received_at": received_time,
            "source": source_ip,
            "node_id": "raw",
            "payload": str(payload)
        })
        if len(live_packets_history) > 100:
            live_packets_history.pop()
        return {"status": "received", "packet": latest_packet, "type": "raw"}

    raw_node_id = str(payload.get("node_id", "CarboNex Data Node"))
    # Standardize on the single CarboNex Data Node requested by the user
    node_id = "CarboNex Data Node"
    seq = int(payload.get("seq", 0))

    # ESP payload values: tilt_x and tilt_y are in millidegrees (mDeg)
    tilt_x_mdeg = float(payload.get("tilt_x", 0))
    tilt_y_mdeg = float(payload.get("tilt_y", 0))
    # Convert to degrees: tilt = sqrt(tilt_x^2 + tilt_y^2) / 1000.0
    computed_tilt_deg = round(math.sqrt(tilt_x_mdeg**2 + tilt_y_mdeg**2) / 1000.0, 4)

    temp = float(payload.get("temp", 25.0))
    batt = float(payload.get("batt", 100.0))
    vib_raw = float(payload.get("vib", 0.0))
    crack_raw = float(payload.get("crack", 0.0))
    rssi = int(payload.get("rssi", -70))

    # Map physical sensor channels to model inputs:
    displacement_mm = float(payload.get("displacement_mm", crack_raw if crack_raw > 0 else 0.8))
    strain_microstrain = float(payload.get("strain_microstrain", 50.0 + displacement_mm * 15.0))
    vibration_mms = float(payload.get("vibration_mms", vib_raw if vib_raw > 0 else 0.08))

    readings = {
        "tilt_deg": computed_tilt_deg if computed_tilt_deg > 0 else 0.15,
        "displacement_mm": displacement_mm,
        "strain_microstrain": strain_microstrain,
        "vibration_mms": vibration_mms
    }

    # Evaluate through 3-Layer Subsidence Sensor Fusion model
    report = model.predict_reading(node_id, readings, update_buffer=True)
    report_dict = report.to_dict()

    node_record = {
        "node_id": node_id,
        "seq": seq,
        "tilt_x": tilt_x_mdeg,
        "tilt_y": tilt_y_mdeg,
        "tilt_deg": readings["tilt_deg"],
        "temp": temp,
        "batt": batt,
        "vib": vib_raw,
        "crack": crack_raw,
        "rssi": rssi,
        "displacement_mm": readings["displacement_mm"],
        "strain_microstrain": readings["strain_microstrain"],
        "vibration_mms": readings["vibration_mms"],
        "risk_score": report_dict.get("risk_score", 18.0),
        "risk_band": report_dict.get("risk_band", BAND_NORMAL),
        "status_color": report_dict.get("status_color", "#10B981"),
        "primary_driver": report_dict.get("primary_driver", "Nominal Baseline"),
        "summary": report_dict.get("summary", ""),
        "recommendation": report_dict.get("recommendation", ""),
        "sensor_scores": report_dict.get("sensor_scores", {}),
        "received_at": received_time,
        "source": source_ip,
        "packets_received": live_nodes.get(node_id, {}).get("packets_received", 0) + 1,
        "status": "online"
    }

    live_nodes["CarboNex Data Node"] = node_record
    live_nodes["Node01"] = node_record

    live_packets_history.insert(0, {
        "received_at": received_time,
        "source": source_ip,
        "node_id": node_id,
        "seq": seq,
        "payload": payload,
        "risk_score": node_record["risk_score"],
        "risk_band": node_record["risk_band"]
    })
    if len(live_packets_history) > 100:
        live_packets_history.pop()

    return {
        "status": "received",
        "packet": latest_packet,
        "node_id": node_id,
        "risk_score": node_record["risk_score"],
        "risk_band": node_record["risk_band"],
        "report": report_dict
    }


# Initialize standby record for CarboNex Data Node
process_esp_payload({
    "node_id": "CarboNex Data Node",
    "seq": 0,
    "tilt_x": 120,
    "tilt_y": 65,
    "temp": 28,
    "batt": 95,
    "vib": 0.07,
    "crack": 0.75,
    "rssi": -65,
    "displacement_mm": 0.75,
    "strain_microstrain": 62.0,
    "vibration_mms": 0.07
}, source_ip="127.0.0.1 (standby)")
live_nodes["CarboNex Data Node"]["status"] = "standby"
live_nodes["Node01"]["status"] = "standby"



@app.route("/api/status", methods=["GET"])
def api_status():
    """System health check and overview metrics."""
    return jsonify({
        "status": "online",
        "model_fitted": True,
        "nodes": ["CarboNex Data Node"],
        "live_nodes": ["CarboNex Data Node"],
        "total_records": len(df_history) if not df_history.empty else 0,
        "sensors": SENSORS,
        "weights": model.weights
    })



@app.route("/endpoint", methods=["POST"])
@app.route("/api/endpoint", methods=["POST"])
def receive_data():
    """
    Receives live telemetry packets transmitted by ESP32 + LoRa nodes.
    Supports JSON and raw HTTP POST body payloads.
    Direct drop-in replacement for esp/server.py.
    """
    try:
        raw_body = request.get_data(cache=True, as_text=True)
        data = request.get_json(silent=True)
        payload = data if data is not None else raw_body
        res = process_esp_payload(
            payload,
            source_ip=request.remote_addr or "127.0.0.1",
            content_type=request.content_type or "application/json"
        )
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/latest", methods=["GET"])
@app.route("/api/latest", methods=["GET"])
def latest():
    """
    Returns the most recent packet received from the base or sensor node.
    Exact compatibility with esp/server.py.
    """
    return jsonify(latest_packet)


@app.route("/api/live-nodes", methods=["GET"])
def api_live_nodes():
    """
    Returns the registered CarboNex Data Node, latest telemetry readings,
    battery, RSSI, and real-time AI risk evaluation.
    """
    primary = live_nodes.get("CarboNex Data Node") or live_nodes.get("Node01")
    return jsonify({
        "count": 1 if primary else 0,
        "nodes": [primary] if primary else [],
        "active_node_ids": ["CarboNex Data Node"],
        "latest_packet": latest_packet,
        "recent_packets": live_packets_history[:20]
    })


@app.route("/api/live-node/<node_id>", methods=["GET"])
def api_live_node(node_id):
    """
    Returns detailed live telemetry state and recent packet history for the CarboNex Data Node.
    """
    node = live_nodes.get("CarboNex Data Node") or live_nodes.get("Node01")
    if not node:
        return jsonify({"error": "CarboNex Data Node has not transmitted live telemetry yet", "status": "offline"}), 404
    return jsonify({
        "node": node,
        "recent_packets": live_packets_history[:20]
    })


@app.route("/api/simulate-packet", methods=["POST"])
def api_simulate_packet():
    """
    Inject a simulated ESP32 LoRa packet into the live pipeline.
    Facilitates testing and demonstration without physical hardware attached.
    """
    data = request.get_json(silent=True) or {}
    node_id = str(data.get("node_id", "Node01"))
    current_seq = live_nodes.get(node_id, {}).get("seq", 0) + 1

    sample_payload = {
        "node_id": node_id,
        "seq": data.get("seq", current_seq),
        "tilt_x": data.get("tilt_x", 160),
        "tilt_y": data.get("tilt_y", 95),
        "temp": data.get("temp", 28),
        "batt": data.get("batt", 92),
        "vib": data.get("vib", 0.08),
        "crack": data.get("crack", 0.8),
        "rssi": data.get("rssi", -68),
        "displacement_mm": data.get("displacement_mm", 0.8),
        "strain_microstrain": data.get("strain_microstrain", 65.0),
        "vibration_mms": data.get("vibration_mms", 0.08)
    }
    res = process_esp_payload(sample_payload, source_ip="127.0.0.1 (simulated)")
    return jsonify(res), 200



@app.route("/api/model-info", methods=["GET"])
def api_model_info():
    """Return model configuration, weights, and risk bands."""
    return jsonify({
        "sensors": SENSORS,
        "weights": model.weights,
        "baseline_days": model.baseline_days,
        "window": model.window,
        "bands": [
            {"name": BAND_NORMAL, "range": "0 - 25", "color": "#10B981", "desc": "Nominal Baseline"},
            {"name": BAND_WATCH, "range": "26 - 50", "color": "#F59E0B", "desc": "Early Telemetry Drift"},
            {"name": BAND_WARNING, "range": "51 - 75", "color": "#F97316", "desc": "Accelerated Deformation"},
            {"name": BAND_CRITICAL, "range": "76 - 100", "color": "#EF4444", "desc": "Severe Subsidence Hazard"}
        ]
    })


@app.route("/api/predict", methods=["POST"])
def api_predict():
    """
    Real-time single-point prediction from sliders or live inputs.
    Calls model.predict_reading without mutating persistent replay buffer.
    """
    data = request.get_json(silent=True)
    if not data:
        try:
            raw = request.get_data(as_text=True)
            data = json.loads(raw) if raw else {}
        except Exception:
            data = {}

    node_id = str(data.get("node_id", available_nodes[0] if available_nodes else "Node01"))
    readings = data.get("readings", {})

    # Ensure required sensors have default floats
    parsed_readings = {
        "tilt_deg": float(readings.get("tilt_deg", 0.15)),
        "displacement_mm": float(readings.get("displacement_mm", 0.8)),
        "strain_microstrain": float(readings.get("strain_microstrain", 65.0)),
        "vibration_mms": float(readings.get("vibration_mms", 0.08))
    }

    report = model.predict_reading(node_id, parsed_readings, update_buffer=False)
    return jsonify(report.to_dict())


@app.route("/api/history", methods=["GET"])
def api_history():
    """
    Historical telemetry and precomputed model scores for time-series charts.
    """
    node_id = request.args.get("node_id", available_nodes[0] if available_nodes else "Node01")
    start_day = int(request.args.get("start_day", 1))
    end_day = int(request.args.get("end_day", 365))

    if df_history.empty:
        return jsonify([])

    node_df = df_history[df_history["node_id"] == node_id]
    if "day" in node_df.columns:
        node_df = node_df[(node_df["day"] >= start_day) & (node_df["day"] <= end_day)]
        node_df = node_df.sort_values("day")

    # Select relevant columns
    cols_to_send = [
        "day", "tilt_deg", "displacement_mm", "strain_microstrain", "vibration_mms",
        "predicted_risk_score", "predicted_risk_band"
    ]
    optional_cols = [
        "tilt_deg_anomaly_score", "displacement_mm_anomaly_score",
        "strain_microstrain_anomaly_score", "vibration_mms_anomaly_score",
        "tilt_deg_slope", "displacement_mm_slope", "strain_microstrain_slope"
    ]
    for oc in optional_cols:
        if oc in node_df.columns:
            cols_to_send.append(oc)

    existing_cols = [c for c in cols_to_send if c in node_df.columns]
    result = node_df[existing_cols].to_dict(orient="records")
    return jsonify(result)


@app.route("/api/nodes-summary", methods=["GET"])
def api_nodes_summary():
    """
    Summary status of the monitored CarboNex Data Node.
    Returns latest live real-time readings, risk scores, and alert flags.
    """
    live_record = live_nodes.get("CarboNex Data Node") or live_nodes.get("Node01")
    if live_record:
        return jsonify([{
            "node_id": "CarboNex Data Node",
            "day": live_record.get("seq", 1),
            "tilt_deg": round(float(live_record.get("tilt_deg", 0.0)), 3),
            "displacement_mm": round(float(live_record.get("displacement_mm", 0.0)), 2),
            "strain_microstrain": round(float(live_record.get("strain_microstrain", 0.0)), 1),
            "vibration_mms": round(float(live_record.get("vibration_mms", 0.0)), 3),
            "risk_score": round(float(live_record.get("risk_score", 15.0)), 1),
            "risk_band": live_record.get("risk_band", BAND_NORMAL),
            "status_color": live_record.get("status_color", "#10B981"),
            "temp": live_record.get("temp", 28),
            "batt": live_record.get("batt", 95),
            "rssi": live_record.get("rssi", -65),
            "status": live_record.get("status", "online")
        }])

    if not df_history.empty:
        latest_row = df_history.iloc[-1]
        score = float(latest_row.get("predicted_risk_score", 15.0))
        band = str(latest_row.get("predicted_risk_band", get_risk_band(score)))
        return jsonify([{
            "node_id": "CarboNex Data Node",
            "day": int(latest_row.get("day", 365)),
            "tilt_deg": round(float(latest_row.get("tilt_deg", 0.0)), 3),
            "displacement_mm": round(float(latest_row.get("displacement_mm", 0.0)), 2),
            "strain_microstrain": round(float(latest_row.get("strain_microstrain", 0.0)), 1),
            "vibration_mms": round(float(latest_row.get("vibration_mms", 0.0)), 3),
            "risk_score": round(score, 1),
            "risk_band": band,
            "status_color": "#10B981"
        }])

    return jsonify([])


@app.route("/api/nodes-positions", methods=["GET"])
def api_nodes_positions():
    """
    GIS map payload: fixed panel coordinate + real-time risk for the CarboNex Data Node.
    """
    live_rec = live_nodes.get("CarboNex Data Node") or live_nodes.get("Node01") or {}
    score = float(live_rec.get("risk_score", 15.0))
    band = str(live_rec.get("risk_band", BAND_NORMAL))
    color = live_rec.get("status_color", "#10B981")

    pos = NODE_POSITIONS.get("CarboNex Data Node", {
        "lat": 23.61850, "lng": 87.11850, "role": "Panel 7 extraction face", "commissioned": True, "hardware": "ESP32 + LoRa SX1278 / MPU6050 + strain"
    })

    feature = {
        "node_id": "CarboNex Data Node",
        "lat": pos["lat"],
        "lng": pos["lng"],
        "role": pos["role"],
        "hardware": pos["hardware"],
        "status": "active",
        "risk_score": score,
        "risk_band": band,
        "status_color": color,
        "telemetry": {
            "tilt_deg": live_rec.get("tilt_deg", 0.14),
            "displacement_mm": live_rec.get("displacement_mm", 0.75),
            "strain_microstrain": live_rec.get("strain_microstrain", 62.0),
            "vibration_mms": live_rec.get("vibration_mms", 0.07)
        },
        "day": live_rec.get("seq", 1),
    }

    return jsonify({
        "gateway": {"lat": GATEWAY_POSITION["lat"], "lng": GATEWAY_POSITION["lng"], "role": GATEWAY_POSITION["role"]},
        "region": {"label": "Raniganj Coalfield", "center": [23.6185, 87.1185], "zoom": 15},
        "nodes": [feature]
    })



@app.route("/api/batch-score", methods=["POST"])
def api_batch_score():
    """
    High-throughput batch CSV scoring using model.predict_batch.
    Accepts uploaded CSV file or raw JSON rows.
    """
    try:
        if "file" in request.files:
            file = request.files["file"]
            df_in = pd.read_csv(file)
        else:
            payload = request.get_json(silent=True) or {}
            if isinstance(payload, list):
                df_in = pd.DataFrame(payload)
            elif isinstance(payload, dict) and "records" in payload:
                df_in = pd.DataFrame(payload["records"])
            else:
                # Fallback to sample
                df_in = pd.read_csv(DATA_PATH)

        scored_df = model.predict_batch(df_in)

        # Compute summary stats
        total_rows = len(scored_df)
        band_counts = scored_df["predicted_risk_band"].value_counts().to_dict()
        critical_nodes = scored_df[scored_df["predicted_risk_band"] == BAND_CRITICAL]["node_id"].unique().tolist()
        warning_nodes = scored_df[scored_df["predicted_risk_band"] == BAND_WARNING]["node_id"].unique().tolist()

        return jsonify({
            "total_rows": total_rows,
            "band_counts": band_counts,
            "critical_nodes": critical_nodes,
            "warning_nodes": warning_nodes,
            "sample_results": scored_df.head(100).to_dict(orient="records")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Coal Mine GIS module (standalone build embed)
GIS_DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "coal-mine-gis", "dist")


@app.route("/gis/")
@app.route("/gis/<path:subpath>")
def serve_gis(subpath=""):
    if os.path.exists(GIS_DIST_DIR):
        if subpath != "" and os.path.exists(os.path.join(GIS_DIST_DIR, subpath)):
            return send_from_directory(GIS_DIST_DIR, subpath)
        return send_from_directory(GIS_DIST_DIR, "index.html")
    return jsonify({"message": "Coal Mine GIS module not built. Run 'npm install && npm run build' inside frontend/coal-mine-gis/"}), 404


# Frontend static files routing
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    dist_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    if os.path.exists(dist_dir):
        if path != "" and os.path.exists(os.path.join(dist_dir, path)):
            return send_from_directory(dist_dir, path)
        return send_from_directory(dist_dir, "index.html")
    return jsonify({
        "message": "CarboNex API is running. Build frontend with 'npm run build' inside frontend/ to serve the UI here.",
        "api_docs": "/api/status"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] CarboNex Python REST Server running at http://10.85.219.17:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
