import React from 'react';
import { ShieldCheck, Activity, AlertTriangle, Flame, Layers } from 'lucide-react';

/**
 * Vibrant Solid/Gradient KPI Blocks
 * Modeled directly on the SRE / NOC Operations Dashboard (Image 3) & Smart Mining KPI cards (Image 1).
 */
export default function KpiCardGrid({
  nodesSummary = [],
  activeNode = 'Node01',
  currentRiskScore = 18.5,
  currentBand = 'NORMAL'
}) {
  const totalNodes = nodesSummary.length || 10;
  const normalNodes = nodesSummary.filter(n => n.risk_band === 'NORMAL').length;
  const watchNodes = nodesSummary.filter(n => n.risk_band === 'WATCH').length;
  const warningNodes = nodesSummary.filter(n => n.risk_band === 'WARNING').length;
  const criticalNodes = nodesSummary.filter(n => n.risk_band === 'CRITICAL').length;

  const cards = [
    {
      label: 'Model SLO / Normal Nodes',
      sublabel: 'Nominal Baseline',
      value: `${((normalNodes / totalNodes) * 100).toFixed(1)}%`,
      badge: `${normalNodes}/${totalNodes} Nodes`,
      bgGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      textColor: '#ffffff',
      icon: ShieldCheck,
      shadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
    },
    {
      label: 'Telemetry Throughput',
      sublabel: 'Annual Observations',
      value: '109,253',
      badge: '365 Days Online',
      bgGradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      textColor: '#ffffff',
      icon: Activity,
      shadow: '0 8px 20px rgba(59, 130, 246, 0.35)'
    },
    {
      label: 'Watch Condition',
      sublabel: 'Early Drift Telemetry',
      value: watchNodes.toString(),
      badge: watchNodes > 0 ? 'Sampling x2' : 'Clear',
      bgGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      textColor: '#ffffff',
      icon: AlertTriangle,
      shadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
    },
    {
      label: 'Warning Progression',
      sublabel: 'Accelerated Drift',
      value: warningNodes.toString(),
      badge: warningNodes > 0 ? 'Inspection Due' : 'Zero',
      bgGradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      textColor: '#ffffff',
      icon: Layers,
      shadow: '0 8px 20px rgba(249, 115, 22, 0.35)'
    },
    {
      label: 'Critical Hazard Alerts',
      sublabel: 'Imminent Slope Rupture',
      value: criticalNodes.toString(),
      badge: criticalNodes > 0 ? 'EVACUATE' : 'Nominal (0)',
      bgGradient: criticalNodes > 0 
        ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' 
        : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
      textColor: '#ffffff',
      icon: Flame,
      shadow: '0 8px 20px rgba(239, 68, 68, 0.35)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '14px',
      marginBottom: '20px'
    }}>
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            style={{
              background: card.bgGradient,
              color: card.textColor,
              borderRadius: '12px',
              padding: '16px 18px',
              boxShadow: card.shadow,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Top row: Label and Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  opacity: 0.92
                }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.75, marginTop: '1px' }}>
                  {card.sublabel}
                </div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconComponent size={18} color="#ffffff" />
              </div>
            </div>

            {/* Middle row: Big Bold Value */}
            <div style={{
              fontSize: '2.3rem',
              fontWeight: '900',
              fontFamily: 'Rajdhani, Inter, sans-serif',
              lineHeight: 1.1,
              marginTop: '12px',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {card.value}
            </div>

            {/* Bottom row: Pill Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(4px)',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: '700',
              letterSpacing: '0.04em',
              alignSelf: 'flex-start'
            }}>
              {card.badge}
            </div>
          </div>
        );
      })}
    </div>
  );
}
