import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";

const GROUPS = [
  {
    title: "Mine",
    rows: [
      ["mineBoundary", "Mine Boundary", "#d99457"],
      ["openPit", "Open Pit", "#8a4f22"],
      ["haulRoads", "Haul Roads", "#c9a15a"],
      ["infrastructure", "Infrastructure", "#b9c2c7"],
    ],
  },
  {
    title: "Environment",
    rows: [
      ["publicRoads", "Public Roads", "#8a959c"],
      ["railways", "Railways", "#5c666c"],
      ["waterways", "Waterways", "#3d8fb0"],
    ],
  },
  {
    title: "Monitoring",
    rows: [
      ["sensorNodes", "Sensor Nodes", "#4caf7d"],
      ["communication", "Node Communication", "#d99457"],
      ["deformation", "Deformation", "#e08a3c"],
      ["riskHeatmap", "Risk Heatmap", "#d64545"],
      ["predictedSubsidence", "Predicted Subsidence", "#a25a3d"],
    ],
  },
  {
    title: "Analytics",
    rows: [
      ["riskZones", "Risk Zones", "#d64545"],
      ["deformationVectors", "Deformation Vectors", "#d9b13d"],
      ["sensorCoverage", "Sensor Coverage", "#3d8fb0"],
    ],
  },
];

export default function LayerControl({ layers, onToggleLayer }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="panel">
      <div className="panel-header" onClick={() => setExpanded((v) => !v)}>
        <span className="panel-title">
          <Layers size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
          Layers
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {expanded && (
        <div className="panel-body tight">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="layer-group-title">{group.title}</div>
              {group.rows.map(([key, label, color]) => (
                <label className="layer-row" key={key}>
                  <input
                    type="checkbox"
                    checked={!!layers[key]}
                    onChange={() => onToggleLayer(key)}
                  />
                  <span className="swatch" style={{ background: color }} />
                  {label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
