import { useEffect, useState } from "react";
import { X, Wifi, BatteryMedium, Thermometer } from "lucide-react";
import Badge from "../ui/Badge";
import SensorChart from "../charts/SensorChart";
import { getNodeHistory } from "../../services/apiService";
import { formatDegrees, formatRelativeTime } from "../../utils/formatters";
import { riskZoneColor } from "../../utils/riskUtils";

const RANGES = [
  { key: "6h", label: "6 HOURS", hours: 6 },
  { key: "24h", label: "24 HOURS", hours: 24 },
  { key: "7d", label: "7 DAYS", hours: 168 },
  { key: "30d", label: "30 DAYS", hours: 720 },
];

export default function NodeDetails({ node, hopTrace, onClose }) {
  const [range, setRange] = useState("24h");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!node) return;
    let cancelled = false;
    const hours = RANGES.find((r) => r.key === range)?.hours || 24;
    setLoading(true);
    getNodeHistory(node.id, hours).then((data) => {
      if (!cancelled) {
        setHistory(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [node?.id, range]);

  if (!node) return null;

  return (
    <div className="floating-panel node-details-panel">
      <div className="node-details-header">
        <div>
          <div className="node-details-id">{node.id}</div>
          <Badge status={node.status} />
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="telemetry-grid">
        <TelemetryItem label="Tilt X" value={formatDegrees(node.tiltX)} />
        <TelemetryItem label="Tilt Y" value={formatDegrees(node.tiltY)} />
        <TelemetryItem label="Vibration" value={`${node.vibration} mg`} />
        <TelemetryItem
          label="Displacement"
          value={`${node.displacement.toFixed(2)} mm`}
        />
        <TelemetryItem
          label="Battery"
          value={`${node.battery}%`}
          icon={<BatteryMedium size={11} />}
        />
        <TelemetryItem
          label="Temperature"
          value={`${node.temperature}°C`}
          icon={<Thermometer size={11} />}
        />
        <TelemetryItem
          label="RSSI"
          value={`${node.rssi} dBm`}
          icon={<Wifi size={11} />}
        />
        <TelemetryItem label="Sequence" value={`#${node.seq}`} />
      </div>

      <ScoreBlock label="AI Anomaly Score" value={node.anomalyScore} />
      <ScoreBlock label="Risk Score" value={node.riskScore} />

      <div className="hop-trace">
        {hopTrace.map((hop, i) => (
          <span key={hop} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {hop}
            {i < hopTrace.length - 1 && <span style={{ color: "var(--ink-700)" }}>→</span>}
          </span>
        ))}
      </div>

      <div className="chart-range-toggle">
        {RANGES.map((r) => (
          <button
            key={r.key}
            className={range === r.key ? "active" : ""}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="chart-wrap">
        <SensorChart data={history} loading={loading} />
      </div>

      <div
        style={{
          padding: "8px 14px 12px",
          fontSize: 11,
          color: "var(--ink-700)",
          borderTop: "1px solid var(--seam-line)",
        }}
      >
        Last update {formatRelativeTime(node.lastUpdate)} · Gateway {node.gatewayId}
        {node.hasGnss ? " · GNSS fixed" : ""}
      </div>
    </div>
  );
}

function TelemetryItem({ label, value, icon }) {
  return (
    <div className="telemetry-item">
      <div className="t-label">
        {icon && <span style={{ marginRight: 4, verticalAlign: -1 }}>{icon}</span>}
        {label}
      </div>
      <div className="t-value">{value}</div>
    </div>
  );
}

function ScoreBlock({ label, value }) {
  const color = riskZoneColor(value);
  return (
    <div className="score-block">
      <div className="score-label">
        <span>{label}</span>
        <span className="score-value" style={{ color }}>
          {value} / 100
        </span>
      </div>
      <div className="risk-meter">
        <div
          className="risk-meter-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}
