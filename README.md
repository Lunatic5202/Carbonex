# CarboNex — Subsidence Monitoring & Early Warning

CarboNex is a prototype for monitoring potential ground movement in underground coal mines. The repository combines sensor-fusion modelling, historical data exploration, a Dash dashboard and a Flask API/static frontend server.

> **Safety disclaimer:** This is a research and engineering prototype, not a certified mine-safety instrument. Risk scores are experimental indicators and must not replace approved monitoring systems, qualified inspections, regulatory procedures or emergency response.

## What is implemented
- **Sensor-fusion model** — unsupervised Isolation Forest anomaly detection, rolling trend features and weighted multi-sensor risk scoring.
- **Sensor inputs** — tilt, displacement, strain and vibration measurements.
- **Risk bands** — NORMAL (0–25), WATCH (26–50), WARNING (51–75) and CRITICAL (76–100).
- **Dash dashboard** — historical sensor explorer, risk visualizations, prediction/what-if views, replay simulation and batch CSV scoring/export.
- **Flask API** — accepts ESP32-style telemetry, evaluates readings through the sensor-fusion pipeline and serves the built frontend.
- **Model persistence** — joblib artifacts under `models/` when generated.

The repository includes CSV datasets and a pre-scored dataset for development. Check their provenance and representativeness before treating results as field evidence.

## Architecture

```text
ESP32 / sensor telemetry
        |
        v
Flask API -----> live packet state and node history
        |                         |
        v                         v
SubsidenceSensorFusion <---- historical sensor data
        |
        +---- anomaly detection
        +---- trend / acceleration features
        +---- weighted risk score and diagnostics
        |
        +----> React dashboard / GIS view
        +----> Dash analysis dashboard
```

## Stack
- Python, NumPy, pandas, scikit-learn and joblib
- Flask and Flask-CORS
- Dash and Plotly
- React frontend assets (served from `frontend/dist` by Flask)

## Run locally

```bash
python -m venv .venv
# macOS / Linux
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the analysis dashboard:

```bash
python app.py
```

Run the Flask telemetry API/static frontend server separately when working on device/API integration:

```bash
python server.py
```

Check startup output for the actual local port. Build the React frontend before expecting Flask to serve the production UI from `frontend/dist`.

## Main files

| Path | Purpose |
| --- | --- |
| `subsidence_model.py` | Sensor-fusion model, features, risk bands and diagnostics |
| `app.py` | Dash analysis and simulation dashboard |
| `server.py` | Flask telemetry API and static frontend server |
| `frontend/` | Browser dashboard |
| `esp/` | Embedded/ESP-side code |
| `models/` | Generated model artifacts |
| `*_sensor_data*.csv` | Development sensor datasets |
| `train_and_evaluate.py` | Training/evaluation workflow |
| `test_suite.py` | Project test suite |

## Development and validation

```bash
python test_suite.py
python train_and_evaluate.py
```

Review script arguments and data expectations before running. Validate sensor calibration, time synchronization, missing data, false alarms, model drift and communications failure modes before any field trial.

## Hardware concept

The proposed node design references ESP32, LoRa SX1278, MPU6050 and strain sensing. Hardware deployment, mesh reliability, sensor calibration and surveyed node placement require real-world verification; the dashboard alone does not establish a live mine deployment.

## Contributing

Document data provenance, sensor units, calibration procedures and test evidence with each change. Never present a simulated packet, generated sample or historical CSV as a live commissioned sensor reading.

## License and data rights

No project-wide license is currently provided. Do not assume permission to copy, modify, or redistribute this repository. Sensor datasets, trained models, hardware designs, and third-party materials may have separate ownership or usage terms; verify provenance and permissions before reuse.
