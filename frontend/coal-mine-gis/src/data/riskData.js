/**
 * Derives spatial risk/deformation surfaces from the current sensor node
 * array. This keeps the "AI output" entirely a function of node state,
 * so swapping in a real spatial-risk-classifier API later only means
 * replacing generateRiskPoints()/generateDeformationPoints() with a fetch.
 */

// leaflet.heat point format: [lat, lng, intensity(0-1)]
export function generateRiskHeatPoints(nodes) {
  return nodes
    .filter((n) => n.status !== "offline")
    .map((n) => [n.lat, n.lng, Math.min(1, n.riskScore / 100)]);
}

export function generateDeformationHeatPoints(nodes) {
  return nodes
    .filter((n) => n.status !== "offline")
    .map((n) => [n.lat, n.lng, Math.min(1, n.displacement / 0.12)]);
}

export function overallRiskScore(nodes) {
  const active = nodes.filter((n) => n.status !== "offline");
  if (active.length === 0) return 0;
  // Weight toward the worst readings rather than a flat average, since a
  // handful of critical nodes should dominate the site-wide indicator.
  const sorted = [...active].sort((a, b) => b.riskScore - a.riskScore);
  const top = sorted.slice(0, Math.max(3, Math.round(sorted.length * 0.2)));
  const topAvg = top.reduce((s, n) => s + n.riskScore, 0) / top.length;
  const overallAvg = active.reduce((s, n) => s + n.riskScore, 0) / active.length;
  return Math.round(topAvg * 0.6 + overallAvg * 0.4);
}

export function generateDemoAlerts(nodes) {
  const alerts = [];
  const byZoneCritical = nodes.filter((n) => n.status === "critical");
  const byZoneWarning = nodes.filter((n) => n.status === "warning");

  byZoneCritical.slice(0, 2).forEach((n, i) => {
    alerts.push({
      id: `AL-C-${n.id}`,
      level: 3,
      levelLabel: "IMMEDIATE ACTION",
      zone: n.zone,
      nodes: [n.id],
      reason: "Rapid ground deformation and high anomaly score detected.",
      riskScore: n.riskScore,
      time: Date.now() - i * 240000,
    });
  });

  byZoneWarning.slice(0, 3).forEach((n, i) => {
    alerts.push({
      id: `AL-W-${n.id}`,
      level: 2,
      levelLabel: "EVACUATION STANDBY",
      zone: n.zone,
      nodes: [n.id],
      reason: "Increasing ground deformation trend detected.",
      riskScore: n.riskScore,
      time: Date.now() - (i + 2) * 360000,
    });
  });

  if (alerts.length < 4) {
    const watchNode = nodes.find((n) => n.status === "watch");
    if (watchNode) {
      alerts.push({
        id: `AL-A-${watchNode.id}`,
        level: 1,
        levelLabel: "ADVISORY",
        zone: watchNode.zone,
        nodes: [watchNode.id],
        reason: "Minor tilt variance outside of baseline range.",
        riskScore: watchNode.riskScore,
        time: Date.now() - 900000,
      });
    }
  }

  return alerts.sort((a, b) => b.level - a.level || b.time - a.time);
}

// Generates a short synthetic history series for a node's telemetry chart.
export function generateNodeHistory(node, hours = 24) {
  const points = [];
  const steps = Math.min(96, hours * 4); // one point every 15 min, capped
  let risk = Math.max(4, node.riskScore - 12);
  let disp = Math.max(0.005, node.displacement - 0.015);

  for (let i = steps; i >= 0; i -= 1) {
    const t = Date.now() - i * (hours * 3600000) / steps;
    risk += (Math.random() - 0.42) * 3;
    risk = Math.min(97, Math.max(2, risk));
    disp += (Math.random() - 0.4) * 0.003;
    disp = Math.max(0.002, disp);

    points.push({
      time: t,
      risk: Math.round(risk),
      displacement: +disp.toFixed(3),
      vibration: Math.round(10 + Math.random() * 20 + risk * 0.15),
      battery: Math.max(20, Math.round(node.battery + (i - steps / 2) * 0.05)),
    });
  }
  return points;
}
