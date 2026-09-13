import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Droplets, Flame, Pickaxe, Tractor } from 'lucide-react';
import InfiniteLayersGrid from './InfiniteLayersGrid';

gsap.registerPlugin(ScrollTrigger);

const BLOCKS = [
  {
    kicker: 'ENVIRONMENTAL STRESS',
    title: 'The ground is already failing.',
    body: 'Two quiet, compounding processes turn a funded mine into an exposed one — and neither waits for a single dramatic failure to make itself felt.',
    reasons: [
      { icon: Droplets, tag: 'WATER SEEPAGE', text: 'Groundwater follows every healed seam junction and old drive. Unmeasured, it softens the roof and floats the pillar — the signature of a collapse that never announces itself.' },
      { icon: Flame, tag: 'COALFIRE', text: 'Seepage meets a hot face and you get subsurface fire: smouldering voids that vent fire-damp and eat the reserve for years before the first crack reaches daylight.' },
    ],
    stat: { value: '0.34', label: 'Ga/quarter   water trending into the voids' },
  },
  {
    kicker: 'MAN-MADE EXPOSURE',
    title: 'Then permission is not enough.',
    body: 'The second pressure is human. It is faster, noisier, and far more dangerous to control — because it is a pattern, not an accident.',
    reasons: [
      { icon: Pickaxe, tag: 'ILLEGAL MINING', text: 'Rat-hole day-shafts and forbidden galleries opened at night. Unsupervised voids that swallow every safety margin the plan book gives you.' },
      { icon: Tractor, tag: 'OPENSITE BLASTING', text: 'Opencast benches blasted with drift on the delay chain — the shockwave cheats the timing table and turns a controlled bench into a broadcasting face.' },
    ],
    stat: { value: '07:42', label: 'avg   time-to-detect for an unsupervised void' },
  },
];

export default function LandingWhy({ className = '', style }) {
  const root = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        BLOCKS.forEach((block, i) => {
          gsap.from(`.ldy-reasons:nth-child(${i + 1}) .ldy-card`, {
            y: 42, opacity: 0, stagger: 0.12, ease: 'power3.out',
            scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
          });
        });
        gsap.from('.ldy-title', {
          y: 30, opacity: 0, ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 88%', once: true },
        });
        if (gridRef.current) {
          gsap.to(gridRef.current, {
            yPercent: -8, ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        }
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className={`ldy ${className}`} ref={root} style={style}>
      <div className="ldy-grid-deck" ref={gridRef}>
        <InfiniteLayersGrid className="ldy-grid" />
      </div>
      <div className="ldy-inner">
        <div className="ldy-heading">
          <span className="section-label">WHY WE PURSUE THIS</span>
          <h2 className="ldy-title">We do this so nobody has to read a<br /><em>map in the dark</em> to know the ground moved.</h2>
        </div>
        <div className="ldy-blocks">
          {BLOCKS.map((b, i) => (
            <div key={b.kicker} className={`ldy-block${i % 2 === 1 ? ' ldy-block-alt' : ''}`}>
              <div className="ldy-reasons">
                <div className="ldy-block-head">
                  <span className="ldy-kicker">{b.kicker}</span>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </div>
                {b.reasons.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.tag} className="ldy-card">
                      <div className="ldy-card-icon"><Icon size={19} /></div>
                      <div className="ldy-card-body">
                        <strong>{r.tag}</strong>
                        <p>{r.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="ldy-stat">
                  <strong>{b.stat.value}</strong>
                  <span>{b.stat.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
