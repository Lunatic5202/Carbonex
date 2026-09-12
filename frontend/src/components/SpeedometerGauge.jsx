import React, { useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Semi-Circular Glowing Speedometer Gauge
 * Revamped: risk-zone tick ring, tapered needle, animated arc + digital readout,
 * pulsing halo and motion entrance. Backwards compatible with the original API.
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
  riskBand = null,
  bands = null,
  format = null
}) {
  const uid = useId().replace(/:/g, '');
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = (clampValue - min) / (max - min || 1);

  const strokeWidth = Math.max(10, size * 0.078);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength * (1 - percentage);

  const displayValue = format
    ? format(value)
    : typeof value === 'number'
      ? Number.isInteger(value)
        ? value
        : value.toFixed(value > 10 ? 1 : 2)
      : value;

  const bandColorFor = (v) => {
    if (!bands) return color;
    for (let i = 0; i < bands.length; i += 1) {
      const b = bands[i];
      const isLast = i === bands.length - 1;
      if (v >= b.from && (isLast ? v <= b.to : v < b.to)) return b.color;
    }
    return bands[bands.length - 1]?.color || color;
  };

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angleDeg = 180 + i * 18;
    const rad = (angleDeg * Math.PI) / 180;
    const major = i % 5 === 0;
    const rOuter = radius - strokeWidth / 2 - 1;
    const len = major ? size * 0.058 : size * 0.03;
    const rInner = rOuter - len;
    const tickValue = min + (max - min) * (i / 10);
    return {
      i,
      major,
      tickValue,
      x1: cx + rOuter * Math.cos(rad),
      y1: cy + rOuter * Math.sin(rad),
      x2: cx + rInner * Math.cos(rad),
      y2: cy + rInner * Math.sin(rad),
      labelR: rInner - size * 0.062,
      rad,
      color: bandColorFor(tickValue)
    };
  });

  const gradId = `sg-grad-${uid}`;
  const glowId = `sg-glow-${uid}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 8px',
        position: 'relative'
      }}
    >
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
          <motion.span
            animate={{ opacity: [1, 0.35, 1], scale: [1, 0.82, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
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

      <div style={{ position: 'relative', width: size, height: size / 2 + 30 }}>
        <motion.div
          aria-hidden
          animate={{ opacity: [0.18, 0.42, 0.18], scale: [0.94, 1.04, 0.94] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 82%, ${color}55 0%, transparent 62%)`,
            pointerEvents: 'none'
          }}
        />

        <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`} style={{ position: 'relative' }}>
          <defs>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.55" />
              <stop offset="60%" stopColor={color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>

          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {ticks.map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.major ? t.color : 'var(--muted)'}
              strokeWidth={t.major ? 2 : 1}
              strokeLinecap="round"
              opacity={t.major ? 0.85 : 0.35}
            />
          ))}

          {ticks.filter((t) => t.major).map((t) => (
            <text
              key={`lbl-${t.i}`}
              x={cx + t.labelR * Math.cos(t.rad)}
              y={cy + t.labelR * Math.sin(t.rad)}
              fill="var(--muted)"
              fontSize={size * 0.058}
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Number.isInteger(t.tickValue) ? t.tickValue : t.tickValue.toFixed(1)}
            </text>
          ))}

          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
          />

          {showNeedle && (
            <g
              style={{
                transform: `rotate(${percentage * 180}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
                transformBox: 'view-box',
                transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1)'
              }}
            >
              <polygon
                points={`${cx - (radius - 7)},${cy} ${cx + 10},${cy - 4.5} ${cx + 10},${cy + 4.5}`}
                fill={color}
                filter={`url(#${glowId})`}
              />
            </g>
          )}

          <circle cx={cx} cy={cy} r={size * 0.036} fill="var(--bg)" stroke={color} strokeWidth="2" />
          <circle cx={cx} cy={cy} r={size * 0.013} fill={color} />
        </svg>

        <div style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          textAlign: 'center',
          pointerEvents: 'none',
          width: '70%'
        }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={String(displayValue)}
              initial={{ opacity: 0, y: 8, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(5px)' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{
                fontSize: size > 160 ? size * 0.165 : size * 0.14,
                fontWeight: '800',
                color: color,
                lineHeight: '1.1',
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 14px ${color}77`
              }}
            >
              {displayValue}
            </motion.div>
          </AnimatePresence>
          <div style={{
            fontSize: size * 0.066,
            color: 'var(--muted)',
            fontWeight: '700',
            textTransform: 'uppercase',
            marginTop: '2px',
            letterSpacing: '0.08em'
          }}>
            {unit}
          </div>
        </div>
      </div>

      {riskBand && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            marginTop: '4px',
            padding: '2px 10px',
            borderRadius: '999px',
            backgroundColor: `${color}22`,
            border: `1px solid ${color}66`,
            color: color,
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}
        >
          {riskBand}
        </motion.div>
      )}
    </motion.div>
  );
}
