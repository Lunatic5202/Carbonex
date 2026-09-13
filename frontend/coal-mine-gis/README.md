# Coal Mine Intelligence — GIS Subsidence Monitoring & Early Warning System

A React + Leaflet + three.js GIS front-end for a coal-mine ground-subsidence
early-warning platform. This repository is the **GIS / dashboard layer** of
a larger hardware + software pipeline:

```
Sensor Nodes -> LoRa/Zigbee Mesh -> Raspberry Pi Edge Gateway -> MQTT ->
Data Ingestion & Validation -> InfluxDB -> AI/ML Engine (Isolation Forest +
LSTM + spatial risk classifier) -> GIS (this app) -> Alerts/Reports ->
Dashboard -> Model Retraining
```

**⚠️ This app currently runs entirely on simulated / demo data.** No real
sensors, MQTT broker, InfluxDB, or AI service are connected. Every screen is
clearly marked as demo/simulation — see "Demo mode" below.

---

## 1. Project overview

The app visualises:

- Mine lease boundary, open pit, haul roads, infrastructure
- Public roads, railways, waterways (loaded from OpenStreetMap/Overpass)
- A simulated network of ~40 sensor nodes (tilt, vibration, displacement,
  battery, RSSI, GNSS) with live-looking status changes
- The Raspberry Pi gateway and a schematic LoRa mesh communication layer
- AI-style outputs: anomaly score, risk score, a risk heatmap, a
  deformation heatmap, predicted-subsidence zones, deformation vectors
- An alert center (Advisory / Evacuation Standby / Immediate Action)
- Per-node historical charts with 6h/24h/7d/30d ranges
- A simplified historical timeline scrubber
- A system pipeline status strip (Sensors → LoRa → Gateway → MQTT → DB →
  AI → GIS → Alerts)
- An optional 3D terrain view of the pit and sensor network

## 2. Architecture

```
coal-mine-gis/
├── package.json
├── vite.config.js
├── index.html
├── .env.example
├── public/
│   └── data/                     # example GeoJSON — replace with real survey data
│       ├── mine-boundary.geojson
│       ├── pit.geojson
│       ├── roads.geojson
│       ├── sensors.geojson
│       └── waterways.geojson
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/
    │   ├── layout/        Header, Sidebar, StatusBar
    │   ├── map/           MineMap + every Leaflet layer + Terrain3D
    │   ├── panels/        LayerControl, Legend, NodeDetails, AlertPanel,
    │   │                  MineOperations, SystemStatus, TimeSlider
    │   ├── charts/        SensorChart (recharts)
    │   └── ui/            Badge, StatCard, Modal
    ├── data/              mineData.js, sensorData.js, riskData.js (demo data)
    ├── services/          geocodingService, osmService, apiService
    ├── hooks/              useSensorSimulation, useMapLayers
    ├── utils/              riskUtils, geoUtils, formatters
    └── styles/             global.css, dashboard.css, map.css
```

**Data flow rule:** components never call `fetch()` directly. Everything
goes through `src/services/apiService.js`, `geocodingService.js`, or
`osmService.js`. This is what makes it possible to swap mock data for a
real backend later without touching any component.

## 3. Tech stack

- React 18 + Vite
- Leaflet + react-leaflet (2D map)
- leaflet.heat (risk / deformation heatmaps)
- three.js (optional 3D terrain view, hand-rolled camera controls — no
  OrbitControls import, so there's nothing extra to configure)
- recharts (sensor history charts)
- lucide-react (icons)

## 4. Required software

- **Node.js 18 LTS or newer** (20/22 also fine)
- **VS Code** (any recent version)
- Recommended VS Code extensions: *ES7+ React/Redux/React-Native snippets*,
  *ESLint* — optional, not required to run the app
- npm (ships with Node.js)

## 5. Installation

```bash
# 1. Create the Vite React project (or just use this folder as-is if you
#    copy-pasted every file into a folder called coal-mine-gis)
npm create vite@latest coal-mine-gis -- --template react
cd coal-mine-gis

# 2. Install dependencies
npm install
npm install leaflet react-leaflet leaflet.heat recharts lucide-react three
```

If you're copying the files from this delivery directly (recommended —
they already include `package.json` with every dependency listed), just
run:

```bash
cd coal-mine-gis
npm install
```

## 6. Setup sequence (manual copy-paste into VS Code)

1. Create a folder `coal-mine-gis` and open it in VS Code.
2. Recreate the folder structure shown in section 2.
3. Create every file listed above and paste in its contents.
4. Open a terminal in VS Code (`` Ctrl+` ``) and run `npm install`.
5. Run `npm run dev`.
6. Open the URL Vite prints (usually `http://localhost:5173`).
7. Confirm the map loads with the mine boundary, pit, and sensor nodes
   visible, and walk through the verification checklist in section 11.

## 7. Environment variables

Copy `.env.example` to `.env` — the app runs immediately with it blank:

```bash
cp .env.example .env
```

```text
VITE_API_BASE_URL=        # backend REST API base URL (blank = demo mode)
VITE_WS_URL=              # backend WebSocket/SSE URL for live push updates
VITE_GEOCODER_BASE_URL=https://nominatim.openstreetmap.org
VITE_OVERPASS_URL=https://overpass-api.de/api/interpreter
```

**Never put MQTT broker credentials, InfluxDB tokens, or any private API
key in this file or anywhere in `src/`.** Those belong exclusively on the
backend/gateway, never in frontend source shipped to a browser.

## 8. Demo mode

Every screen carries a visible **LIVE SIMULATION** indicator (bottom status
bar) and the app never claims its coordinates are an approved mine survey.
`src/data/mineData.js`, `sensorData.js`, and `riskData.js` are the only
places demo values are generated — swap their contents for real data
without touching any component.

## 9. Replacing demo data with real GIS data

- Replace the files in `public/data/*.geojson` with your actual
  QGIS/Shapefile-converted GeoJSON exports.
- Replace the hard-coded arrays in `src/data/mineData.js`
  (`MINE_BOUNDARY`, `OPEN_PIT`, `HAUL_ROADS`, `MINE_ASSETS`, `GATEWAY`)
  with geometry loaded from those GeoJSON files (e.g. via `fetch('/data/mine-boundary.geojson')`
  in a small loader, or by importing them directly since Vite can import
  JSON).
- Sensor node data (`src/data/sensorData.js`) should ultimately come from
  `apiService.getNodes()` instead of the local generator — see below.

## 10. Backend integration

Everything the GIS needs is expressed as functions in
`src/services/apiService.js`:

```js
apiService.getNodes();
apiService.getRiskZones();
apiService.getAlerts();
apiService.getNodeHistory(nodeId, rangeHours);
apiService.getSystemStatus();
```

Today each function resolves from local mock/simulation data. To connect a
real backend:

1. Stand up a backend service that reads from InfluxDB and your AI
   pipeline's output (Isolation Forest anomaly scores, LSTM deformation
   predictions, spatial risk classification).
2. Expose REST endpoints (or a WebSocket/SSE stream) matching the shapes
   currently returned by the mock functions.
3. Replace each function body in `apiService.js` with a `fetch()` call to
   `import.meta.env.VITE_API_BASE_URL`, keeping the same return shape.
4. Nothing in `components/`, `hooks/`, or `App.jsx` needs to change.

**Do not connect React directly to InfluxDB or an MQTT broker.** MQTT and
database credentials belong on the gateway/backend, never in the browser.

### Expected data shapes

```ts
Node = {
  id, zone, lat, lng, status, tiltX, tiltY, vibration, displacement,
  battery, temperature, rssi, seq, anomalyScore, riskScore,
  lastUpdate, gatewayId, hasGnss
}

Alert = {
  id, level (1|2|3), levelLabel, zone, nodes: [nodeId], reason,
  riskScore, time
}

HistoryPoint = { time, risk, displacement, vibration, battery }

SystemStatus = {
  sensors, loraMesh, gateway, mqtt, database, aiEngine, gis, alertEngine
}
```

## 11. Verification checklist

```text
[ ] Map loads
[ ] Mine boundary visible
[ ] Open pit visible (with depth shading)
[ ] Haul roads visible
[ ] Sensor nodes visible with colour-coded, pulsing status markers
[ ] Clicking a node opens the Node Details panel with live-updating charts
[ ] Layers toggle correctly from the sidebar
[ ] Risk heatmap and deformation layer toggle independently
[ ] Simulation updates node values every few seconds without a page reload
[ ] Search finds a place name or "lat, lng" and flies the map to it
[ ] Alerts panel shows demo alerts and clicking one selects the node
[ ] Charts render 6h/24h/7d/30d ranges for a selected node
[ ] Switching to 3D TERRAIN renders a rotatable pit/sensor scene, or shows
    a graceful fallback message if WebGL is unavailable
```

## 12. Troubleshooting

- **Blank map / grey tiles:** check your internet connection — base map
  tiles and Overpass/Nominatim requests require network access. The app
  itself won't crash if any of these fail; you'll see a small toast instead.
- **"leaflet.heat" errors:** make sure `leaflet` and `leaflet.heat` are
  both listed in `package.json` and reinstall with `npm install`.
- **3D view is blank or shows a fallback message:** your browser/GPU may
  not support WebGL, or hardware acceleration is disabled. Use 2D MAP mode.
- **Port already in use:** change the port in `vite.config.js` or run
  `npm run dev -- --port 5174`.

## 13. Production considerations

- Replace demo geometry and sensor data with real survey/GeoJSON and a
  live backend as described in sections 9–10 before any operational use.
- The historical timeline (`TimeSlider`) is intentionally simplified — a
  production build should replace its synthetic trend with a real
  time-range query against `apiService.getNodeHistory`/InfluxDB per zone.
- Consider server-side clustering of sensor markers if the real deployment
  has hundreds of nodes, to keep the map smooth.
- Add authentication/authorization on the backend before exposing any of
  this outside a trusted network — the current app assumes an
  already-authenticated operator.

---

## Pipeline-to-GIS traceability

| Pipeline stage           | GIS / software representation                     |
|---------------------------|----------------------------------------------------|
| Sensor nodes              | Interactive sensor markers (`SensorLayer`)         |
| Tilt                      | Node telemetry grid + history chart                |
| Vibration                 | Node telemetry + anomaly visualization              |
| Crack/displacement        | `DeformationLayer` heatmap + telemetry + charts     |
| GNSS                      | Spatial node location (`hasGnss` flag)              |
| LoRa mesh                 | `CommunicationLayer` topology + hop trace           |
| Raspberry Pi gateway      | `GatewayMarker` + gateway popup status              |
| MQTT                      | `SystemStatus` pipeline strip                       |
| InfluxDB                  | `apiService.getNodeHistory` abstraction             |
| Isolation Forest          | `anomalyScore` field + Node Details panel           |
| LSTM                      | `PredictedSubsidence` layer                         |
| Spatial risk classifier   | `RiskHeatmap` + `RiskZones` + `riskScore`           |
| GIS                       | The mine map (`MineMap`) + spatial analytics layers |
| Early warning             | `AlertPanel` alert center                           |
| Dashboard                 | This React application (`App.jsx`)                  |
| Retraining                | Represented conceptually via `SystemStatus`/README  |
