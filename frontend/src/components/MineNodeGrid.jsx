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
        borderBottom: '1px solid var(--line)',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardHat size={20} color="var(--cyan)" />
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
            Underground Coal Mine Sensor Nodes • Spatial Mesh Grid
          </h3>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
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
          const bandColor = node.status_color || 'var(--cyan)';

          return (
            <div
              key={node.node_id}
              className="mine-node-card"
              onClick={() => onSelectNode(node.node_id)}
              style={{
                background: isSelected ? 'color-mix(in srgb, var(--cyan) 8%, transparent)' : 'var(--panel)',
                border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--line)',
                borderRadius: '10px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isSelected ? '0 0 16px rgba(0, 240, 255, 0.25)' : 'none'
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.borderColor = 'var(--line)';
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.borderColor = 'var(--line)';
              }}
            >
              {/* Top Row: Node ID & Status Pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: isSelected ? 'var(--cyan)' : 'var(--text)',
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
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>/ 100 Risk</span>
              </div>

              {/* Telemetry Snapshot */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--muted)',
                borderTop: '1px solid var(--line)',
                paddingTop: '8px'
              }}>
                <div>Tilt: <strong style={{ color: 'var(--text)' }}>{node.tilt_deg?.toFixed(1)}°</strong></div>
                <div>Disp: <strong style={{ color: 'var(--text)' }}>{node.displacement_mm?.toFixed(0)}mm</strong></div>
                <div>Strain: <strong style={{ color: 'var(--text)' }}>{node.strain_microstrain?.toFixed(0)}µε</strong></div>
                <div>Vib: <strong style={{ color: 'var(--text)' }}>{node.vibration_mms?.toFixed(2)}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
