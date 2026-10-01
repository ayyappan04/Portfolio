import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeShuttle, makeBall } from './models.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {
  bg: 0x0d191e, teal: 0x3fb8b5, hot: 0xe2627f, amber: 0xe6b33c,
  steel: 0x48656f, steelLight: 0x9cb5bb, pad: 0x1a2e36,
};

function finishLoading() {
  const l = document.getElementById('loader');
  if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 700); }
}

function init() {
  const canvas = document.getElementById('plant');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no-webgl'); finishLoading(); return;
  }
  const mobile = innerWidth < 860;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.FogExp2(C.bg, 0.018);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0xcfeeff, 0x1a3038, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(8, 16, 10); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x3fb8b5, 1.6);
  rim.position.set(-10, 6, -12); scene.add(rim);

  // ground: blueprint grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: 0x0f1d23, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);
  const grid = new THREE.GridHelper(160, 160, 0x24515a, 0x152d34);
  grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
  const major = new THREE.GridHelper(160, 16, 0x2f6b72, 0x2f6b72);
  major.material.transparent = true; major.material.opacity = 0.35; major.position.y = 0.005; scene.add(major);

  const steel = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.75, roughness: 0.35 });
  const steelLight = new THREE.MeshStandardMaterial({ color: C.steelLight, metalness: 0.85, roughness: 0.3 });
  const padMat = new THREE.MeshStandardMaterial({ color: C.pad, roughness: 0.9 });

  const units = {};
  const pickables = [];
  const animated = [];

  function addEdges(mesh, opacityRef) {
    const mat = new THREE.LineBasicMaterial({ color: C.teal, transparent: true, opacity: 0.35 });
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 28), mat));
    opacityRef.push(mat);
    return mesh;
  }

  function makeUnit(id, x, z, padR = 2.6) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const edgeMats = [];
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.1, 0.2, 48), padMat);
    pad.position.y = 0.1; g.add(pad);
    const ringMat = new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.3, side: THREE.DoubleSide, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(padR + 0.15, padR + 0.32, 64), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    const light = new THREE.PointLight(C.teal, 0, 22, 1.4);
    light.position.set(-1, 7, 8); g.add(light);
    scene.add(g);
    const u = { id, group: g, edgeMats, ringMat, light, level: 0.15 };
    units[id] = u;
    return u;
  }

  /* H-101: storage tank — Hobbies ---------------------------------- */
  {
    const u = makeUnit('hobbies', -13, 1.2);
    const g = u.group;
    const body = addEdges(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 48), steel), u.edgeMats);
    body.position.y = 2.2; g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel);
    dome.scale.y = 0.42; dome.position.y = 4.2; g.add(dome);
    for (const y of [1.1, 2.2, 3.3]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.045, 8, 64), steelLight);
      band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band);
    }
    // ladder
    for (const dx of [-0.22, 0.22]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.4, 0.05), steelLight);
      rail.position.set(dx, 2.4, 1.72); g.add(rail);
    }
    for (let y = 0.5; y < 4.5; y += 0.35) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), steelLight);
      rung.position.set(0, y, 1.72); g.add(rung);
    }
    // level gauge
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 12),
      new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false, transparent: true, opacity: 0.85 }));
    gauge.position.set(-1.7, 2.1, 0.5); g.add(gauge);

    // floating hobbies: a shuttle and a ball orbiting above the dome
    const floaters = new THREE.Group(); floaters.position.y = 6.1; g.add(floaters);
    const sh = makeShuttle(8); sh.position.set(0.95, 0, 0); sh.rotation.z = -0.5; floaters.add(sh);
    const ball = makeBall(0.28); ball.position.set(-0.95, 0.2, 0); floaters.add(ball);
    animated.push((t) => {
      floaters.rotation.y = t * 0.6;
      floaters.position.y = 6.1 + Math.sin(t * 1.4) * 0.18;
      ball.rotation.x = t * 1.5; sh.rotation.y = t * 2;
    });
    u.labelY = 7.2; pickables.push(g);
  }

  /* P-201: distillation column — Projects --------------------------- */
  {
    const u = makeUnit('projects', -3.5, -2.6, 2.2);
    const g = u.group;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.9, 40), steelLight);
    skirt.position.y = 0.65; g.add(skirt);
    const body = addEdges(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 8.6, 48), steel), u.edgeMats);
    body.position.y = 5.4; g.add(body);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.05, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), steel);
    top.scale.y = 0.5; top.position.y = 9.7; g.add(top);
    for (let y = 2.2; y < 9.6; y += 1.5) {
      const plat = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 6, 48), steelLight);
      plat.rotation.x = Math.PI / 2; plat.position.y = y; g.add(plat);
    }
    // sight glasses that light up tray by tray, like vapour climbing the column
    const glasses = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false, transparent: true, opacity: 0.25 });
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), m);
      s.position.set(0, 2.9 + i * 1.25, 1.06); g.add(s); glasses.push(m);
    }
    animated.push((t) => {
      glasses.forEach((m, i) => {
        const phase = (t * 0.9 - i * 0.35) % 2.4;
        m.opacity = 0.2 + 0.8 * Math.max(0, Math.sin(Math.max(0, phase) * Math.PI / 1.2)) * (phase < 1.2 ? 1 : 0);
      });
    });
    // overhead line to a reflux drum
    const drum = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.3, 6, 24), steel);
    drum.rotation.z = Math.PI / 2; drum.position.set(2.3, 8.2, 0); g.add(drum);
    const ovh = new THREE.CatmullRomCurve3([V(0, 10.1, 0), V(0.6, 10.6, 0), V(2.3, 10.2, 0), V(2.3, 8.7, 0)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(ovh, 40, 0.1, 10), steelLight));
    u.labelY = 11.6; pickables.push(g);
  }

  /* C-301: warehouse — Career ---------------------------------------- */
  {
    const u = makeUnit('career', 5.5, 1.4, 3.6);
    const g = u.group;
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x4d6a74, metalness: 0.45, roughness: 0.45 });
    const shell = addEdges(new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 4.2), shellMat), u.edgeMats);
    shell.position.y = 1.8; g.add(shell);
    const tri = new THREE.Shape([new THREE.Vector2(-2.25, 0), new THREE.Vector2(2.25, 0), new THREE.Vector2(0, 1.25)]);
    const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 6.3, bevelEnabled: false });
    roofGeo.translate(0, 0, -3.15);
    const roof = addEdges(new THREE.Mesh(roofGeo, steel), u.edgeMats);
    roof.rotation.y = Math.PI / 2; roof.position.y = 3.4; g.add(roof);
    // loading doors with lights
    for (const dx of [-1.8, 0, 1.8]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x0f1a1f, roughness: 0.8 }));
      door.position.set(dx, 1.05, 2.111); g.add(door);
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.08), new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false }));
      lamp.position.set(dx, 2.05, 2.112); g.add(lamp);
    }
    // conveyor with packages
    const belt = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: 0x111c21, roughness: 0.7 }));
    belt.position.set(0, 0.62, 3.1); g.add(belt);
    for (let x = -4; x <= 4; x += 1) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.8), steelLight);
      leg.position.set(x, 0.3, 3.1); g.add(leg);
    }
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xb48d5c, roughness: 0.85 });
    const boxes = [];
    for (let i = 0; i < 9; i++) {
      const s = 0.35 + (i % 3) * 0.08;
      const b = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s), boxMat);
      b.userData.h = s * 0.4; boxes.push(b); g.add(b);
    }
    animated.push((t) => {
      boxes.forEach((b, i) => {
        const x = ((t * 0.9 + i * 0.93) % 8.4) - 4.2;
        b.position.set(x, 0.68 + b.userData.h, 3.1);
      });
    });
    u.labelY = 6.4; pickables.push(g);
  }

  /* L-401: stirred reactor — Learning -------------------------------- */
  {
    const u = makeUnit('learning', 14.5, -1.2, 2.4);
    const g = u.group;
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd9d6, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false });
    const vessel = addEdges(new THREE.Mesh(new THREE.CapsuleGeometry(1.45, 2.0, 10, 40), glass), u.edgeMats);
    vessel.position.y = 2.95; g.add(vessel);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.9, 40),
      new THREE.MeshStandardMaterial({ color: C.teal, emissive: C.teal, emissiveIntensity: 0.35, transparent: true, opacity: 0.45 }));
    liquid.position.y = 2.2; g.add(liquid);
    for (const y of [2.4, 3.5]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.47, 0.05, 8, 64), steelLight);
      band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band);
    }
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.8, 24), steel);
    motor.position.y = 5.95; g.add(motor);
    const agit = new THREE.Group(); agit.position.y = 1.7; g.add(agit);
    const shaftM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 12), steelLight);
    shaftM.position.y = 2.0; agit.add(shaftM);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.06), steelLight);
      blade.position.set(Math.cos(i * Math.PI / 2) * 0.5, 0, Math.sin(i * Math.PI / 2) * 0.5);
      blade.rotation.y = -i * Math.PI / 2; agit.add(blade);
    }
    for (const [lx, lz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 10), steelLight);
      leg.position.set(lx * 0.95, 0.75, lz * 0.95); g.add(leg);
    }
    // bubbles
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xbff4f2, transparent: true, opacity: 0.8, toneMapped: false });
    const bubbles = [];
    for (let i = 0; i < 18; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 8, 6), bubbleMat);
      b.userData = { a: Math.random() * Math.PI * 2, r: 0.3 + Math.random() * 0.8, o: Math.random() };
      bubbles.push(b); g.add(b);
    }
    animated.push((t, dt) => {
      agit.rotation.y += dt * 3.2;
      bubbles.forEach((b) => {
        const p = (t * 0.35 + b.userData.o) % 1;
        b.position.set(Math.cos(b.userData.a + t) * b.userData.r, 1.3 + p * 1.8, Math.sin(b.userData.a + t) * b.userData.r);
      });
    });
    u.labelY = 7.1; pickables.push(g);
  }

  function V(x, y, z) { return new THREE.Vector3(x, y, z); }

  /* Pipes with flowing particles ------------------------------------ */
  const flows = [];
  function pipe(points, color, density = 3) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 220, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x223a43, metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.85 }));
    scene.add(tube);
    const len = curve.getLength();
    const n = Math.max(8, Math.round(len * density));
    const dotColor = new THREE.Color(color).multiplyScalar(2.2);
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial({ color: dotColor, toneMapped: false }), n);
    scene.add(inst);
    flows.push({ curve, inst, n, len, off: 0 });
  }
  pipe([V(-11.4, 1.0, 1.2), V(-9, 1.0, 1.2), V(-7, 1.0, -2.6), V(-4.55, 1.2, -2.6)], C.teal);
  pipe([V(-2.45, 3.4, -2.6), V(0, 3.4, -2.6), V(1.2, 2.8, 0), V(2.5, 2.4, 1.4)], C.teal);
  pipe([V(8.5, 1.5, 1.4), V(10.6, 1.5, 1.4), V(11.8, 1.8, -1.2), V(13.05, 2.4, -1.2)], C.teal);
  pipe([V(14.5, 0.7, -2.5), V(14.2, 0.7, -7.5), V(0, 0.7, -9), V(-13, 0.7, -6.5), V(-13, 0.7, -0.4)], C.hot, 2.2);
  const dummy = new THREE.Object3D();

  /* Floating dust for depth ----------------------------------------- */
  const dustGeo = new THREE.BufferGeometry();
  const dust = [];
  for (let i = 0; i < 500; i++) dust.push((Math.random() - 0.5) * 70, Math.random() * 18, (Math.random() - 0.5) * 50);
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3));
  const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x6fd3cf, size: 0.05, transparent: true, opacity: 0.5 }));
  scene.add(dustPts);

  /* Labels ---------------------------------------------------------- */
  const labelLayer = document.getElementById('labels');
  const labelInfo = { hobbies: ['H-101', 'Hobbies'], projects: ['P-201', 'Projects'], career: ['C-301', 'Career'], learning: ['L-401', 'Learning'] };
  for (const id in units) {
    const a = document.createElement('a');
    a.href = '#' + id; a.className = 'label';
    a.innerHTML = `<span class="ltag">${labelInfo[id][0]}</span><span class="lname">${labelInfo[id][1]}</span>`;
    labelLayer.appendChild(a);
    units[id].label = a;
  }

  /* Post-processing ------------------------------------------------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.65, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  /* Camera rig ------------------------------------------------------- */
  const sections = ['hero', 'hobbies', 'projects', 'career', 'learning'];
  let active = 'hero';
  function viewFor(id) {
    const wide = innerWidth >= 860;
    if (id === 'hero' || !units[id]) {
      return wide ? { pos: V(1.5, 15, 37), look: V(1, 3.2, -1), shift: 0.27 } : { pos: V(0, 30, 64), look: V(0, 3, -2), shift: 0, shiftY: 0.24 };
    }
    const p = units[id].group.position;
    const tall = id === 'projects' ? 2.5 : 0;
    const far = id === 'career' ? 4 : 0;
    const shiftBy = { hobbies: 0.33, projects: 0.32, career: 0.27, learning: 0.27 }[id];
    if (!wide) return { pos: V(p.x + 2, 8 + tall, p.z + 17 + tall * 2), look: V(p.x, 3 + tall, p.z), shift: 0 };
    return { pos: V(p.x + 2.5, 6.5 + tall + far * 0.4, p.z + 15 + tall * 2.2 + far), look: V(p.x, 3.3 + tall * 0.8, p.z), shift: shiftBy };
  }
  const camPos = viewFor('hero').pos.clone().add(V(0, 8, 14));
  const camLook = viewFor('hero').look.clone();
  camera.position.copy(camPos);

  function updateActive() {
    let cur = 'hero';
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < innerHeight * 0.5) cur = id;
    }
    if (cur !== active) {
      active = cur;
      document.querySelectorAll('.label').forEach((l) => l.classList.toggle('on', l.getAttribute('href') === '#' + active));
    }
  }
  addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  /* Pointer: parallax + hover + click ------------------------------- */
  const mouse = new THREE.Vector2(), ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  let hovered = null;
  addEventListener('pointermove', (e) => {
    mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  });
  canvas.addEventListener('click', () => {
    if (hovered) document.getElementById(hovered).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* Loop ------------------------------------------------------------ */
  const clock = new THREE.Clock();
  let first = true, t = 0, shift = 0, shiftY = 0;
  const tmp = new THREE.Vector3();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += reduce ? dt * 0.25 : dt;

    // hover
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    let h = null;
    if (hit) { let o = hit.object; while (o && !h) { for (const id in units) if (units[id].group === o) h = id; o = o.parent; } }
    if (h !== hovered) { hovered = h; canvas.style.cursor = h ? 'pointer' : ''; }

    // camera
    const v = viewFor(active);
    const target = v.pos.clone();
    if (active === 'hero' && !reduce) {
      const a = Math.sin(t * 0.07) * 0.22;
      target.sub(v.look).applyAxisAngle(V(0, 1, 0), a).add(v.look);
    }
    target.x += mouse.x * 1.6; target.y -= mouse.y * 0.9;
    const k = 1 - Math.exp(-dt * (reduce ? 6 : 1.9));
    camPos.lerp(target, k); camLook.lerp(v.look, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    shift += (v.shift - shift) * k;
    shiftY += ((v.shiftY || 0) - shiftY) * k;
    camera.setViewOffset(innerWidth, innerHeight, -shift * innerWidth, shiftY * innerHeight, innerWidth, innerHeight);

    // unit highlight
    for (const id in units) {
      const u = units[id];
      const goal = id === active ? 1 : id === hovered ? 0.7 : 0.12;
      u.level += (goal - u.level) * Math.min(1, dt * 4);
      const pulse = 0.85 + 0.15 * Math.sin(t * 3);
      u.ringMat.opacity = 0.15 + 0.75 * u.level * pulse;
      u.edgeMats.forEach((m) => (m.opacity = 0.18 + 0.6 * u.level));
      u.light.intensity = 30 * u.level;
      // label
      tmp.set(u.group.position.x, u.labelY, u.group.position.z).project(camera);
      const show = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      const relevant = (active === 'hero' && innerWidth >= 860) || id === active || id === hovered;
      u.label.style.opacity = show && relevant ? 1 : 0;
      u.label.style.pointerEvents = show && relevant ? 'auto' : 'none';
      u.label.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
    }

    // flows
    for (const f of flows) {
      f.off = (f.off + (dt * 2.0) / f.len) % 1;
      for (let i = 0; i < f.n; i++) {
        f.curve.getPointAt((f.off + i / f.n) % 1, dummy.position);
        dummy.updateMatrix(); f.inst.setMatrixAt(i, dummy.matrix);
      }
      f.inst.instanceMatrix.needsUpdate = true;
    }
    animated.forEach((fn) => fn(t, reduce ? dt * 0.25 : dt));
    dustPts.rotation.y = t * 0.01;

    composer.render();
    if (first) { first = false; finishLoading(); }
  }
  renderer.setAnimationLoop(frame);
}

try { init(); } catch (e) { console.error(e); document.body.classList.add('no-webgl'); finishLoading(); }
