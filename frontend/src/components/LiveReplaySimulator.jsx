import React, { useState, useEffect, useRef } from 'react';
import SpeedometerGauge from './SpeedometerGauge';
import { Play, Pause, SkipForward, RotateCcw, AlertTriangle, Radio, ShieldAlert } from 'lucide-react';

export default function LiveReplaySimulator({ activeNode = 'Node01' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [historyData, setHistoryData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const timerRef = useRef(null);

  // Fetch full history data once
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/history?node_id=${activeNode}&start_day=1&end_day=365`);
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data);
        }
      } catch (e) {
        console.error('Error fetching stream data:', e);
      }
    }
    loadData();
    setCurrentDay(1);
    setAlerts([]);
    setIsPlaying(false);
  }, [activeNode]);

  // Current active record
  const currentRecord = historyData.find(d => d.day === currentDay) || historyData[0] || {
    day: 1,
    tilt_deg: 0.1,
    displacement_mm: 0.5,
    strain_microstrain: 50,
    vibration_mms: 0.05,
    predicted_risk_score: 16.5,
    predicted_risk_band: 'NORMAL'
  };

  // Replay interval loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, 1000 / speed);
      timerRef.current = setInterval(() => {
        setCurrentDay(prev => {
          if (prev >= 365) {
            setIsPlaying(false);
            return 365;
          }
          const nextDay = prev + 1;
          const rec = historyData.find(d => d.day === nextDay);
          if (rec && (rec.predicted_risk_band === 'WARNING' || rec.predicted_risk_band === 'CRITICAL' || rec.predicted_risk_band === 'WATCH')) {
            setAlerts(oldAlerts => [
              {
                id: `${nextDay}-${Date.now()}`,
                day: nextDay,
                band: rec.predicted_risk_band,
                score: rec.predicted_risk_score,
                tilt: rec.tilt_deg,
                strain: rec.strain_microstrain,
                time: new Date().toLocaleTimeString()
              },
              ...oldAlerts.slice(0, 40)
            ]);
          }
          return nextDay;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, historyData]);

  const stepForward = () => {
    if (currentDay < 365) {
      setCurrentDay(prev => prev + 1);
    }
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentDay(1);
    setAlerts([]);
  };

  const getStatusColor = (band) => {
    switch (band) {
      case 'CRITICAL': return 'var(--lime)';
      case 'WARNING': return 'var(--orange)';
      case 'WATCH': return 'var(--orange)';
      default: return 'var(--cyan)';
    }
  };

  const statusColor = getStatusColor(currentRecord.predicted_risk_band);

  return (
    <div>
      {/* Playback Control Bar */}
      <div className="glass-card" style={{
        padding: '16px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Playback action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? 'linear-gradient(135deg, var(--orange) 0%, var(--orange) 100%)' : 'linear-gradient(135deg, var(--cyan) 0%, var(--cyan) 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              color: 'var(--text)',
              fontWeight: '800',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isPlaying ? '0 0 16px color-mix(in srgb, var(--orange) 40%, transparent)' : '0 0 16px color-mix(in srgb, var(--cyan) 40%, transparent)'
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'PAUSE STREAM' : 'START REPLAY'}</span>
          </button>

          <button
            onClick={stepForward}
            disabled={isPlaying || currentDay >= 365}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <SkipForward size={16} />
            <span>STEP (+1)</span>
          </button>

          <button
            onClick={resetSimulation}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={16} />
            <span>RESET</span>
          </button>
        </div>

        {/* Speed multiplier selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '700' }}>SPEED:</span>
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                background: speed === s ? 'var(--cyan)' : 'var(--panel)',
                color: speed === s ? 'var(--bg)' : 'var(--text)',
                border: speed === s ? '1px solid var(--cyan)' : '1px solid var(--line)',
                borderRadius: '6px',
                padding: '5px 12px',
                fontWeight: '800',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Current Day / Progress pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid var(--line)'
        }}>
          <Radio size={16} color={isPlaying ? 'var(--cyan)' : 'var(--muted)'} className={isPlaying ? 'pulse-dot' : ''} />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Simulation Timeline:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--cyan)', fontFamily: 'Rajdhani, monospace' }}>
              Day {currentDay} / 365
            </div>
          </div>
        </div>
      </div>

      {/* Live Stream Dual Display: Active Speedometers + Live Alert Stream */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* Left: Real-Time Stream Status & Gauges */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '10px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
              Live Telemetry Stream • {activeNode}
            </h3>
            <span style={{
              background: `${statusColor}22`,
              border: `1px solid ${statusColor}`,
              color: statusColor,
              padding: '3px 10px',
              borderRadius: '999px',
              fontWeight: '800',
              fontSize: '0.75rem'
            }}>
              {currentRecord.predicted_risk_band}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <SpeedometerGauge
              label="Streaming Risk"
              value={currentRecord.predicted_risk_score}
              min={0}
              max={100}
              unit="Risk (0-100)"
              color={statusColor}
              statusDot={statusColor}
              size={160}
            />
            <SpeedometerGauge
              label="Tilt (°)"
              value={currentRecord.tilt_deg}
              min={0}
              max={10}
              unit="deg"
              color="var(--cyan)"
              size={160}
            />
            <SpeedometerGauge
              label="Displacement (mm)"
              value={currentRecord.displacement_mm}
              min={0}
              max={60}
              unit="mm"
              color="var(--orange)"
              size={160}
            />
            <SpeedometerGauge
              label="Strain (µε)"
              value={currentRecord.strain_microstrain}
              min={0}
              max={2000}
              unit="µε"
              color="var(--cyan)"
              size={160}
            />
          </div>

          {/* Real-time telemetry values bar */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Tilt</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--cyan)', fontFamily: 'monospace' }}>
                {currentRecord.tilt_deg?.toFixed(2)}°
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Disp</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--orange)', fontFamily: 'monospace' }}>
                {currentRecord.displacement_mm?.toFixed(1)} mm
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Strain</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--cyan)', fontFamily: 'monospace' }}>
                {currentRecord.strain_microstrain?.toFixed(0)} µε
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Vib</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--violet)', fontFamily: 'monospace' }}>
                {currentRecord.vibration_mms?.toFixed(2)} mm/s
              </div>
            </div>
          </div>
        </div>

        {/* Right: High-Density Live Alert Log (Matching Image 4 - Problem / Alarm Logs) */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="var(--orange)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
                Live Early-Warning Event Stream
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {alerts.length} Events Logged
            </span>
          </div>

          <div style={{
            flexGrow: 1,
            maxHeight: '380px',
            overflowY: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px'
          }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Telemetry stable. No anomalous threshold exceedances recorded yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--panel)', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time / Day</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Severity Band</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Risk Score</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Trigger Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, idx) => (
                    <tr
                      key={a.id || idx}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: a.band === 'CRITICAL' ? 'color-mix(in srgb, var(--lime) 10%, transparent)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--text)', fontFamily: 'monospace' }}>
                        Day {a.day} ({a.time})
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          background: `${getStatusColor(a.band)}22`,
                          color: getStatusColor(a.band),
                          border: `1px solid ${getStatusColor(a.band)}`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '800',
                          fontSize: '0.7rem'
                        }}>
                          {a.band}
                        </span>
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        fontWeight: '800',
                        color: getStatusColor(a.band)
                      }}>
                        {a.score?.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>
                        {a.strain > 500 ? `Strain (${a.strain.toFixed(0)}µε)` : `Tilt (${a.tilt.toFixed(2)}°)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
