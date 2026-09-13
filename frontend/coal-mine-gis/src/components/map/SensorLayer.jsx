import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { statusLabel } from "../../utils/riskUtils";

function buildIcon(node, selected) {
  const html = `
    <div class="sensor-marker core-${node.status}${selected ? " selected" : ""}${node.commissioned === false ? " planned" : ""}">
      <span class="pulse"></span>
      <span class="core"></span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export default function SensorLayer({ nodes, selectedNodeId, onSelectNode }) {
  const icons = useMemo(() => {
    const map = {};
    for (const node of nodes) {
      map[node.id] = buildIcon(node, node.id === selectedNodeId);
    }
    return map;
  }, [nodes, selectedNodeId]);

  return (
    <>
      {nodes.map((node) => (
        <Marker
          key={`${node.id}-${node.lat}-${node.lng}`}
          position={[node.lat, node.lng]}
          icon={icons[node.id]}
          eventHandlers={{ click: () => onSelectNode(node.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div style={{ textAlign: "center" }}>
              <strong>{node.id}</strong>
              <div>
                {node.bandLabel || statusLabel(node.status)} · Risk{" "}
                {node.riskScore ?? "—"}/100
              </div>
              {node.commissioned === false && (
                <em style={{ fontSize: 10, opacity: 0.7 }}>
                  COMMISSIONING — no telemetry yet
                </em>
              )}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
