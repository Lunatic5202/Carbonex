import { useEffect, useMemo, useState } from "react";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import StatusBar from "./components/layout/StatusBar";
import MineMap from "./components/map/MineMap";
import Terrain3D from "./components/map/Terrain3D";
import NodeDetails from "./components/panels/NodeDetails";
import AlertPanel from "./components/panels/AlertPanel";
import MineOperations from "./components/panels/MineOperations";
import TimeSlider from "./components/panels/TimeSlider";

import { useSensorSimulation } from "./hooks/useSensorSimulation";
import { useMapLayers } from "./hooks/useMapLayers";
import { getSystemStatus } from "./services/apiService";
import { overallRiskScore } from "./data/riskData";
import { buildHopTrace } from "./data/sensorData";

const SYSTEM_STATUS_POLL_MS = 15000;

export default function App() {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [viewMode, setViewMode] = useState("2d");
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [liveMode, setLiveMode] = useState(true);
  const [hourOfDay, setHourOfDay] = useState(new Date().getHours());

  const { nodes, alerts, liveDataSource } = useSensorSimulation({ running: liveMode });
  const { layers, toggleLayer } = useMapLayers();

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const status = await getSystemStatus();
      if (!cancelled) setSystemStatus(status);
    }
    poll();
    const interval = setInterval(poll, SYSTEM_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const overallRisk = useMemo(() => overallRiskScore(nodes), [nodes]);
  const overallStatus =
    overallRisk >= 80 ? "critical" : overallRisk >= 60 ? "warning" : "normal";

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const hopTrace = selectedNode ? buildHopTrace(selectedNode, nodes) : [];

  function handleSelectLocation(location) {
    setFlyToTarget([location.lat, location.lng]);
  }

  function handleSelectNode(nodeId) {
    setSelectedNodeId(nodeId);
    setFlyToTarget(null);
  }

  return (
    <div className="app-shell">
      <Header
        overallStatus={overallStatus}
        alertCount={alerts.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSelectLocation={handleSelectLocation}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="app-body">
        <Sidebar layers={layers} onToggleLayer={toggleLayer} sidebarOpen={sidebarOpen} />

        <div style={{ position: "relative", minHeight: 0 }}>
          {viewMode === "2d" ? (
            <MineMap
              nodes={nodes}
              layers={layers}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              flyToTarget={flyToTarget}
            />
          ) : (
            <div className="map-viewport">
              <Terrain3D nodes={nodes} />
            </div>
          )}

          <AlertPanel alerts={alerts} onSelectNode={handleSelectNode} />
          <MineOperations nodes={nodes} overallRisk={overallRisk} />
          <TimeSlider
            hourOfDay={hourOfDay}
            onChange={setHourOfDay}
            liveMode={liveMode}
            onToggleLive={() => setLiveMode((v) => !v)}
          />

          {selectedNode && (
            <NodeDetails
              node={selectedNode}
              hopTrace={hopTrace}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </div>

      <StatusBar systemStatus={systemStatus} live={liveDataSource} />
    </div>
  );
}
