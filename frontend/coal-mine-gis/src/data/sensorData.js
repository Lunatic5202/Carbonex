import { OPEN_PIT, GATEWAY, SHIFT } from "./mineData";

/**
 * Generates a realistic-looking grid of demo sensor nodes distributed
 * around the open pit perimeter and across the panel. Values are seeded
 * pseudo-randomly (not truly random) so the demo layout is stable across
 * reloads but still looks organic rather than a perfect grid.
 */

// Deterministic pseudo-random generator (mulberry32) so the demo layout
// is stable between reloads instead of reshuffling every refresh.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1337);

function centroid(polygon) {
  const lat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
  const lng = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
  return [lat, lng];
}

const PIT_CENTER = centroid(OPEN_PIT);

// A handful of "hot" clusters where deformation/risk will be seeded higher,
// simulating known geotechnically sensitive zones (e.g. old goaf areas).
const RISK_HOTSPOTS = [
  { pos: [23.742 + SHIFT.lat, 86.4155 + SHIFT.lng], radius: 0.0035, boost: 46 },
  { pos: [23.7455 + SHIFT.lat, 86.4075 + SHIFT.lng], radius: 0.003, boost: 22 },
];

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function riskBoostAt(pos) {
  let boost = 0;
  for (const spot of RISK_HOTSPOTS) {
    const d = distance(pos, spot.pos);
    if (d < spot.radius) {
      boost += spot.boost * (1 - d / spot.radius);
    }
  }
  return boost;
}

function classify(riskScore) {
  if (riskScore >= 80) return "critical";
  if (riskScore >= 60) return "warning";
  if (riskScore >= 35) return "watch";
  return "normal";
}

const NODE_COUNT = 42;
const ZONE_LABELS = ["A", "B", "C", "D", "E", "F"];

function buildNode(index) {
  const angle = rand() * Math.PI * 2;
  const ring = 0.0018 + rand() * 0.0075;
  const lat = PIT_CENTER[0] + Math.sin(angle) * ring * 1.05;
  const lng = PIT_CENTER[1] + Math.cos(angle) * ring;
  const pos = [lat, lng];

  const zone = `${ZONE_LABELS[index % ZONE_LABELS.length]}-${String(
    Math.floor(index / ZONE_LABELS.length) + 1
  ).padStart(2, "0")}`;

  const boost = riskBoostAt(pos);
  const baseRisk = Math.round(6 + rand() * 20 + boost);
  const riskScore = Math.min(97, baseRisk);
  const anomalyScore = Math.min(
    97,
    Math.round(riskScore * (0.7 + rand() * 0.3))
  );

  // Occasionally take a node offline in the demo baseline
  const offline = rand() < 0.045;

  const status = offline ? "offline" : classify(riskScore);

  return {
    id: `NODE-${zone}`,
    zone,
    lat,
    lng,
    status,
    tiltX: +(rand() * 0.6 - 0.3 + boost * 0.01).toFixed(3),
    tiltY: +(rand() * 0.5 - 0.25).toFixed(3),
    vibration: Math.round(8 + rand() * 20 + boost * 0.6),
    displacement: +(0.01 + rand() * 0.05 + boost * 0.001).toFixed(3),
    battery: Math.round(55 + rand() * 44),
    temperature: Math.round(24 + rand() * 12),
    rssi: -1 * Math.round(48 + rand() * 42),
    seq: Math.round(rand() * 90000),
    anomalyScore,
    riskScore,
    lastUpdate: Date.now() - Math.round(rand() * 60000),
    gatewayId: GATEWAY.id,
    hasGnss: rand() > 0.4,
  };
}

export function generateSensorNodes() {
  return Array.from({ length: NODE_COUNT }, (_, i) => buildNode(i));
}

// Build a simple mesh topology: each node relays through its 1-2 nearest
// neighbours toward the gateway, purely for visualizing the LoRa mesh —
// this is a topology sketch, not a real routing computation.
export function buildHopTrace(node, allNodes) {
  const others = allNodes
    .filter((n) => n.id !== node.id && n.status !== "offline")
    .map((n) => ({ n, d: distance([node.lat, node.lng], [n.lat, n.lng]) }))
    .sort((a, b) => a.d - b.d);

  const relay = others[0]?.n;
  const trace = [node.id];
  if (relay && distance([node.lat, node.lng], GATEWAY.pos) > 0.006) {
    trace.push(relay.id);
  }
  trace.push("GATEWAY");
  return trace;
}

export const STATUS_ORDER = ["critical", "warning", "watch", "normal", "offline"];

export { classify as classifyRisk };
