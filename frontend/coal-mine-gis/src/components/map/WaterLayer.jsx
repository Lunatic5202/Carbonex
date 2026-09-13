import { Polyline } from "react-leaflet";

export default function WaterLayer({ layers, publicContext }) {
  if (!layers.waterways) return null;

  return (publicContext?.waterways || []).map((w) => (
    <Polyline
      key={`water-${w.id}`}
      positions={w.path}
      pathOptions={{ color: "#3d8fb0", weight: 3, opacity: 0.75 }}
    />
  ));
}
