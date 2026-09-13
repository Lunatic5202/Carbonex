"""
Laser-Based Mine Wall Deformation & Discrepancy Data Generator
=============================================================
Models the physical interaction between:
  - Wall 2: Laser transmitter / light dispenser.
  - Wall 1: Optical position sensor / photodiode receiver matrix.

Core State Logic:
-----------------
1. `current_offset` is persistent and carried from day to day (not reset).
2. Elastic (Normal) Behavior:
   - Daily vibration causes transient movement, but wall springs back elastically.
   - residual_offset_mm stays near 0.
   - returned_to_baseline = True.
   - days_unreturned_streak = 0.
   - Graph stays flat.
3. Plastic (Abnormal) Behavior:
   - Once fault activates, a fraction of vibration displacement becomes permanent.
   - Permanent offset accumulates day after day.
   - Creep growth accelerates over time (steepening curve).
   - returned_to_baseline = False.
   - days_unreturned_streak increments daily.
   - Laser beam shifts off sensor center, causing optical signal attenuation (signal_intensity_pct drops to 0%).
"""

import numpy as np
import pandas as pd


def generate_laser_wall_dataset(
    n_days=90,
    wall_pairs=None,
    seed=42,
    output_csv=None
):
    """
    Generate synthetic sensor telemetry for laser wall monitoring.
    """
    if wall_pairs is None:
        wall_pairs = {
            "WallPair01": {"fault_start_day": 41, "creep_rate": 0.45, "creep_growth": 0.015},
            "WallPair02": {"fault_start_day": 59, "creep_rate": 0.35, "creep_growth": 0.010},
            "WallPair03": {"fault_start_day": 43, "creep_rate": 0.38, "creep_growth": 0.012},
            "WallPair04": {"fault_start_day": 26, "creep_rate": 0.55, "creep_growth": 0.022},
        }

    rng = np.random.RandomState(seed)
    records = []

    for pair_id, config in wall_pairs.items():
        fault_day = config.get("fault_start_day", 45)
        base_creep = config.get("creep_rate", 0.4)
        growth_rate = config.get("creep_growth", 0.015)

        current_offset = 0.0
        streak = 0

        for day in range(1, n_days + 1):
            # Vibration magnitude: typical underground mine vibration (blasting / equipment)
            vib_mag = round(float(rng.gamma(shape=2.5, scale=0.5)), 4)
            vib_mag = max(0.02, min(4.5, vib_mag))

            is_abnormal = day >= fault_day

            if not is_abnormal:
                # Normal elastic behavior: Wall oscillates and springs back
                elastic_rebound = rng.normal(0.0, 0.06)
                pre_vib = round(float(rng.normal(0.0, 0.08)), 4)
                post_vib = round(float(elastic_rebound), 4)
                residual = post_vib
                current_offset = residual
                returned = True
                streak = 0
            else:
                # Plastic deformation: Non-recovering wall displacement
                streak += 1
                days_active = day - fault_day
                effective_creep = base_creep + (days_active * growth_rate)
                plastic_slip = (vib_mag * 0.4) + (effective_creep * 0.8) + rng.normal(0.05, 0.08)
                plastic_slip = max(0.1, plastic_slip)

                pre_vib = round(float(current_offset + rng.normal(0, 0.03)), 4)
                current_offset += plastic_slip
                post_vib = round(float(current_offset), 4)
                residual = post_vib
                returned = False

            discrepancy = round(abs(residual), 4)

            # Laser beam optical sensor attenuation model (Wall 2 laser to Wall 1 sensor)
            # Sensor aperture radius = ~12 mm. Beam attenuation follows Gaussian falloff.
            if discrepancy < 0.5:
                signal_pct = round(float(rng.uniform(97.5, 99.9)), 2)
            else:
                # Signal decay as spot walks off receiver target
                decay = np.exp(-((discrepancy / 14.0) ** 2.2))
                raw_signal = 100.0 * decay + rng.normal(0.0, 0.8)
                if discrepancy > 24.0:
                    raw_signal = max(0.0, raw_signal - (discrepancy - 24.0) * 8.0)
                signal_pct = round(float(np.clip(raw_signal, 0.0, 100.0)), 2)
                if signal_pct < 0.5:
                    signal_pct = 0.0

            # Determine engineering status reference
            if discrepancy < 1.5 and streak < 3:
                status = "NORMAL"
            elif discrepancy < 3.0 or streak < 6:
                status = "WATCH"
            elif discrepancy < 8.0:
                status = "WARNING"
            else:
                status = "CRITICAL"

            records.append({
                "pair_id": pair_id,
                "day": day,
                "baseline_position_mm": 0.0,
                "vibration_magnitude_mm": vib_mag,
                "pre_vibration_position_mm": pre_vib,
                "post_vibration_position_mm": post_vib,
                "residual_offset_mm": residual,
                "returned_to_baseline": returned,
                "days_unreturned_streak": streak,
                "discrepancy_mm": discrepancy,
                "signal_intensity_pct": signal_pct,
                "status_reference": status
            })

    df = pd.DataFrame(records)
    if output_csv:
        df.to_csv(output_csv, index=False)
        print(f"Saved {len(df)} rows to {output_csv}")
    return df


if __name__ == "__main__":
    df_sim = generate_laser_wall_dataset(n_days=90, output_csv="simulated_laser_wall_sensor_data.csv")
    print(df_sim.head(10))
