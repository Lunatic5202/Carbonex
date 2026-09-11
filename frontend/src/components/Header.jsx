import React from 'react';
import { Sliders, LineChart, PlayCircle, FileSpreadsheet } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  nodes = ['Node01'],
  selectedNode,
  setSelectedNode,
  modelStatus = 'ONLINE (Trained)'
}) {
  const tabs = [
    { id: 'predictor', label: 'Real-Time Predictor & What-If Simulator', icon: Sliders },
    { id: 'historical', label: 'Historical Telemetry Analytics', icon: LineChart },
    { id: 'replay', label: 'Live Streaming Replay Simulator', icon: PlayCircle },
    { id: 'batch', label: 'Batch CSV Scorer & Node Ingestion', icon: FileSpreadsheet }
  ];

  return (
    <header style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)', padding: '16px 24px 0', boxShadow: '0 10px 30px color-mix(in srgb, var(--bg) 50%, transparent)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--text)', fontFamily: 'Rajdhani, Inter, sans-serif', letterSpacing: '-0.01em', margin: 0 }}>
              CARBONEX <span style={{ color: 'var(--cyan)', fontWeight: '700' }}>SUBSIDENCE INTELLIGENCE</span>
            </h1>
            <span style={{ background: 'color-mix(in srgb, var(--cyan) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--cyan) 40%, transparent)', color: 'var(--cyan)', fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.08em' }}>
              SIH25025 • HARDWARE IoT
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '3px 0 0' }}>
            Unsupervised 3-Layer Sensor Fusion: Isolation Forest • Rolling Trend &amp; 2nd Derivative • Calibrated Early Warning
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--panel)', border: '1px solid var(--line)', padding: '6px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>NODE:</span>
            <select value={selectedNode} onChange={event => setSelectedNode(event.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'Rajdhani, monospace', outline: 'none', cursor: 'pointer' }}>
              {nodes.map(node => <option key={node} value={node} style={{ background: 'var(--panel)', color: 'var(--text)' }}>{node}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'color-mix(in srgb, var(--cyan) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--cyan) 30%, transparent)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--cyan)' }}>
            <span className="pulse-dot pulse-dot-green" />
            <span>MODEL: {modelStatus}</span>
          </div>

          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ background: 'color-mix(in srgb, var(--cyan) 20%, transparent)', border: '1px solid var(--cyan)', color: 'var(--cyan)', fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>0-25 Normal</span>
            <span style={{ background: 'color-mix(in srgb, var(--orange) 20%, transparent)', border: '1px solid var(--orange)', color: 'var(--orange)', fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>26-50 Watch</span>
            <span style={{ background: 'color-mix(in srgb, var(--orange) 20%, transparent)', border: '1px solid var(--orange)', color: 'var(--orange)', fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>51-75 Warning</span>
            <span style={{ background: 'color-mix(in srgb, var(--lime) 20%, transparent)', border: '1px solid var(--lime)', color: 'var(--lime)', fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>76-100 Critical</span>
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: '4px', overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isActive ? 'var(--panel)' : 'transparent', border: 'none', borderBottom: isActive ? '3px solid var(--cyan)' : '3px solid transparent', color: isActive ? 'var(--cyan)' : 'var(--muted)', fontWeight: isActive ? '800' : '600', fontSize: '0.85rem', padding: '12px 18px', cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap', borderRadius: '6px 6px 0 0' }}>
              <Icon size={16} color={isActive ? 'var(--cyan)' : 'var(--muted)'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
