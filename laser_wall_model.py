"""
Laser Wall Deformation AI/ML Detection Engine
============================================
Independent AI/ML model for underground mine wall stability monitoring using:
- Wall 2: Laser transmitter / light dispenser
- Wall 1: Optical position sensor / receiver

Features:
1. Physics-informed feature extraction (plasticity ratio, creep velocity, optical attenuation, streak penalty).
2. Multi-Class Risk Classifier (NORMAL, WATCH, WARNING, CRITICAL).
3. Continuous Deflection Risk Scorer (0 - 100).
4. Unsupervised Anomaly Detection (Isolation Forest).
5. Kinematic Time-to-Failure (TTF) Forecaster.
6. Real-time diagnostic explainability engine.
"""

import os
import math
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, f1_score, accuracy_score, confusion_matrix

# Risk Tiers
STATUS_NORMAL = "NORMAL"
STATUS_WATCH = "WATCH"
STATUS_WARNING = "WARNING"
STATUS_CRITICAL = "CRITICAL"

STATUS_ORDER = [STATUS_NORMAL, STATUS_WATCH, STATUS_WARNING, STATUS_CRITICAL]
STATUS_TO_INT = {s: i for i, s in enumerate(STATUS_ORDER)}
INT_TO_STATUS = {i: s for i, s in enumerate(STATUS_ORDER)}

# Critical limits for kinematic TTF projection (mm)
CRITICAL_DEFLECTION_THRESHOLD_MM = 15.0
BLACKOUT_DEFLECTION_THRESHOLD_MM = 25.0


class LaserWallAIModel:
    """
    Independent AI/ML model trained on laser transmitter & receiver telemetry.
    """

    FEATURE_COLS = [
        "discrepancy_mm",
        "residual_offset_mm",
        "vibration_magnitude_mm",
        "signal_intensity_pct",
        "optical_attenuation_ratio",
        "plastic_retention_ratio",
        "springback_elastic_index",
        "days_unreturned_streak",
        "streak_penalty",
        "creep_velocity_1d",
        "creep_velocity_3d",
        "creep_acceleration",
    ]

    def __init__(self):
        # Supervised Multi-class Classifier
        self.classifier = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=4,
            random_state=42
        )
        # Continuous Risk Regressor (0 - 100 risk score)
        self.regressor = RandomForestRegressor(
            n_estimators=100,
            max_depth=6,
            random_state=42
        )
        # Unsupervised Anomaly Detector
        self.anomaly_detector = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_importances_ = None
        self.metrics_ = {}

    @classmethod
    def extract_features(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Derives physical kinematic and optical features from raw telemetry.
        """
        data = df.copy()

        # Handle boolean conversion
        if "returned_to_baseline" in data.columns:
            data["returned_to_baseline_int"] = data["returned_to_baseline"].astype(int)

        # 1. Plastic Retention Ratio: fraction of vibration converted to permanent plastic offset
        vib = data["vibration_magnitude_mm"].clip(lower=0.001)
        res = data["residual_offset_mm"].abs()
        data["plastic_retention_ratio"] = (res / vib).clip(upper=50.0)

        # 2. Springback Elastic Index (1.0 = perfect elastic recovery, 0.0 = zero springback)
        data["springback_elastic_index"] = (1.0 - (res / (vib + 0.1))).clip(lower=0.0, upper=1.0)

        # 3. Optical Attenuation Ratio: fractional loss of laser light
        data["optical_attenuation_ratio"] = ((100.0 - data["signal_intensity_pct"]) / 100.0).clip(lower=0.0, upper=1.0)

        # 4. Streak Penalty: non-linear escalation for prolonged unreturned states
        data["streak_penalty"] = 1.0 / (1.0 + np.exp(-0.2 * (data["days_unreturned_streak"] - 5)))

        # Temporal kinematics (grouped by pair_id if available)
        if "pair_id" in data.columns:
            groups = data.groupby("pair_id")
            data["creep_velocity_1d"] = groups["discrepancy_mm"].diff().fillna(0.0)
            data["creep_velocity_3d"] = groups["discrepancy_mm"].diff(periods=3).fillna(0.0) / 3.0
            data["creep_acceleration"] = groups["creep_velocity_1d"].diff().fillna(0.0)
        else:
            data["creep_velocity_1d"] = data["discrepancy_mm"].diff().fillna(0.0)
            data["creep_velocity_3d"] = data["discrepancy_mm"].diff(periods=3).fillna(0.0) / 3.0
            data["creep_acceleration"] = data["creep_velocity_1d"].diff().fillna(0.0)

        # Replace any inf or NaN with safe defaults
        for col in cls.FEATURE_COLS:
            if col not in data.columns:
                data[col] = 0.0
            data[col] = data[col].replace([np.inf, -np.inf], np.nan).fillna(0.0)

        return data

    def fit(self, df: pd.DataFrame):
        """
        Fits the supervised and unsupervised models on historical training data.
        """
        df_feat = self.extract_features(df)
        X = df_feat[self.FEATURE_COLS].values

        # Target 1: Discrete status (NORMAL, WATCH, WARNING, CRITICAL)
        y_class = df_feat["status_reference"].map(STATUS_TO_INT).values

        # Target 2: Continuous Risk Score (0 - 100)
        # Formulated from discrepancy, streak, and optical loss
        y_risk = (
            (df_feat["discrepancy_mm"].clip(upper=20.0) / 20.0) * 45.0 +
            (df_feat["days_unreturned_streak"].clip(upper=30.0) / 30.0) * 30.0 +
            (df_feat["optical_attenuation_ratio"]) * 25.0
        ).clip(0.0, 100.0).values

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Fit models
        self.classifier.fit(X_scaled, y_class)
        self.regressor.fit(X_scaled, y_risk)
        self.anomaly_detector.fit(X_scaled)

        self.is_fitted = True

        # Store feature importances
        self.feature_importances_ = dict(
            zip(self.FEATURE_COLS, self.classifier.feature_importances_.round(4))
        )

        # Evaluate on training data
        preds_class = self.classifier.predict(X_scaled)
        self.metrics_ = {
            "accuracy": round(float(accuracy_score(y_class, preds_class)), 4),
            "macro_f1": round(float(f1_score(y_class, preds_class, average="macro")), 4),
            "confusion_matrix": confusion_matrix(y_class, preds_class).tolist(),
            "classes": STATUS_ORDER
        }
        return self

    def predict_realtime(
        self,
        discrepancy_mm: float,
        residual_offset_mm: float,
        vibration_magnitude_mm: float,
        signal_intensity_pct: float,
        days_unreturned_streak: int,
        prev_discrepancies: list = None
    ) -> dict:
        """
        Runs real-time inference on a single live observation from the laser wall pair.
        """
        if not self.is_fitted:
            raise ValueError("LaserWallAIModel must be fitted before running inference.")

        # Compute velocity and acceleration if previous history provided
        if prev_discrepancies and len(prev_discrepancies) >= 1:
            v1 = discrepancy_mm - prev_discrepancies[-1]
            if len(prev_discrepancies) >= 3:
                v3 = (discrepancy_mm - prev_discrepancies[-3]) / 3.0
            else:
                v3 = v1
            if len(prev_discrepancies) >= 2:
                v_prev = prev_discrepancies[-1] - prev_discrepancies[-2]
                acc = v1 - v_prev
            else:
                acc = 0.0
        else:
            v1 = 0.0
            v3 = 0.0
            acc = 0.0

        # Feature engineering for single row
        vib_safe = max(0.001, vibration_magnitude_mm)
        res_abs = abs(residual_offset_mm)
        plastic_ratio = min(50.0, res_abs / vib_safe)
        springback_idx = max(0.0, min(1.0, 1.0 - (res_abs / (vib_safe + 0.1))))
        optical_att = max(0.0, min(1.0, (100.0 - signal_intensity_pct) / 100.0))
        streak_pen = 1.0 / (1.0 + math.exp(-0.2 * (days_unreturned_streak - 5)))

        row_dict = {
            "discrepancy_mm": discrepancy_mm,
            "residual_offset_mm": residual_offset_mm,
            "vibration_magnitude_mm": vibration_magnitude_mm,
            "signal_intensity_pct": signal_intensity_pct,
            "optical_attenuation_ratio": optical_att,
            "plastic_retention_ratio": plastic_ratio,
            "springback_elastic_index": springback_idx,
            "days_unreturned_streak": days_unreturned_streak,
            "streak_penalty": streak_pen,
            "creep_velocity_1d": v1,
            "creep_velocity_3d": v3,
            "creep_acceleration": acc,
        }

        X_vec = np.array([[row_dict[col] for col in self.FEATURE_COLS]])
        X_scaled = self.scaler.transform(X_vec)

        # Supervised Classification
        pred_idx = int(self.classifier.predict(X_scaled)[0])
        pred_status = INT_TO_STATUS[pred_idx]
        probs = self.classifier.predict_proba(X_scaled)[0]
        prob_dict = {STATUS_ORDER[i]: round(float(probs[i]), 4) for i in range(len(STATUS_ORDER))}

        # Continuous Risk Score (0 - 100)
        risk_score = round(float(np.clip(self.regressor.predict(X_scaled)[0], 0.0, 100.0)), 1)

        # Unsupervised Outlier / Novelty detection (-1 is outlier, 1 is inlier)
        iso_flag = int(self.anomaly_detector.predict(X_scaled)[0])
        is_novel_anomaly = (iso_flag == -1)

        # Kinematic Time-to-Failure (TTF) projection
        ttf_days = self._estimate_time_to_failure(discrepancy_mm, v3, acc)

        # Diagnostic Explanation & Remediation Trigger
        diagnostics = self._generate_diagnostics(
            status=pred_status,
            discrepancy_mm=discrepancy_mm,
            residual_offset_mm=residual_offset_mm,
            streak=days_unreturned_streak,
            signal_pct=signal_intensity_pct,
            velocity=v3,
            acceleration=acc,
            ttf_days=ttf_days
        )

        return {
            "status": pred_status,
            "status_code": pred_idx,
            "risk_score": risk_score,
            "probabilities": prob_dict,
            "is_anomaly": is_novel_anomaly,
            "creep_velocity_mm_per_day": round(v3, 4),
            "creep_acceleration_mm_per_day2": round(acc, 4),
            "time_to_failure_days": ttf_days,
            "diagnostics": diagnostics
        }

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Runs batch scoring on a full telemetry DataFrame.
        """
        df_feat = self.extract_features(df)
        X = df_feat[self.FEATURE_COLS].values
        X_scaled = self.scaler.transform(X)

        preds_idx = self.classifier.predict(X_scaled)
        preds_status = [INT_TO_STATUS[i] for i in preds_idx]
        probs = self.classifier.predict_proba(X_scaled)
        risk_scores = np.clip(self.regressor.predict(X_scaled), 0.0, 100.0).round(1)
        iso_scores = self.anomaly_detector.predict(X_scaled)

        result = df.copy()
        result["ai_predicted_status"] = preds_status
        result["ai_risk_score"] = risk_scores
        result["ai_prob_normal"] = probs[:, 0].round(3)
        result["ai_prob_watch"] = probs[:, 1].round(3)
        result["ai_prob_warning"] = probs[:, 2].round(3)
        result["ai_prob_critical"] = probs[:, 3].round(3)
        result["ai_unsupervised_anomaly"] = (iso_scores == -1)

        return result

    def _estimate_time_to_failure(self, current_disp_mm: float, velocity: float, acceleration: float) -> float:
        """
        Calculates remaining days until discrepancy breaches 15 mm (structural failure).
        Uses kinematic quadratic equation: d0 + v*t + 0.5*a*t^2 = D_crit.
        """
        target = CRITICAL_DEFLECTION_THRESHOLD_MM
        if current_disp_mm >= target:
            return 0.0

        rem_dist = target - current_disp_mm
        effective_vel = max(0.01, velocity)
        effective_acc = max(0.0, acceleration)

        if effective_acc <= 1e-4:
            days = rem_dist / effective_vel
        else:
            # Quadratic solution: 0.5*a*t^2 + v*t - rem_dist = 0
            a = 0.5 * effective_acc
            b = effective_vel
            c = -rem_dist
            disc = b ** 2 - 4 * a * c
            if disc >= 0:
                days = (-b + math.sqrt(disc)) / (2 * a)
            else:
                days = rem_dist / effective_vel

        return round(float(np.clip(days, 0.0, 90.0)), 1)

    def _generate_diagnostics(
        self,
        status: str,
        discrepancy_mm: float,
        residual_offset_mm: float,
        streak: int,
        signal_pct: float,
        velocity: float,
        acceleration: float,
        ttf_days: float
    ) -> dict:
        """
        Constructs transparent engineering diagnostics explaining why the AI triggered the alert.
        """
        if status == STATUS_NORMAL:
            summary = "Nominal Elastic Stability: Wall 2 springs back to zero position following vibrations."
            action = "Routine automated laser sensor monitoring active. No intervention needed."
            alert_level = "GREEN"
        elif status == STATUS_WATCH:
            summary = f"Elastic Limit Exceeded: Wall 2 exhibiting {streak}-day non-recovering streak with {discrepancy_mm:.2f}mm persistent drift."
            action = "Increase laser scan frequency. Dispatch geotechnical field crew for visual fissure inspection."
            alert_level = "YELLOW"
        elif status == STATUS_WARNING:
            summary = f"Active Plastic Creep: Wall 2 shifting at {velocity:.3f} mm/day. Optical beam transmission degraded to {signal_pct:.1f}%."
            action = "Immediate structural shoring recommended. Restrict heavy machinery traffic near panel rib."
            alert_level = "ORANGE"
        else:  # CRITICAL
            summary = (
                f"Severe Plastic Runaway Deflection: Discrepancy reached {discrepancy_mm:.2f}mm ({discrepancy_mm/15.0*100:.0f}% of failure threshold). "
                f"Laser light beam misaligned (Signal: {signal_pct:.1f}%). Estimated collapse window: {ttf_days} days."
            )
            action = "EMERGENCY SAFETY PROTOCOL: Evacuate personnel from Panel rib zone immediately. Deploy hydraulic emergency props."
            alert_level = "RED"

        return {
            "summary": summary,
            "action": action,
            "alert_level": alert_level,
            "primary_driver": "Plastic Creep Accumulation" if streak > 3 else "Elastic Vibration Transient",
            "optical_status": "Beam Centered" if signal_pct > 95.0 else ("Beam Drifting" if signal_pct > 50.0 else "Beam Loss / Occluded")
        }

    def save(self, filepath: str):
        """Saves model pipeline to disk."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)
        print(f"Saved LaserWallAIModel to {filepath}")

    @classmethod
    def load(cls, filepath: str) -> "LaserWallAIModel":
        """Loads model from disk."""
        return joblib.load(filepath)
