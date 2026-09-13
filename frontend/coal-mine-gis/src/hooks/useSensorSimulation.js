import { useEffect, useState } from "react";
import { getNodes } from "../services/apiService";
import { generateDemoAlerts } from "../data/riskData";

const TICK_MS = 4000;

/**
 * Drives the sensor node array by polling the live CarboNex API
 * (/api/nodes-positions) on an interval. When the API is unreachable the
 * apiService layer falls back to seeded simulation data, so the map always
 * renders. `running` false freezes the stream (TimeSlider "pause").
 */
export function useSensorSimulation({ running = true } = {}) {
  const [nodes, setNodes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [liveDataSource, setLiveDataSource] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    let cancelled = false;

    const tick = async () => {
      const data = await getNodes();
      if (!cancelled) {
        setLiveDataSource(data.every((n) => n.carbonex));
        setNodes(data);
      }
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [running]);

  useEffect(() => {
    setAlerts(generateDemoAlerts(nodes));
    // Regenerating alerts every node update keeps them in sync with status
    // changes without needing a separate polling loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  return { nodes, alerts, liveDataSource };
}