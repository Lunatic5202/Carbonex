import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, Activity, AlertTriangle, Flame, Layers } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

/**
 * Vibrant Solid/Gradient KPI Blocks
 * Modeled directly on the SRE / NOC Operations Dashboard (Image 3) & Smart Mining KPI cards (Image 1).
 */
export default function KpiCardGrid({
  nodesSummary = [],
  activeNode = 'Node01',
  currentRiskScore = 18.5,
  currentBand = 'NORMAL'
}) {
  const gridRef = useRef(null);
  const totalNodes = nodesSummary.length || 10;
  const normalNodes = nodesSummary.filter(n => n.risk_band === 'NORMAL').length;
  const watchNodes = nodesSummary.filter(n => n.risk_band === 'WATCH').length;
  const warningNodes = nodesSummary.filter(n => n.risk_band === 'WARNING').length;
  const criticalNodes = nodesSummary.filter(n => n.risk_band === 'CRITICAL').length;

  const cards = [
    {
      label: 'Model SLO / Normal Nodes',
      sublabel: 'Nominal Baseline',
      value: `${((normalNodes / totalNodes) * 100).toFixed(1)}%`,
      badge: `${normalNodes}/${totalNodes} Nodes`,
      bgGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      textColor: '#ffffff',
      icon: ShieldCheck,
      shadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
    },
    {
      label: 'Telemetry Throughput',
      sublabel: 'Annual Observations',
      value: '109,253',
      badge: '365 Days Online',
      bgGradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      textColor: '#ffffff',
      icon: Activity,
      shadow: '0 8px 20px rgba(59, 130, 246, 0.35)'
    },
    {
      label: 'Watch Condition',
      sublabel: 'Early Drift Telemetry',
      value: watchNodes.toString(),
      badge: watchNodes > 0 ? 'Sampling x2' : 'Clear',
      bgGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      textColor: '#ffffff',
      icon: AlertTriangle,
      shadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
    },
    {
      label: 'Warning Progression',
      sublabel: 'Accelerated Drift',
      value: warningNodes.toString(),
      badge: warningNodes > 0 ? 'Inspection Due' : 'Zero',
      bgGradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      textColor: '#ffffff',
      icon: Layers,
      shadow: '0 8px 20px rgba(249, 115, 22, 0.35)'
    },
    {
      label: 'Critical Hazard Alerts',
      sublabel: 'Imminent Slope Rupture',
      value: criticalNodes.toString(),
      badge: criticalNodes > 0 ? 'EVACUATE' : 'Nominal (0)',
      bgGradient: criticalNodes > 0 
        ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' 
        : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
      textColor: '#ffffff',
      icon: Flame,
      shadow: '0 8px 20px rgba(239, 68, 68, 0.35)'
    }
  ];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const cardElements = gsap.utils.toArray('.kpi-card');
      gsap.from(cardElements, {
        opacity: 0,
        y: 15,
        duration: 0.65,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 86%',
          once: true
        }
      });
    }, gridRef);

    return () => context.revert();
  }, []);

  return (
    <div ref={gridRef} style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '14px',
      marginBottom: '20px'
    }}>
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <Card
            as={motion.div}
            key={idx}
            className="kpi-card"
            whileHover={{ y: -5, scale: 1.012 }}
            whileTap={{ scale: 0.985 }}
            style={{
              background: card.bgGradient,
              color: card.textColor,
              borderRadius: '12px',
              padding: '16px 18px',
              boxShadow: card.shadow,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s ease',
              cursor: 'default'
            }}
          >
            {/* Top row: Label and Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  opacity: 0.92
                }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '1px' }}>
                  {card.sublabel}
                </div>
              </div>
              <motion.div
                whileHover={{ rotate: 8, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconComponent size={18} color="#ffffff" />
              </motion.div>
            </div>

            {/* Middle row: Big Bold Value */}
            <div style={{
              fontSize: '37px',
              fontWeight: '900',
              lineHeight: 1.1,
              marginTop: '12px',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={card.value}
                  initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  style={{ display: 'inline-block' }}
                >
                  {card.value}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Bottom row: Pill Badge */}
            <Badge variant="glass" style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(4px)',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.04em',
              alignSelf: 'flex-start'
            }}>
              {card.badge}
            </Badge>
          </Card>
        );
      })}
    </div>
  );
}
