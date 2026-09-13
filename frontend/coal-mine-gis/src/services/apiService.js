import { generateSensorNodes } from "../data/sensorData";
import {
  generateDemoAlerts,
  generateNodeHistory,
  overallRiskScore,
} from "../data/riskData";

/**
 * Backend-ready data access layer.
 *
 * Components only ever call functions from this file, never fetch() raw
 * services directly. Every getter first tries the live CarboNex REST API
 * (/api/nodes-positions, /api/nodes-summary, /api/history, /api/status) and
 * transparently falls back to local simulation data if the API is
 * unreachable, so the GIS always renders.
 *
 * Pipeline this fronts: Sensors -> LoRa/Zigbee -> RPi gateway -> MQTT ->
 * ingestion -> InfluxDB -> AI/ML (Isolation Forest + LSTM + spatial risk
 * classifier) -> this API -> GIS/dashboard.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

let _liveMode = false;
/** True once the last getNodes()/getSystemStatus() resolved live. */
export function getLiveMode() {
  return _liveMode;
}

async function liveFetch(path, { timeout = 5000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    const data = await res.json();
    clearTimeout(timer);
    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function simulateLatency(min = 120, max = 340) {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Local in-memory demo state so results stay consistent within a session.
let _nodesCache = null;
function seedNodes() {
  if (!_nodesCache) _nodesCache = generateSensorNodes();
  return _nodesCache;
}

const BAND_TO_STATUS = {
  NORMAL: "normal",
  WATCH: "watch",
  WARNING: "warning",
  CRITICAL: "critical",
};

/** Maps a /api/nodes-positions feature onto the module's sensor-node shape. */
export function liveNodesFromPayload(payload) {
  const features = Array.isArray(payload.nodes) ? payload.nodes : [];
  const gateway = payload.gateway || null;

  return features.map((f) => {
    const telemetry = f.telemetry || {};
    const score = typeof f.risk_score === "number" ? f.risk_score : 0;
    const active = f.status === "active";
    const band = (f.risk_band || "").toUpperCase();
    const status = active ? BAND_TO_STATUS[band] || "normal" : "offline";

    return {
      id: f.node_id,
      zone: (f.role || f.node_id || "NODE").toUpperCase(),
      lat: f.lat,
      lng: f.lng,
      status,
      carbonex: true,
      commissioned: active,
      bandLabel: active ? band : f.risk_band,
      statusColor: f.status_color || null,
      riskScore: Math.round(score),
      anomalyScore: Math.min(97, Math.round(score * 0.92 + 3)),
      tiltX: +(telemetry.tilt_deg || 0).toFixed(3),
      tiltY: +(telemetry.tilt_deg || 0).toFixed(3),
      vibration: Math.round((telemetry.vibration_mms || 0) * 50),
      displacement: +(telemetry.displacement_mm || 0).toFixed(3),
      strain: +(telemetry.strain_microstrain || 0).toFixed(1),
      battery: 92,
      temperature: 26,
      rssi: -62,
      seq: f.day || 0,
      lastUpdate: Date.now(),
      gatewayId: gateway?.id || "GW-01",
      hasGnss: false,
    };
  });
}

export async function getNodes() {
  try {
    const payload = await liveFetch("/api/nodes-positions");
    const nodes = liveNodesFromPayload(payload);
    if (!nodes.length) throw new Error("live payload empty");
    _liveMode = true;
    return nodes;
  } catch {
    _liveMode = false;
    await simulateLatency();
    return seedNodes();
  }
}

export async function getRiskZones() {
  try {
    const payload = await liveFetch("/api/nodes-positions");
    const nodes = liveNodesFromPayload(payload);
    if (!nodes.length) throw new Error("live payload empty");
    const active = nodes.filter((n) => n.status !== "offline");
    const overall = active.length
      ? Math.round(Math.max(...active.map((n) => n.riskScore)))
      : 0;
    return { overall, live: true };
  } catch {
    await simulateLatency();
    return { overall: overallRiskScore(seedNodes()), live: false };
  }
}

export async function getAlerts() {
  await simulateLatency();
  return generateDemoAlerts(seedNodes());
}

export async function getNodeHistory(nodeId, rangeHours = 24) {
  try {
    const rows = await liveFetch(`/api/history?node_id=${encodeURIComponent(nodeId)}`);
    if (Array.isArray(rows) && rows.length) {
      const lastDay = Math.max(...rows.map((r) => r.day || 0));
      return rows.map((r) => ({
        time: Date.now() - (lastDay - (r.day || 0)) * 86400000,
        day: r.day,
        risk: Math.round(r.predicted_risk_score || 0),
        riskBand: r.predicted_risk_band || null,
        displacement: +(r.displacement_mm || 0).toFixed(3),
        vibration: Math.round((r.vibration_mms || 0) * 50),
        battery: 92,
      }));
    }
    throw new Error("no history for node");
  } catch {
    await simulateLatency(150, 300);
    const node = seedNodes().find((n) => n.id === nodeId);
    return generateNodeHistory(node || seedNodes()[0], rangeHours);
  }
}

const DEMO_STATUS = {
  sensors: "online",
  loraMesh: "healthy",
  gateway: "online",
  mqtt: "connected",
  database: "connected",
  aiEngine: "running",
  gis: "live",
  alertEngine: "ready",
};

export async function getSystemStatus() {
  try {
    const [status, positions] = await Promise.all([
      liveFetch("/api/status"),
      liveFetch("/api/nodes-positions"),
    ]);
    const nodes = Array.isArray(positions.nodes) ? positions.nodes : [];
    const active = nodes.filter((n) => n.status === "active").length;
    _liveMode = true;
    return {
      live: true,
      sensors: active > 0 ? "online" : "offline",
      loraMesh: active > 0 ? "healthy" : "offline",
      gateway: positions.gateway ? "online" : "offline",
      mqtt: status.status === "online" ? "connected" : "offline",
      database: Number(status.total_records) > 0 ? "connected" : "offline",
      aiEngine: status.model_fitted ? "running" : "offline",
      gis: "live",
      alertEngine: "ready",
      nodeCount: nodes.length,
    };
  } catch {
    await simulateLatency(80, 180);
    return { ...DEMO_STATUS, live: false };
  }
}