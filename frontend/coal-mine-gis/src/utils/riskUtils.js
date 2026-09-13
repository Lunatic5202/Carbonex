export const STATUS_COLORS = {
  normal: "#4caf7d",
  watch: "#d9b13d",
  warning: "#e08a3c",
  critical: "#d64545",
  offline: "#6b747a",
};

export const STATUS_LABELS = {
  normal: "Normal",
  watch: "Watch",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
};

export function statusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.offline;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || "Unknown";
}

export function riskZoneLabel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "WARNING";
  if (score >= 35) return "WATCH";
  return "LOW";
}

export function riskZoneColor(score) {
  if (score >= 80) return STATUS_COLORS.critical;
  if (score >= 60) return STATUS_COLORS.warning;
  if (score >= 35) return STATUS_COLORS.watch;
  return STATUS_COLORS.normal;
}

export function alertLevelColorClass(level) {
  if (level >= 3) return "alert-level-3";
  if (level === 2) return "alert-level-2";
  return "alert-level-1";
}
