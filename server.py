"""
CarboNex Subsidence AI - Python REST API & Static File Server
=============================================================
Directly wraps subsidence_model.py (3-Layer Unsupervised Pipeline)
and serves the React Frontend Dashboard.
"""

import os
import io
import json
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

available_nodes = sorted(df_history["node_id"].unique().tolist()) if not df_history.empty else ["Node01"]


@app.route("/api/status", methods=["GET"])
def api_status():
    """System health check and overview metrics."""
    return jsonify({
        "status": "online",
        "model_fitted": True,
        "nodes": available_nodes,
        "total_records": len(df_history) if not df_history.empty else 0,
        "sensors": SENSORS,
        "weights": model.weights
    })


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
    Summary status of all monitored nodes across the mine panel.
    Returns latest day readings, risk scores, and alert flags.
    """
    if df_history.empty:
        return jsonify([])

    summaries = []
    for nid in available_nodes:
        sub = df_history[df_history["node_id"] == nid]
        if sub.empty:
            continue
        latest_row = sub.sort_values("day").iloc[-1]
        score = float(latest_row.get("predicted_risk_score", 15.0))
        band = str(latest_row.get("predicted_risk_band", get_risk_band(score)))
        
        summaries.append({
            "node_id": nid,
            "day": int(latest_row.get("day", 365)),
            "tilt_deg": round(float(latest_row.get("tilt_deg", 0.0)), 3),
            "displacement_mm": round(float(latest_row.get("displacement_mm", 0.0)), 2),
            "strain_microstrain": round(float(latest_row.get("strain_microstrain", 0.0)), 1),
            "vibration_mms": round(float(latest_row.get("vibration_mms", 0.0)), 3),
            "risk_score": round(score, 1),
            "risk_band": band,
            "status_color": (
                "#10B981" if band == BAND_NORMAL else
                "#F59E0B" if band == BAND_WATCH else
                "#F97316" if band == BAND_WARNING else "#EF4444"
            )
        })

    return jsonify(summaries)


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
    print(f"[*] CarboNex Python REST Server running at http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
