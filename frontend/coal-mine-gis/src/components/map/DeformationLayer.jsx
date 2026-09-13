import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { generateDeformationHeatPoints } from "../../data/riskData";

// Renders ground-deformation intensity (derived from node displacement
// readings) as a separate heat surface, independently toggleable from the
// AI risk heatmap so an operator can compare "where risk is classified"
// against "where the ground is physically moving".
export default function DeformationLayer({ nodes, visible }) {
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

    const points = generateDeformationHeatPoints(nodes);
    const layer = L.heatLayer(points, {
      radius: 34,
      blur: 30,
      max: 1,
      minOpacity: 0.2,
      gradient: {
        0.3: "#3d8fb0",
        0.6: "#a25a3d",
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
