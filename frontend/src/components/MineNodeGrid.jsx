import React, { useEffect, useRef } from 'react';
import { Radio, AlertTriangle, ShieldCheck, Zap, HardHat } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function MineNodeGrid({
  nodesSummary = [],
  selectedNode = 'Node01',
  onSelectNode
}) {
  const gridRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const nodeCards = gsap.utils.toArray('.mine-node-card');
      if (!nodeCards.length) return;

      gsap.from(nodeCards, {
        opacity: 0,
        y: 15,
        duration: 0.65,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 86%',
          once: true
        }
      });
    }, gridRef);

    return () => context.revert();
  }, [nodesSummary.length]);

  return (
    <div ref={gridRef} className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardHat size={20} color="#00f0ff" />
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
            Underground Coal Mine Sensor Nodes • Spatial Mesh Grid
          </h3>
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Self-Healing LoRa Mesh • {nodesSummary.length} Monitored Panels
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '12px'
      }}>
        {nodesSummary.map((node) => {
          const isSelected = selectedNode === node.node_id;
          const bandColor = node.status_color || '#10b981';

          return (
            <div
              key={node.node_id}
              className="mine-node-card"
              onClick={() => onSelectNode(node.node_id)}
              style={{
                background: isSelected ? 'rgba(0, 240, 255, 0.08)' : '#0d1322',
                border: isSelected ? '2px solid #00f0ff' : '1px solid #1e293b',
                borderRadius: '10px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isSelected ? '0 0 16px rgba(0, 240, 255, 0.25)' : 'none'
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.borderColor = '#334155';
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.borderColor = '#1e293b';
              }}
            >
              {/* Top Row: Node ID & Status Pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: isSelected ? '#00f0ff' : '#ffffff',
                }}>
                  {node.node_id}
                </span>
                <span style={{
                  background: `${bandColor}22`,
                  border: `1px solid ${bandColor}`,
                  color: bandColor,
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {node.risk_band}
                </span>
              </div>

              {/* Risk Score */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: bandColor,
                  lineHeight: 1
                }}>
                  {node.risk_score?.toFixed(1)}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>/ 100 Risk</span>
              </div>

              {/* Telemetry Snapshot */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px',
                fontSize: '11px',
                color: '#94a3b8',
                borderTop: '1px solid #161e32',
                paddingTop: '8px'
              }}>
                <div>Tilt: <strong style={{ color: '#e2e8f0' }}>{node.tilt_deg?.toFixed(1)}°</strong></div>
                <div>Disp: <strong style={{ color: '#e2e8f0' }}>{node.displacement_mm?.toFixed(0)}mm</strong></div>
                <div>Strain: <strong style={{ color: '#e2e8f0' }}>{node.strain_microstrain?.toFixed(0)}µε</strong></div>
                <div>Vib: <strong style={{ color: '#e2e8f0' }}>{node.vibration_mms?.toFixed(2)}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
