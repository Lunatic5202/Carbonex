const PIPELINE_STAGES = [
  ["sensors", "Sensors"],
  ["loraMesh", "LoRa Mesh"],
  ["gateway", "Gateway"],
  ["mqtt", "MQTT"],
  ["database", "Database"],
  ["aiEngine", "AI Engine"],
  ["gis", "GIS"],
  ["alertEngine", "Alert Engine"],
];

const OK_VALUES = new Set([
  "online",
  "healthy",
  "connected",
  "running",
  "live",
  "ready",
]);

/**
 * Renders the Sensors -> LoRa -> Gateway -> MQTT -> DB -> AI -> GIS ->
 * Alerts pipeline as a row of health indicators. Values come from
 * apiService.getSystemStatus(), which returns simulated values today and
 * real health-check results from the backend once one exists.
 */
export default function SystemStatus({ systemStatus }) {
  return (
    <>
      {PIPELINE_STAGES.map(([key, label]) => {
        const value = systemStatus?.[key];
        const ok = OK_VALUES.has(value);
        return (
          <span className="pipeline-item" key={key}>
            <span className={`dot ${ok ? "dot-normal" : "dot-offline"}`} />
            <span className="label">{label}</span>
            <span className="mono">{(value || "—").toUpperCase()}</span>
          </span>
        );
      })}
    </>
  );
}
