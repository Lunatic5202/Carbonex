"""
Subsidence Sensor Fusion CLI
============================
Command-line interface for:
- Model training & baseline fitting.
- Real-time single point inference with diagnostic explanation.
- Batch CSV file scoring.
"""

import argparse
import json
import os
import sys
import pandas as pd
from subsidence_model import SubsidenceSensorFusion, SENSORS, DEFAULT_WEIGHTS

MODEL_PATH = os.path.join("models", "subsidence_model.joblib")


def get_pipeline() -> SubsidenceSensorFusion:
    if os.path.exists(MODEL_PATH):
        return SubsidenceSensorFusion.load(MODEL_PATH)
    elif os.path.exists("subsidence_sensor_data_365.csv"):
        print("Model file not found. Fitting default baseline from 'subsidence_sensor_data_365.csv'...")
        df = pd.read_csv("subsidence_sensor_data_365.csv")
        pipe = SubsidenceSensorFusion()
        pipe.fit(df, baseline_days=30)
        os.makedirs("models", exist_ok=True)
        pipe.save(MODEL_PATH)
        return pipe
    else:
        print(f"Error: Model not found at '{MODEL_PATH}' and default dataset not found.")
        sys.exit(1)


def cmd_train(args):
    print(f"Loading training data from: {args.data}")
    df = pd.read_csv(args.data)
    pipe = SubsidenceSensorFusion(baseline_days=args.baseline_days)
    pipe.fit(df)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    pipe.save(args.output)
    print(f"Trained model successfully saved to: {args.output}")


def cmd_predict(args):
    pipe = get_pipeline()
    readings = {
        "tilt_deg": args.tilt,
        "displacement_mm": args.displacement,
        "strain_microstrain": args.strain,
        "vibration_mms": args.vibration
    }

    report = pipe.predict_reading(args.node, readings, update_buffer=not args.no_buffer)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print("\n" + "=" * 60)
        print(f" SUBSIDENCE INFERENCE REPORT - NODE: {report.node_id}")
        print("=" * 60)
        print(f" Risk Score    : {report.risk_score:.1f} / 100")
        print(f" Risk Status   : {report.risk_band}")
        print(f" Primary Driver: {report.primary_driver} ({report.driver_contribution_pct:.1f}% contribution)")
        print("\n Diagnostic Summary:")
        print(f"   {report.summary}")
        print("\n Recommended Protocol:")
        print(f"   {report.recommendation}")
        print("\n Sensor Telemetry & Trends:")
        print(f"   {'Channel':<24} {'Reading':<12} {'Slope':<12} {'Accel':<12} {'Anomaly'}")
        print("   " + "-" * 66)
        labels = {
            "tilt_deg": "Tilt (deg)",
            "displacement_mm": "Displacement (mm)",
            "strain_microstrain": "Strain (ustrain)",
            "vibration_mms": "Vibration (mm/s)"
        }
        for s in SENSORS:
            tr = report.sensor_trends[s]
            sc = report.sensor_scores[s]
            print(f"   {labels[s]:<24} {tr['value']:<12.3f} {tr['slope']:<+12.3f} {tr['acceleration']:<+12.3f} {sc:.3f}")
        print("=" * 60 + "\n")


def cmd_score_file(args):
    pipe = get_pipeline()
    print(f"Reading input file: {args.input}")
    df = pd.read_csv(args.input)
    df_scored = pipe.predict_batch(df)

    out_file = args.output or f"scored_{os.path.basename(args.input)}"
    df_scored.to_csv(out_file, index=False)
    crit_count = (df_scored["predicted_risk_band"] == "CRITICAL").sum()
    print(f"Scored {len(df_scored):,} rows. Found {crit_count} CRITICAL records.")
    print(f"Output saved to: {out_file}")


def main():
    parser = argparse.ArgumentParser(description="Subsidence Sensor Fusion AI Engine")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # train
    p_train = subparsers.add_parser("train", help="Train model baselines")
    p_train.add_argument("--data", default="subsidence_sensor_data_365.csv", help="Path to training CSV")
    p_train.add_argument("--baseline-days", type=int, default=30, help="Days in quiet baseline")
    p_train.add_argument("--output", default=MODEL_PATH, help="Path to save model")
    p_train.set_defaults(func=cmd_train)

    # predict
    p_pred = subparsers.add_parser("predict", help="Predict risk for single reading")
    p_pred.add_argument("--node", default="Node01", help="Node identifier")
    p_pred.add_argument("--tilt", type=float, required=True, help="Tilt in degrees")
    p_pred.add_argument("--displacement", type=float, required=True, help="Displacement in mm")
    p_pred.add_argument("--strain", type=float, required=True, help="Strain in microstrain")
    p_pred.add_argument("--vibration", type=float, required=True, help="Vibration in mm/s")
    p_pred.add_argument("--no-buffer", action="store_true", help="Do not update sliding buffer")
    p_pred.add_argument("--json", action="store_true", help="Output as JSON")
    p_pred.set_defaults(func=cmd_predict)

    # score-file
    p_score = subparsers.add_parser("score-file", help="Batch score CSV file")
    p_score.add_argument("--input", required=True, help="Input CSV")
    p_score.add_argument("--output", help="Output CSV path")
    p_score.set_defaults(func=cmd_score_file)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
