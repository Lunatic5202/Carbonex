from datetime import datetime, timezone

from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Global dictionary to store the most recent data
latest_data = {
    "node_id": "Waiting...", "seq": 0, "tilt_x": 0, "tilt_y": 0, 
    "vib": 0, "crack": 0, "batt": 0, "temp": 0, "rssi": 0
}
latest_packet = {
    "received_at": None,
    "source": None,
    "payload": None,
    "content_type": None,
}

# New Route: Serves the Jinja HTML template
@app.route('/')
def dashboard():
    # Passes the 'latest_data' python dictionary to the HTML as 'sensor'
    return render_template('index.html', sensor=latest_data, packet=latest_packet)


@app.route('/latest', methods=['GET'])
def latest():
    """Return the most recent packet received from the base or sensor node."""
    return jsonify(latest_packet)

# Existing Route: Receives data from the ESP32
@app.route('/endpoint', methods=['POST'])
def receive_data():
    global latest_data, latest_packet
    try:
        raw_body = request.get_data(cache=True, as_text=True)
        data = request.get_json(silent=True)
        payload = data if data is not None else raw_body

        latest_packet = {
            "received_at": datetime.now(timezone.utc).isoformat(),
            "source": request.remote_addr,
            "payload": payload,
            "content_type": request.content_type,
        }
        if isinstance(data, dict):
            latest_data = data

        node_id = data.get('node_id', 'unknown') if isinstance(data, dict) else 'raw'
        print(f"Received packet from {request.remote_addr} (node={node_id}): {payload!r}")
        return jsonify({"status": "received", "packet": latest_packet}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)