import { useCallback, useState } from "react";

export const DEFAULT_LAYERS = {
  mineBoundary: true,
  openPit: true,
  haulRoads: true,
  infrastructure: true,

  publicRoads: true,
  railways: true,
  waterways: true,

  sensorNodes: true,
  communication: false,
  deformation: false,
  riskHeatmap: false,
  predictedSubsidence: false,

  riskZones: false,
  deformationVectors: false,
  sensorCoverage: false,
};

/**
 * Centralised layer-visibility state for the map. Kept as a single hook so
 * the LayerControl panel and the map layers themselves always agree on
 * what's on/off.
 */
export function useMapLayers() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS);

  const toggleLayer = useCallback((key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { layers, toggleLayer };
}
