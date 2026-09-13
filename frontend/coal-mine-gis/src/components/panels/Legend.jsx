import { useState } from "react";
import { ChevronDown, ChevronUp, Map } from "lucide-react";

export default function Legend({ layers }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="panel">
      <div className="panel-header" onClick={() => setExpanded((v) => !v)}>
        <span className="panel-title">
          <Map size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
          Map Legend
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {expanded && (
        <div className="panel-body">
          <div className="layer-group-title" style={{ padding: "0 0 4px" }}>
            Mine
          </div>
          {layers.mineBoundary && (
            <div className="legend-swatch-row">
              <span className="legend-swatch" style={{ background: "transparent", border: "2px solid #d99457" }} />
              Mine Boundary
            </div>
          )}
          {layers.openPit && (
            <div className="legend-swatch-row">
              <span className="legend-swatch" style={{ background: "#8a4f22" }} />
              Open Pit
            </div>
          )}
          {layers.haulRoads && (
            <div className="legend-swatch-row">
              <span className="legend-swatch line" style={{ background: "#c9a15a" }} />
              Haul Road
            </div>
          )}

          <div className="layer-group-title" style={{ padding: "8px 0 4px" }}>
            Monitoring
          </div>
          <div className="legend-swatch-row">
            <span className="legend-swatch dot" style={{ background: "#4caf7d" }} />
            Healthy
          </div>
          <div className="legend-swatch-row">
            <span className="legend-swatch dot" style={{ background: "#d9b13d" }} />
            Watch
          </div>
          <div className="legend-swatch-row">
            <span className="legend-swatch dot" style={{ background: "#e08a3c" }} />
            Warning
          </div>
          <div className="legend-swatch-row">
            <span className="legend-swatch dot" style={{ background: "#d64545" }} />
            Critical
          </div>
          <div className="legend-swatch-row">
            <span className="legend-swatch dot" style={{ background: "#6b747a" }} />
            Offline
          </div>

          {(layers.riskHeatmap || layers.deformation) && (
            <>
              <div className="layer-group-title" style={{ padding: "8px 0 4px" }}>
                Risk
              </div>
              <div className="legend-swatch-row">
                <span className="legend-swatch" style={{ background: "#4caf7d" }} />
                Low
              </div>
              <div className="legend-swatch-row">
                <span className="legend-swatch" style={{ background: "#d9b13d" }} />
                Watch
              </div>
              <div className="legend-swatch-row">
                <span className="legend-swatch" style={{ background: "#e08a3c" }} />
                Warning
              </div>
              <div className="legend-swatch-row">
                <span className="legend-swatch" style={{ background: "#d64545" }} />
                Critical
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
