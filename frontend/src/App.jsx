import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, BellRing, ChevronRight, Cpu, Database, Download, Gauge, Layers3, Menu, Network, Radar, Radio, Sparkles, X } from 'lucide-react';
import KpiCardGrid from './components/KpiCardGrid';
import MineNodeGrid from './components/MineNodeGrid';
import RealTimePredictor from './components/RealTimePredictor';
import HistoricalAnalytics from './components/HistoricalAnalytics';
import LiveReplaySimulator from './components/LiveReplaySimulator';
import BatchCsvScorer from './components/BatchCsvScorer';
import ScrollReveal from './components/ScrollReveal';
import { Button } from './components/ui/button';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

const navItems = [
  { id: 'predictor', label: 'Live monitor', icon: Radar },
  { id: 'historical', label: 'Analytics', icon: BarChart3 },
  { id: 'replay', label: 'Event replay', icon: Activity },
  { id: 'batch', label: 'Batch scoring', icon: Database },
];
const pipeline = [
  { label: 'Sense', detail: 'ESP32 nodes', icon: Radio, color: 'lime' },
  { label: 'Transmit', detail: 'LoRa mesh', icon: Network, color: 'cyan' },
  { label: 'Understand', detail: 'Edge + AI', icon: Cpu, color: 'violet' },
  { label: 'Act', detail: 'Early warning', icon: BellRing, color: 'orange' },
];

function MeshPreview() {
  const points = [[15,32],[27,61],[40,38],[52,69],[62,24],[75,51],[88,29],[82,78],[34,84],[67,88]];
  const links = [[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,5],[4,6],[5,7],[3,8],[7,9],[5,9]];
  return <div className="mesh-visual" aria-label="Live sensor mesh preview"><motion.div className="mesh-pulse" animate={{ scale: [0.82, 1.18, 0.82], opacity: [0.2, 0.48, 0.2] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} /><div className="mesh-orbit orbit-one" /><div className="mesh-orbit orbit-two" /><svg viewBox="0 0 100 100" role="img" aria-hidden="true"><defs><linearGradient id="meshLine" x1="0" x2="1"><stop offset="0" stopColor="#b7ff4a" stopOpacity=".18" /><stop offset="1" stopColor="#46e7f2" stopOpacity=".6" /></linearGradient><filter id="nodeGlow"><feGaussianBlur stdDeviation="1.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>{links.map(([a,b]) => <line key={`${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke="url(#meshLine)" strokeWidth=".45" />)}<circle cx="51" cy="53" r="11" fill="rgba(183,255,74,.08)" stroke="#b7ff4a" strokeOpacity=".55" strokeWidth=".3" /><path d="M51 44v18M42 53h18" stroke="#b7ff4a" strokeWidth=".45" strokeOpacity=".75" />{points.map(([x,y],i) => <g key={`${x}-${y}`} filter="url(#nodeGlow)"><motion.circle cx={x} cy={y} r={i%4!==2?1.8:1.4} fill={i%4!==2?'#b7ff4a':'#ffab5c'} animate={{ opacity: [0.5, 1, 0.5], r: [i%4!==2?1.5:1.2, i%4!==2?2.15:1.7, i%4!==2?1.5:1.2] }} transition={{ duration: 1.8 + (i % 4) * .25, repeat: Infinity, delay: i * .09, ease: 'easeInOut' }} /><circle cx={x} cy={y} r="3.3" fill="none" stroke={i%4!==2?'#b7ff4a':'#ffab5c'} strokeOpacity=".22" strokeWidth=".5" /></g>)}</svg><div className="mesh-label mesh-label-top"><span className="status-dot" /> LIVE NODE GRID</div><div className="mesh-label mesh-label-bottom">MINE PANEL A / 07:42:18 IST</div><div className="mesh-readout"><span>RSSI</span><strong>-62 dBm</strong><i /><span>PACKETS</span><strong>99.98%</strong></div></div>;
}

function InteractiveHero({ children }) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 120, damping: 20, mass: 0.6 });
  const y = useSpring(pointerY, { stiffness: 120, damping: 20, mass: 0.6 });
  const copyX = useTransform(x, [-40, 40], [-8, 8]);
  const copyY = useTransform(y, [-40, 40], [-5, 5]);
  const meshX = useTransform(x, [-40, 40], [10, -10]);
  const meshY = useTransform(y, [-40, 40], [8, -8]);
  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - rect.left - rect.width / 2);
    pointerY.set(event.clientY - rect.top - rect.height / 2);
  };
  const reset = () => { pointerX.set(0); pointerY.set(0); };
  return <section className="hero-section" onPointerMove={handleMove} onPointerLeave={reset}><motion.div className="hero-spotlight" style={{ x, y }} /><motion.div className="hero-copy" style={{ x: copyX, y: copyY }}>{children[0]}</motion.div><motion.div className="hero-mesh-layer" style={{ x: meshX, y: meshY }}>{children[1]}</motion.div><motion.div className="hero-scanline" animate={{ y: ['-20%', '120%'], opacity: [0, .8, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'linear' }} /></section>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('predictor');
  const [nodes, setNodes] = useState(['Node01']);
  const [selectedNode, setSelectedNode] = useState('Node01');
  const [nodesSummary, setNodesSummary] = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    async function initData() { try { const [a,b] = await Promise.all([fetch('/api/status'), fetch('/api/nodes-summary')]); if (a.ok) { const d=await a.json(); if (d.nodes?.length) { setNodes(d.nodes); setSelectedNode(c => d.nodes.includes(c) ? c : d.nodes[0]); } } if (b.ok) setNodesSummary(await b.json()); } catch (err) { console.error('Error initializing CarboNex data:', err); } }
    initData(); const interval=setInterval(initData,15000); return () => clearInterval(interval);
  }, []);
  const liveNodes = nodesSummary.length || nodes.length;
  const activeRisk = useMemo(() => nodesSummary.length ? Math.max(...nodesSummary.map(n => n.risk_score || 0)) : 18.4, [nodesSummary]);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><div className="brand-lockup"><div className="brand-mark"><span /><span /><span /></div><div><strong>carbonex</strong><small>ground intelligence</small></div></div><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button><div className="sidebar-kicker">Workspace</div><nav className="side-nav">{navItems.map(({id,label,icon:Icon}) => <button key={id} className={activeTab===id?'nav-item active':'nav-item'} onClick={() => {setActiveTab(id);setMobileNav(false);}}><Icon size={17}/><span>{label}</span>{activeTab===id&&<motion.span layoutId="active-nav" className="nav-active-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}{activeTab===id&&<ChevronRight size={15} className="nav-arrow"/>}</button>)}</nav><div className="sidebar-spacer"/><div className="system-card"><div className="system-card-header"><span className="status-dot"/> SYSTEM NOMINAL</div><div className="system-card-value">99.98<span>%</span></div><div className="system-card-note">mesh availability / last 24h</div><div className="mini-bar"><i/></div></div><div className="sidebar-footer"><span>CARBONEX / 0.9.4</span><span className="env-pill">EDGE + CLOUD</span></div></aside>
    {mobileNav&&<button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}<main className="main-content"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={22}/></button><div className="breadcrumb"><span>CARBONEX</span><ChevronRight size={14}/><strong>LIVE MONITOR</strong></div><div className="topbar-actions"><span className="sync-status"><span className="status-dot"/> synced 12s ago</span><button className="icon-button" title="Download report"><Download size={17}/></button><div className="avatar">AK</div></div></header>
      <InteractiveHero><div><div className="eyebrow"><span className="eyebrow-line"/> MINE PANEL A / RANIGANJ COALFIELD</div><h1>See the ground<br/><em>before it moves.</em></h1><p className="hero-description">Carbonex turns distributed sensing into an early-warning advantage. From the first millidegree of tilt to a field-ready alert.</p><div className="hero-actions"><Button className="primary-button" onClick={() => document.getElementById('workspace')?.scrollIntoView({behavior:'smooth'})}>Open live workspace <ArrowUpRight size={16}/></Button><Button variant="ghost" className="text-button" onClick={() => setActiveTab('historical')}>Explore analytics <span>↗</span></Button></div><div className="hero-proof"><div><strong>24 / 7</strong><span>continuous sensing</span></div><div><strong>4.2 km</strong><span>mesh coverage</span></div><div><strong>6 min</strong><span>early signal window</span></div></div></div><MeshPreview/></InteractiveHero>
      <section className="pipeline-strip"><div className="pipeline-intro"><span className="section-label">THE SIGNAL PATH</span><strong>One system.<br/>Every layer connected.</strong></div>{pipeline.map(({label,detail,icon:Icon,color},i)=><React.Fragment key={label}><div className={`pipeline-step ${color}`}><div className="pipeline-icon"><Icon size={17}/></div><div><span>0{i+1}</span><strong>{label}</strong><small>{detail}</small></div></div>{i<pipeline.length-1&&<div className="pipeline-connector"/>}</React.Fragment>)}<div className="pipeline-end"><Sparkles size={16}/><span>AI READY</span></div></section>
      <ScrollReveal className="workspace-heading" id="workspace"><div><div className="section-label">OPERATOR CONSOLE</div><h2>Live field picture <span className="live-badge"><span className="status-dot"/> LIVE</span></h2></div><div className="workspace-meta"><span><Layers3 size={15}/> {liveNodes} nodes reporting</span><span><Gauge size={15}/> peak risk {activeRisk.toFixed(1)}</span></div></ScrollReveal><ScrollReveal delay={.08}><KpiCardGrid nodesSummary={nodesSummary} activeNode={selectedNode}/></ScrollReveal><ScrollReveal delay={.14}><MineNodeGrid nodesSummary={nodesSummary} selectedNode={selectedNode} onSelectNode={setSelectedNode}/></ScrollReveal><ScrollReveal delay={.2} className="module-wrap"><section>{activeTab==='predictor'&&<RealTimePredictor activeNode={selectedNode}/>} {activeTab==='historical'&&<HistoricalAnalytics activeNode={selectedNode}/>} {activeTab==='replay'&&<LiveReplaySimulator activeNode={selectedNode}/>} {activeTab==='batch'&&<BatchCsvScorer/>}</section></ScrollReveal><footer className="app-footer"><div><strong>carbonex</strong> / ground intelligence platform</div><div>Built for safer extraction <span>•</span> Smart India Hackathon 2025</div></footer>
    </main></div>;
}
