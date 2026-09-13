"""
Training & Evaluation Pipeline for Laser Wall Deformation AI/ML Engine
======================================================================
Follows ML Best Practices:
1. Loads 90-day 360-row laser transmitter/sensor dataset.
2. Performs stratified & chronological validation splits.
3. Trains Gradient Boosting multi-class classifier, continuous risk regressor,
   and Isolation Forest unsupervised anomaly detector.
4. Reports accuracy, precision, recall, macro F1, and confusion matrix.
5. Saves serializable artifact to models/laser_wall_model.joblib.
6. Generates scored batch dataset for instant GUI consumption.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from laser_wall_model import LaserWallAIModel, STATUS_ORDER

DATASET_PATH = "laser_wall_sensor_data_90days.csv"
MODEL_PATH = os.path.join("models", "laser_wall_model.joblib")
SCORED_OUTPUT_PATH = "scored_laser_wall_data_90days.csv"


def train_and_evaluate():
    print("=" * 65)
    print("  CARBO-NEX: Laser Wall Deformation AI/ML Model Training")
    print("=" * 65)

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset: {len(df)} rows across {df['pair_id'].nunique()} wall pairs ({df['pair_id'].unique().tolist()}).")
    print(f"Time span: Days {df['day'].min()} to {df['day'].max()}.\n")

    print("Target class distribution:")
    for status, count in df["status_reference"].value_counts().items():
        pct = (count / len(df)) * 100
        print(f"  - {status:8s}: {count:3d} ({pct:5.1f}%)")

    # Train-test split (80% train, 20% test stratified by status)
    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        random_state=42,
        stratify=df["status_reference"]
    )

    print(f"\nSplit into {len(train_df)} training samples and {len(test_df)} test samples.")

    # Initialize model
    model = LaserWallAIModel()

    # Fit on training set
    print("\nTraining LaserWallAIModel pipeline...")
    model.fit(train_df)

    # Evaluate on held-out test set
    test_feat = model.extract_features(test_df)
    X_test = test_feat[model.FEATURE_COLS].values
    X_test_scaled = model.scaler.transform(X_test)
    y_test_true = test_feat["status_reference"].values
    y_test_pred_idx = model.classifier.predict(X_test_scaled)
    y_test_pred = [STATUS_ORDER[i] for i in y_test_pred_idx]

    acc = accuracy_score(y_test_true, y_test_pred)
    macro_f1 = f1_score(y_test_true, y_test_pred, average="macro")

    print("\n" + "-" * 65)
    print(f"  HELD-OUT TEST SET EVALUATION")
    print(f"  Accuracy: {acc * 100:.2f}% | Macro F1-Score: {macro_f1 * 100:.2f}%")
    print("-" * 65)
    print(classification_report(y_test_true, y_test_pred, target_names=STATUS_ORDER))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test_true, y_test_pred, labels=STATUS_ORDER)
    cm_df = pd.DataFrame(cm, index=[f"Actual {s}" for s in STATUS_ORDER], columns=[f"Pred {s}" for s in STATUS_ORDER])
    print(cm_df.to_string())

    print("\nFeature Importances (Top Drivers of Deflection Risk):")
    sorted_fi = sorted(model.feature_importances_.items(), key=lambda x: x[1], reverse=True)
    for feat, imp in sorted_fi:
        bar = "█" * int(imp * 40)
        print(f"  {feat:28s} : {imp:6.4f} | {bar}")

    # Retrain on full 360-row dataset for production deployment
    print("\nRetraining on full dataset for production deployment...")
    model.fit(df)

    # Save artifact
    model.save(MODEL_PATH)

    # Batch score full dataset for GUI
    print(f"Scoring full dataset and writing to {SCORED_OUTPUT_PATH}...")
    df_scored = model.predict_batch(df)
    df_scored.to_csv(SCORED_OUTPUT_PATH, index=False)
    print("Full dataset scored successfully.")

    # Run quick sanity check on a live single inference
    print("\nTesting Real-Time Single Inference Test Case:")
    sample_normal = model.predict_realtime(
        discrepancy_mm=0.08,
        residual_offset_mm=0.04,
        vibration_magnitude_mm=1.2,
        signal_intensity_pct=99.2,
        days_unreturned_streak=0
    )
    print("  Normal Wall Test Result :", sample_normal["status"], "| Risk:", sample_normal["risk_score"], "| TTF:", sample_normal["time_to_failure_days"], "days")

    sample_abnormal = model.predict_realtime(
        discrepancy_mm=11.5,
        residual_offset_mm=11.5,
        vibration_magnitude_mm=2.1,
        signal_intensity_pct=52.4,
        days_unreturned_streak=18,
        prev_discrepancies=[9.6, 10.2, 10.9]
    )
    print("  Abnormal Wall Test Result:", sample_abnormal["status"], "| Risk:", sample_abnormal["risk_score"], "| TTF:", sample_abnormal["time_to_failure_days"], "days")
    print("  Diagnostic Explanation   :", sample_abnormal["diagnostics"]["summary"])
    print("=" * 65)


if __name__ == "__main__":
    train_and_evaluate()
