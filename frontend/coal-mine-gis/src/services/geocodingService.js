import { parseCoordinateString } from "../utils/geoUtils";

const BASE_URL =
  import.meta.env.VITE_GEOCODER_BASE_URL || "https://nominatim.openstreetmap.org";

/**
 * Searches for a place name or accepts a raw "lat, lng" string.
 * Uses the public Nominatim endpoint — no API key required, but please
 * respect Nominatim's usage policy (low request volume, identify your app)
 * if this is deployed beyond local demo use.
 */
export async function searchLocation(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const coordMatch = parseCoordinateString(trimmed);
  if (coordMatch) {
    return [
      {
        id: `coord-${trimmed}`,
        label: `${coordMatch[0].toFixed(4)}, ${coordMatch[1].toFixed(4)}`,
        lat: coordMatch[0],
        lng: coordMatch[1],
        type: "coordinate",
      },
    ];
  }

  try {
    const url = `${BASE_URL}/search?format=json&limit=6&q=${encodeURIComponent(
      trimmed
    )}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
    const data = await res.json();
    return data.map((item) => ({
      id: item.place_id,
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (err) {
    console.warn("[geocodingService] search failed:", err.message);
    return [];
  }
}
