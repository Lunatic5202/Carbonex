import React, { useState, useEffect } from 'react';
import SpeedometerGauge from './SpeedometerGauge';
import Reveal from './Reveal';
import {
  Cpu,
  Radio,
  Wifi,
  Battery,
  Thermometer,
  Compass,
  Terminal,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  HardHat
} from 'lucide-react';

const RISK_BANDS = [
  { from: 0, to: 25, color: 'var(--cyan)' },
  { from: 25, to: 50, color: 'var(--orange)' },
  { from: 50, to: 75, color: 'var(--orange)' },
  { from: 75, to: 100, color: 'var(--lime)' }
];

export default function RealTimePredictor({ activeNode = 'CarboNex Data Node' }) {
  // Real-time live node telemetry from ESP32 / LoRa SX1278 hardware
  const [liveNodeData, setLiveNodeData] = useState({
    node_id: 'CarboNex Data Node',
    seq: 0,
    tilt_x: 120,
    tilt_y: 65,
    tilt_deg: 0.137,
    temp: 28,
    batt: 95,
    vib: 0.07,
    crack: 0.75,
    rssi: -65,
    displacement_mm: 0.75,
    strain_microstrain: 62.0,
    vibration_mms: 0.07,
    status: 'online',
    received_at: null,
    source: '127.0.0.1',
    packets_received: 1
  });

  const [latestPacket, setLatestPacket] = useState(null);
  const [showRawPacket, setShowRawPacket] = useState(false);
  const [lastPacketAgo, setLastPacketAgo] = useState('Standby');
  const [loading, setLoading] = useState(false);

  // Live sensor readings feeding the speedometers and inference engine
  const [readings, setReadings] = useState({
    tilt_deg: 0.137,
    displacement_mm: 0.75,
    strain_microstrain: 62.0,
    vibration_mms: 0.07
  });

  // Real-time model prediction response
  const [prediction, setPrediction] = useState({
    risk_score: 18.2,
    risk_band: 'NORMAL',
    status_color: 'var(--cyan)',
    primary_driver: 'Nominal Baseline',
    driver_contribution_pct: 0.0,
    summary: 'CarboNex Data Node is operating within nominal baseline parameters. All sensor channels show stable background telemetry.',
    recommendation: 'Standard automated monitoring. No immediate maintenance intervention required.',
    sensor_scores: { tilt_deg: 0.02, displacement_mm: 0.01, strain_microstrain: 0.03, vibration_mms: 0.01 },
    sensor_trends: {}
  });

  // Continuously poll real-time telemetry from ESP32 / LoRa backend
  useEffect(() => {
    let isMounted = true;

    async function fetchRealTimeFeed() {
      try {
        const [nodesRes, latestRes] = await Promise.all([
          fetch('/api/live-nodes'),
          fetch('/latest')
        ]);

        if (nodesRes.ok && isMounted) {
          const data = await nodesRes.json();
          if (data.nodes && data.nodes.length > 0) {
            const node = data.nodes[0];
            setLiveNodeData(node);
            setReadings({
              tilt_deg: Number(node.tilt_deg || 0.14),
              displacement_mm: Number(node.displacement_mm || 0.75),
              strain_microstrain: Number(node.strain_microstrain || 62.0),
              vibration_mms: Number(node.vibration_mms || 0.07)
            });

            if (node.received_at) {
              const diffMs = Date.now() - new Date(node.received_at).getTime();
              const diffSec = Math.max(0, Math.floor(diffMs / 1000));
              setLastPacketAgo(diffSec < 3 ? 'Just now' : `${diffSec}s ago`);
            }
          }
        }

        if (latestRes.ok && isMounted) {
          const packet = await latestRes.json();
          if (packet && packet.payload) {
            setLatestPacket(packet);
          }
        }
      } catch (err) {
        console.warn('Real-time telemetry poll error:', err);
      }
    }

    fetchRealTimeFeed();
    const interval = setInterval(fetchRealTimeFeed, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch real-time AI risk prediction when readings update
  useEffect(() => {
    let isMounted = true;
    async function runPrediction() {
      setLoading(true);
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: 'CarboNex Data Node',
            readings: readings
          })
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setPrediction(data);
        }
      } catch (err) {
        console.error('Error calling /api/predict:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    runPrediction();
    return () => {
      isMounted = false;
    };
  }, [readings]);

  return (
    <div>
      {/* REAL-TIME TELEMETRY STREAM HEADER */}
      <div className="glass-card" style={{
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--panel) 90%, transparent) 0%, color-mix(in srgb, var(--bg) 95%, transparent) 100%)',
        border: '1px solid var(--line)'
      }}>
        {/* Node Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'color-mix(in srgb, var(--cyan) 15%, transparent)',
            border: '1px solid var(--cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan)'
          }}>
            <HardHat size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Field Monitoring Point
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
              CarboNex Data Node • Panel 7 Extraction Face
            </h2>
          </div>
        </div>

        {/* Real-Time Uplink Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--lime)'
          }}>
            <span className="pulse-dot" style={{ backgroundColor: 'var(--lime)' }} />
            <span>LoRa Uplink: Real-Time Active</span>
            <span style={{ color: 'var(--muted)', fontWeight: '400' }}>• #{liveNodeData.seq || 0}</span>
            <span style={{ color: 'var(--muted)', fontWeight: '400' }}>• {lastPacketAgo}</span>
          </div>
          {loading && (
            <span style={{ fontSize: '12px', color: 'var(--cyan)', fontWeight: '600' }}>
              Inferring...
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: ROW OF 6 SPEEDOMETER GAUGES */}
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
              REAL-TIME GEOTECHNICAL SPEEDOMETERS & TELEMETRY GAUGES
            </h2>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Hardware: <strong style={{ color: 'var(--cyan)' }}>ESP32 + LoRa SX1278</strong> • 3-Layer Subsidence Sensor Fusion
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

          {/* Gauge 6: Anomaly Load / Confidence */}
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

      {/* SECTION 2: LIVE HARDWARE TELEMETRY & DIAGNOSTIC CARD */}
      <Reveal delay={0.08} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px'
      }}>
        {/* Left Column: Live Hardware Node Statistics */}
        <div className="glass-card" style={{ padding: '24px' }}>
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
              <Radio size={20} color="var(--cyan)" />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
                CarboNex Data Node • Live Hardware Statistics
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-dot" style={{ backgroundColor: 'var(--lime)' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--lime)' }}>
                LORA LINK ONLINE
              </span>
            </div>
          </div>

          {/* Hardware Identifier & Uplink Strip */}
          <div style={{
            background: 'color-mix(in srgb, var(--panel) 80%, transparent)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hardware Node Specification
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--cyan)', marginTop: '2px' }}>
                ESP32 + LoRa SX1278 / MPU6050 + Strain Gauge
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Packet Seq</span>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>#{liveNodeData.seq || 0}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Uplink IP</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'monospace' }}>{liveNodeData.source || '127.0.0.1'}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Last Packet</span>
                <span style={{ fontSize: '12px', color: 'var(--lime)', fontWeight: '600' }}>{lastPacketAgo}</span>
              </div>
            </div>
          </div>

          {/* 4-Stat Sensor Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '18px'
          }}>
            {/* Stat 1: Kalman Tilt X & Y */}
            <div style={{
              background: 'color-mix(in srgb, var(--panel) 60%, transparent)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan)', marginBottom: '4px' }}>
                <Compass size={16} />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Kalman Dual-Axis Tilt</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>
                {readings.tilt_deg.toFixed(3)}°
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Tilt X: <strong style={{ color: 'var(--cyan)' }}>{liveNodeData.tilt_x || 0} mDeg</strong> ({((liveNodeData.tilt_x || 0)/1000).toFixed(3)}°)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Tilt Y: <strong style={{ color: 'var(--cyan)' }}>{liveNodeData.tilt_y || 0} mDeg</strong> ({((liveNodeData.tilt_y || 0)/1000).toFixed(3)}°)
              </div>
            </div>

            {/* Stat 2: Internal Temperature */}
            <div style={{
              background: 'color-mix(in srgb, var(--panel) 60%, transparent)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--orange)', marginBottom: '4px' }}>
                <Thermometer size={16} />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>IMU Temperature</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>
                {liveNodeData.temp || 28} °C
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                MPU6050 Onboard Thermal Sensor
              </div>
              <div style={{ fontSize: '11px', color: 'var(--lime)', marginTop: '2px' }}>
                ● Thermal drift nominal
              </div>
            </div>

            {/* Stat 3: Battery Level */}
            <div style={{
              background: 'color-mix(in srgb, var(--panel) 60%, transparent)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--lime)', marginBottom: '4px' }}>
                <Battery size={16} />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Battery Level</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>
                {liveNodeData.batt || 95} %
              </div>
              {/* Battery bar */}
              <div style={{
                height: '5px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, liveNodeData.batt || 95))}%`,
                  backgroundColor: (liveNodeData.batt || 95) > 30 ? 'var(--lime)' : 'var(--orange)',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Power: 3.7V Li-Ion / Regulated
              </div>
            </div>

            {/* Stat 4: Signal Strength (RSSI) */}
            <div style={{
              background: 'color-mix(in srgb, var(--panel) 60%, transparent)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan)', marginBottom: '4px' }}>
                <Wifi size={16} />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>LoRa Signal (RSSI)</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>
                {liveNodeData.rssi || -65} dBm
              </div>
              {/* Signal bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px', marginTop: '6px' }}>
                {[1, 2, 3, 4].map(bar => {
                  const rssiVal = liveNodeData.rssi || -65;
                  const active = (bar === 1 && rssiVal > -110) ||
                                 (bar === 2 && rssiVal > -95) ||
                                 (bar === 3 && rssiVal > -80) ||
                                 (bar === 4 && rssiVal > -65);
                  return (
                    <div
                      key={bar}
                      style={{
                        width: '6px',
                        height: `${bar * 3.5}px`,
                        backgroundColor: active ? 'var(--cyan)' : 'rgba(255,255,255,0.15)',
                        borderRadius: '1px'
                      }}
                    />
                  );
                })}
                <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>
                  {(liveNodeData.rssi || -65) > -70 ? 'Excellent' : (liveNodeData.rssi || -65) > -85 ? 'Good' : 'Fair'}
                </span>
              </div>
            </div>
          </div>

          {/* Auxiliary Physical Channels: Vibration & Crack */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '18px'
          }}>
            <div style={{
              background: 'color-mix(in srgb, var(--panel) 40%, transparent)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Dynamic Vibration:</span>
              <strong style={{ fontSize: '14px', color: 'var(--violet)' }}>{liveNodeData.vib || 0.07} mm/s</strong>
            </div>
            <div style={{
              background: 'color-mix(in srgb, var(--panel) 40%, transparent)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Extensometer Crack:</span>
              <strong style={{ fontSize: '14px', color: 'var(--orange)' }}>{liveNodeData.crack || 0.75} mm</strong>
            </div>
          </div>

          {/* Collapsible Raw LoRa Packet Inspector */}
          <div style={{
            background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setShowRawPacket(prev => !prev)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '10px 14px',
                color: 'var(--muted)',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} color="var(--cyan)" />
                <span>Raw Ingested Packet (POST /endpoint JSON)</span>
              </div>
              {showRawPacket ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showRawPacket && (
              <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid var(--line)' }}>
                <pre style={{
                  margin: '10px 0 0 0',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--cyan)',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '10px',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  maxHeight: '180px'
                }}>
                  {JSON.stringify(latestPacket || { node: liveNodeData }, null, 2)}
                </pre>
              </div>
            )}
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
                Real-Time AI Subsidence Diagnostics
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

          {/* Large Risk Banner */}
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
