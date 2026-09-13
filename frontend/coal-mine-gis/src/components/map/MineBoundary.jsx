import { Polygon, Tooltip } from "react-leaflet";
import { MINE_BOUNDARY } from "../../data/mineData";

export default function MineBoundary() {
  return (
    <Polygon
      positions={MINE_BOUNDARY}
      pathOptions={{
        color: "#d99457",
        weight: 2.5,
        fillOpacity: 0.03,
        fillColor: "#d99457",
        dashArray: "6 4",
      }}
    >
      <Tooltip sticky>Mine Lease / Panel Boundary (demo)</Tooltip>
    </Polygon>
  );
}
