import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, BellRing, ChevronRight, Cpu, Database, Download, Flame, Gauge, Home, Layers3, Map, MapPin, Menu, Network, Radar, Radio, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import KpiCardGrid from './components/KpiCardGrid';
import MineNodeGrid from './components/MineNodeGrid';
import RealTimePredictor from './components/RealTimePredictor';
import HistoricalAnalytics from './components/HistoricalAnalytics';
import LiveReplaySimulator from './components/LiveReplaySimulator';
import BatchCsvScorer from './components/BatchCsvScorer';
import CoalMineGisEmbed from './components/CoalMineGisEmbed';
import AsciiRadar from './components/AsciiRadar';
import LandingWhy from './components/LandingWhy';
import BayerGlobe from './components/BayerGlobe';
import Glass from './components/ui/Glass';
import { Button } from './components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const landingPage = { id: 'landing', path: '/', label: 'Overview', kicker: 'CARBONEX / GROUND INTELLIGENCE', title: 'See the ground before it moves.', description: 'Distributed sensing and calibrated AI for earlier, clearer mine-safety decisions.' };
const navItems = [
  { id: 'landing', path: '/', label: 'Home', icon: Home, kicker: 'CARBONEX / GROUND INTELLIGENCE', title: 'See the ground before it moves.', description: 'Distributed sensing and calibrated AI for earlier, clearer mine-safety decisions.' },
  { id: 'gis', path: '/map', label: 'Risk map', icon: Map, kicker: 'GIS / SPATIAL LAYER', title: 'The panel, to scale', description: 'Live subsidence risk over the surveyed coalfield panel — thermal density, risk bands, and every node at its fixed commissioning coordinate.' },
  { id: 'predictor', path: '/monitor', label: 'Live monitor', icon: Radar, kicker: '01 / SIGNAL ROOM', title: 'Live field picture', description: 'The ground is speaking in real time. Watch every node, threshold, and risk score converge into one operational view.' },
  { id: 'historical', path: '/analytics', label: 'Analytics', icon: BarChart3, kicker: '02 / PATTERN LAB', title: 'Find the drift before the event', description: 'Move through historical telemetry, model confidence, and deformation patterns to understand what is changing beneath the panel.' },
  { id: 'replay', path: '/replay', label: 'Event replay', icon: Activity, kicker: '03 / TIME MACHINE', title: 'Replay the signal', description: 'Scrub through recorded sensor moments and inspect how a warning becomes a decision.' },
  { id: 'batch', path: '/batch', label: 'Batch scoring', icon: Database, kicker: '04 / DATA DESK', title: 'Score a whole shift', description: 'Upload and score a telemetry batch against the latest calibrated subsidence model.' },
  { id: 'why', path: '/why', label: 'Why this', icon: Flame, kicker: '05 / WHY THIS', title: 'Why we pursue this project', description: 'The reasons behind the platform — environmental stress and the man-made exposure it surfaces.' },
];
const pipeline = [{ label: 'Sense', detail: 'ESP32 nodes', icon: Radio, color: 'lime' }, { label: 'Transmit', detail: 'LoRa mesh', icon: Network, color: 'cyan' }, { label: 'Understand', detail: 'Edge + AI', icon: Cpu, color: 'violet' }, { label: 'Act', detail: 'Early warning', icon: BellRing, color: 'orange' }];

function resolvePage() { return window.location.pathname === '/' ? landingPage : navItems.find(item => window.location.pathname === item.path) || navItems.find(item => item.id === 'predictor'); }
function go(path) { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }

function WorkspacePage({ page, children }) {
  return <motion.div className="route-frame" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25, ease: [.22, 1, .36, 1] }}>
    <div className="route-head">
      <div>
        <motion.div className="route-kicker section-label" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .05 }}>{page.kicker}</motion.div>
        <motion.h1 className="route-title" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .12, ease: [.22, 1, .36, 1] }}>{page.title}</motion.h1>
        <motion.p className="route-description" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .2, ease: [.22, 1, .36, 1] }}>{page.description}</motion.p>
      </div>
      <motion.div className="route-index" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: .32 }}>{page.id === 'gis' ? 'GIS / 01' : page.id === 'predictor' ? 'LIVE / 02' : page.id === 'historical' ? 'DATA / 03' : page.id === 'replay' ? 'TIME / 04' : 'FILE / 05'}</motion.div>
    </div>
    <div className="route-content">{children}</div>
  </motion.div>;
}

const RISK_SERIES = [16,15,17,18,16,19,21,20,18,22,25,23,28,31,26,29,35,33,30,38,42,45,41,48,53,50,47,44,52,58,55,49,53,61,66,63,58,55,60,69,74,70,78,83,86,80,77,84,91,96,99];
const SPARK = {
  tilt: [0.2,0.4,0.2,0.3,0.4,0.5,0.8,1.2,2.1,3.4,4.8,6.2],
  displacement: [1.7,1.7,1.6,1.5,1.6,1.4,1.8,2.2,3.1,4.4,6.0,7.6],
  strain: [28,25,30,28,27,29,31,35,41,52,66,80],
  vibration: [1.0,1.1,1.0,0.9,1.0,1.2,1.5,2.0,2.8,3.6,4.5,5.4]
};
const SPARK_META = [
  ['TILT', 'deg', '#c9ff3d'],
  ['DISP', 'mm', '#6ae8ff'],
  ['STRAIN', 'µε', '#c98bff'],
  ['VIB', 'mm/s', '#ff7a3d']
];
const TICKER = ['PANEL 7 / TILT SIGNALING','STRAIN +0.7% PER 24H','DISP 4.1mm · ACCEL','MESH ROUTE REBALANCED','23.618°N 87.118°E · RANIGANJ','LOOP RX OK 99.98%',
'SELF-HEALING LORA MESH','EARLY WINDOW 06:00 MIN','10 PANELS PLANNED'];
const FIELD_STATS = [
  { label: 'SENSING UPTIME', value: 24, suffix: '/7', decimals: 0, note: 'continuous field sensing' },
  { label: 'MESH COVERAGE', value: 4.2, suffix: 'km', decimals: 1, note: 'self-healing LoRa mesh' },
  { label: 'EARLY WINDOW', value: 6, suffix: 'min', decimals: 0, note: 'mean signal-to-alert' },
  { label: 'MONITORED PANELS', value: 10, suffix: '', decimals: 0, note: 'planned node deployment' }
];

function buildPath(values, width = 100, height = 40, pad = 2) {
  const min = Math.min(...values); const max = Math.max(...values);
  const span = max - min || 1; const step = (width - pad * 2) / (values.length - 1);
  return values.map((v, i) => {
    const x = pad + i * step;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function ContourBackdrop() {
  const rings = [12, 26, 40, 54, 68];
  return (
    <div className="ld-contour-bg" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="ldContourGlow" cx=".5" cy=".5" r=".5">
            <stop offset=".55" stopColor="#c9ff3d" stopOpacity=".05" />
            <stop offset="1" stopColor="#c9ff3d" stopOpacity="0" />
          </radialGradient>
        </defs>
        {rings.map((r, i) => (
          <g key={r} opacity={.55 - i * .1}>
            <ellipse cx="50" cy="52" rx={r} ry={r * .62} fill="none" stroke="rgba(201,255,61,.14)" strokeWidth=".18" transform={`rotate(${i * 14 - 24} 50 52)`} />
            <ellipse cx="50" cy="52" rx={r - 3} ry={(r - 3) * .62} fill="none" stroke="rgba(106,232,255,.07)" strokeWidth=".1" transform={`rotate(${i * 14 + 10} 50 52)`} />
          </g>
        ))}
        <rect x="0" y="0" width="100" height="100" fill="url(#ldContourGlow)" />
      </svg>
      <span className="ld-contour-coord">23.61850°N</span>
      <span className="ld-contour-coord ld-cc-row">87.11850°E</span>
    </div>
  );
}

function LandingHero() {
  const root = useRef(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 90, damping: 22, mass: .8 });
  const springY = useSpring(pointerY, { stiffness: 90, damping: 22, mass: .8 });
  const copyX = useTransform(springX, [-18, 18], [-4, 4]);
  const copyY = useTransform(springY, [-12, 12], [-2.5, 2.5]);
  const glowX = useTransform(springX, [-18, 18], [-28, 28]);
  const glowY = useTransform(springY, [-12, 12], [-18, 18]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro.from('.ld-eyebrow', { y: 16, opacity: 0, duration: .5 })
          .from('.ld-hero-title', { y: 64, opacity: 0, duration: .9 }, '-=.25')
          .from('.ld-hero-sub', { y: 22, opacity: 0, duration: .5 }, '-=.55')
          .from('.ld-hero-actions, .ld-hero-proof', { y: 18, opacity: 0, duration: .45, stagger: .1 }, '-=.42')
          .from('.ld-hero-ticker', { y: 26, opacity: 0, duration: .45 }, '-=.4');
        gsap.to('.ld-hero-copy-col', { yPercent: -14, opacity: .12, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.ld-contour-bg', { yPercent: 34, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const handleMove = e => {
    const b = root.current.getBoundingClientRect();
    pointerX.set(((e.clientX - b.left) / b.width - .5) * 18);
    pointerY.set(((e.clientY - b.top) / b.height - .5) * 12);
  };
  const handleLeave = () => { pointerX.set(0); pointerY.set(0); };

  return (
    <section className="ld-hero" ref={root} onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <ContourBackdrop />
      <motion.div className="ld-glow" style={{ x: glowX, y: glowY }} />
      <span className="ld-rule ld-rule-tl" /><span className="ld-rule ld-rule-tr" />
      <span className="ld-rule ld-rule-bl" /><span className="ld-rule ld-rule-br" />
      <div className="ld-hero-inner">
        <motion.div className="ld-hero-copy-col" style={{ x: copyX, y: copyY }}>
          <Glass className="lg-glass lg-hero-glass">
            <div className="ld-eyebrow"><i />MINE PANEL A / RANIGANJ COALFIELD</div>
            <h1 className="ld-hero-title">See the ground<br /><em>before it moves.</em></h1>
            <p className="ld-hero-sub">Carbonex turns a mesh of cheap sensors into an early-warning instrument. From the first millidegree of tilt to a field-ready alert — no line of sight, no hand-walked rounds, no dead air underground.</p>
            <div className="ld-hero-actions">
              <Button className="ld-cta" onClick={() => go('/monitor')}>Open live workspace <ArrowUpRight size={16} /></Button>
              <Button variant="ghost" className="ld-text-cta" onClick={() => go('/map')}>Explore risk map <span>↗</span></Button>
            </div>
            <div className="ld-hero-proof">
              <div><strong>24 / 7</strong><span>continuous sensing</span></div>
              <div><strong>4.2 km</strong><span>mesh coverage</span></div>
              <div><strong>6 min</strong><span>early signal window</span></div>
            </div>
          </Glass>
        </motion.div>
        <Glass className="lg-glass lg-globe-glass">
          <div className="lg-globe-cell">
            <BayerGlobe
              colorA="#050a14"
              colorB="#c9ff3d"
              accent="#6ae8ff"
              pixel={14}
              levels={5}
              land={9}
              globeSize={13}
              glowEnabled
              glowSize={7}
              speed={16}
              dragEnabled
              style={{ minWidth: 0, minHeight: 0 }}
            />
          </div>
        </Glass>
      </div>
      <div className="ld-hero-ticker">
        <div className="ld-ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => <span key={i} className="ld-ticker-item"><i /><em>{t}</em></span>)}
        </div>
      </div>
    </section>
  );
}

function FieldStats() {
  const root = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray('[data-count]', root.current).forEach(el => {
          const target = parseFloat(el.dataset.count);
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const state = { v: 0 };
          gsap.to(state, {
            v: target, duration: 1.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            onUpdate() { el.textContent = state.v.toFixed(decimals); }
          });
        });
        gsap.from('.ld-stat', { y: 28, opacity: 0, stagger: .12, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: root.current, start: 'top 88%', once: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="ld-stats" ref={root}>
      <Glass className="lg-glass">
        <div className="ld-stats-head"><span className="section-label">FIELD CARD</span><strong>Operating numbers, straight from the panel</strong></div>
        <div className="ld-stats-grid">
          {FIELD_STATS.map(s => (
            <motion.div key={s.label} className="ld-stat" whileHover={{ y: -4 }}>
              <span>{s.label}</span>
              <div className="ld-stat-num"><b data-count={s.value} data-decimals={s.decimals}>0</b>{s.suffix}</div>
              <small>{s.note}</small>
            </motion.div>
          ))}
        </div>
      </Glass>
    </section>
  );
}

function RiskTerrain() {
  const series = RISK_SERIES;
  const line = buildPath(series);
  const area = `${line} L98,42 L2,42 Z`;
  const maxIdx = series.indexOf(Math.max(...series));
  const peak = series[maxIdx];
  const last = series[series.length - 1];
  return (
    <section className="ld-terrain">
      <Glass className="lg-glass">
      <div className="ld-terrain-grid">
        <div className="ld-terrain-intro">
          <span className="section-label">THE RISK SURFACE</span>
          <h2>One composite score.<br />Every sensor stitched in.</h2>
          <p>Isolation forest, rolling trend + second derivative, and weighted sensor fusion collapse four channels into a 0–100 subsidence index — mapped live across every node in the panel.</p>
          <div className="ld-band-chips">
            <span className="ld-band ld-band-ok"><i />0 – 25 NORMAL</span>
            <span className="ld-band ld-band-watch"><i />26 – 50 WATCH</span>
            <span className="ld-band ld-band-warn"><i />51 – 75 WARNING</span>
            <span className="ld-band ld-band-crit"><i />76 – 100 CRIT</span>
          </div>
          <div className="ld-terrain-actions">
            <Button className="ld-cta ld-cta-ghost" onClick={() => go('/map')}><MapPin size={15} /> Open the GIS map</Button>
            <Button variant="ghost" className="ld-text-cta" onClick={() => go('/analytics')}>Drill into signals <span>↗</span></Button>
          </div>
        </div>

        <div className="ld-terrain-plot card-lift">
          <div className="ld-plot-head">
            <div><span className="status-dot" /> PANEL 7 · COMPOSITE RISK INDEX</div>
            <span><Flame size={13} /> PEAK {peak} · NOW {last}</span>
          </div>
          <svg viewBox="0 0 100 42" className="ld-risk-curve" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ldRiskFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ff7a3d" stopOpacity=".4" />
                <stop offset="1" stopColor="#ff7a3d" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ldRiskStroke" x1="0" x2="1">
                <stop offset="0" stopColor="#6ae8ff" />
                <stop offset=".55" stopColor="#c9ff3d" />
                <stop offset="1" stopColor="#ff7a3d" />
              </linearGradient>
            </defs>
            {[10.5, 21, 31.5, 36.5].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(210,225,236,.07)" strokeWidth=".3" />)}
            <line x1="0" x2="100" y1="31.5" y2="31.5" stroke="rgba(201,255,61,.5)" strokeWidth=".25" strokeDasharray="1.4 1.4" />
            <motion.path d={area} fill="url(#ldRiskFill)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1.4, delay: .7 }} />
            <motion.path d={line} fill="none" stroke="url(#ldRiskStroke)" strokeWidth=".9" strokeLinecap="round"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2.1, ease: 'easeInOut' }} />
            <motion.circle cx={2 + (maxIdx / (series.length - 1)) * 96} cy={0} r="0"
              initial={{ r: 0, opacity: 0 }} whileInView={{ r: 1.6, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 2 }} fill="#ff7a3d" stroke="#0a0e09" strokeWidth=".4" />
          </svg>
          <div className="ld-plot-axis"><span>DAY 001</span><span>DAY 120</span><span>DAY 250</span><span>DAY 365</span></div>
          <div className="ld-plot-foot">
            <span>0–100 INDEX</span>
            <span className="ld-thresh">THRESHOLD 75 · ALERT LINE</span>
          </div>
          <div className="ld-plot-rings" aria-hidden="true">
            {[1, 2, 3, 4].map(k => <i key={k} style={{ animationDelay: `${k * .5}s` }} />)}
          </div>
          <div className="ld-plot-badge"><Radar size={13} /> IOFOREST + TREND + FUSION</div>
        </div>
      </div>

      <div className="ld-spark-row">
        {SPARK_META.map(([name, unit, color], idx) => {
          const key = ['tilt', 'displacement', 'strain', 'vibration'][idx];
          const vals = SPARK[key];
          return (
            <div key={name} className="ld-spark" style={{ '--spark': color }}>
              <div className="ld-spark-head"><span>{name}</span><small>{unit}</small><b>{vals[vals.length - 1]}{unit}</b></div>
              <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                <motion.path d={buildPath(vals, 100, 30)} fill="none" stroke="var(--spark)" strokeWidth="1.2"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.3, delay: .15 * idx }} />
              </svg>
            </div>
          );
        })}
      </div>
      </Glass>
    </section>
  );
}

function SignalPath() {
  return (
    <section className="ld-signal">
      <Glass className="lg-glass">
      <div className="ld-signal-head">
        <span className="section-label">THE SIGNAL PATH</span>
        <h2>Sense → transmit → understand → act.</h2>
        <p>Four links, one chain. Each node is a surveyor, the mesh is the wire, the model is the interpreter, and the alert is the shout.</p>
      </div>
      <div className="ld-signal-track">
        {pipeline.map(({ label, detail, icon: Icon, color }, i) => (
          <React.Fragment key={label}>
            <motion.div className={`ld-step ${color}`} whileHover={{ y: -6 }} whileTap={{ scale: .98 }}>
              <div className="ld-step-num">0{i + 1}</div>
              <div className="ld-step-icon"><Icon size={20} /></div>
              <div className="ld-step-body"><strong>{label}</strong><small>{detail}</small></div>
            </motion.div>
            {i < pipeline.length - 1 && (
              <motion.div className="ld-link" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: .8, delay: .2 + i * .15 }}>
                <i /><i /><i />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>
      </Glass>
    </section>
  );
}

function LandingCta() {
  return (
    <section className="ld-cta-band">
      <Glass className="lg-glass">
        <span className="ld-cta-graph" aria-hidden="true">{RISK_SERIES.map((v, i) => <i key={i} style={{ height: `${Math.max(4, v)}%`, '--d': `${i * 0.045}s` }} />)}</span>
        <div className="ld-cta-inner">
          <span className="section-label">DEPLOYMENT READY</span>
          <h2>First shift under the surface<br />starts with a louder signal.</h2>
          <div className="ld-cta-actions">
            <Button className="ld-cta ld-cta-invert" onClick={() => go('/monitor')}>Open the live workspace <Gauge size={16} /></Button>
            <Button variant="ghost" className="ld-text-cta" onClick={() => go('/')}><Sparkles size={15} /> Back to overview</Button>
        </div>
      </div>
      </Glass>
    </section>
  );
}

function LandingPage() {
  const root = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const factors = [
          { glass: -16, inner: 4 },
          { glass: 20, inner: -5 },
          { glass: -26, inner: 7 },
          { glass: 30, inner: -6 }
        ];
        gsap.utils.toArray('.ld-page > section', root.current).forEach((section, i) => {
          const f = factors[i % factors.length];
          const glass = section.querySelector('.lg-glass');
          if (!glass) return;
          gsap.to(glass, {
            yPercent: f.glass, ease: 'none', force3D: true,
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
          });
          const inner = section.querySelector('.lg-glass .glass-content');
          if (inner) gsap.to(inner, {
            yPercent: f.inner, ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="ld-page" ref={root}>
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="34" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AsciiRadar
        className="ld-radar-bg"
        background="transparent"
        glyphColor="#c9ff3d"
        ringColor="#c9ff3d"
        scale={110}
        glyphSize={52}
        density={58}
        speed={48}
        ringSpeed={60}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.5, pointerEvents: 'none' }}
      />
      <LandingHero />
      <FieldStats />
      <RiskTerrain />
      <SignalPath />
      <LandingCta />
    </div>
  );
}
function Sidebar({ page, mobileNav, setMobileNav }) { return <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}><div className="brand-lockup"><div className="brand-mark"><span/><span/><span/></div><div><strong>carbonex</strong><small>ground intelligence</small></div></div><button className="mobile-close" onClick={()=>setMobileNav(false)} aria-label="Close navigation"><X size={20}/></button><div className="sidebar-kicker">Workspace</div><nav className="side-nav">{navItems.map(({id,path,label,icon:Icon})=><motion.button key={id} className={page.id===id?'nav-item active':'nav-item'} onClick={()=>{go(path);setMobileNav(false)}} whileHover={{ x: 2 }} whileTap={{ scale: .97 }}><Icon size={17}/><span>{label}</span>{page.id===id&&<motion.span layoutId="active-nav" className="nav-active-pill"/>}<ChevronRight size={15} className="nav-arrow"/></motion.button>)}</nav><div className="sidebar-spacer"/><div className="system-card"><div className="system-card-header"><span className="status-dot"/> SYSTEM NOMINAL</div><div className="system-card-value">99.98<span>%</span></div><div className="system-card-note">mesh availability / last 24h</div><div className="mini-bar"><i/></div></div><div className="sidebar-footer"><span>CARBONEX / 0.9.4</span><span className="env-pill">EDGE + CLOUD</span></div></aside>; }

function DashboardPage({ page, nodesSummary, selectedNode, setSelectedNode, activeRisk, liveNodes }) { return <WorkspacePage page={page}><div><div className="route-console"><span><Layers3 size={15}/> {liveNodes} nodes reporting</span><span><Gauge size={15}/> peak risk {activeRisk.toFixed(1)}</span></div><KpiCardGrid nodesSummary={nodesSummary} activeNode={selectedNode}/><MineNodeGrid nodesSummary={nodesSummary} selectedNode={selectedNode} onSelectNode={setSelectedNode}/><div className="route-module"><RealTimePredictor activeNode={selectedNode}/></div></div></WorkspacePage>; }
function GisPage({ page }) { return <WorkspacePage page={page}><CoalMineGisEmbed /></WorkspacePage>; }
function AnalyticsPage({ page, selectedNode }) { return <WorkspacePage page={page}><HistoricalAnalytics activeNode={selectedNode}/></WorkspacePage>; }
function ReplayPage({ page, selectedNode }) { return <WorkspacePage page={page}><LiveReplaySimulator activeNode={selectedNode}/></WorkspacePage>; }
function BatchPage({ page }) { return <WorkspacePage page={page}><BatchCsvScorer/></WorkspacePage>; }
function WhyPage({ page }) { return <WorkspacePage page={page}><LandingWhy/></WorkspacePage>; }

export default function App() {
  const [page,setPage]=useState(resolvePage); const [nodes,setNodes]=useState(['Node01']); const [selectedNode,setSelectedNode]=useState('Node01'); const [nodesSummary,setNodesSummary]=useState([]); const [mobileNav,setMobileNav]=useState(false);
  useEffect(()=>{const onPop=()=>setPage(resolvePage());window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[]);
  useEffect(()=>{async function init(){try{const [a,b]=await Promise.all([fetch('/api/status'),fetch('/api/nodes-summary')]);if(a.ok){const d=await a.json();if(d.nodes?.length){setNodes(d.nodes);setSelectedNode(c=>d.nodes.includes(c)?c:d.nodes[0])}}if(b.ok)setNodesSummary(await b.json())}catch(e){console.error('Error initializing CarboNex data:',e)}}init();const i=setInterval(init,15000);return()=>clearInterval(i)},[]);
  const activeRisk=useMemo(()=>nodesSummary.length?Math.max(...nodesSummary.map(n=>n.risk_score||0)):18.4,[nodesSummary]); const liveNodes=nodesSummary.length||nodes.length; const isLanding=page.id==='landing';
  return <div className={isLanding?'app-shell landing-shell':'app-shell'}>{!isLanding&&<Sidebar page={page} mobileNav={mobileNav} setMobileNav={setMobileNav}/>} {!isLanding&&mobileNav&&<button className="nav-scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}<main className="main-content">{!isLanding&&<header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Menu size={22}/></button><div className="breadcrumb"><span>CARBONEX</span><ChevronRight size={14}/><strong>{page.label.toUpperCase()}</strong></div><div className="topbar-actions"><span className="sync-status"><span className="status-dot"/> synced 12s ago</span><button className="icon-button" title="Download report"><Download size={17}/></button><div className="avatar">AK</div></div></header>}{isLanding?<LandingPage/>:<AnimatePresence mode="wait" initial={false}>{page.id==='gis'&&<GisPage key={page.id} page={page}/>} {page.id==='predictor'&&<DashboardPage key={page.id} page={page} nodesSummary={nodesSummary} selectedNode={selectedNode} setSelectedNode={setSelectedNode} activeRisk={activeRisk} liveNodes={liveNodes}/>} {page.id==='historical'&&<AnalyticsPage key={page.id} page={page} selectedNode={selectedNode}/>} {page.id==='replay'&&<ReplayPage key={page.id} page={page} selectedNode={selectedNode}/>} {page.id==='batch'&&<BatchPage key={page.id} page={page}/>} {page.id==='why'&&<WhyPage key={page.id} page={page}/>}</AnimatePresence>}<footer className="app-footer"><div><strong>carbonex</strong> / ground intelligence platform</div><div>Built for safer extraction <span>•</span> Smart India Hackathon 2025</div></footer></main></div>;
}
