import React from 'react';
import { Zap, Cpu, Bell, Sliders, LineChart, PlayCircle, FileSpreadsheet } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  nodes = ['Node01'],
  selectedNode,
  setSelectedNode,
  modelStatus = 'ONLINE (Trained)',
  currentTime = 'Live Telemetry'
}) {
  const tabs = [
    { id: 'predictor', label: 'Real-Time Predictor & What-If Simulator', icon: Sliders },
    { id: 'historical', label: 'Historical Telemetry Analytics', icon: LineChart },
    { id: 'replay', label: 'Live Streaming Replay Simulator', icon: PlayCircle },
    { id: 'batch', label: 'Batch CSV Scorer & Node Ingestion', icon: FileSpreadsheet }
  ];

  return (
    <header style={{
      background: '#0d1322',
      borderBottom: '1px solid #1e293b',
      padding: '16px 24px 0 24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Top Main Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Left: Brand / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.45)'
          }}>
            <Zap size={26} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: '900',
                color: '#ffffff',
                fontFamily: 'Rajdhani, Inter, sans-serif',
                letterSpacing: '-0.01em',
                margin: 0
              }}>
                CARBONEX <span style={{ color: '#00f0ff', fontWeight: '700' }}>SUBSIDENCE INTELLIGENCE</span>
              </h1>
              <span style={{
                background: 'rgba(0, 240, 255, 0.12)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                color: '#00f0ff',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.08em'
              }}>
                SIH25025 • HARDWARE IoT
              </span>
            </div>
            <p style={{
              fontSize: '0.78rem',
              color: '#94a3b8',
              margin: '3px 0 0 0'
            }}>
              Unsupervised 3-Layer Sensor Fusion: Isolation Forest • Rolling Trend & 2nd Derivative • Calibrated Early Warning
            </p>
          </div>
        </div>

        {/* Right: Node Selector, Status Pills & Model Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Active Node Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#141c2e',
            border: '1px solid #283654',
            padding: '6px 14px',
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>NODE:</span>
            <select
              value={selectedNode}
              onChange={e => setSelectedNode(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00f0ff',
                fontWeight: '800',
                fontSize: '0.9rem',
                fontFamily: 'Rajdhani, monospace',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {nodes.map(n => (
                <option key={n} value={n} style={{ background: '#111726', color: '#ffffff' }}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Model Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#10b981'
          }}>
            <span className="pulse-dot pulse-dot-green" />
            <span>MODEL: {modelStatus}</span>
          </div>

          {/* Risk Band Legend Badges */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              color: '#10b981',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>0-25 Normal</span>
            <span style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid #f59e0b',
              color: '#f59e0b',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>26-50 Watch</span>
            <span style={{
              background: 'rgba(249, 115, 22, 0.2)',
              border: '1px solid #f97316',
              color: '#f97316',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>51-75 Warning</span>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>76-100 Critical</span>
          </div>
        </div>
      </div>

      {/* High-Tech Tab Navigation */}
      <nav style={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isActive ? '#141d30' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #00f0ff' : '3px solid transparent',
                color: isActive ? '#00f0ff' : '#94a3b8',
                fontWeight: isActive ? '800' : '600',
                fontSize: '0.85rem',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                borderRadius: '6px 6px 0 0'
              }}
            >
              <Icon size={16} color={isActive ? '#00f0ff' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
