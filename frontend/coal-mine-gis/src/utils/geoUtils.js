// Small geometry helpers shared across map layers. Kept dependency-free so
// they work the same whether fed demo data or real GeoJSON later.

export function haversineMeters([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function polygonCentroid(points) {
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lng = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [lat, lng];
}

// Shrinks a polygon toward its centroid by a factor (0-1). Used to draw
// concentric "depth" rings inside the open pit without needing real DEM data.
export function shrinkPolygon(points, factor) {
  const [cLat, cLng] = polygonCentroid(points);
  return points.map(([lat, lng]) => [
    cLat + (lat - cLat) * factor,
    cLng + (lng - cLng) * factor,
  ]);
}

export function isValidLatLng(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function parseCoordinateString(input) {
  const match = input
    .trim()
    .match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[3]);
  return isValidLatLng(lat, lng) ? [lat, lng] : null;
}
