import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeRacket, makeShuttle, makePlayer, makeBall, lineGrid } from './models.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mini(canvas, { camPos, target, autoRotate = false, minD = 2, maxD = 40, bg = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  if (bg) { scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(bg, maxD * 0.9, maxD * 2.4); }
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 300);
  camera.position.copy(camPos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = minD; controls.maxDistance = maxD;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = autoRotate && !reduce; controls.autoRotateSpeed = 1.4;
  controls.enableZoom = false; // keep page scroll working
  scene.add(new THREE.HemisphereLight(0xe6f7ff, 0x10202a, 1.2));
  const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(6, 12, 8); scene.add(d);
  const d2 = new THREE.DirectionalLight(0x3fb8b5, 0.9); d2.position.set(-8, 5, -6); scene.add(d2);
  const ticks = [];
  let visible = false;
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || !canvas.clientWidth) return;
    ticks.forEach((f) => f(dt));
    controls.update();
    renderer.render(scene, camera);
  });
  return { scene, camera, controls, ticks, canvas };
}

function whenFirstVisible(el, fn) {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && el.clientWidth) { io.disconnect(); setTimeout(fn, 500); }
  }, { threshold: 0.5 });
  io.observe(el);
}

/* Flight animation along a curve ----------------------------------- */
function flight(curve, duration, ease, onStep, onDone) {
  let t = 0, running = true;
  if (reduce) { // no animation: draw the whole path at once
    for (let i = 0; i <= 80; i++) onStep(curve.getPointAt(i / 80), i / 80, i / 80);
    onDone && onDone();
    return { step() {} };
  }
  return {
    step(dt) {
      if (!running) return;
      t = Math.min(1, t + dt / duration);
      onStep(curve.getPointAt(ease(t)), ease(t), t);
      if (t >= 1) { running = false; onDone && onDone(); }
    },
  };
}

function trail(scene, color, radius = 0.05, max = 120) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 10, 8), new THREE.MeshBasicMaterial({ color }), max);
  mesh.count = 0; scene.add(mesh);
  const d = new THREE.Object3D(), last = new THREE.Vector3(1e9, 0, 0);
  const gap = radius * 3;
  return {
    reset() { mesh.count = 0; last.set(1e9, 0, 0); },
    push(p) {
      if (mesh.count >= max || p.distanceTo(last) < gap) return;
      last.copy(p); d.position.copy(p); d.updateMatrix();
      mesh.setMatrixAt(mesh.count, d.matrix); mesh.count++;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ================= RACKETS ======================================== */
const rCanvas = document.getElementById('rackets3d');
if (rCanvas) {
  const m = mini(rCanvas, { camPos: V(0, 1.0, 4.9), target: V(0, 0.9, 0), autoRotate: true, minD: 2.5, maxD: 7 });
  const r1 = makeRacket({ frame: 0xc9ced2, accent: 0x15191b, grip: 0x1d2124 });
  const r2 = makeRacket({ frame: 0x15191b, accent: 0x37d27a, grip: 0x1d2124 });
  r1.position.x = -0.62; r2.position.x = 0.62;
  r1.rotation.z = 0.08; r2.rotation.z = -0.08;
  m.scene.add(r1, r2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshStandardMaterial({ color: 0x14272e, roughness: 0.9 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -0.12; m.scene.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.64, 64), new THREE.MeshBasicMaterial({ color: 0x3fb8b5 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.115; m.scene.add(ring);
  let t = 0;
  m.ticks.push((dt) => {
    t += dt;
    r1.position.y = Math.sin(t * 1.3) * 0.04;
    r2.position.y = Math.sin(t * 1.3 + 1.6) * 0.04;
  });
  // focus buttons
  document.querySelectorAll('[data-racket]').forEach((b) => {
    b.addEventListener('click', () => {
      const which = b.dataset.racket;
      document.querySelectorAll('[data-racket]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      const tx = which === '88' ? -0.62 : which === '99' ? 0.62 : 0;
      m.controls.target.set(tx, 0.95, 0);
      m.camera.position.set(tx, 1.0, which === 'both' ? 4.5 : 3.0);
    });
  });
}

/* ================= COURT: backhand cross-court drop ================ */
const cCanvas = document.getElementById('court3d');
if (cCanvas) {
  const m = mini(cCanvas, { camPos: V(-4.5, 8.5, -12.5), target: V(-0.6, 0.6, 0.2), minD: 6, maxD: 24, bg: 0x0f1f25 });
  const s = m.scene;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), new THREE.MeshStandardMaterial({ color: 0x173f39, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; s.add(floor);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 6.1), new THREE.MeshStandardMaterial({ color: 0x1f6b57, roughness: 0.8 }));
  court.rotation.x = -Math.PI / 2; court.position.y = 0.002; s.add(court);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2f4ef });
  const L = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const b = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.004, 0.04), lineMat);
    b.position.set((x1 + x2) / 2, 0.005, (z1 + z2) / 2);
    b.rotation.y = -Math.atan2(z2 - z1, x2 - x1); s.add(b);
  };
  L(-6.7, -3.05, 6.7, -3.05); L(-6.7, 3.05, 6.7, 3.05);
  L(-6.7, -2.59, 6.7, -2.59); L(-6.7, 2.59, 6.7, 2.59);
  L(-6.7, -3.05, -6.7, 3.05); L(6.7, -3.05, 6.7, 3.05);
  L(-5.94, -3.05, -5.94, 3.05); L(5.94, -3.05, 5.94, 3.05);
  L(-1.98, -3.05, -1.98, 3.05); L(1.98, -3.05, 1.98, 3.05);
  L(-6.7, 0, -1.98, 0); L(1.98, 0, 6.7, 0);
  // net
  const postMat = new THREE.MeshStandardMaterial({ color: 0xd8dde0, metalness: 0.6, roughness: 0.3 });
  for (const z of [-3.05, 3.05]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.55, 12), postMat);
    p.position.set(0, 0.775, z); s.add(p);
  }
  const netMat = new THREE.LineBasicMaterial({ color: 0xcfd8d6, transparent: true, opacity: 0.45 });
  s.add(lineGrid(V(0, 0.76, -3.05), V(0, 0, 6.1), V(0, 0.76, 0), 76, 10, netMat));
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 6.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tape.position.set(0, 1.53, 0); s.add(tape);

  const me = makePlayer(0x3fb8b5, 1.8); me.position.set(-6.0, 0, -2.0); s.add(me);
  const opp = makePlayer(0x6d7f86, 1.8); opp.position.set(3.6, 0, 0.3); s.add(opp);

  const pathPts = [V(-5.8, 2.55, -2.25), V(-3.2, 2.45, -1.1), V(-1.2, 2.05, 0.15), V(0, 1.72, 0.85), V(0.9, 1.15, 1.45), V(1.55, 0.45, 1.85), V(1.85, 0.06, 2.05)];
  const curve = new THREE.CatmullRomCurve3(pathPts, false, 'centripetal');
  const ghost = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
    new THREE.LineDashedMaterial({ color: 0xe6b33c, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.5 }));
  ghost.computeLineDistances(); s.add(ghost);
  const tr = trail(s, 0xe6b33c, 0.045, 160);
  const shuttle = makeShuttle(5); shuttle.position.copy(pathPts[0]); s.add(shuttle);
  const land = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.24, 32), new THREE.MeshBasicMaterial({ color: 0xe6b33c, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  land.rotation.x = -Math.PI / 2; land.position.set(1.85, 0.01, 2.05); s.add(land);

  const up = V(0, 1, 0), dir = new THREE.Vector3(), prev = new THREE.Vector3();
  let fl = null, landT = 1;
  const play = () => {
    tr.reset(); landT = 1; land.material.opacity = 0; prev.copy(pathPts[0]);
    // the drop: fast off the racket, then the shuttle stalls and falls
    fl = flight(curve, 1.7, (x) => 1 - Math.pow(1 - x, 1.7), (p) => {
      dir.subVectors(p, prev); if (dir.lengthSq() > 1e-8) shuttle.quaternion.setFromUnitVectors(up, dir.normalize());
      prev.copy(p); shuttle.position.copy(p); tr.push(p);
    }, () => { landT = 0; });
  };
  m.ticks.push((dt) => {
    fl && fl.step(dt);
    if (landT < 1) { landT += dt; land.material.opacity = 1 - landT; land.scale.setScalar(1 + landT * 2.5); }
  });
  document.querySelector('[data-play="drop"]')?.addEventListener('click', play);
  whenFirstVisible(cCanvas, play);
}

/* ================= SOCCER: free kick + rabona ====================== */
const sCanvas = document.getElementById('soccer3d');
if (sCanvas) {
  const m = mini(sCanvas, { camPos: V(7.5, 6.2, 22.5), target: V(0, 1.2, 6), minD: 8, maxD: 40, bg: 0x0f1f25 });
  const s = m.scene;
  // striped pitch
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 512;
  const cx = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#2b7342' : '#317f49'; cx.fillRect(0, i * 64, 64, 64); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  pitch.rotation.x = -Math.PI / 2; pitch.position.z = 18; s.add(pitch);
  const lm = new THREE.MeshBasicMaterial({ color: 0xf2f4ef });
  const L = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const b = new THREE.Mesh(new THREE.BoxGeometry(len + 0.12, 0.01, 0.12), lm);
    b.position.set((x1 + x2) / 2, 0.006, (z1 + z2) / 2); b.rotation.y = -Math.atan2(z2 - z1, x2 - x1); s.add(b);
  };
  L(-30, 0, 30, 0);
  L(-20.15, 0, -20.15, 16.5); L(20.15, 0, 20.15, 16.5); L(-20.15, 16.5, 20.15, 16.5);
  L(-9.16, 0, -9.16, 5.5); L(9.16, 0, 9.16, 5.5); L(-9.16, 5.5, 9.16, 5.5);
  // goal
  const pm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  for (const x of [-3.66, 3.66]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.44, 16), pm); p.position.set(x, 1.22, 0); s.add(p); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.44, 16), pm); bar.rotation.z = Math.PI / 2; bar.position.set(0, 2.44, 0); s.add(bar);
  const nm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
  s.add(lineGrid(V(-3.66, 2.44, 0), V(7.32, 0, 0), V(0, -0.3, -1.6), 36, 8, nm));
  s.add(lineGrid(V(-3.66, 2.14, -1.6), V(7.32, 0, 0), V(0, -2.14, 0.4), 36, 12, nm));
  s.add(lineGrid(V(-3.66, 0, 0), V(0, 0, -1.2), V(0, 2.44, -0.4), 8, 12, nm));
  s.add(lineGrid(V(3.66, 0, 0), V(0, 0, -1.2), V(0, 2.44, -0.4), 8, 12, nm));

  const keeper = makePlayer(0xe6b33c, 1.9); keeper.position.set(0.4, 0, 0.6); s.add(keeper);
  const wall = [];
  for (const x of [0.9, 1.45, 2.0, 2.55]) { const w = makePlayer(0x1d2b33, 1.85); w.position.set(x, 0, 11.2); s.add(w); wall.push(w); }
  const kicker = makePlayer(0x3fb8b5, 1.8); s.add(kicker);
  const ball = makeBall(0.22); s.add(ball);
  const tr = trail(s, 0xe6b33c, 0.09, 160);

  const shots = {
    fk: {
      start: V(4.2, 0.22, 20), kicker: V(4.9, 0, 21.4),
      pts: [V(4.2, 0.22, 20), V(3.7, 1.5, 15), V(2.4, 2.6, 11.2), V(0.6, 2.9, 6.2), V(-1.8, 2.55, 2.1), V(-3.25, 2.12, 0.05), V(-3.3, 1.9, -1.0)],
      keeperTo: -1.8,
    },
    rabona: {
      start: V(-6.5, 0.22, 16.5), kicker: V(-7.4, 0, 17.4),
      pts: [V(-6.5, 0.22, 16.5), V(-5.3, 1.3, 12.6), V(-2.6, 2.55, 7.4), V(0.9, 2.7, 3.2), V(3.25, 2.15, 0.05), V(3.35, 1.95, -1.0)],
      keeperTo: 1.9,
    },
  };
  let mode = 'fk', fl = null, keeperT = 1, keeperGoal = 0, wallT = 1;
  const setMode = (k) => {
    mode = k; const sh = shots[k];
    ball.position.copy(sh.start); kicker.position.copy(sh.kicker);
    kicker.lookAt(sh.pts[2].x, 0, sh.pts[2].z);
    keeper.position.x = 0.4; keeper.rotation.z = 0; tr.reset(); fl = null;
    wall.forEach((w) => (w.visible = k === 'fk'));
  };
  setMode('fk');
  const play = (k) => {
    setMode(k);
    const sh = shots[k];
    const curve = new THREE.CatmullRomCurve3(sh.pts, false, 'centripetal');
    keeperGoal = sh.keeperTo; keeperT = 0; wallT = 0;
    fl = flight(curve, 1.35, (x) => 1 - Math.pow(1 - x, 1.35), (p) => {
      ball.position.copy(p); ball.rotation.y += 0.35; ball.rotation.x += 0.12; tr.push(p);
    });
  };
  m.ticks.push((dt) => {
    fl && fl.step(dt);
    if (keeperT < 1) {
      keeperT = Math.min(1, keeperT + dt / 1.2);
      const k = Math.max(0, (keeperT - 0.45) / 0.55); // dives late
      keeper.position.x = 0.4 + (keeperGoal - 0.4) * k;
      keeper.position.y = Math.sin(k * Math.PI) * 0.5;
      keeper.rotation.z = -Math.sign(keeperGoal) * k * 1.1;
    }
    if (wallT < 1) {
      wallT = Math.min(1, wallT + dt / 0.6);
      wall.forEach((w, i) => (w.position.y = Math.sin(wallT * Math.PI) * (0.45 + i * 0.03)));
    }
  });
  document.querySelectorAll('[data-kick]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-kick]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    play(b.dataset.kick);
  }));
  whenFirstVisible(sCanvas, () => play('fk'));
}
