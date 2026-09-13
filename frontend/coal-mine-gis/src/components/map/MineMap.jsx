import { useEffect, useRef, useState } from "react";
import { MapContainer, useMap } from "react-leaflet";
import { RotateCcw } from "lucide-react";
import { MINE_SITE } from "../../data/mineData";
import { fetchPublicContext } from "../../services/osmService";

import MineBoundary from "./MineBoundary";
import PitLayer from "./PitLayer";
import RoadsLayer from "./RoadsLayer";
import WaterLayer from "./WaterLayer";
import SensorLayer from "./SensorLayer";
import RiskHeatmap from "./RiskHeatmap";
import BasemapLayer, { BASEMAP_OPTIONS } from "./BasemapLayer";
import DeformationLayer from "./DeformationLayer";
import CommunicationLayer from "./CommunicationLayer";
import {
  RiskZones,
  PredictedSubsidence,
  DeformationVectors,
  SensorCoverage,
} from "./AnalyticsLayers";

// Lives inside <MapContainer> purely to hand the live Leaflet map instance
// back up to MineMap via a ref, since react-leaflet v4 doesn't expose one
// on MapContainer itself in all versions.
function MapRefBridge({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function FlyToController({ target, mapRef }) {
  useEffect(() => {
    if (target && mapRef.current) {
      mapRef.current.flyTo(target, Math.max(mapRef.current.getZoom(), 15), {
        duration: 1.1,
      });
    }
  }, [target, mapRef]);
  return null;
}

export default function MineMap({
  nodes,
  layers,
  selectedNodeId,
  onSelectNode,
  flyToTarget,
}) {
  const mapRef = useRef(null);
  const [basemap, setBasemap] = useState("street");
  const [publicContext, setPublicContext] = useState({
    roads: [],
    railways: [],
    waterways: [],
  });
  const [contextError, setContextError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicContext(MINE_SITE.center, 1800).then((ctx) => {
      if (cancelled) return;
      setPublicContext(ctx);
      if (
        ctx.roads.length === 0 &&
        ctx.railways.length === 0 &&
        ctx.waterways.length === 0
      ) {
        setContextError(
          "Public map context (roads/rail/water) could not be loaded right now — showing mine data only."
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const target = flyToTarget || (selectedNode ? [selectedNode.lat, selectedNode.lng] : null);

  return (
    <div className="map-viewport">
      <MapContainer
        center={MINE_SITE.center}
        zoom={MINE_SITE.defaultZoom}
        zoomControl={true}
        style={{ height: "100%", width: "100%" }}
      >
        <BasemapLayer provider={basemap} />

        {layers.mineBoundary && <MineBoundary />}
        {layers.openPit && <PitLayer />}
        <RoadsLayer layers={layers} publicContext={publicContext} />
        <WaterLayer layers={layers} publicContext={publicContext} />

        <RiskHeatmap nodes={nodes} visible={layers.riskHeatmap} />
        <DeformationLayer nodes={nodes} visible={layers.deformation} />
        <CommunicationLayer nodes={nodes} visible={layers.communication} />

        <RiskZones nodes={nodes} visible={layers.riskZones} />
        <PredictedSubsidence nodes={nodes} visible={layers.predictedSubsidence} />
        <DeformationVectors nodes={nodes} visible={layers.deformationVectors} />
        <SensorCoverage nodes={nodes} visible={layers.sensorCoverage} />

        {layers.sensorNodes && (
          <SensorLayer
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        )}

        <MapRefBridge mapRef={mapRef} />
        <FlyToController target={target} mapRef={mapRef} />
      </MapContainer>

      <div className="map-toolbar">
        <span className="basemap-group">
          {BASEMAP_OPTIONS.map((b) => (
            <button
              key={b.key}
              className={`btn basemap-btn${basemap === b.key ? " active" : ""}`}
              title={`${b.label} basemap`}
              onClick={() => setBasemap(b.key)}
            >
              {b.label}
            </button>
          ))}
        </span>
        <button
          className="btn"
          title="Reset view"
          onClick={() =>
            mapRef.current?.flyTo(MINE_SITE.center, MINE_SITE.defaultZoom, {
              duration: 0.8,
            })
          }
        >
          <RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
          Reset
        </button>
      </div>

      {contextError && <div className="toast">{contextError}</div>}
    </div>
  );
}
