import { Gauge } from "lucide-react";
import StatCard from "../ui/StatCard";
import { riskZoneColor } from "../../utils/riskUtils";

export default function MineOperations({ nodes, overallRisk }) {
  const online = nodes.filter((n) => n.status !== "offline").length;
  const watch = nodes.filter((n) => n.status === "watch").length;
  const critical = nodes.filter((n) => n.status === "critical").length;

  return (
    <div className="floating-panel mine-ops-panel">
      <div className="panel-header" style={{ cursor: "default" }}>
        <span className="panel-title">
          <Gauge size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
          Mine Status
        </span>
      </div>
      <div className="panel-body">
        <div className="stat-grid">
          <StatCard label="Monitoring Nodes" value={nodes.length} />
          <StatCard label="Online" value={online} accent="var(--status-normal)" />
          <StatCard label="Watch" value={watch} accent="var(--status-watch)" />
          <StatCard label="Critical" value={critical} accent="var(--status-critical)" />
          <StatCard
            label="Current Risk"
            value={`${overallRisk} / 100`}
            wide
            accent={riskZoneColor(overallRisk)}
          />
        </div>
      </div>
    </div>
  );
}
