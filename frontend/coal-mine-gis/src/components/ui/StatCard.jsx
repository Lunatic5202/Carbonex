export default function StatCard({ label, value, wide = false, accent }) {
  return (
    <div className={`stat-card${wide ? " wide" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
