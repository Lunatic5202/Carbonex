import { useState } from "react";
import { ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { alertLevelColorClass } from "../../utils/riskUtils";
import { formatRelativeTime } from "../../utils/formatters";

export default function AlertPanel({ alerts, onSelectNode }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="floating-panel alert-panel">
      <div className="panel-header" onClick={() => setExpanded((v) => !v)}>
        <span className="panel-title">
          <TriangleAlert size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
          Alert Center · {alerts.length}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {expanded &&
        (alerts.length === 0 ? (
          <div className="empty-state">No active alerts. All zones nominal.</div>
        ) : (
          alerts.map((alert) => (
            <div
              className="alert-card"
              key={alert.id}
              onClick={() => onSelectNode(alert.nodes[0])}
              style={{ cursor: "pointer" }}
            >
              <div className={`alert-level ${alertLevelColorClass(alert.level)}`}>
                LEVEL {alert.level} — {alert.levelLabel}
              </div>
              <div className="alert-zone">Zone {alert.zone}</div>
              <div className="alert-reason">{alert.reason}</div>
              <div className="alert-meta">
                <span>Risk {alert.riskScore}/100</span>
                <span>{formatRelativeTime(alert.time)}</span>
              </div>
            </div>
          ))
        ))}
    </div>
  );
}
