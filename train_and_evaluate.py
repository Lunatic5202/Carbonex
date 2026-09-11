"""
Model Training and Evaluation Pipeline
======================================
Trains the 3-layer Unsupervised Subsidence Anomaly Detection model on
'subsidence_sensor_data_365.csv', validates against reference ground truth,
and serializes the trained model to disk.
"""

import os
import sys
import pandas as pd
import numpy as np
from subsidence_model import SubsidenceSensorFusion, DEFAULT_WEIGHTS, SENSORS


def run_training_and_evaluation(
    data_path: str = "subsidence_sensor_data_365.csv",
    model_save_dir: str = "models",
    baseline_days: int = 30
):
    print("=" * 70)
    print(" 3-LAYER SUBSIDENCE SENSOR FUSION & ANOMALY DETECTION ENGINE")
    print("=" * 70)

    if not os.path.exists(data_path):
        print(f"Error: Dataset '{data_path}' not found.")
        sys.exit(1)

    print(f"\n[1/4] Loading dataset: {data_path}")
    df = pd.read_csv(data_path)
    print(f"  Total records: {len(df):,}")
    print(f"  Unique nodes : {df['node_id'].unique().tolist()}")
    print(f"  Sensor channels: {SENSORS}")
    print(f"  Domain weights : {DEFAULT_WEIGHTS}")

    print(f"\n[2/4] Training 3-Layer Pipeline (Baseline window = first {baseline_days} days per node)...")
    pipeline = SubsidenceSensorFusion(
        sensors=SENSORS,
        weights=DEFAULT_WEIGHTS,
        window=7,
        buffer_size=14,
        baseline_days=baseline_days
    )
    pipeline.fit(df, baseline_days=baseline_days)
    print(f"  Successfully trained Isolation Forest models for {len(pipeline.node_models)} nodes.")
    print("  Global fallback model initialized.")

    print("\n[3/4] Running batch inference across full 365 days...")
    df_scored = pipeline.predict_batch(df)

    # Evaluation against reference columns if present
    if "risk_score_reference" in df_scored.columns:
        overall_corr = df_scored["predicted_risk_score"].corr(df_scored["risk_score_reference"])
        mae = np.mean(np.abs(df_scored["predicted_risk_score"] - df_scored["risk_score_reference"]))
        print("\n" + "-" * 70)
        print(" EVALUATION METRICS vs REFERENCE GROUND TRUTH")
        print("-" * 70)
        print(f"  Pearson Correlation : {overall_corr:.4f} ({overall_corr*100:.2f}%)")
        print(f"  Mean Absolute Error : {mae:.2f} points")

        print("\n  Per-Node Correlation & Mean Comparison:")
        for node_id, group in df_scored.groupby("node_id"):
            corr = group["predicted_risk_score"].corr(group["risk_score_reference"])
            p_mean = group["predicted_risk_score"].mean()
            r_mean = group["risk_score_reference"].mean()
            # If standard deviation is 0 or all values constant (like Node03 normal)
            corr_str = f"{corr:.4f}" if not np.isnan(corr) else "N/A (Stable baseline)"
            print(f"    • {node_id:<8} | Correlation: {corr_str:<12} | Pred Mean: {p_mean:5.1f} | Ref Mean: {r_mean:5.1f}")

    if "status_reference" in df_scored.columns:
        print("\n  Confusion Matrix (Reference Status vs Predicted Band):")
        crosstab = pd.crosstab(
            df_scored["status_reference"],
            df_scored["predicted_risk_band"],
            margins=True
        )
        print(crosstab.to_string())

        # Check safety: False Negatives for Critical
        crit_as_norm = len(df_scored[(df_scored["status_reference"] == "CRITICAL") & (df_scored["predicted_risk_band"] == "NORMAL")])
        print(f"\n  Critical False Negative (CRITICAL predicted as NORMAL): {crit_as_norm} (Safety Check: {'PASSED' if crit_as_norm == 0 else 'FAILED'})")

    # Export scored dataset
    output_csv = "scored_subsidence_sensor_data.csv"
    df_scored.to_csv(output_csv, index=False)
    print(f"\n[4/4] Saved enriched predictions to: {output_csv}")

    # Serialize trained model
    os.makedirs(model_save_dir, exist_ok=True)
    model_path = os.path.join(model_save_dir, "subsidence_model.joblib")
    pipeline.save(model_path)
    print(f"  Serialized trained model to: {model_path}")
    print("=" * 70)
    print(" TRAINING & EVALUATION COMPLETED SUCCESSFULLY")
    print("=" * 70)

    return pipeline, df_scored


if __name__ == "__main__":
    run_training_and_evaluation()
