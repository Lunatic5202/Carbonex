# Subsidence Sensor Fusion AI Engine (3-Layer Architecture)

A standalone, unsupervised machine learning system for real-time geotechnical subsidence anomaly detection, sensor fusion, and risk forecasting.

---

## 3-Layer Unsupervised Architecture

```
Layer 1 — Per-Node Anomaly Detection (Isolation Forest)
  ├── Trains an individual Isolation Forest baseline for each sensor node on its own early quiet history (Day 1–30).
  └── Produces continuous anomaly scores rescaled to [0, 1].

Layer 2 — Trend & Progression Feature Engineering (Unsupervised)
  ├── Rolling slope (1st derivative over 5–7 days)
  ├── Rolling acceleration (2nd derivative / rate of change of slope)
  ├── Rolling volatility (standard deviation over window)
  └── Catches escalation patterns (e.g. 1, 1, 2, 4, 5) even when absolute values are moderate.

Layer 3 — Sensor Fusion & Calibrated Risk Scoring
  ├── Combines the 4 per-sensor anomaly scores via domain risk weights:
  │     • Tilt (30%)
  │     • Structural Strain (30%)
  │     • Linear Displacement (25%)
  │     • Vibration Velocity (15%)
  └── Maps composite anomaly to a 0–100 risk score and 4 standard geotechnical alert bands:
        • 0 – 25   : NORMAL   (Nominal quiet state)
        • 26 – 50  : WATCH    (Subtle drift / elevated noise)
        • 51 – 75  : WARNING  (Accelerated strain / field inspection required)
        • 76 – 100 : CRITICAL (Severe subsidence / evacuation protocol)
```

---

## Performance on 365-Day Dataset

Evaluated against `subsidence_sensor_data_365.csv` (1,460 rows, Nodes 01–04):

| Metric | Result |
| :--- | :--- |
| **Ground Truth Correlation** | **0.9778 (97.78%)** |
| **Mean Absolute Error (MAE)** | **5.38 points** |
| **Critical False Negatives** | **0 (Zero critical events missed)** |

---

## Project Structure

```
carnonexforest/
├── subsidence_model.py          # Standalone 3-layer ML pipeline & diagnostic explainer
├── train_and_evaluate.py        # Model training, baseline fitting, and evaluation script
├── app.py                       # Interactive Dash Web GUI (Gauges, Replay, Visualizer)
├── gui_desktop.py               # Native Python Tkinter Desktop GUI
├── cli.py                       # Command-line interface for predictions & batch files
├── test_suite.py                # Automated unit and integration test suite
├── subsidence_sensor_data_365.csv # Historical 365-day sensor dataset
└── models/
    └── subsidence_model.joblib  # Serialized trained model
```

---

## How to Run

### 1. Interactive Web Dashboard (Dash)
Run the web application:
```bash
python app.py
```
Then open in your browser: **[http://127.0.0.1:8050](http://127.0.0.1:8050)**

Features in the Web App:
- **Real-Time Predictor & What-If Simulator**: Interactive sliders, quick scenario presets ("Nominal", "Creep", "Slide", "Rupture"), live radial gauge, and geotechnical diagnostic recommendations.
- **Historical Data & Telemetry Analytics**: Multi-sensor time-series plots, risk score timeline with 4-tier shaded background bands, and per-sensor stacked anomaly contribution.
- **Live Streaming & Replay Simulator**: Play back historical data day-by-day with variable speed, live updating gauges, and warning alert banners.
- **Batch CSV Scorer**: Drag-and-drop external CSV files, view scored table previews, and download enriched CSVs.

---

### 2. Native Desktop GUI (Tkinter)
If you prefer a desktop window without opening a browser:
```bash
python gui_desktop.py
```
Includes scenario presets, live slider inputs, color-coded risk meter, detailed diagnostics, and batch CSV scoring dialogs.

---

### 3. Command-Line Interface (CLI)

**Single-Point Real-Time Prediction:**
```bash
python cli.py predict --node Node01 --tilt 0.35 --displacement 1.6 --strain 30.0 --vibration 1.05
```

**JSON Output (for API / external service integration):**
```bash
python cli.py predict --node Node02 --tilt 35.0 --displacement 80.0 --strain 1200.0 --vibration 15.0 --json
```

**Batch Score an External CSV File:**
```bash
python cli.py score-file --input subsidence_sensor_data_365.csv --output scored_output.csv
```

---

### 4. Python API Integration

```python
from subsidence_model import SubsidenceSensorFusion

# Load model
model = SubsidenceSensorFusion.load("models/subsidence_model.joblib")

# Ingest new reading from external source / IoT gateway
reading = {
    "tilt_deg": 1.45,
    "displacement_mm": 4.10,
    "strain_microstrain": 58.2,
    "vibration_mms": 1.75
}

report = model.predict_reading("Node01", reading, update_buffer=True)

print(f"Risk Score    : {report.risk_score:.1f} / 100")
print(f"Risk Band     : {report.risk_band}")
print(f"Primary Driver: {report.primary_driver} ({report.driver_contribution_pct:.1f}%)")
print(f"Summary       : {report.summary}")
print(f"Action        : {report.recommendation}")
```

---

### 5. Running the Test Suite

```bash
python test_suite.py
```
Validates mathematical slope calculation, 2nd derivative acceleration, trend-driven anomalies ("1, 1, 2, 4, 5"), sliding buffer statefulness, unknown node fallback, and model serialization.
