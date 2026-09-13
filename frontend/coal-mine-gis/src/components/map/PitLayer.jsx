import { Polygon, Tooltip } from "react-leaflet";
import { OPEN_PIT, PIT_DEPTH_RINGS } from "../../data/mineData";
import { shrinkPolygon } from "../../utils/geoUtils";

// A real DEM/terrain service would render true excavation depth. Here we
// fake a sense of depth with concentric, progressively darker rings shrunk
// toward the pit centroid — the visual read is "this gets deeper toward
// the middle" without needing elevation data.
const RING_COLORS = ["#4a3220", "#3a2618", "#2a1a10", "#1c1009"];

export default function PitLayer() {
  return (
    <>
      {PIT_DEPTH_RINGS.map((factor, i) => (
        <Polygon
          key={i}
          positions={shrinkPolygon(OPEN_PIT, factor)}
          className="pit-fill"
          pathOptions={{
            color: i === 0 ? "#5c3a20" : "transparent",
            weight: i === 0 ? 2 : 0,
            fillOpacity: 0.85,
            fillColor: RING_COLORS[i],
          }}
        >
          {i === 0 && <Tooltip sticky>Open Pit — active excavation (demo)</Tooltip>}
        </Polygon>
      ))}
    </>
  );
}
