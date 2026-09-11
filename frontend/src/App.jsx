import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KpiCardGrid from './components/KpiCardGrid';
import MineNodeGrid from './components/MineNodeGrid';
import RealTimePredictor from './components/RealTimePredictor';
import HistoricalAnalytics from './components/HistoricalAnalytics';
import LiveReplaySimulator from './components/LiveReplaySimulator';
import BatchCsvScorer from './components/BatchCsvScorer';

export default function App() {
  const [activeTab, setActiveTab] = useState('predictor');
  const [nodes, setNodes] = useState(['Node01']);
  const [selectedNode, setSelectedNode] = useState('Node01');
  const [nodesSummary, setNodesSummary] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);

  // Fetch system status & nodes summary on mount
  useEffect(() => {
    async function initData() {
      try {
        const [resStatus, resSummary, resModel] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/nodes-summary'),
          fetch('/api/model-info')
        ]);

        if (resStatus.ok) {
          const statusData = await resStatus.json();
          if (statusData.nodes && statusData.nodes.length > 0) {
            setNodes(statusData.nodes);
            if (!statusData.nodes.includes(selectedNode)) {
              setSelectedNode(statusData.nodes[0]);
            }
          }
        }

        if (resSummary.ok) {
          const summaryData = await resSummary.json();
          setNodesSummary(summaryData);
        }

        if (resModel.ok) {
          const mInfo = await resModel.json();
          setModelInfo(mInfo);
        }
      } catch (err) {
        console.error('Error initializing CarboNex data:', err);
      }
    }

    initData();
    const interval = setInterval(initData, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        nodes={nodes}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
      />

      {/* Main Container */}
      <main style={{
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 20px',
        flexGrow: 1,
        boxSizing: 'border-box'
      }}>
        {/* SRE / NOC Vibrant Top KPI Blocks (Matching Image 3) */}
        <KpiCardGrid
          nodesSummary={nodesSummary}
          activeNode={selectedNode}
        />

        {/* Spatial Mine Panel Node Mesh (Matching Image 1 & 4) */}
        <MineNodeGrid
          nodesSummary={nodesSummary}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
        />

        {/* Active Tab View */}
        {activeTab === 'predictor' && (
          <RealTimePredictor activeNode={selectedNode} />
        )}

        {activeTab === 'historical' && (
          <HistoricalAnalytics activeNode={selectedNode} />
        )}

        {activeTab === 'replay' && (
          <LiveReplaySimulator activeNode={selectedNode} />
        )}

        {activeTab === 'batch' && (
          <BatchCsvScorer />
        )}
      </main>

      {/* Modern High-Tech Industrial Footer */}
      <footer style={{
        background: '#0a0e1a',
        borderTop: '1px solid #1e293b',
        padding: '16px 24px',
        fontSize: '0.78rem',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <strong style={{ color: '#94a3b8' }}>CarboNex AI</strong> • Real-time Distributed Anomaly Detection & Geotechnical Mine Safety System
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Smart India Hackathon 2025 (SIH25025)</span>
          <span>•</span>
          <span>Theme: Smart Automation & IoT</span>
          <span>•</span>
          <span style={{ color: '#00f0ff' }}>3-Layer Sensor Fusion Intact</span>
        </div>
      </footer>
    </div>
  );
}
