/**
 * SITE GEOMETRY — DEMO SHAPES RE-CENTRED ONTO THE LIVE CARBONEX SITE
 * -----------------------------------------------------------------------
 * The polygon/infrastructure shapes below are hand-drawn demo geometry (NOT
 * an approved mine survey). They are translated at module-load time so the
 * scene frames the real Raniganj Panel 5–9 node cluster with live CarboNex
 * risk data. Replace `SRC` shapes with actual GeoJSON before operational use.
 */

export const SITE_CENTER = [23.6185, 87.1185]; // Raniganj coalfield (real node cluster)

// Original hand-drawn demo shapes sketched near Jharia (for reference).
// Shifted by DELTA below so the overlays sit around the live site.
const SRC = {
  boundary: [
    [23.7505, 86.4025],
    [23.7522, 86.4098],
    [23.7508, 86.4175],
    [23.7462, 86.4215],
    [23.7398, 86.4198],
    [23.7362, 86.4142],
    [23.7368, 86.4068],
    [23.7412, 86.4012],
    [23.7468, 86.3998],
    [23.7505, 86.4025],
  ],
  pit: [
    [23.746, 86.407],
    [23.7472, 86.4105],
    [23.7458, 86.4145],
    [23.742, 86.4158],
    [23.7385, 86.4132],
    [23.738, 86.409],
    [23.7405, 86.4062],
    [23.7438, 86.4055],
    [23.746, 86.407],
  ],
  assets: [
    { id: "CRUSHER-1", type: "crusher", label: "Primary Crusher", pos: [23.7488, 86.4183] },
    { id: "STOCKYARD-1", type: "stockyard", label: "Coal Stockyard", pos: [23.7515, 86.4145] },
    { id: "WORKSHOP-1", type: "workshop", label: "Heavy Vehicle Workshop", pos: [23.7395, 86.4205] },
    { id: "OFFICE-1", type: "office", label: "Site Office", pos: [23.7478, 86.4045] },
  ],
  roads: [
    {
      id: "HR-01",
      label: "Pit → Crusher",
      path: [
        [23.746, 86.409],
        [23.7472, 86.4115],
        [23.7482, 86.4145],
        [23.7488, 86.4183],
      ],
    },
    {
      id: "HR-02",
      label: "Pit → Stockyard",
      path: [
        [23.7458, 86.4128],
        [23.7478, 86.4132],
        [23.7498, 86.4138],
        [23.7515, 86.4145],
      ],
    },
    {
      id: "HR-03",
      label: "Pit → Workshop",
      path: [
        [23.739, 86.4132],
        [23.7385, 86.4165],
        [23.7392, 86.4195],
        [23.7395, 86.4205],
      ],
    },
    {
      id: "HR-04",
      label: "Pit → Site Office",
      path: [
        [23.7405, 86.4062],
        [23.7432, 86.4055],
        [23.7458, 86.4048],
        [23.7478, 86.4045],
      ],
    },
  ],
  gateway: {
    id: "GW-01",
    label: "Raspberry Pi Gateway",
    pos: [23.7448, 86.412],
  },
};

// Concentric depth rings used to fake excavation depth shading inside the pit
export const PIT_DEPTH_RINGS = [1, 0.78, 0.56, 0.34];

function centroid(points) {
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lng = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [lat, lng];
}

const DEMO_CENTER = [
  (centroid(SRC.boundary)[0] + centroid(SRC.pit)[0]) / 2,
  (centroid(SRC.boundary)[1] + centroid(SRC.pit)[1]) / 2,
];

// Re-centre every demo shape onto the live Raniganj node cluster.
export const SHIFT = Object.freeze({
  lat: SITE_CENTER[0] - DEMO_CENTER[0],
  lng: SITE_CENTER[1] - DEMO_CENTER[1],
});

const shift = ([lat, lng]) => [lat + SHIFT.lat, lng + SHIFT.lng];

export const MINE_SITE = {
  name: "Raniganj Panel 5–9 (CarboNex Live)",
  district: "Paschim Bardhaman, West Bengal, India",
  center: SITE_CENTER,
  defaultZoom: 15,
};

// Mine lease / panel boundary — shifted demo polygon around the live site
export const MINE_BOUNDARY = SRC.boundary.map(shift);

// Open-pit excavation — shifted demo polygon inside the boundary
export const OPEN_PIT = SRC.pit.map(shift);

// Mine infrastructure point assets
export const MINE_ASSETS = SRC.assets.map((a) => ({ ...a, pos: shift(a.pos) }));

// Haul roads — curved routes connecting pit to infrastructure (poly-lines)
export const HAUL_ROADS = SRC.roads.map((r) => ({ ...r, path: r.path.map(shift) }));

// Gateway (Raspberry Pi edge gateway) location
export const GATEWAY = { ...SRC.gateway, pos: shift(SRC.gateway.pos) };

export const DEMO_DATA_NOTICE =
  "Geometry is demo — replace with approved mine survey. Live risk feeds from CarboNex /api.";