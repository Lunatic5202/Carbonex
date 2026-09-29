/**
 * Deterministic synthetic telemetry for TEST DATA mode.
 *
 * The generator reproduces the shape and scale of
 * scored_subsidence_sensor_data.csv — a slow nominal baseline that rolls into an
 * accelerating subsidence event — so the live monitor, analytics, and event
 * replay stay visually consistent with the calibrated model instead of showing
 * flat placeholder numbers.
 *
 * Risk scoring mirrors subsidence_model.py:
 *   risk = clip(15 + sum(weight * normalized_anomaly) * 85, 0, 100)
 * with the same 4-tier band boundaries.
 */

export const TEST_NODE_ID = 'CarboNex Data Node';

/** Layer 3 fusion weights, kept in sync with subsidence_model.DEFAULT_WEIGHTS. */
export const RISK_WEIGHTS = {
  tilt_deg: 0.30,
  displacement_mm: 0.25,
  strain_microstrain: 0.30,
  vibration_mms: 0.15
};

export const BAND_COLORS = {
  NORMAL: '#10B981',
  WATCH: '#F59E0B',
  WARNING: '#F97316',
  CRITICAL: '#EF4444'
};

const SENSOR_LABELS = {
  tilt_deg: 'Angular Tilt',
  displacement_mm: 'Linear Displacement',
  strain_microstrain: 'Structural Strain',
  vibration_mms: 'Vibration Velocity'
};

/**
 * Top of the nominal operating envelope per channel. Readings are normalized
 * against these so a synthetic composite anomaly lands in the same 0-1 range as
 * the Isolation Forest scores produced server-side.
 */
const ENVELOPE = {
  tilt_deg: 6.0,
  displacement_mm: 12.0,
  strain_microstrain: 900.0,
  vibration_mms: 4.5
};

const HISTORY_DAYS = 365;

/** How often the live monitor advances one day of the synthetic event. */
export const TEST_LIVE_STEP_MS = 2200;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, dp) => Number(v.toFixed(dp));

/** Small deterministic PRNG so a given node always yields the same event. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 4-tier domain band, identical to subsidence_model.get_risk_band. */
export function getRiskBand(score) {
  if (score <= 25) return 'NORMAL';
  if (score <= 50) return 'WATCH';
  if (score <= 75) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Weighted sensor-fusion risk estimate over a raw reading set.
 * Returns the score, band, and per-sensor anomaly contributions.
 */
export function estimateRisk(readings) {
  const sensor_scores = {};
  let composite = 0;

  for (const sensor of Object.keys(RISK_WEIGHTS)) {
    const raw = Math.max(0, Number(readings?.[sensor]) || 0);
    const normalized = clamp(raw / ENVELOPE[sensor], 0, 1);
    // Softened response curve so early drift registers before the channel saturates.
    const anomaly = Math.pow(normalized, 0.65);
    sensor_scores[sensor] = round(anomaly, 4);
    composite += RISK_WEIGHTS[sensor] * anomaly;
  }

  const risk_score = round(clamp(15 + composite * 85, 0, 100), 1);
  return {
    risk_score,
    risk_band: getRiskBand(risk_score),
    sensor_scores
  };
}

/**
 * Plain-language diagnostic, mirroring the band-specific copy emitted by
 * SubsidenceSensorFusion._build_diagnostic_report.
 */
export function buildTestDiagnostic(nodeId, readings, risk, trend = {}) {
  const contributions = Object.keys(RISK_WEIGHTS).map(sensor => ({
    sensor,
    value: sensor_scores_value(risk, sensor) * RISK_WEIGHTS[sensor]
  }));
  const total = contributions.reduce((sum, c) => sum + c.value, 0) + 1e-6;
  const top = contributions.reduce((a, b) => (b.value > a.value ? b : a));
  const driver = SENSOR_LABELS[top.sensor] || top.sensor;
  const driver_pct = round((top.value / total) * 100, 0);
  const slope = trend.slope ?? 0;
  const accel = trend.accel ?? 0;
  const node = nodeId || TEST_NODE_ID;

  if (risk.risk_band === 'NORMAL') {
    return {
      status_color: BAND_COLORS.NORMAL,
      primary_driver: 'Nominal Baseline',
      driver_contribution_pct: 0,
      summary: `Node ${node} is operating within nominal baseline parameters. All sensor channels show stable background telemetry with negligible drift.`,
      recommendation: 'Standard automated monitoring. No immediate maintenance intervention required.'
    };
  }

  if (risk.risk_band === 'WATCH') {
    return {
      status_color: BAND_COLORS.WATCH,
      primary_driver: driver,
      driver_contribution_pct: driver_pct,
      summary: `Elevated telemetry detected on Node ${node}. ${driver} is the primary driver (anomaly score: ${round(risk.sensor_scores[top.sensor], 2)}, accounting for ${driver_pct}% of risk). Observed trend slope is ${slope >= 0 ? '+' : ''}${round(slope, 3)} per unit time.`,
      recommendation: 'Increase sampling frequency to hourly. Verify sensor mounting stability and inspect local geological logs.'
    };
  }

  if (risk.risk_band === 'WARNING') {
    return {
      status_color: BAND_COLORS.WARNING,
      primary_driver: driver,
      driver_contribution_pct: driver_pct,
      summary: `Significant subsidence progression observed at Node ${node}. ${driver} exhibits accelerated deformation (slope ${slope >= 0 ? '+' : ''}${round(slope, 2)}, acceleration ${accel >= 0 ? '+' : ''}${round(accel, 2)}). Multiple channels show synchronous departure from early baseline.`,
      recommendation: 'Dispatch geotechnical engineering team for field inspection within 24–48 hours. Alert operations supervisor and assess surrounding slope stability.'
    };
  }

  return {
    status_color: BAND_COLORS.CRITICAL,
    primary_driver: driver,
    driver_contribution_pct: driver_pct,
    summary: `CRITICAL SUBSIDENCE ALERT: Node ${node} is experiencing severe structural deformation! ${driver} reading (${round(readings?.[top.sensor] || 0, 2)}) and composite risk (${risk.risk_score}/100) indicate imminent slope failure or ground rupture hazard.`,
    recommendation: 'IMMEDIATE ACTION: Restrict personnel access to affected perimeter. Trigger Level 1 evacuation protocol and enact emergency slope stabilization countermeasures.'
  };
}

function sensor_scores_value(risk, sensor) {
  return risk?.sensor_scores?.[sensor] ?? 0;
}

const historyCache = new Map();

/**
 * A full 365-day synthetic subsidence event for a node: quiet baseline, then a
 * smooth onset that accelerates through WATCH, WARNING, and into CRITICAL.
 */
export function getTestHistory(nodeId) {
  const id = nodeId || TEST_NODE_ID;
  if (historyCache.has(id)) return historyCache.get(id);

  const rand = mulberry32(hashString(id));
  const onsetDay = 110 + Math.floor(rand() * 70);
  const peakDay = onsetDay + 130 + Math.floor(rand() * 90);
  const records = [];

  for (let day = 1; day <= HISTORY_DAYS; day += 1) {
    const raw = clamp((day - onsetDay) / (peakDay - onsetDay), 0, 1);
    const progress = raw * raw * (3 - 2 * raw); // smoothstep
    const noise = (rand() - 0.5) * 0.08;

    const readings = {
      tilt_deg: round(Math.max(0, (0.15 + progress * 5.6) * (1 + noise)), 3),
      displacement_mm: round(Math.max(0, (0.7 + Math.pow(progress, 1.4) * 11) * (1 + noise)), 3),
      strain_microstrain: round(Math.max(5, (30 + Math.pow(progress, 1.6) * 850) * (1 + noise * 1.4)), 1),
      vibration_mms: round(Math.max(0, (0.08 + progress * 4.2) * (1 + noise * 2)), 3)
    };

    const risk = estimateRisk(readings);
    records.push({
      node_id: id,
      day,
      ...readings,
      predicted_risk_score: risk.risk_score,
      predicted_risk_band: risk.risk_band
    });
  }

  historyCache.set(id, records);
  return records;
}

/**
 * A single live telemetry packet, walking through the synthetic event so the
 * monitor visibly escalates. Shaped like a record from GET /api/live-nodes.
 */
export function getTestLiveNode(nodeId, elapsedMs) {
  const id = nodeId || TEST_NODE_ID;
  const history = getTestHistory(id);
  const step = Math.max(0, Math.floor(elapsedMs / TEST_LIVE_STEP_MS));
  const rec = history[step % history.length];
  const previous = history[Math.max(0, (step % history.length) - 1)];

  const readings = {
    tilt_deg: rec.tilt_deg,
    displacement_mm: rec.displacement_mm,
    strain_microstrain: rec.strain_microstrain,
    vibration_mms: rec.vibration_mms
  };
  const risk = estimateRisk(readings);
  const driverSensor = Object.keys(RISK_WEIGHTS).reduce(
    (a, b) => (RISK_WEIGHTS[b] * risk.sensor_scores[b] > RISK_WEIGHTS[a] * risk.sensor_scores[a] ? b : a),
    'tilt_deg'
  );
  const trend = {
    slope: rec.day > 1 ? round(rec.tilt_deg - previous.tilt_deg, 3) : 0,
    accel: 0
  };

  // Raw ESP32 channels, mirroring what the firmware posts to /endpoint.
  const tiltX = Math.round(rec.tilt_deg * 620);
  const tiltY = Math.round(rec.tilt_deg * 430);
  const receivedAt = new Date(Date.now() - (elapsedMs % TEST_LIVE_STEP_MS)).toISOString();

  return {
    ...readings,
    node_id: id,
    seq: 1000 + step,
    tilt_x: tiltX,
    tilt_y: tiltY,
    temp: round(27 + Math.sin(step / 9) * 3 + rec.tilt_deg * 0.4, 1),
    batt: round(clamp(96 - (step % history.length) * 0.06, 41, 100), 1),
    vib: rec.vibration_mms,
    crack: rec.displacement_mm,
    rssi: Math.round(-64 - Math.sin(step / 5) * 9 - (risk.risk_score / 100) * 12),
    risk_score: risk.risk_score,
    risk_band: risk.risk_band,
    status_color: BAND_COLORS[risk.risk_band],
    primary_driver: SENSOR_LABELS[driverSensor],
    summary: buildTestDiagnostic(id, readings, risk, trend).summary,
    recommendation: buildTestDiagnostic(id, readings, risk, trend).recommendation,
    sensor_scores: risk.sensor_scores,
    received_at: receivedAt,
    source: 'test-generator',
    packets_received: step + 1,
    status: 'online'
  };
}

/** Full prediction payload, shaped like POST /api/predict. */
export function getTestPrediction(nodeId, readings) {
  const risk = estimateRisk(readings);
  const diagnostic = buildTestDiagnostic(nodeId, readings, risk);
  return {
    node_id: nodeId || TEST_NODE_ID,
    ...risk,
    ...diagnostic,
    sensor_readings: readings,
    sensor_trends: {}
  };
}
