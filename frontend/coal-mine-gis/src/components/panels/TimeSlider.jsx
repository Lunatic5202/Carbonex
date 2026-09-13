import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { riskZoneColor } from "../../utils/riskUtils";

/**
 * Simplified historical timeline control (see README "Production
 * considerations" for full temporal map replay). Rather than replaying
 * every past sensor reading, this derives one synthetic site-wide risk
 * trend for "today" from the current node population and lets the operator
 * scrub through it — a lightweight stand-in for a real InfluxDB range query
 * that the same UI can later be wired up to.
 */
export default function TimeSlider({ overallRisk }) {
  const [value, setValue] = useState(100); // 0-100 = 00:00-24:00, 100 = now/live

  const trend = useMemo(() => {
    // Build a plausible 24-point trend that ends at the current overall risk.
    const points = [];
    let risk = Math.max(5, overallRisk - 18 + Math.random() * 10);
    for (let i = 0; i <= 24; i += 1) {
      risk += (Math.random() - 0.45) * 4;
      risk = Math.min(97, Math.max(4, risk));
      points.push(Math.round(risk));
    }
    points[24] = overallRisk;
    return points;
    // Recomputed only when overallRisk meaningfully shifts, so scrubbing
    // doesn't regenerate the trend under the user's thumb.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(overallRisk / 5)]);

  const hourIndex = Math.round((value / 100) * 24);
  const displayedRisk = trend[hourIndex];
  const isLive = value === 100;
  const hourLabel = `${String(hourIndex).padStart(2, "0")}:00`;

  return (
    <div className="floating-panel time-slider-panel">
      <div className="time-slider-header">
        <span>
          <History size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
          Historical Timeline
        </span>
        <span className="current-time">
          {isLive ? "LIVE" : hourLabel} · Risk {displayedRisk}/100
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--ink-700)",
          marginTop: 2,
        }}
      >
        <span>00:00</span>
        <span style={{ color: riskZoneColor(displayedRisk) }}>●</span>
        <span>24:00 (now)</span>
      </div>
    </div>
  );
}
