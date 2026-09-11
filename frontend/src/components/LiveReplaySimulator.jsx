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
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f97316';
      case 'WATCH': return '#f59e0b';
      default: return '#10b981';
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
              background: isPlaying ? 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isPlaying ? '0 0 16px rgba(249, 115, 22, 0.4)' : '0 0 16px rgba(16, 185, 129, 0.4)'
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'PAUSE STREAM' : 'START REPLAY'}</span>
          </button>

          <button
            onClick={stepForward}
            disabled={isPlaying || currentDay >= 365}
            style={{
              background: '#141d30',
              border: '1px solid #283654',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#cbd5e1',
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
              background: '#141d30',
              border: '1px solid #283654',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#cbd5e1',
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
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>SPEED:</span>
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                background: speed === s ? '#00f0ff' : '#141d30',
                color: speed === s ? '#080b11' : '#cbd5e1',
                border: speed === s ? '1px solid #00f0ff' : '1px solid #283654',
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
          background: '#0a0e1a',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #1e293b'
        }}>
          <Radio size={16} color={isPlaying ? '#10b981' : '#64748b'} className={isPlaying ? 'pulse-dot' : ''} />
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>Simulation Timeline:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#00f0ff', fontFamily: 'Rajdhani, monospace' }}>
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
            borderBottom: '1px solid #1e293b',
            paddingBottom: '10px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
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
              color="#00f0ff"
              size={160}
            />
            <SpeedometerGauge
              label="Displacement (mm)"
              value={currentRecord.displacement_mm}
              min={0}
              max={60}
              unit="mm"
              color="#f59e0b"
              size={160}
            />
            <SpeedometerGauge
              label="Strain (µε)"
              value={currentRecord.strain_microstrain}
              min={0}
              max={2000}
              unit="µε"
              color="#10b981"
              size={160}
            />
          </div>

          {/* Real-time telemetry values bar */}
          <div style={{
            background: '#0a0e1a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Tilt</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#00f0ff', fontFamily: 'monospace' }}>
                {currentRecord.tilt_deg?.toFixed(2)}°
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Disp</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'monospace' }}>
                {currentRecord.displacement_mm?.toFixed(1)} mm
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Strain</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                {currentRecord.strain_microstrain?.toFixed(0)} µε
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Vib</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ec4899', fontFamily: 'monospace' }}>
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
            borderBottom: '1px solid #1e293b',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#f97316" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Live Early-Warning Event Stream
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {alerts.length} Events Logged
            </span>
          </div>

          <div style={{
            flexGrow: 1,
            maxHeight: '380px',
            overflowY: 'auto',
            background: '#0a0e1a',
            border: '1px solid #1e293b',
            borderRadius: '8px'
          }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '0.85rem' }}>
                Telemetry stable. No anomalous threshold exceedances recorded yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#111726', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
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
                        borderBottom: '1px solid #161e32',
                        background: a.band === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
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
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
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
