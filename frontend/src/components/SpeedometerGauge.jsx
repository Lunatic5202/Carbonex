import React from 'react';

/**
 * Semi-Circular Glowing Speedometer Gauge
 * Direct aesthetic recreation of the Power Generation (Image 2) & Smart Mining (Image 1) meters.
 */
export default function SpeedometerGauge({
  value = 0,
  min = 0,
  max = 100,
  label = '',
  unit = '',
  color = 'var(--cyan)',
  trackColor = 'var(--panel-2)',
  size = 180,
  statusDot = null,
  showNeedle = true,
  riskBand = null
}) {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = (clampValue - min) / (max - min || 1);

  // SVG dimensions for 180-degree semi-circle
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;

  // Arc math: 180 degrees from -180° to 0° (or Math.PI to 2*Math.PI)
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength * (1 - percentage);

  // Needle angle: -180deg (at min) to 0deg (at max)
  const needleAngle = -180 + percentage * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius - 8;
  const needleX = cx + needleLength * Math.cos(needleRad);
  const needleY = cy + needleLength * Math.sin(needleRad);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 8px',
      position: 'relative'
    }}>
      {/* Top Header Label with optional status dot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {statusDot && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusDot,
              boxShadow: `0 0 8px ${statusDot}`,
              display: 'inline-block'
            }}
          />
        )}
        <span>{label}</span>
      </div>

      {/* Semi-circular gauge SVG */}
      <div style={{ position: 'relative', width: size, height: size / 2 + 28 }}>
        <svg width={size} height={size / 2 + 28} viewBox={`0 0 ${size} ${size / 2 + 28}`}>
          <defs>
            <filter id={`glow-${label.replace(/\s+/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background track arc (180 degrees) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active colored glowing arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#grad-${label.replace(/\s+/g, '')})`}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#glow-${label.replace(/\s+/g, '')})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />

          {/* Needle indicator */}
          {showNeedle && (
            <g>
              <line
                x1={cx}
                y1={cy}
                x2={needleX}
                y2={needleY}
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter={`url(#glow-${label.replace(/\s+/g, '')})`}
                style={{ transition: 'all 0.5s ease-out' }}
              />
              <circle cx={cx} cy={cy} r="4" fill="var(--text)" />
            </g>
          )}

          {/* Min and Max endpoint markers */}
          <text x={cx - radius + 2} y={cy + 18} fill="var(--muted)" fontSize="10" fontWeight="600" textAnchor="middle">
            {min}
          </text>
          <text x={cx + radius - 2} y={cy + 18} fill="var(--muted)" fontSize="10" fontWeight="600" textAnchor="middle">
            {max}
          </text>
        </svg>

        {/* Big centered digital readout */}
        <div style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: size > 160 ? '30px' : '24px',
            fontWeight: '800',
            color: color,
            lineHeight: '1.1',
            textShadow: `0 0 12px ${color}66`
          }}>
            {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(value > 10 ? 1 : 2)) : value}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--muted)',
            fontWeight: '600',
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            {unit}
          </div>
        </div>
      </div>

      {/* Risk Band Sub-pill if provided */}
      {riskBand && (
        <div style={{
          marginTop: '4px',
          padding: '2px 10px',
          borderRadius: '999px',
          backgroundColor: `${color}22`,
          border: `1px solid ${color}66`,
          color: color,
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '0.05em'
        }}>
          {riskBand}
        </div>
      )}
    </div>
  );
}
