import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatClock } from "../../utils/formatters";

export default function SensorChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-700)", fontSize: 12 }}>
        Loading history…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-700)", fontSize: 12 }}>
        No historical data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e08a3c" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#e08a3c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#2b3238" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatClock}
          stroke="#5c666c"
          tick={{ fontSize: 10 }}
          minTickGap={40}
        />
        <YAxis stroke="#5c666c" tick={{ fontSize: 10 }} width={30} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: "#1a1f23",
            border: "1px solid #333c42",
            borderRadius: 5,
            fontSize: 12,
          }}
          labelFormatter={formatClock}
        />
        <Area
          type="monotone"
          dataKey="risk"
          name="Risk score"
          stroke="#e08a3c"
          fill="url(#riskFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
