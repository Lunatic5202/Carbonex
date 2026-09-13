import { Circle, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { riskZoneColor } from "../../utils/riskUtils";

// Four small, independently toggleable analytics overlays. Each derives
// entirely from the current node array so they stay in sync with the
// simulation (or, later, with live AI output) automatically.

export function RiskZones({ nodes, visible }) {
  if (!visible) return null;
  return (
    <>
      {nodes
        .filter((n) => n.status === "warning" || n.status === "critical")
        .map((n) => (
          <Circle
            key={`riskzone-${n.id}`}
            center={[n.lat, n.lng]}
            radius={40 + n.riskScore * 1.1}
            pathOptions={{
              color: riskZoneColor(n.riskScore),
              weight: 1,
              fillColor: riskZoneColor(n.riskScore),
              fillOpacity: 0.14,
            }}
          >
            <Tooltip sticky>
              Risk zone around {n.id} — {n.riskScore}/100
            </Tooltip>
          </Circle>
        ))}
    </>
  );
}

export function PredictedSubsidence({ nodes, visible }) {
  if (!visible) return null;
  return (
    <>
      {nodes
        .filter((n) => n.status === "critical")
        .map((n) => (
          <Circle
            key={`predicted-${n.id}`}
            center={[n.lat, n.lng]}
            radius={110}
            pathOptions={{
              color: "#a25a3d",
              weight: 1.5,
              dashArray: "4 4",
              fillOpacity: 0.05,
              fillColor: "#a25a3d",
            }}
          >
            <Tooltip sticky>
              Predicted subsidence extent (LSTM trajectory, demo) — {n.id}
            </Tooltip>
          </Circle>
        ))}
    </>
  );
}

function arrowIcon(angleDeg, color) {
  const html = `<svg width="22" height="22" viewBox="0 0 24 24" style="transform:rotate(${angleDeg}deg)">
      <path d="M12 3 L18 14 L12 11 L6 14 Z" fill="${color}" stroke="#1a1206" stroke-width="1"/>
    </svg>`;
  return L.divIcon({ html, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
}

export function DeformationVectors({ nodes, visible }) {
  if (!visible) return null;
  return (
    <>
      {nodes
        .filter((n) => n.status !== "offline" && Math.abs(n.tiltX) + Math.abs(n.tiltY) > 0.15)
        .map((n) => {
          const angle = (Math.atan2(n.tiltY, n.tiltX) * 180) / Math.PI + 90;
          return (
            <Marker
              key={`vector-${n.id}`}
              position={[n.lat, n.lng]}
              icon={arrowIcon(angle, riskZoneColor(n.riskScore))}
              interactive={false}
            />
          );
        })}
    </>
  );
}

export function SensorCoverage({ nodes, visible }) {
  if (!visible) return null;
  return (
    <>
      {nodes.map((n) => (
        <Circle
          key={`coverage-${n.id}`}
          center={[n.lat, n.lng]}
          radius={90}
          pathOptions={{
            color: "#3d8fb0",
            weight: 1,
            fillColor: "#3d8fb0",
            fillOpacity: 0.05,
          }}
          interactive={false}
        />
      ))}
    </>
  );
}
