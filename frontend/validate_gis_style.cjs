const { validateStyleMin, version } = require('@maplibre/maplibre-gl-style-spec');

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

const style = {
  version: 8,
  name: 'carbonex-gis-3d',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    nodes: { type: 'geojson', data: EMPTY_FC },
    critical: { type: 'geojson', data: EMPTY_FC },
    planned: { type: 'geojson', data: EMPTY_FC },
    gateway: { type: 'geojson', data: EMPTY_FC },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#04080a' } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.88, 'raster-fade-duration': 220 } },
    {
      id: 'risk-heat', type: 'heatmap', source: 'nodes', maxzoom: 18,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'risk_score'], 0, 0, 25, 0.12, 50, 0.36, 75, 0.62, 100, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3.2],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(16,185,129,0)', 0.35, 'rgba(16,185,129,0.35)', 0.55, 'rgba(245,158,11,0.5)', 0.75, 'rgba(249,115,22,0.68)', 1, 'rgba(239,68,68,0.85)'],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 26, 12, 48, 16, 68],
        'heatmap-opacity': 0.5,
      },
    },
    {
      id: 'critical-heat', type: 'heatmap', source: 'critical', maxzoom: 18,
      paint: {
        'heatmap-weight': ['get', 'risk'],
        'heatmap-intensity': 1.8,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(239,68,68,0)', 0.5, 'rgba(239,68,68,0.45)', 1, 'rgba(255,80,80,0.9)'],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 34, 16, 74],
        'heatmap-opacity': 0.9,
      },
    },
    {
      id: 'risk-extrusion', type: 'fill-extrusion', source: 'nodes', minzoom: 9,
      paint: {
        'fill-extrusion-base': 6,
        'fill-extrusion-height': ['interpolate', ['linear'], ['get', 'risk_score'], 0, 18, 25, 54, 50, 118, 75, 210, 100, 340],
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: 'planned-extrusion', type: 'fill-extrusion', source: 'planned', minzoom: 9,
      paint: {
        'fill-extrusion-base': 4,
        'fill-extrusion-height': 14,
        'fill-extrusion-color': '#64748B',
        'fill-extrusion-opacity': 0.3,
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: 'node-dots', type: 'circle', source: 'nodes',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6.5, 16, 12],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#0d1114',
        'circle-stroke-width': 2.5,
      },
    },
    {
      id: 'node-selected', type: 'circle', source: 'nodes', layout: {},
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 13, 16, 20],
        'circle-color': 'rgba(255,255,255,0)',
        'circle-stroke-color': '#7fffd4',
        'circle-stroke-width': 2.5,
      },
    },
    {
      id: 'planned-dots', type: 'circle', source: 'planned',
      paint: { 'circle-radius': 5, 'circle-color': '#94A3B8', 'circle-opacity': 0.85, 'circle-stroke-color': '#0d1114', 'circle-stroke-width': 1.5 },
    },
    {
      id: 'gateway-dot', type: 'circle', source: 'gateway',
      paint: { 'circle-radius': 8, 'circle-color': '#7fffd4', 'circle-opacity': 0.95, 'circle-stroke-color': '#12222a', 'circle-stroke-width': 3 },
    },
    {
      id: 'node-labels', type: 'symbol', source: 'nodes', minzoom: 10,
      layout: { 'text-field': ['get', 'node_id'], 'text-size': 10.5, 'text-offset': [0, -1.6], 'text-anchor': 'top', 'text-allow-overlap': false },
      paint: { 'text-color': '#eafcff', 'text-halo-color': 'rgba(3,7,9,0.95)', 'text-halo-width': 1.5 },
    },
    {
      id: 'planned-labels', type: 'symbol', source: 'planned', minzoom: 10,
      layout: { 'text-field': ['get', 'node_id'], 'text-size': 9.5, 'text-offset': [0, -1.4], 'text-anchor': 'top', 'text-allow-overlap': false },
      paint: { 'text-color': '#cbd5e1', 'text-halo-color': 'rgba(3,7,9,0.85)', 'text-halo-width': 1.2 },
    },
    {
      id: 'gateway-labels', type: 'symbol', source: 'gateway', minzoom: 9,
      layout: { 'text-field': 'GATEWAY', 'text-size': 9, 'text-offset': [0, 1.4], 'text-anchor': 'bottom' },
      paint: { 'text-color': '#7fffd4', 'text-halo-color': 'rgba(3,7,9,0.9)', 'text-halo-width': 1.2 },
    },
  ],
};

const errors = validateStyleMin(style);
if (errors.length) {
  console.log('STYLE VALIDATION ERRORS:');
  errors.forEach((e, i) => console.log(`${i}: [${e.level}] ${e.message} (${e.line}, ${e.column})`));
} else {
  console.log('Style valid (spec version', version + ')');
}