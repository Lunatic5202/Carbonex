"""
Comprehensive Test Suite for 3-Layer Subsidence Model & Inference Engine
========================================================================
Runs automated checks on Layer 1, Layer 2, Layer 3, buffer state, serialization,
and diagnostic report structures.
"""

import os
import unittest
import numpy as np
import pandas as pd
from subsidence_model import (
    SubsidenceSensorFusion,
    NodeBaselineModel,
    calculate_slope,
    compute_rolling_series_features,
    get_risk_band,
    BAND_NORMAL,
    BAND_WATCH,
    BAND_WARNING,
    BAND_CRITICAL,
    DEFAULT_WEIGHTS,
    SENSORS
)


class TestLayer2FeatureEngineering(unittest.TestCase):
    """Test Layer 2 trend & progression mathematics."""

    def test_calculate_slope_linear(self):
        # Perfect linear increase: y = 2x + 1
        x = np.array([1.0, 3.0, 5.0, 7.0, 9.0])
        slope = calculate_slope(x)
        self.assertAlmostEqual(slope, 2.0, places=5)

    def test_calculate_slope_flat(self):
        x = np.array([5.0, 5.0, 5.0, 5.0])
        slope = calculate_slope(x)
        self.assertAlmostEqual(slope, 0.0, places=5)

    def test_rolling_series_features(self):
        # 10 readings with known slope
        vals = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0])
        slopes, accel, stds = compute_rolling_series_features(vals, window=5)
        self.assertEqual(len(slopes), len(vals))
        self.assertEqual(len(accel), len(vals))
        self.assertEqual(len(stds), len(vals))
        # After window fills, slope should be 1.0
        self.assertAlmostEqual(slopes[-1], 1.0, places=3)
        self.assertAlmostEqual(accel[-1], 0.0, places=3)


class TestRiskBands(unittest.TestCase):
    """Test Layer 3 risk band boundary mapping."""

    def test_risk_bands(self):
        self.assertEqual(get_risk_band(0.0), BAND_NORMAL)
        self.assertEqual(get_risk_band(25.0), BAND_NORMAL)
        self.assertEqual(get_risk_band(25.1), BAND_WATCH)
        self.assertEqual(get_risk_band(50.0), BAND_WATCH)
        self.assertEqual(get_risk_band(50.1), BAND_WARNING)
        self.assertEqual(get_risk_band(75.0), BAND_WARNING)
        self.assertEqual(get_risk_band(75.1), BAND_CRITICAL)
        self.assertEqual(get_risk_band(100.0), BAND_CRITICAL)


class TestPipelineInference(unittest.TestCase):
    """Test full 3-layer pipeline integration, streaming buffer, and explanations."""

    @classmethod
    def setUpClass(cls):
        # Load or create synthetic baseline
        if os.path.exists("subsidence_sensor_data_365.csv"):
            cls.df = pd.read_csv("subsidence_sensor_data_365.csv")
        else:
            # Synthetic 60 days
            np.random.seed(42)
            rows = []
            for d in range(1, 61):
                rows.append({
                    "node_id": "TestNode",
                    "day": d,
                    "tilt_deg": 0.5 + np.random.normal(0, 0.05),
                    "displacement_mm": 1.2 + np.random.normal(0, 0.1),
                    "strain_microstrain": 25.0 + np.random.normal(0, 1.0),
                    "vibration_mms": 1.0 + np.random.normal(0, 0.1),
                })
            cls.df = pd.DataFrame(rows)

        cls.pipeline = SubsidenceSensorFusion(window=7, baseline_days=30)
        cls.pipeline.fit(cls.df)

    def test_nominal_reading_prediction(self):
        # Node01 early nominal reading
        report = self.pipeline.predict_reading(
            "Node01",
            {
                "tilt_deg": 0.3,
                "displacement_mm": 1.5,
                "strain_microstrain": 28.0,
                "vibration_mms": 1.0
            },
            update_buffer=True
        )
        self.assertIn(report.risk_band, [BAND_NORMAL, BAND_WATCH])
        self.assertLessEqual(report.risk_score, 45.0)
        self.assertIn("node_id", report.to_dict())
        self.assertIn("recommendation", report.to_dict())

    def test_sudden_trend_progression(self):
        """
        Test the user's specific scenario:
        Catching '1, 1, 2, 4, 5' as abnormal through Layer 2 trend & acceleration.
        """
        node = "Node01"
        self.pipeline.reset_buffer(node)

        # Stream escalating values
        progression = [1.0, 1.0, 2.0, 4.0, 5.0]
        reports = []
        for val in progression:
            rep = self.pipeline.predict_reading(
                node,
                {
                    "tilt_deg": val,
                    "displacement_mm": 1.5,
                    "strain_microstrain": 28.0,
                    "vibration_mms": 1.0
                },
                update_buffer=True
            )
            reports.append(rep)

        # As slope and acceleration spike, risk score must rise significantly
        self.assertGreater(reports[-1].risk_score, reports[0].risk_score)
        # Tilt anomaly score should be high due to rapid slope
        self.assertGreater(reports[-1].sensor_scores["tilt_deg"], 0.6)

    def test_extreme_critical_event(self):
        report = self.pipeline.predict_reading(
            "Node02",
            {
                "tilt_deg": 3500.0,
                "displacement_mm": 5000.0,
                "strain_microstrain": 40000.0,
                "vibration_mms": 1200.0
            },
            update_buffer=False
        )
        self.assertEqual(report.risk_band, BAND_CRITICAL)
        self.assertGreaterEqual(report.risk_score, 76.0)
        self.assertEqual(report.status_color, "#EF4444")
        self.assertIn("CRITICAL", report.summary)

    def test_fallback_for_unknown_node(self):
        # Node "Node99" was not in training data
        report = self.pipeline.predict_reading(
            "Node99",
            {
                "tilt_deg": 0.5,
                "displacement_mm": 1.2,
                "strain_microstrain": 22.0,
                "vibration_mms": 0.9
            },
            update_buffer=True
        )
        self.assertIsNotNone(report)
        self.assertIn(report.risk_band, [BAND_NORMAL, BAND_WATCH])

    def test_save_and_load(self):
        test_path = "models/test_model_temp.joblib"
        self.pipeline.save(test_path)
        self.assertTrue(os.path.exists(test_path))

        loaded = SubsidenceSensorFusion.load(test_path)
        self.assertEqual(len(loaded.node_models), len(self.pipeline.node_models))

        # Test inference parity
        rep_orig = self.pipeline.predict_reading("Node01", {"tilt_deg": 0.3, "displacement_mm": 1.5, "strain_microstrain": 28.0, "vibration_mms": 1.0}, update_buffer=False)
        rep_loaded = loaded.predict_reading("Node01", {"tilt_deg": 0.3, "displacement_mm": 1.5, "strain_microstrain": 28.0, "vibration_mms": 1.0}, update_buffer=False)
        self.assertAlmostEqual(rep_orig.risk_score, rep_loaded.risk_score, places=2)

        if os.path.exists(test_path):
            os.remove(test_path)


if __name__ == "__main__":
    unittest.main()
