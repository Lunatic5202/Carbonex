import { useMemo } from "react";
import { Polyline } from "react-leaflet";
import { GATEWAY } from "../../data/mineData";
import { buildHopTrace } from "../../data/sensorData";

// Draws a schematic Node -> Relay -> Gateway line for every active node.
// This visualises mesh topology/health only — it is not a real LoRa
// routing computation.
export default function CommunicationLayer({ nodes, visible }) {
  const nodeById = useMemo(() => {
    const map = {};
    nodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [nodes]);

  if (!visible) return null;

  return (
    <>
      {nodes
        .filter((n) => n.status !== "offline")
        .map((node) => {
          const hops = buildHopTrace(node, nodes);
          const path = hops.map((hopId) =>
            hopId === "GATEWAY" ? GATEWAY.pos : [nodeById[hopId]?.lat, nodeById[hopId]?.lng]
          );
          const weak = node.rssi < -85;
          return (
            <Polyline
              key={`comm-${node.id}`}
              positions={path}
              pathOptions={{
                color: weak ? "#e08a3c" : "#d99457",
                weight: 1.2,
                opacity: weak ? 0.55 : 0.35,
                dashArray: "2 4",
              }}
            />
          );
        })}
    </>
  );
}
