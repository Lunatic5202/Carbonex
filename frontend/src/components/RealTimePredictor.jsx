import React, { useState, useEffect } from 'react';
import SpeedometerGauge from './SpeedometerGauge';
import Reveal from './Reveal';
import { Slider } from './ui/slider';
import { Sliders, Cpu } from 'lucide-react';

const RISK_BANDS = [
  { from: 0, to: 25, color: 'var(--cyan)' },
  { from: 25, to: 50, color: 'var(--orange)' },
  { from: 50, to: 75, color: 'var(--orange)' },
  { from: 75, to: 100, color: 'var(--lime)' }
];

export default function RealTimePredictor({ activeNode = 'Node01' }) {
  // Sensor input state
  const [readings, setReadings] = useState({
    tilt_deg: 0.15,
    displacement_mm: 0.8,
    strain_microstrain: 65.0,
    vibration_mms: 0.08
  });

  // Model prediction response state
  const [prediction, setPrediction] = useState({
    risk_score: 18.2,
    risk_band: 'NORMAL',
    status_color: 'var(--cyan)',
    primary_driver: 'Nominal Baseline',
    driver_contribution_pct: 0.0,
    summary: 'Node is operating within nominal baseline parameters. All sensor channels show stable background telemetry.',
    recommendation: 'Standard automated monitoring. No immediate maintenance intervention required.',
    sensor_scores: { tilt_deg: 0.02, displacement_mm: 0.01, strain_microstrain: 0.03, vibration_mms: 0.01 },
    sensor_trends: {}
  });

  const [loading, setLoading] = useState(false);

  // Preset scenarios
  const presets = [
    {
      id: 'nominal',
      name: 'Nominal Baseline',
      color: 'var(--cyan)',
      values: { tilt_deg: 0.12, displacement_mm: 0.6, strain_microstrain: 48.0, vibration_mms: 0.05 }
    },
    {
      id: 'watch',
      name: 'Early Watch (Tilt Drift)',
      color: 'var(--orange)',
      values: { tilt_deg: 1.85, displacement_mm: 4.2, strain_microstrain: 280.0, vibration_mms: 0.45 }
    },
    {
      id: 'warning',
      name: 'Warning (Strain Accel)',
      color: 'var(--orange)',
      values: { tilt_deg: 4.2, displacement_mm: 16.5, strain_microstrain: 720.0, vibration_mms: 1.8 }
    },
    {
      id: 'critical',
      name: 'Critical Hazard',
      color: 'var(--lime)',
      values: { tilt_deg: 8.5, displacement_mm: 52.0, strain_microstrain: 1650.0, vibration_mms: 6.2 }
    }
  ];

  // Fetch prediction from backend
  const runPrediction = async (currentReadings) => {
    setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: activeNode,
          readings: currentReadings
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      }
    } catch (err) {
      console.error('Error calling /api/predict:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run prediction when readings or node change
  useEffect(() => {
    runPrediction(readings);
  }, [readings, activeNode]);

  const handleSliderChange = (sensor, val) => {
    setReadings(prev => ({
      ...prev,
      [sensor]: parseFloat(val)
    }));
  };

  const applyPreset = (presetValues) => {
    setReadings(presetValues);
  };

  return (
    <div>
      {/* SECTION 1: ROW OF 6 SPEEDOMETER GAUGES (Matching Image 2 - Power Generation) */}
      <Reveal className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-dot" style={{ backgroundColor: prediction.status_color }} />
            <h2 style={{
              fontSize: '17px',
              fontWeight: '800',
              color: 'var(--text)',
              letterSpacing: '0.04em',
              margin: 0
            }}>
              LIVE GEOTECHNICAL SPEEDOMETERS & TELEMETRY GAUGES
            </h2>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Node: <strong style={{ color: 'var(--cyan)' }}>{activeNode}</strong> • 3-Layer Isolation Forest & Sensor Fusion
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px'
        }}>
          {/* Gauge 1: Composite Calibrated Risk Score */}
          <SpeedometerGauge
            label="Composite Risk"
            value={prediction.risk_score}
            min={0}
            max={100}
            unit="Risk (0-100)"
            color={prediction.status_color}
            statusDot={prediction.status_color}
            riskBand={prediction.risk_band}
            bands={RISK_BANDS}
            size={180}
          />

          {/* Gauge 2: Angular Tilt */}
          <SpeedometerGauge
            label="Angular Tilt"
            value={readings.tilt_deg}
            min={0}
            max={10}
            unit="Degrees (°)"
            color="var(--cyan)"
            statusDot="var(--cyan)"
            size={180}
          />

          {/* Gauge 3: Linear Displacement */}
          <SpeedometerGauge
            label="Displacement"
            value={readings.displacement_mm}
            min={0}
            max={60}
            unit="Millimeters (mm)"
            color="var(--orange)"
            statusDot="var(--orange)"
            size={180}
          />

          {/* Gauge 4: Structural Strain */}
          <SpeedometerGauge
            label="Structural Strain"
            value={readings.strain_microstrain}
            min={0}
            max={2000}
            unit="Microstrain (µε)"
            color="var(--cyan)"
            statusDot="var(--cyan)"
            size={180}
          />

          {/* Gauge 5: Vibration Velocity */}
          <SpeedometerGauge
            label="Vibration"
            value={readings.vibration_mms}
            min={0}
            max={10}
            unit="Velocity (mm/s)"
            color="var(--violet)"
            statusDot="var(--violet)"
            size={180}
          />

          {/* Gauge 6: Anomaly Score / Confidence */}
          <SpeedometerGauge
            label="Anomaly Load"
            value={Math.round((prediction.risk_score - 15) / 0.85)}
            min={0}
            max={100}
            unit="Anomaly (%)"
            color="var(--violet)"
            statusDot="var(--violet)"
            size={180}
          />
        </div>
      </Reveal>

      {/* SECTION 2: INTERACTIVE SIMULATOR CONTROLS & DIAGNOSTIC CARD */}
      <Reveal delay={0.08} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px'
      }}>
        {/* Left Column: Sensor Input Sliders & Presets */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} color="var(--cyan)" />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
                Sensor Simulation & What-If Sliders
              </h3>
            </div>
            {loading && <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>Predicting...</span>}
          </div>

          {/* Preset Buttons (Matching Image 2 Charger/Output priority buttons) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '8px'
            }}>
              Quick Mine Scenarios:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.values)}
                  style={{
                    background: 'color-mix(in srgb, var(--panel) 80%, transparent)',
                    border: `1px solid ${p.color}66`,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = p.color;
                    e.currentTarget.style.boxShadow = `0 0 12px ${p.color}44`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = `${p.color}66`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '700', color: p.color }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    Click to load telemetry
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Slider 1: Angular Tilt */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  Angular Tilt (tilt_deg)
                </span>
                <span style={{ color: 'var(--cyan)', fontWeight: '700' }}>
                  {readings.tilt_deg.toFixed(2)} °
                </span>
              </div>
              <Slider min={0} max={10} step={0.05} value={[readings.tilt_deg]} onValueChange={value => handleSliderChange('tilt_deg', value[0])} aria-label="Angular tilt" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                <span>0.0° (Baseline)</span>
                <span>Weight: 30%</span>
                <span>10.0° (Hazard)</span>
              </div>
            </div>

            {/* Slider 2: Linear Displacement */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  Linear Displacement (displacement_mm)
                </span>
                <span style={{ color: 'var(--orange)', fontWeight: '700' }}>
                  {readings.displacement_mm.toFixed(1)} mm
                </span>
              </div>
              <Slider min={0} max={60} step={0.5} value={[readings.displacement_mm]} onValueChange={value => handleSliderChange('displacement_mm', value[0])} aria-label="Linear displacement" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                <span>0.0 mm</span>
                <span>Weight: 25%</span>
                <span>60.0 mm</span>
              </div>
            </div>

            {/* Slider 3: Structural Strain */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  Structural Strain (strain_microstrain)
                </span>
                <span style={{ color: 'var(--cyan)', fontWeight: '700' }}>
                  {readings.strain_microstrain.toFixed(0)} µε
                </span>
              </div>
              <Slider min={0} max={2000} step={10} value={[readings.strain_microstrain]} onValueChange={value => handleSliderChange('strain_microstrain', value[0])} aria-label="Structural strain" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                <span>0 µε</span>
                <span>Weight: 30%</span>
                <span>2000 µε</span>
              </div>
            </div>

            {/* Slider 4: Vibration Velocity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  Vibration Velocity (vibration_mms)
                </span>
                <span style={{ color: 'var(--violet)', fontWeight: '700' }}>
                  {readings.vibration_mms.toFixed(2)} mm/s
                </span>
              </div>
              <Slider min={0} max={10} step={0.05} value={[readings.vibration_mms]} onValueChange={value => handleSliderChange('vibration_mms', value[0])} aria-label="Vibration velocity" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                <span>0.0 mm/s</span>
                <span>Weight: 15%</span>
                <span>10.0 mm/s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Model Diagnostics & Recommended Action */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color={prediction.status_color} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
                Model Prediction & Geotechnical Diagnostics
              </h3>
            </div>
            <span style={{
              background: `${prediction.status_color}22`,
              border: `1px solid ${prediction.status_color}`,
              color: prediction.status_color,
              padding: '3px 10px',
              borderRadius: '999px',
              fontWeight: '800',
              fontSize: '12px'
            }}>
              {prediction.risk_band}
            </span>
          </div>

          {/* Large Risk Banner (Matching gui_desktop.py & Dash app) */}
          <div style={{
            background: `linear-gradient(135deg, ${prediction.status_color}18 0%, var(--bg) 100%)`,
            border: `1px solid ${prediction.status_color}66`,
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '18px',
            boxShadow: `0 8px 24px ${prediction.status_color}22`
          }}>
            <div style={{
              fontSize: '58px',
              fontWeight: '900',
              color: prediction.status_color,
              lineHeight: 1,
              textShadow: `0 0 20px ${prediction.status_color}88`
            }}>
              {prediction.risk_score.toFixed(1)}
            </div>
            <div>
              <div style={{
                fontSize: '20px',
                fontWeight: '800',
                color: prediction.status_color,
                letterSpacing: '0.04em'
              }}>
                {prediction.risk_band} STATUS
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '3px' }}>
                Primary Driver: <strong style={{ color: 'var(--text)' }}>{prediction.primary_driver}</strong>
                {prediction.driver_contribution_pct > 0 && ` (${prediction.driver_contribution_pct.toFixed(0)}% contribution)`}
              </div>
            </div>
          </div>

          {/* Geotechnical Assessment & Recommended Action */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '18px',
            flexGrow: 1
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Diagnostic Assessment:
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.45', marginBottom: '14px' }}>
              {prediction.summary}
            </p>

            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Recommended Engineering Action:
            </div>
            <p style={{
              fontSize: '14px',
              color: prediction.risk_band === 'CRITICAL' ? 'var(--lime)' : prediction.risk_band === 'WARNING' ? 'var(--orange)' : 'var(--cyan)',
              fontWeight: '700',
              lineHeight: '1.45'
            }}>
              {prediction.recommendation}
            </p>
          </div>

          {/* Individual Sensor Anomaly Breakdown Bars */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '14px 16px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Layer 1 Isolation Forest Anomaly Scores (0.0 - 1.0):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {Object.entries(prediction.sensor_scores || {}).map(([sensor, score]) => (
                <div key={sensor}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--muted)' }}>{sensor.split('_')[0]}</span>
                    <span style={{ color: score > 0.5 ? 'var(--orange)' : 'var(--cyan)', fontWeight: '700' }}>
                      {score.toFixed(3)}
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(score * 100, 100)}%`,
                      height: '100%',
                      background: score > 0.7 ? 'var(--lime)' : score > 0.4 ? 'var(--orange)' : 'var(--cyan)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
