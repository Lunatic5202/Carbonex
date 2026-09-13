const OVERPASS_URL =
  import.meta.env.VITE_OVERPASS_URL || "https://overpass-api.de/api/interpreter";

/**
 * Loads public roads / railways / waterways around a point from the
 * Overpass API, converted to simple polyline arrays of [lat, lng].
 * All failures are caught and return an empty result set — the map must
 * keep working even when Overpass is unreachable or rate-limited.
 */
export async function fetchPublicContext([lat, lng], radiusMeters = 1500) {
  const query = `
    [out:json][timeout:20];
    (
      way["highway"](around:${radiusMeters},${lat},${lng});
      way["railway"](around:${radiusMeters},${lat},${lng});
      way["waterway"](around:${radiusMeters},${lat},${lng});
      way["natural"="water"](around:${radiusMeters},${lat},${lng});
    );
    out body geom;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
    });
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
    const data = await res.json();
    return groupElements(data.elements || []);
  } catch (err) {
    console.warn("[osmService] Overpass fetch failed:", err.message);
    return { roads: [], railways: [], waterways: [] };
  }
}

function groupElements(elements) {
  const roads = [];
  const railways = [];
  const waterways = [];

  for (const el of elements) {
    if (!el.geometry) continue;
    const path = el.geometry.map((pt) => [pt.lat, pt.lon]);
    if (path.length < 2) continue;

    if (el.tags?.highway) roads.push({ id: el.id, path });
    else if (el.tags?.railway) railways.push({ id: el.id, path });
    else if (el.tags?.waterway || el.tags?.natural === "water")
      waterways.push({ id: el.id, path });
  }

  return { roads, railways, waterways };
}
