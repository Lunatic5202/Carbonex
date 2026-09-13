import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MINE_BOUNDARY, OPEN_PIT } from "../../data/mineData";
import { polygonCentroid } from "../../utils/geoUtils";
import { statusColor } from "../../utils/riskUtils";

/**
 * Lightweight 3D terrain view built directly on three.js (no OrbitControls,
 * no react-three-fiber). Drapes a live keyless basemap (OSM street tiles)
 * onto the ground plane so the map imagery is visible in 3D, then overlays:
 *   - the mine boundary as a raised outline
 *   - an extruded depression standing in for the open pit
 *   - sensor nodes as colour-coded spheres, height-offset by risk
 *
 * Falls back to a plain message if WebGL cannot be initialised instead of
 * crashing the app.
 */
const GROUND_ZOOM = 15;
const GROUND_GRID = 3; // n×n tile mosaic centred on the site

function loadTile(url) {
  return fetch(url, { mode: "cors" })
    .then((res) => (res.ok ? res.blob() : null))
    .then((blob) => (blob ? createImageBitmap(blob) : null))
    .catch(() => null);
}

// Web-Mercator helpers so both the tile mosaic and on-ground features use
// the same projection and therefore line up exactly.
function mercWorld(lat, lng, z) {
  const tilesPerEdge = 2 ** z;
  const xtile = ((lng + 180) / 360) * tilesPerEdge;
  const r = (lat * Math.PI) / 180;
  const ytile =
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) *
    tilesPerEdge;
  return { xtile, ytile, tilesPerEdge };
}

export default function Terrain3D({ nodes }) {
  const containerRef = useRef(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(true);
      return undefined;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1113);
    scene.fog = new THREE.Fog(0x0e1113, 60, 260);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ---- lighting: a low warm key light + soft ambient fill, evoking a
    // control-room / dusk-over-the-pit atmosphere rather than flat CAD light.
    const ambient = new THREE.AmbientLight(0x8a959c, 0.55);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xd99457, 1.1);
    key.position.set(-40, 60, 30);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x3d8fb0, 0.35);
    rim.position.set(40, 20, -40);
    scene.add(rim);

    // ---- coordinate mapping: tile-aligned Web-Mercator X/Z plane centred
    // on the mine boundary centroid, so the draped basemap photo aligns
    // exactly with everything drawn on the ground.
    const origin = polygonCentroid(MINE_BOUNDARY);
    const SCALE = 9000; // scene units per degree of longitude
    const world = mercWorld(origin[0], origin[1], GROUND_ZOOM);
    const TWS = (360 / 2 ** GROUND_ZOOM) * SCALE; // world units per tile edge
    const project = ([lat, lng]) => {
      const t = mercWorld(lat, lng, GROUND_ZOOM);
      return [(t.xtile - world.xtile) * TWS, -(t.ytile - world.ytile) * TWS];
    };

    // ---- ground plane, sized to the tile mosaic
    const planeUnits = GROUND_GRID * TWS;
    const groundGeo = new THREE.PlaneGeometry(planeUnits, planeUnits, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2b3020,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    scene.add(ground);

    // ---- drape the keyless OSM basemap over the ground plane
    let texturedMat = null;
    let disposed = false;
    (async () => {
      const n = GROUND_GRID;
      const canvas = document.createElement("canvas");
      const size = n * 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const cx = Math.floor(world.xtile);
      const cy = Math.floor(world.ytile);
      let anyPainted = false;

      const jobs = [];
      for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < n; c += 1) {
          const x = cx - 1 + c;
          const y = cy - 1 + r;
          const url = `https://tile.openstreetmap.org/${GROUND_ZOOM}/${x}/${y}.png`;
          jobs.push(
            loadTile(url).then((img) => {
              if (!img || disposed) return;
              ctx.drawImage(
                img,
                (x - world.xtile) * 256 + n * 128,
                (y - world.ytile) * 256 + n * 128
              );
              anyPainted = true;
            })
          );
        }
      }
      await Promise.all(jobs);
      if (disposed || !anyPainted) return;

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;

      texturedMat = new THREE.MeshBasicMaterial({
        map: tex,
        fog: false,
        toneMapped: false,
      });
      ground.material.dispose();
      ground.material = texturedMat;
    })().catch(() => {});

    // ---- mine boundary as a raised outline (embossed edge)
    const boundaryPts = MINE_BOUNDARY.map((p) => {
      const [x, z] = project(p);
      return new THREE.Vector3(x, 0.4, z);
    });
    boundaryPts.push(boundaryPts[0]);
    const boundaryLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(boundaryPts),
      new THREE.LineBasicMaterial({ color: 0xd99457 })
    );
    scene.add(boundaryLine);

    // ---- open pit depression: extrude a shape downward
    const pitShape = new THREE.Shape();
    OPEN_PIT.forEach((p, i) => {
      const [x, z] = project(p);
      if (i === 0) pitShape.moveTo(x, z);
      else pitShape.lineTo(x, z);
    });
    const pitGeo = new THREE.ExtrudeGeometry(pitShape, {
      depth: 9,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 2,
    });
    pitGeo.rotateX(Math.PI / 2);
    const pitMat = new THREE.MeshStandardMaterial({
      color: 0x3a2618,
      roughness: 0.95,
    });
    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.y = -0.1;
    scene.add(pit);

    // ---- sensor nodes as small emissive spheres, lifted slightly higher
    // for more critical risk so the worst nodes are easiest to spot.
    const nodeGroup = new THREE.Group();
    nodes.forEach((n) => {
      const [x, z] = project([n.lat, n.lng]);
      const height = 1.2 + (n.riskScore / 100) * 3.5;
      const geo = new THREE.SphereGeometry(0.7, 12, 12);
      const color = new THREE.Color(statusColor(n.status));
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: n.status === "critical" ? 0.9 : 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, height, z);
      nodeGroup.add(mesh);

      // thin stem connecting the marker down to the ground for depth cueing
      const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, height, 6);
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x5c666c });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(x, height / 2, z);
      nodeGroup.add(stem);
    });
    scene.add(nodeGroup);

    // ---- manual orbit: drag to rotate, wheel to zoom. Deliberately not
    // using THREE.OrbitControls to avoid examples/ import-path fragility
    // across bundler setups.
    let radius = 90;
    let theta = Math.PI / 4; // horizontal angle
    let phi = 1.0; // vertical angle (from y axis)
    const target = new THREE.Vector3(0, 0, 0);

    function updateCamera() {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    }
    updateCamera();

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function onPointerUp() {
      dragging = false;
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      theta -= dx * 0.006;
      phi = Math.min(1.45, Math.max(0.35, phi - dy * 0.006));
      updateCamera();
    }
    function onWheel(e) {
      e.preventDefault();
      radius = Math.min(220, Math.max(35, radius + e.deltaY * 0.08));
      updateCamera();
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let autoRotate = true;
    function stopAutoRotateOnInteract() {
      autoRotate = false;
    }
    renderer.domElement.addEventListener("pointerdown", stopAutoRotateOnInteract);
    renderer.domElement.addEventListener("wheel", stopAutoRotateOnInteract);

    let frameId;
    function animate() {
      if (autoRotate) {
        theta += 0.0015;
        updateCamera();
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      if (texturedMat) {
        texturedMat.map?.dispose();
        texturedMat.dispose();
      }
      pitGeo.dispose();
      pitMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // Intentionally built once on mount rather than re-running on every
    // simulation tick: tearing down and rebuilding a WebGL context every
    // few seconds would be expensive and would flicker. The 3D view shows
    // a live snapshot of node status/risk; switch views (2D <-> 3D) to
    // pull a fresh snapshot. Swap this for imperative mesh updates if you
    // need the 3D view to animate continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (webglError) {
    return (
      <div className="mine-mode-3d-fallback">
        <div>3D terrain view is unavailable on this device (WebGL could not start).</div>
        <div>Switch back to 2D MAP for full functionality.</div>
      </div>
    );
  }

  return <div className="terrain-3d-wrap" ref={containerRef} />;
}
