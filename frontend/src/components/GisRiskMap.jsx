import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { AlertTriangle, BarChart3, Cpu, MapPin, Radio, Satellite, ShieldAlert, X } from 'lucide-react';

const BAND_HEX = {
  NORMAL: '#10B981',
  WATCH: '#F59E0B',
  WARNING: '#F97316',
  CRITICAL: '#EF4444',
  COMMISSIONING: '#64748B',
};
const BAND = {
  NORMAL: { color: '#10B981', label: 'Normal' },
  WATCH: { color: '#F59E0B', label: 'Watch' },
  WARNING: { color: '#F97316', label: 'Warning' },
  CRITICAL: { color: '#EF4444', label: 'Critical' },
  COMMISSIONING: { color: '#64748B', label: 'Commissioning' },
};
const BAND_ORDER = ['CRITICAL', 'WARNING', 'WATCH', 'NORMAL'];

export default function GisRiskMap({ onNodeSelected, selectedNode }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const groupRef = useRef(null);
  const heatRef = useRef(null);
  const didFit = useRef(false);
  const selectionRef = useRef(null);
  const [data, setData] = useState({ nodes: [], gateway: null, region: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('3d');
  const [hovered, setHovered] = useState(null);
  const [selection, setSelection] = useState(null);
  const [rise, setRise] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/nodes-positions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!cancelled) { setData(payload); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 1,
      minZoom: 5,
      maxZoom: 19,
    });
    mapRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      maxNativeZoom: 19,
      subdomains: 'abc',
    }).addTo(map);
    map.on('tileerror', () => {
      map.eachLayer(layer => { if (layer instanceof L.TileLayer) map.removeLayer(layer); });
      L.tileLayer('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', {
        maxZoom: 20,
        maxNativeZoom: 20,
      }).addTo(map);
    }, { once: true });
    map.on('click', () => { if (selectionRef.current) setSelection(null); });
    return () => { map.remove(); mapRef.current = null; didFit.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => data.nodes.filter(n => n.status === 'active'), [data.nodes]);
  const planned = useMemo(() => data.nodes.filter(n => n.status === 'planned'), [data.nodes]);
  const riskCounts = useMemo(() => {
    const counts = { CRITICAL: 0, WARNING: 0, WATCH: 0, NORMAL: 0, COMMISSIONING: 0 };
    data.nodes.forEach(n => { counts[n.risk_band] = (counts[n.risk_band] || 0) + 1; });
    return counts;
  }, [data.nodes]);

  const selectNode = (n) => {
    selectionRef.current = n;
    setSelection(n);
    if (onNodeSelected) onNodeSelected(n.node_id);
  };

  const pin = (n) => {
    const risk = n.risk_score || 0;
    const color = BAND_HEX[n.risk_band] || BAND_HEX.NORMAL;
    const h = 60 + (risk / 100) * 70;
    const isSel = selectedNode === n.node_id;
    const tower = mode === '3d'
      ? `<div class="gis-tower" style="--c:${color};--h:${h}px;transform:translateX(-50%) perspective(300px) rotateX(38deg)"><i class="gis-tower-cap" style="background:${color}"></i><b style="background:linear-gradient(${color},rgba(2,6,10,.9))"></b></div>
         <span class="gis-tower-tag ${isSel ? 'sel' : ''}" style="--c:${color}">${n.node_id}</span>`
      : `<i class="gis-dot" style="background:${isSel ? '#7fffd4' : color};box-shadow:0 0 10px ${color}"></i>`;
    const d = L.divIcon({
      className: 'gis-pinwrap',
      html: `<div class="gis-pin ${mode} ${isSel ? 'sel' : ''} ${n.risk_band === 'CRITICAL' ? 'crit' : ''}" data-id="${n.node_id}">${tower}</div>`,
      iconSize: [64, 150],
      iconAnchor: [32, 150],
      interactive: true,
    });
    return d;
  };

  useEffect(() => {
    setRise(false);
    const timer = setTimeout(() => setRise(true), 60);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    if (groupRef.current) map.removeLayer(groupRef.current);
    const group = L.layerGroup().addTo(map);
    groupRef.current = group;

    (active.concat(planned)).forEach((n) => {
      const marker = L.marker([n.lat, n.lng], { icon: pin(n), zIndexOffset: n.status === 'active' ? 500 : 100 }).addTo(group);
      marker.on('click', () => selectNode(n));
      if (n.status === 'active') {
        marker.on('mouseover', e => {
          const p = map.mouseEventToContainerPoint(e.originalEvent);
          setHovered({ x: p.x, y: p.y, node_id: n.node_id, band: n.risk_band, risk: n.risk_score });
        });
        marker.on('mouseout', () => setHovered(null));
      }
    });
    if (data.gateway) {
      L.marker([data.gateway.lat, data.gateway.lng], {
        icon: L.divIcon({
          className: 'gis-pinwrap',
          html: `<div class="gis-pin gw"><i class="gis-gw-marker"></i><span class="gis-gw-label">GATEWAY</span></div>`,
          iconSize: [40, 46],
          iconAnchor: [20, 24],
          interactive: true,
        }),
        zIndexOffset: 250,
      }).addTo(group);
    }

    const points = active.map(n => [n.lat, n.lng, (n.risk_score || 0) / 100]);
    if (heatRef.current) map.removeLayer(heatRef.current);
    heatRef.current = L.heatLayer(points, {
      radius: 30,
      blur: 26,
      maxZoom: 16,
      minOpacity: 0.35,
      gradient: { 0: '#10B981', 0.35: '#F59E0B', 0.6: '#F97316', 1: '#EF4444' },
    }).addTo(group);

    if (!didFit.current) {
      const all = active.concat(planned);
      const pts = all.length ? all : (data.gateway ? [data.gateway] : []);
      if (pts.length) {
        didFit.current = true;
        const bounds = L.latLngBounds(pts.map(n => [n.lat, n.lng]));
        map.fitBounds(bounds, { padding: [64, 64], maxZoom: 16 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode, selectedNode]);

  if (loading) {
    return <div className="gis-loading"><div className="gis-spinner" /><span>Acquiring mine panel layout…</span></div>;
  }

  if (error) {
    return <div className="gis-error"><AlertTriangle size={18} /> Map data unavailable: {error}</div>;
  }

  const sky = active.concat(planned).map(n => ({
    id: n.node_id,
    risk: n.risk_score || 0,
    band: n.risk_band,
    planned: n.status === 'planned',
    color: BAND_HEX[n.risk_band] || BAND_HEX.COMMISSIONING,
  }));

  return (
    <div className="gis-wrap">
      <div className="gis-toolbar">
        <div className="gis-toolbar-left">
          <span className="section-label">LIVE SPATIAL RISK</span>
          <strong>{data.region?.label || 'Raniganj MW panel'}</strong>
          <span className="gis-kicker">OSM basemap · fixed coords</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="gis-seg" role="group" aria-label="Tower mode">
            <button className={mode === '2d' ? 'active' : ''} onClick={() => setMode('2d')}>2D</button>
            <button className={mode === '3d' ? 'active' : ''} onClick={() => setMode('3d')}>3D</button>
          </div>
          <div className="gis-stats">
            <span><i style={{ background: '#10B981' }} /> {riskCounts.NORMAL || 0} normal</span>
            <span><i style={{ background: '#F59E0B' }} /> {riskCounts.WATCH || 0} watch</span>
            <span><i style={{ background: '#F97316' }} /> {riskCounts.WARNING || 0} warning</span>
            <span><i style={{ background: '#EF4444' }} /> {riskCounts.CRITICAL || 0} critical</span>
            <span className="gis-planned-pill"><Cpu size={13} /> {planned.length} to connect</span>
          </div>
        </div>
      </div>

      <div className="gis-stage">
        <div ref={containerRef} className="gis-map" />

        <div className="gis-legend glass-card">
          <div className="gis-legend-title"><ShieldAlert size={14} /> RISK BANDS</div>
          {BAND_ORDER.map(b => (
            <div className="gis-legend-row" key={b}>
              <i style={{ background: BAND[b].color }} />
              <span>{BAND[b].label}</span>
            </div>
          ))}
          <div className="gis-legend-row"><i className="gis-heat-swatch" /><span>Thermal density (all bands)</span></div>
          <div className="gis-legend-row"><i className="gis-planned-swatch" /><span>Planned node (to connect)</span></div>
          <div className="gis-legend-row"><i className="gis-gw-swatch" /><span>Gateway / uplink</span></div>
          {mode === '3d' && (
            <div className="gis-legend-3d">
              <span>3D EXTRUSION</span>
              <div className="gis-legend-row"><i className="gis-3d-swatch" /><span>Tower height = risk score</span></div>
              <div className="gis-legend-row"><i className="gis-3d-swatch glow" /><span>Red pulse = critical</span></div>
            </div>
          )}
        </div>

        <div className="gis-north-tag">N ↑</div>

        {selection && (
          <div className="gis-sel-card">
            <button className="gis-sel-close" onClick={() => setSelection(null)}><X size={12} /></button>
            <div className="gis-sel-head" style={{ borderColor: BAND_HEX[selection.risk_band] || '#10B981' }}>
              <strong>{selection.node_id}</strong>
              <span style={{ color: BAND_HEX[selection.risk_band] || '#10B981' }}>{selection.risk_band}</span>
            </div>
            <div className="gis-popup-score" style={{ color: BAND_HEX[selection.risk_band] || '#10B981' }}>
              {selection.risk_score?.toFixed?.(1) ?? selection.risk_score}<small> / 100</small>
            </div>
            <div className="gis-sel-bar"><span style={{ width: `${Math.min(selection.risk_score || 0, 100)}%`, background: BAND_HEX[selection.risk_band] || '#10B981' }} /></div>
            <div className="gis-popup-meta"><MapPin size={12} /> {selection.role}</div>
            <div className="gis-popup-meta"><Satellite size={12} /> day {selection.day} · commissioned {selection.commissioned}</div>
            <div className="gis-telemetry">
              <div>Tilt <b>{selection.telemetry?.tilt_deg}°</b></div>
              <div>Disp <b>{selection.telemetry?.displacement_mm}mm</b></div>
              <div>Strain <b>{selection.telemetry?.strain_microstrain}με</b></div>
              <div>Vib <b>{selection.telemetry?.vibration_mms}</b></div>
            </div>
          </div>
        )}

        {hovered && (
          <div className="gis-tooltip" style={{ left: hovered.x + 14, top: hovered.y - 30 }}>
            <span className="gis-tooltip-dot" style={{ background: hovered.band ? BAND_HEX[hovered.band] : '#7fffd4' }} />
            <span>{hovered.node_id}</span><i> · {hovered.band} {(hovered.risk || 0).toFixed(1)}/100</i>
          </div>
        )}
      </div>

      <div className="gis-skyline glass-card">
        <div className="gis-legend-title"><BarChart3 size={13} /> LIVE RISK SKYLINE — TOWER HEIGHT = RISK SCORE</div>
        <div className="gis-bars">
          {sky.map((s, i) => (
            <div className="gis-bar-cell" key={s.id}>
              <div className="gis-bar-track">
                <div
                  className="gis-bar"
                  style={{ height: (rise ? (s.planned ? 10 : 8 + (s.risk / 100) * 88) : 0), background: s.planned ? 'repeating-linear-gradient(180deg,#64748B 0 4px, transparent 4px 8px)' : undefined, '--c': s.planned ? '#64748B' : s.color, transitionDelay: `${i * 45}ms` }}
                />
              </div>
              <span className="gis-bar-label">{s.id}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gis-notes glass-card">
        <span className="gis-note-pill"><Radio size={13} /> fixed coords · no GPS</span>
        <span>Live OSM basemap for navigation; coordinates are surveyed at commissioning from the approved panel layout. Tower height and red glow scale with live risk — critical panels dominate the field. Tiles © OpenStreetMap contributors.</span>
      </div>
    </div>
  );
}