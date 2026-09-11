"""
Subsidence Sensor Fusion & Anomaly Detection Model (3-Layer Unsupervised Architecture)
=====================================================================================

Architecture Overview:
- Layer 1: Per-node Anomaly Detection via scikit-learn Isolation Forest on node baseline.
- Layer 2: Trend / Progression Feature Engineering (rolling slope, rolling acceleration, rolling std).
- Layer 3: Weighted Multi-Sensor Fusion & Calibrated Risk Scoring (0-100 scale, 4 status bands).

Designed for both streaming/real-time inference and high-throughput batch evaluation.
"""

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


# Domain sensor definitions and default fusion weights
SENSORS: List[str] = [
    "tilt_deg",
    "displacement_mm",
    "strain_microstrain",
    "vibration_mms"
]

DEFAULT_WEIGHTS: Dict[str, float] = {
    "tilt_deg": 0.30,
    "strain_microstrain": 0.30,
    "displacement_mm": 0.25,
    "vibration_mms": 0.15
}

# Risk Bands
BAND_NORMAL = "NORMAL"      # 0 - 25
BAND_WATCH = "WATCH"        # 26 - 50
BAND_WARNING = "WARNING"    # 51 - 75
BAND_CRITICAL = "CRITICAL"  # 76 - 100


def get_risk_band(score: float) -> str:
    """Map continuous risk score (0-100) to standard 4-tier domain band."""
    if score <= 25.0:
        return BAND_NORMAL
    elif score <= 50.0:
        return BAND_WATCH
    elif score <= 75.0:
        return BAND_WARNING
    else:
        return BAND_CRITICAL


def calculate_slope(values: np.ndarray) -> float:
    """Calculate linear trend slope over a 1D sequence of readings."""
    w = len(values)
    if w < 2:
        return 0.0
    x = np.arange(w, dtype=float)
    x_bar = x.mean()
    y_bar = values.mean()
    num = np.sum((x - x_bar) * (values - y_bar))
    den = np.sum((x - x_bar) ** 2)
    return float(num / den) if den > 1e-12 else 0.0


def compute_rolling_series_features(values: np.ndarray, window: int = 7) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Vectorized calculation of rolling slope, acceleration (2nd derivative), and std dev.
    Returns:
        (slopes, accelerations, rolling_stds)
    """
    n = len(values)
    slopes = np.zeros(n, dtype=float)
    stds = np.zeros(n, dtype=float)

    for i in range(n):
        start_idx = max(0, i - window + 1)
        sub = values[start_idx : i + 1]
        w = len(sub)
        if w > 1:
            x = np.arange(w, dtype=float)
            x_bar = x.mean()
            y_bar = sub.mean()
            num = np.sum((x - x_bar) * (sub - y_bar))
            den = np.sum((x - x_bar) ** 2)
            slopes[i] = num / den if den > 1e-12 else 0.0
            stds[i] = np.std(sub, ddof=1)
        else:
            slopes[i] = 0.0
            stds[i] = 0.0

    accel = np.diff(slopes, prepend=slopes[0])
    return slopes, accel, stds


@dataclass
class DiagnosticReport:
    """Rich, user-friendly diagnostic explanation of model inference."""
    node_id: str
    risk_score: float
    risk_band: str
    status_color: str
    primary_driver: str
    driver_contribution_pct: float
    summary: str
    recommendation: str
    sensor_scores: Dict[str, float]
    sensor_readings: Dict[str, float]
    sensor_trends: Dict[str, Dict[str, float]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "risk_score": round(self.risk_score, 1),
            "risk_band": self.risk_band,
            "status_color": self.status_color,
            "primary_driver": self.primary_driver,
            "driver_contribution_pct": round(self.driver_contribution_pct, 1),
            "summary": self.summary,
            "recommendation": self.recommendation,
            "sensor_scores": {k: round(v, 4) for k, v in self.sensor_scores.items()},
            "sensor_readings": {k: round(v, 4) for k, v in self.sensor_readings.items()},
            "sensor_trends": self.sensor_trends
        }


class NodeBaselineModel:
    """
    Encapsulates Layer 1 (Isolation Forest) and Layer 2 (Trend Features) for a single node.
    Trained on the node's early quiet history to establish an individual normal baseline.
    """

    def __init__(
        self,
        node_id: str,
        sensors: Optional[List[str]] = None,
        window: int = 7,
        contamination: float = 0.01,
        random_state: int = 42
    ):
        self.node_id = node_id
        self.sensors = sensors or SENSORS
        self.window = window
        self.contamination = contamination
        self.random_state = random_state

        # Trained per-sensor Isolation Forest models
        self.models: Dict[str, IsolationForest] = {}
        # Baseline reference statistics per sensor
        self.stats: Dict[str, Dict[str, float]] = {}
        self.is_fitted = False

    def fit(self, df_node_baseline: pd.DataFrame) -> "NodeBaselineModel":
        """
        Fit Isolation Forest models on baseline period data (e.g. first 30 days).
        Engineers [value, slope, accel, std] for each sensor before fitting.
        """
        df_clean = df_node_baseline.sort_values("day").copy() if "day" in df_node_baseline.columns else df_node_baseline.copy()

        for s in self.sensors:
            if s not in df_clean.columns:
                raise ValueError(f"Sensor '{s}' missing in baseline data for node {self.node_id}")

            raw_vals = df_clean[s].values.astype(float)
            slopes, accel, stds = compute_rolling_series_features(raw_vals, window=self.window)
            X_base = np.column_stack([raw_vals, slopes, accel, stds])

            # Layer 1 & 2 Isolation Forest trained on [value, slope, acceleration, std]
            iso = IsolationForest(
                n_estimators=100,
                contamination=self.contamination,
                random_state=self.random_state,
                bootstrap=True
            )
            iso.fit(X_base)
            self.models[s] = iso

            # Calibrate baseline baseline distribution parameters
            base_dec = iso.decision_function(X_base)
            base_med = float(np.median(base_dec))
            base_q25 = float(np.percentile(base_dec, 25))
            base_q75 = float(np.percentile(base_dec, 75))
            base_spread = max(base_q75 - base_q25, 0.02)

            raw_q25 = float(np.percentile(raw_vals, 25))
            raw_q75 = float(np.percentile(raw_vals, 75))
            raw_iqr = max(raw_q75 - raw_q25, 1e-4)

            self.stats[s] = {
                "base_med": base_med,
                "base_spread": base_spread,
                "raw_q25": raw_q25,
                "raw_q75": raw_q75,
                "raw_iqr": raw_iqr,
                "val_mean": float(np.mean(raw_vals)),
                "val_std": float(np.std(raw_vals))
            }

        self.is_fitted = True
        return self

    def score_sensor_features(self, sensor: str, features: np.ndarray) -> np.ndarray:
        """
        Score engineered features [val, slope, accel, std] for a specific sensor.
        Returns continuous anomaly score in [0, 1].
        """
        if not self.is_fitted:
            raise RuntimeError(f"Model for node {self.node_id} is not fitted yet.")

        iso = self.models[sensor]
        stat = self.stats[sensor]

        if features.ndim == 1:
            features = features.reshape(1, -1)

        dec_scores = iso.decision_function(features)
        dev = (stat["base_med"] - dec_scores) / stat["base_spread"]

        # Magnitude excess over baseline IQR
        raw_vals = features[:, 0]
        val_excess = np.maximum(0, (raw_vals - stat["raw_q75"]) / stat["raw_iqr"])

        # Trend excess: slope compared to baseline spread
        slopes = np.abs(features[:, 1])
        slope_excess = np.maximum(0, (slopes - stat["val_std"]) / max(stat["val_std"], 1e-4))

        combined_dev = dev + 0.3 * np.log1p(val_excess) + 0.2 * np.log1p(slope_excess)

        # Sigmoid calibration: 0 = completely normal, 1 = severe anomaly
        anom_score = 1.0 / (1.0 + np.exp(-1.5 * (combined_dev - 2.5)))
        return np.clip(anom_score, 0.0, 1.0)


class SubsidenceSensorFusion:
    """
    Full 3-Layer Unsupervised Pipeline & Orchestrator.
    Manages per-node baselines, real-time sliding buffers, sensor fusion, and explanations.
    """

    def __init__(
        self,
        sensors: Optional[List[str]] = None,
        weights: Optional[Dict[str, float]] = None,
        window: int = 7,
        buffer_size: int = 14,
        baseline_days: int = 30
    ):
        self.sensors = sensors or SENSORS
        self.weights = weights or DEFAULT_WEIGHTS
        # Normalize weights so they sum to 1.0
        w_sum = sum(self.weights.values())
        self.weights = {k: v / w_sum for k, v in self.weights.items()}

        self.window = window
        self.buffer_size = buffer_size
        self.baseline_days = baseline_days

        # Per-node models: Dict[node_id, NodeBaselineModel]
        self.node_models: Dict[str, NodeBaselineModel] = {}
        # Global fallback model (trained on all normal baselines pooled)
        self.fallback_model: Optional[NodeBaselineModel] = None

        # Real-time streaming buffer per node: Dict[node_id, deque of sensor readings dict]
        self.buffers: Dict[str, deque] = {}

    def fit(self, df: pd.DataFrame, baseline_days: Optional[int] = None) -> "SubsidenceSensorFusion":
        """
        Train per-node baselines from historical dataset on early quiet history.
        """
        if baseline_days is not None:
            self.baseline_days = baseline_days

        if "node_id" not in df.columns:
            raise ValueError("Dataframe must contain 'node_id' column")

        baseline_pool = []

        for node_id, group in df.groupby("node_id"):
            if "day" in group.columns:
                base_data = group[group["day"] <= self.baseline_days]
            else:
                base_data = group.iloc[: self.baseline_days]

            if len(base_data) < 10:
                # Use entire group if less than 10 rows
                base_data = group

            node_model = NodeBaselineModel(
                node_id=str(node_id),
                sensors=self.sensors,
                window=self.window
            )
            node_model.fit(base_data)
            self.node_models[str(node_id)] = node_model
            self.buffers[str(node_id)] = deque(maxlen=self.buffer_size)

            baseline_pool.append(base_data)

        # Build fallback model from combined baseline data for unknown new nodes
        if baseline_pool:
            pool_df = pd.concat(baseline_pool, ignore_index=True)
            self.fallback_model = NodeBaselineModel(
                node_id="GLOBAL_FALLBACK",
                sensors=self.sensors,
                window=self.window
            )
            self.fallback_model.fit(pool_df)

        return self

    def _get_node_model(self, node_id: str) -> NodeBaselineModel:
        """Get trained model for node or return fallback model."""
        if str(node_id) in self.node_models:
            return self.node_models[str(node_id)]
        elif self.fallback_model is not None:
            return self.fallback_model
        else:
            raise RuntimeError(f"No trained model available for node '{node_id}' and no fallback fitted.")

    def reset_buffer(self, node_id: Optional[str] = None):
        """Reset streaming sliding buffer for a node or all nodes."""
        if node_id is not None:
            if str(node_id) in self.buffers:
                self.buffers[str(node_id)].clear()
            else:
                self.buffers[str(node_id)] = deque(maxlen=self.buffer_size)
        else:
            for b in self.buffers.values():
                b.clear()

    def feed_history(self, node_id: str, historical_records: List[Dict[str, float]]):
        """Pre-populate a node's streaming buffer with recent history."""
        node_str = str(node_id)
        if node_str not in self.buffers:
            self.buffers[node_str] = deque(maxlen=self.buffer_size)
        for rec in historical_records:
            self.buffers[node_str].append(rec)

    def predict_reading(
        self,
        node_id: str,
        readings: Dict[str, float],
        update_buffer: bool = True
    ) -> DiagnosticReport:
        """
        Real-time single-point prediction from external streaming source or user input.
        Maintains sliding buffer to calculate Layer 2 slope, acceleration, and std.
        """
        node_str = str(node_id)
        model = self._get_node_model(node_str)

        if node_str not in self.buffers:
            self.buffers[node_str] = deque(maxlen=self.buffer_size)

        buffer = self.buffers[node_str]

        # Extract reading values
        current_vals = {s: float(readings.get(s, 0.0)) for s in self.sensors}

        # Build sequence of readings including current one
        history_vals = list(buffer) + [current_vals]

        sensor_scores = {}
        sensor_trends = {}
        weighted_anomaly_sum = 0.0

        for s in self.sensors:
            series_s = np.array([item[s] for item in history_vals], dtype=float)
            w = len(series_s)
            val = float(series_s[-1])

            # Layer 2: Rolling slope over window
            sub_w = series_s[-self.window :] if w >= self.window else series_s
            slope = calculate_slope(sub_w)

            # Acceleration: difference between current slope and previous slope
            if w > 2:
                prev_sub = series_s[-(self.window + 1) : -1] if w > self.window else series_s[:-1]
                prev_slope = calculate_slope(prev_sub)
                accel = slope - prev_slope
            else:
                accel = 0.0

            # Volatility: rolling std
            std = float(np.std(sub_w, ddof=1)) if len(sub_w) > 1 else 0.0

            feature_vec = np.array([val, slope, accel, std], dtype=float).reshape(1, -1)

            # Layer 1 & 2: Score anomaly
            anom_s = float(model.score_sensor_features(s, feature_vec)[0])
            sensor_scores[s] = anom_s
            sensor_trends[s] = {
                "value": val,
                "slope": slope,
                "acceleration": accel,
                "std": std
            }

            # Layer 3: Weighted sensor fusion
            weighted_anomaly_sum += self.weights[s] * anom_s

        # Map to calibrated 0-100 risk score
        # Baseline quiet state corresponds to ~ 15-18 on the domain scale
        risk_score = float(np.clip(15.0 + weighted_anomaly_sum * 85.0, 0.0, 100.0))
        risk_band = get_risk_band(risk_score)

        # Update sliding window buffer if requested
        if update_buffer:
            buffer.append(current_vals)

        # Generate diagnostic explanation
        return self._build_diagnostic_report(
            node_id=node_str,
            risk_score=risk_score,
            risk_band=risk_band,
            sensor_scores=sensor_scores,
            sensor_readings=current_vals,
            sensor_trends=sensor_trends
        )

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        High-throughput batch inference on full historical datasets or files.
        Processes each node in sequence, preserving time-series progression.
        """
        if "node_id" not in df.columns:
            raise ValueError("Input dataframe must contain 'node_id' column")

        results = []

        for node_id, group in df.groupby("node_id", sort=False):
            node_str = str(node_id)
            model = self._get_node_model(node_str)
            group_sorted = group.sort_values("day").copy() if "day" in group.columns else group.copy()

            sensor_anoms = {}
            for s in self.sensors:
                raw_vals = group_sorted[s].values.astype(float)
                slopes, accel, stds = compute_rolling_series_features(raw_vals, window=self.window)
                group_sorted[f"{s}_slope"] = slopes
                group_sorted[f"{s}_accel"] = accel
                group_sorted[f"{s}_std"] = stds

                X_s = np.column_stack([raw_vals, slopes, accel, stds])
                anom_scores = model.score_sensor_features(s, X_s)
                group_sorted[f"{s}_anomaly_score"] = anom_scores
                sensor_anoms[s] = anom_scores

            # Layer 3: Weighted fusion
            composite_anom = np.zeros(len(group_sorted), dtype=float)
            for s in self.sensors:
                composite_anom += self.weights[s] * sensor_anoms[s]

            group_sorted["predicted_risk_score"] = np.clip(15.0 + composite_anom * 85.0, 0.0, 100.0)
            group_sorted["predicted_risk_band"] = group_sorted["predicted_risk_score"].apply(get_risk_band)

            results.append(group_sorted)

        return pd.concat(results, ignore_index=True)

    def _build_diagnostic_report(
        self,
        node_id: str,
        risk_score: float,
        risk_band: str,
        sensor_scores: Dict[str, float],
        sensor_readings: Dict[str, float],
        sensor_trends: Dict[str, Dict[str, float]]
    ) -> DiagnosticReport:
        """
        Synthesize plain-language geotechnical explanations, root cause driver, and recommended actions.
        """
        color_map = {
            BAND_NORMAL: "#10B981",    # Emerald Green
            BAND_WATCH: "#F59E0B",     # Amber Yellow
            BAND_WARNING: "#F97316",   # Orange
            BAND_CRITICAL: "#EF4444"   # Red
        }
        status_color = color_map.get(risk_band, "#6B7280")

        # Find primary anomaly driver
        weighted_contributions = {s: sensor_scores[s] * self.weights[s] for s in self.sensors}
        total_contrib = sum(weighted_contributions.values()) + 1e-6
        primary_driver = max(weighted_contributions, key=weighted_contributions.get)
        driver_pct = (weighted_contributions[primary_driver] / total_contrib) * 100.0

        # Human-readable sensor names
        name_map = {
            "tilt_deg": "Angular Tilt",
            "displacement_mm": "Linear Displacement",
            "strain_microstrain": "Structural Strain",
            "vibration_mms": "Vibration Velocity"
        }
        driver_label = name_map.get(primary_driver, primary_driver)

        # Synthesize summary and recommendations based on band and trend
        trend_info = sensor_trends[primary_driver]
        slope_val = trend_info["slope"]
        accel_val = trend_info["acceleration"]

        if risk_band == BAND_NORMAL:
            summary = (
                f"Node {node_id} is operating within nominal baseline parameters. "
                f"All sensor channels show stable background telemetry with negligible drift."
            )
            recommendation = "Standard automated monitoring. No immediate maintenance intervention required."

        elif risk_band == BAND_WATCH:
            summary = (
                f"Elevated telemetry detected on Node {node_id}. {driver_label} is the primary driver "
                f"(anomaly score: {sensor_scores[primary_driver]:.2f}, accounting for {driver_pct:.0f}% of risk). "
                f"Observed trend slope is {slope_val:+.3f} per unit time."
            )
            recommendation = (
                "Increase sampling frequency to hourly. Verify sensor mounting stability and inspect local geological logs."
            )

        elif risk_band == BAND_WARNING:
            summary = (
                f"Significant subsidence progression observed at Node {node_id}. {driver_label} exhibits accelerated "
                f"deformation (slope {slope_val:+.2f}, acceleration {accel_val:+.2f}). "
                f"Multiple channels show synchronous departure from early baseline."
            )
            recommendation = (
                "Dispatch geotechnical engineering team for field inspection within 24–48 hours. "
                "Alert operations supervisor and assess surrounding slope stability."
            )

        else:  # BAND_CRITICAL
            summary = (
                f"CRITICAL SUBSIDENCE ALERT: Node {node_id} is experiencing severe structural deformation! "
                f"{driver_label} reading ({sensor_readings[primary_driver]:.2f}) and composite risk ({risk_score:.1f}/100) "
                f"indicate imminent slope failure or ground rupture hazard."
            )
            recommendation = (
                "IMMEDIATE ACTION: Restrict personnel access to affected perimeter. "
                "Trigger Level 1 evacuation protocol and enact emergency slope stabilization countermeasures."
            )

        return DiagnosticReport(
            node_id=node_id,
            risk_score=risk_score,
            risk_band=risk_band,
            status_color=status_color,
            primary_driver=driver_label,
            driver_contribution_pct=driver_pct,
            summary=summary,
            recommendation=recommendation,
            sensor_scores=sensor_scores,
            sensor_readings=sensor_readings,
            sensor_trends=sensor_trends
        )

    def save(self, filepath: str):
        """Serialize full pipeline, models, and weights to disk."""
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str) -> "SubsidenceSensorFusion":
        """Load trained pipeline from disk."""
        obj = joblib.load(filepath)
        if not isinstance(obj, SubsidenceSensorFusion):
            raise TypeError(f"Loaded object is not a SubsidenceSensorFusion instance: {type(obj)}")
        return obj
