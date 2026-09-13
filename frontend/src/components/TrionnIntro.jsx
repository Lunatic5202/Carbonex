import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function TrionnIntro({ onComplete }) {
  const containerRef = useRef(null);
  const qRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);

  useEffect(() => {
    // Disable scrolling while intro plays
    document.body.style.overflow = 'hidden';

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = '';
          if (onComplete) onComplete();
        }
      });

      // Initial stagger reveal
      tl.from([qRef.current, line1Ref.current, line2Ref.current], {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.2
      })
      // Hold for reading
      .to({}, { duration: 1.5 })
      // The "Explode" effect: Scale up massively, blur, and fade out
      .to([qRef.current, line1Ref.current, line2Ref.current], {
        scale: 40,
        opacity: 0,
        duration: 1.2,
        ease: 'expo.inOut',
        stagger: 0.05
      })
      // Hide the container overlay
      .to(containerRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out'
      }, "-=0.4")
      .set(containerRef.current, {
        display: 'none'
      });
      
    }, containerRef);

    return () => {
      ctx.revert();
      document.body.style.overflow = '';
    };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="trionn-intro-overlay">
      <div className="trionn-intro-content">
        <h2 ref={qRef} className="trionn-intro-q">
          Why do we need ai-powered smart monitoring for coal-mines subsidence?
        </h2>
        <div className="trionn-intro-points">
          <p ref={line1Ref}>
            <strong>1. Environmental Factors :</strong> water seepage and coal mine intelligence fire
          </p>
          <p ref={line2Ref}>
            <strong>2. Man-caused :</strong> illegal mining detection and open cast blasting
          </p>
        </div>
      </div>
    </div>
  );
}
