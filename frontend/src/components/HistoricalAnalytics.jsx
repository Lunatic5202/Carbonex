import React, { useState, useEffect } from 'react';
import { LineChart, Calendar, Eye, Activity, AlertOctagon, TrendingUp } from 'lucide-react';

export default function HistoricalAnalytics({ activeNode = 'Node01' }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayRange, setDayRange] = useState([1, 365]);
  const [selectedSensor, setSelectedSensor] = useState('all');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [activeNode]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?node_id=${activeNode}&start_day=1&end_day=365`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by day range
  const filteredData = historyData.filter(
    d => d.day >= dayRange[0] && d.day <= dayRange[1]
  );

  // Summary Metrics
  const maxRisk = filteredData.length > 0 
    ? Math.max(...filteredData.map(d => d.predicted_risk_score || 0)) 
    : 0;
  const criticalCount = filteredData.filter(d => d.predicted_risk_band === 'CRITICAL').length;
  const warningCount = filteredData.filter(d => d.predicted_risk_band === 'WARNING').length;
  const watchCount = filteredData.filter(d => d.predicted_risk_band === 'WATCH').length;

  // SVG Chart rendering helper
  const renderLineChart = (data, valueKey, color, height = 180, maxY = null, hasBands = false) => {
    if (!data || data.length === 0) return null;

    const width = 800;
    const padding = { top: 20, right: 30, bottom: 30, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const calculatedMaxY = maxY || Math.max(...data.map(d => d[valueKey] || 0), 1) * 1.15;
    const minY = 0;

    const getX = (index) => padding.left + (index / (data.length - 1 || 1)) * chartW;
    const getY = (val) => padding.top + chartH - ((val - minY) / (calculatedMaxY - minY || 1)) * chartH;

    // Generate path
    const points = data.map((d, i) => `${getX(i)},${getY(d[valueKey] || 0)}`).join(' ');

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: `${height}px`, overflow: 'visible' }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={`grad-${valueKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
          <filter id={`glow-${valueKey}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 4 Risk Zone Bands if enabled (Normal, Watch, Warning, Critical) */}
        {hasBands && (
          <g opacity="0.12">
            {/* Normal: 0-25 */}
            <rect x={padding.left} y={getY(25)} width={chartW} height={getY(0) - getY(25)} fill="var(--cyan)" />
            {/* Watch: 26-50 */}
            <rect x={padding.left} y={getY(50)} width={chartW} height={getY(25) - getY(50)} fill="var(--orange)" />
            {/* Warning: 51-75 */}
            <rect x={padding.left} y={getY(75)} width={chartW} height={getY(50) - getY(75)} fill="var(--orange)" />
            {/* Critical: 76-100 */}
            <rect x={padding.left} y={getY(100)} width={chartW} height={getY(75) - getY(100)} fill="var(--lime)" />
          </g>
        )}

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
          const yVal = minY + ratio * (calculatedMaxY - minY);
          const yPos = getY(yVal);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={padding.left + chartW}
                y2={yPos}
                stroke="var(--line)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text x={padding.left - 8} y={yPos + 4} fill="var(--muted)" fontSize="10" textAnchor="end">
                {yVal.toFixed(yVal > 10 ? 0 : 1)}
              </text>
            </g>
          );
        })}

        {/* Shaded Area under curve */}
        <polygon
          points={`${padding.left},${padding.top + chartH} ${points} ${padding.left + chartW},${padding.top + chartH}`}
          fill={`url(#grad-${valueKey})`}
        />

        {/* Glowing Line Stroke */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          points={points}
          filter={`url(#glow-${valueKey})`}
        />

        {/* Invisible hit targets for tooltip */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d[valueKey] || 0)}
            r="6"
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredPoint({ x: getX(i), y: getY(d[valueKey] || 0), data: d })}
          />
        ))}

        {/* Active hover indicator */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={padding.top + chartH}
              stroke="var(--cyan)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="var(--text)" stroke={color} strokeWidth="2" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div>
      {/* KPI Highlight Strip for Historical Record */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--cyan)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            Historical Peak Risk
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: maxRisk > 75 ? 'var(--lime)' : maxRisk > 50 ? 'var(--orange)' : 'var(--cyan)', fontFamily: 'Rajdhani, sans-serif' }}>
            {maxRisk.toFixed(1)} / 100
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            Across {filteredData.length} observation days
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--lime)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            Critical Hazards
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: criticalCount > 0 ? 'var(--lime)' : 'var(--cyan)', fontFamily: 'Rajdhani, sans-serif' }}>
            {criticalCount} Days
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            Risk Score &gt; 75.0 (Emergency)
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--orange)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            Warning Progression
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--orange)', fontFamily: 'Rajdhani, sans-serif' }}>
            {warningCount} Days
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            Deformation Acceleration &gt; 50.0
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--orange)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            Watch Drift
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--orange)', fontFamily: 'Rajdhani, sans-serif' }}>
            {watchCount} Days
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            Early Telemetry Deviation
          </div>
        </div>
      </div>

      {/* Main Historical Visualizer (Matching Image 2 - Dark Glowing Line Chart) */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
        {/* Controls Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
              Calibrated Subsidence Risk Progression (365 Days)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '2px 0 0 0' }}>
              4-Tier Domain Zones: Normal (0-25), Watch (26-50), Warning (51-75), Critical (76-100)
            </p>
          </div>

          {/* Day range scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>FILTER DAYS:</span>
            <input
              type="range"
              min="1"
              max="365"
              value={dayRange[1]}
              onChange={e => setDayRange([1, parseInt(e.target.value)])}
              style={{ width: '160px' }}
            />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--cyan)',
              fontSize: '0.8rem',
              fontWeight: '700',
              background: 'var(--bg)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--line)'
            }}>
              Day 1–{dayRange[1]}
            </span>
          </div>
        </div>

        {/* Hover details pill */}
        {hoveredPoint && (
          <div style={{
            background: 'color-mix(in srgb, var(--panel) 95%, transparent)',
            border: '1px solid var(--cyan)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '10px',
            display: 'flex',
            gap: '16px',
            fontSize: '0.8rem',
            boxShadow: '0 0 16px color-mix(in srgb, var(--cyan) 20%, transparent)'
          }}>
            <span>Day: <strong style={{ color: 'var(--cyan)' }}>{hoveredPoint.data.day}</strong></span>
            <span>Risk Score: <strong style={{ color: hoveredPoint.data.predicted_risk_score > 75 ? 'var(--lime)' : hoveredPoint.data.predicted_risk_score > 50 ? 'var(--orange)' : 'var(--cyan)' }}>
              {hoveredPoint.data.predicted_risk_score?.toFixed(1)}
            </strong></span>
            <span>Band: <strong style={{ color: 'var(--text)' }}>{hoveredPoint.data.predicted_risk_band}</strong></span>
            <span>Tilt: <strong>{hoveredPoint.data.tilt_deg?.toFixed(2)}°</strong></span>
            <span>Strain: <strong>{hoveredPoint.data.strain_microstrain?.toFixed(0)} µε</strong></span>
          </div>
        )}

        {/* Primary Chart: Risk Score with Shaded Zone Bands */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            Loading historical telemetry...
          </div>
        ) : (
          renderLineChart(filteredData, 'predicted_risk_score', 'var(--cyan)', 240, 100, true)
        )}
      </div>

      {/* Multi-Channel Synchronized Sensor Telemetry Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '20px'
      }}>
        {/* Tilt Chart */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cyan)' }}>
              Angular Tilt Telemetry (° deg)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Weight: 30%</span>
          </div>
          {renderLineChart(filteredData, 'tilt_deg', 'var(--cyan)', 140)}
        </div>

        {/* Displacement Chart */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--orange)' }}>
              Linear Displacement Telemetry (mm)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Weight: 25%</span>
          </div>
          {renderLineChart(filteredData, 'displacement_mm', 'var(--orange)', 140)}
        </div>

        {/* Strain Chart */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cyan)' }}>
              Structural Strain Telemetry (µε)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Weight: 30%</span>
          </div>
          {renderLineChart(filteredData, 'strain_microstrain', 'var(--cyan)', 140)}
        </div>

        {/* Vibration Chart */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--violet)' }}>
              Vibration Velocity Telemetry (mm/s)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Weight: 15%</span>
          </div>
          {renderLineChart(filteredData, 'vibration_mms', 'var(--violet)', 140)}
        </div>
      </div>
    </div>
  );
}
