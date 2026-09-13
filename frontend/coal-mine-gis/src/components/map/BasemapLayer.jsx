import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Keyless basemap providers (no API keys, reliable in browsers): OSM street
 * and Esri satellite. A manual switch is layered on top of an automatic
 * fallback chain so the map never blanks. CARTO dark removed — it now
 * requires an API key.
 */
export const BASEMAP_OPTIONS = [
  {
    key: "street",
    label: "Street",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc",
  },
  {
    key: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/en-us/legal/terms/full-master-agreement">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    subdomains: "abc",
  },
];

export const FALLBACK_ORDER = ["street", "satellite"];

export default function BasemapLayer({ provider = "street" }) {
  const map = useMap();
  const [active, setActive] = useState(provider);
  const errorsRef = useRef(0);

  useEffect(() => {
    setActive(provider);
  }, [provider]);

  useEffect(() => {
    const spec = BASEMAP_OPTIONS.find((b) => b.key === active);
    const layer = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: spec.maxZoom,
      subdomains: spec.subdomains,
    });

    const onError = () => {
      errorsRef.current += 1;
      if (errorsRef.current >= 3) {
        errorsRef.current = 0;
        const next = FALLBACK_ORDER.find((k) => k !== active);
        if (next) setActive(next);
      }
    };
    layer.on("tileerror", onError);
    layer.addTo(map);

    return () => {
      layer.off("tileerror", onError);
      map.removeLayer(layer);
    };
  }, [map, active]);

  return null;
}