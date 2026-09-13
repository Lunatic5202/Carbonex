import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { generateRiskHeatPoints } from "../../data/riskData";

// leaflet.heat has no official React wrapper, so this component manages a
// raw L.heatLayer instance directly via the map instance from useMap().
export default function RiskHeatmap({ nodes, visible }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return undefined;
    }

    const points = generateRiskHeatPoints(nodes);
    const layer = L.heatLayer(points, {
      radius: 42,
      blur: 38,
      max: 1,
      minOpacity: 0.25,
      gradient: {
        0.2: "#4caf7d",
        0.45: "#d9b13d",
        0.7: "#e08a3c",
        1.0: "#d64545",
      },
    });
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, map, nodes]);

  return null;
}
