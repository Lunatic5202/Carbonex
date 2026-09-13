import React from 'react';
import { ExternalLink, MapPinned } from 'lucide-react';

export default function CoalMineGisEmbed() {
  return (
    <div className="gis-embed">
      <div className="gis-embed-bar glass-card">
        <span className="gis-embed-title"><MapPinned size={14} /> COAL MINE GIS</span>
        <span className="gis-embed-note">Kotdih colliery demo · live OSM/Carto basemap · mine boundary, open pit, roads, rail &amp; waterways · sensor mesh + risk heatmap · 2D map &amp; 3D terrain</span>
        <a className="gis-embed-link" href="/gis/" target="_blank" rel="noreferrer">
          Open fullscreen <ExternalLink size={12} />
        </a>
      </div>
      <div className="gis-embed-frame glass-card">
        <iframe
          src="/gis/"
          title="Coal Mine GIS"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="eager"
        />
      </div>
    </div>
  );
}