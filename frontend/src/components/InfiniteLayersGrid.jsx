import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const ORIG = { w: 1522, h: 1238 };

const TILES = [
  { x: 71,  y: 58,  w: 400, h: 270, cap: 'Water seepage   · tracking a seam junction' },
  { x: 211, y: 255, w: 540, h: 360, cap: 'Subsurface fire   · venting behind the pillar' },
  { x: 631, y: 158, w: 400, h: 270, cap: 'Opencast face   · freshly blasted bench' },
  { x: 1191,y: 22,  w: 260, h: 195, cap: 'Coalfire   · smouldering slice of the drift' },
  { x: 351, y: 687, w: 230, h: 300, cap: 'Illegal day-shaft   · unsupervised void' },
  { x: 711, y: 820, w: 205, h: 235, cap: 'Dust plume   · the moment detonation clears' },
  { x: 901, y: 540, w: 260, h: 355, cap: 'Fire-damp   · gas trending at the face' },
  { x: 1141,y: 403, w: 400, h: 130, cap: 'Rat-hole gallery   · blasted at the crest' },
  { x: 171, y: 1022,w: 400, h: 300, cap: 'Blast wave   · timing drift across benches' },
];

const FACTORS = [0.4, 0.15, 0.06, 0.3, 0.5, 0.12, 0.42, 0.08, 0.2];

export default function InfiniteLayersGrid({ className = '', reducedMotion = false, style }) {
  const root = useRef(null);
  const grid = useRef(null);

  useEffect(() => {
    const $scroller = root.current;
    const $grid = grid.current;
    if (!$scroller || !$grid) return;

    const sources = Array.from({ length: 9 }, (_, i) => `/img/image-${i + 1}.jpg`);
    const poor = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let winW = 0, winH = 0, tileW = 0, tileH = 0;
    const scroll = {
      ease: 0.04,
      current: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      last: { x: 0, y: 0 },
    };
    const mouse = {
      x: { c: 0.5, t: 0.5 },
      y: { c: 0.5, t: 0.5 },
      press: { c: 0, t: 0 },
    };
    const items = [];

    const capObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('visible', en.isIntersecting));
    });

    function onResize() {
      winW = window.innerWidth;
      winH = window.innerHeight;
      tileW = winW;
      tileH = winW * (ORIG.h / ORIG.w);
      scroll.current.x = scroll.target.x = -winW * 0.1;
      scroll.current.y = scroll.target.y = -winH * 0.1;
      scroll.last = { ...scroll.current };
    }

    function onWheel(e) {
      const rect = $scroller.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) return;
      e.preventDefault();
      scroll.target.x -= e.deltaX;
      scroll.target.y -= e.deltaY;
    }

    let dragging = false;
    function onMouseDown() { dragging = true; mouse.press.t = 1; }
    function onMouseUp() { dragging = false; mouse.press.t = 0; }
    function onMouseMove(e) {
      mouse.x.t = e.clientX / winW;
      mouse.y.t = e.clientY / winH;
      if (dragging) {
        scroll.target.x += (e.movementX || 0);
        scroll.target.y += (e.movementY || 0);
      }
    }

    function buildTiles() {
      items.length = 0;
      $grid.innerHTML = '';
      TILES.forEach((t, i) => {
        const el = document.createElement('div');
        el.className = 'ilg-item';
        const wrap = document.createElement('div');
        wrap.className = 'ilg-item-wrap';
        const img = document.createElement('div');
        img.className = 'ilg-item-img';
        img.style.backgroundImage = `url(${sources[i % sources.length]})`;
        wrap.appendChild(img);
        const cap = document.createElement('small');
        cap.className = 'ilg-cap';
        cap.innerHTML = t.cap;
        wrap.appendChild(cap);
        el.appendChild(wrap);
        $grid.appendChild(el);
        capObserver.observe(cap);
        items.push({
          el, img, cap,
          x: t.x, y: t.y, w: t.w, h: t.h,
          ease: FACTORS[i % FACTORS.length],
          extraX: 0, extraY: 0,
        });
      });
    }

    let raf = 0, lastX = 0, lastY = 0;
    function render() {
      scroll.current.x += (scroll.target.x - scroll.current.x) * scroll.ease;
      scroll.current.y += (scroll.target.y - scroll.current.y) * scroll.ease;

      const deltas = {
        x: scroll.current.x - lastX,
        y: scroll.current.y - lastY,
      };

      items.forEach((it) => {
        const posX = it.x + scroll.current.x + it.extraX;
        const posY = it.y + scroll.current.y + it.extraY;
        const posX2 = posX + it.w;
        const posY2 = posY + it.h;

        if (posX > winW) it.extraX -= tileW;
        else if (posX2 < 0) it.extraX += tileW;
        if (posY > winH) it.extraY -= tileH;
        else if (posY2 < 0) it.extraY += tileH;

        const fx = it.x + scroll.current.x + it.extraX;
        const fy = it.y + scroll.current.y + it.extraY;

        gsap.set(it.el, {
          x: fx,
          y: fy,
          rotation: deltas.y * it.ease * 0.1,
          scale: 1 + Math.abs(deltas.x) * it.ease * 0.001,
        });
        gsap.set(it.img, {
          xPercent: (mouse.x.c - 0.5) * -it.ease * 10,
          yPercent: (mouse.y.c - 0.5) * -it.ease * 10,
        });
      });

      lastX = scroll.current.x;
      lastY = scroll.current.y;
      raf = requestAnimationFrame(render);
    }

    onResize();
    buildTiles();

    if (!poor) {
      raf = requestAnimationFrame(render);
    } else {
      gsap.set('.ilg-item', { x: (i) => i * 2, y: 0 });
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      capObserver.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div className={`ilg ${className}`} ref={root} style={style}>
      <div className="ilg-grid" ref={grid} />
    </div>
  );
}
