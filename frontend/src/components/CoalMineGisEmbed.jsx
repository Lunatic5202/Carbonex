import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, MapPinned, ServerCrash } from 'lucide-react';

// Title of the standalone Coal Mine GIS app. Used to tell a real GIS response
// apart from the CarboNex SPA shell, which is what a dev server returns for
// unknown paths.
const GIS_MARKER = 'Coal Mine Intelligence';

export default function CoalMineGisEmbed() {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        const res = await fetch('/gis/', { cache: 'no-store' });
        const html = await res.text();
        if (!cancelled) setState(html.includes(GIS_MARKER) ? 'ready' : 'missing');
      } catch {
        if (!cancelled) setState('missing');
      }
    }

    probe();
    return () => { cancelled = true; };
  }, []);

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
        {state === 'checking' && (
          <div className="gis-embed-state">
            <Loader2 size={22} className="spin" />
            <span>Contacting GIS module…</span>
          </div>
        )}

        {state === 'missing' && (
          <div className="gis-embed-state">
            <ServerCrash size={26} />
            <strong>GIS module is not responding</strong>
            <span>
              The Coal Mine GIS app is a separate Vite project. Start its dev server,
              then reload this page.
            </span>
            <code>npm run dev</code>
            <span className="gis-embed-state-dim">
              In production this is served from the built bundle at{' '}
              <code>frontend/coal-mine-gis/dist</code> — no second server needed.
            </span>
          </div>
        )}

        {state === 'ready' && (
          <iframe
            src="/gis/"
            title="Coal Mine GIS"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="eager"
          />
        )}
      </div>
    </div>
  );
}
