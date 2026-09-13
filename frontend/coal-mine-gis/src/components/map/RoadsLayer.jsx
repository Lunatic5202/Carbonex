import { Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { HAUL_ROADS, MINE_ASSETS } from "../../data/mineData";

const ASSET_COLORS = {
  crusher: "#c17a3d",
  stockyard: "#d9b13d",
  workshop: "#8a959c",
  office: "#3d8fb0",
};

export default function RoadsLayer({ layers, publicContext }) {
  return (
    <>
      {layers.haulRoads &&
        HAUL_ROADS.map((road) => (
          <Polyline
            key={road.id}
            positions={road.path}
            pathOptions={{ color: "#c9a15a", weight: 3, opacity: 0.9, dashArray: "1 6" }}
          >
            <Tooltip sticky>{road.label} (haul road, demo)</Tooltip>
          </Polyline>
        ))}

      {layers.infrastructure &&
        MINE_ASSETS.map((asset) => (
          <CircleMarker
            key={asset.id}
            center={asset.pos}
            radius={7}
            pathOptions={{
              color: "#1a1206",
              weight: 1.5,
              fillColor: ASSET_COLORS[asset.type] || "#b9c2c7",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip sticky>{asset.label}</Tooltip>
          </CircleMarker>
        ))}

      {layers.publicRoads &&
        (publicContext?.roads || []).map((road) => (
          <Polyline
            key={`pub-road-${road.id}`}
            positions={road.path}
            pathOptions={{ color: "#8a959c", weight: 2, opacity: 0.55 }}
          />
        ))}

      {layers.railways &&
        (publicContext?.railways || []).map((rail) => (
          <Polyline
            key={`rail-${rail.id}`}
            positions={rail.path}
            pathOptions={{
              color: "#5c666c",
              weight: 2,
              opacity: 0.75,
              dashArray: "1 5",
            }}
          />
        ))}
    </>
  );
}
