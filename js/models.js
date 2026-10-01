import { THREE, mat, mesh, box, cyl, V, scene } from './core.js';

/* Grip wrap texture: spiral overgrip --------------------------------- */
function gripTexture(base, stripe) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = stripe; g.lineWidth = 5;
  for (let y = -64; y < 320; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 26); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Badminton racket: 675 mm long, isometric head --------------------- */
export function makeRacket({ frame, accent, accent2 = accent, grip = '#1d2226', gripStripe = '#30373c' }) {
  const g = new THREE.Group();
  const fm = new THREE.MeshPhysicalMaterial({ color: frame, metalness: 0.55, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 });
  const am = new THREE.MeshPhysicalMaterial({ color: accent, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 });
  const am2 = new THREE.MeshPhysicalMaterial({ color: accent2, metalness: 0.4, roughness: 0.3, clearcoat: 1 });
  const L = 0.675, headW = 0.215, headH = 0.245, cy = L - headH / 2 - 0.004;
  const sq = (v, k) => Math.sign(v) * Math.pow(Math.abs(v), k);
  const headPt = (a, grow = 0) => {
    const s = Math.sin(a), c = Math.cos(a);
    const k = c < 0 ? 0.82 : 0.9; // squarer shoulders, isometric
    return V(sq(s, k) * (headW / 2 + grow), cy + sq(c, k) * (headH / 2 + grow), 0);
  };
  const pts = []; for (let i = 0; i < 96; i++) pts.push(headPt((i / 96) * Math.PI * 2));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  // box-section frame: slightly flattened tube
  const frameMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.0062, 8, true), fm);
  frameMesh.scale.z = 1.25; frameMesh.castShadow = true; g.add(frameMesh);
  // grommet strip
  const grom = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.0035, 6, true), mat(0x111417, { rough: 0.6 }));
  grom.scale.set(0.985, 1, 2.1); grom.position.y = cy * 0.015; g.add(grom);
  // accent sweep along the top of the frame
  const arc = []; for (let i = 0; i <= 40; i++) arc.push(headPt(-1.35 + (2.7 * i) / 40, 0.0025));
  const sweep = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 90, 0.0042, 6), am);
  sweep.scale.z = 1.45; g.add(sweep);
  // side accents near the throat
  for (const sgn of [-1, 1]) {
    const s = []; for (let i = 0; i <= 16; i++) s.push(headPt(Math.PI - sgn * (0.55 + 0.75 * i / 16), 0.0026));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s), 40, 0.004, 6), am2);
    m.scale.z = 1.45; g.add(m);
  }
  // strings: 22 mains x 22 crosses
  const sp = [], iw = headW / 2 - 0.006, ih = headH / 2 - 0.006;
  for (let i = 0; i < 22; i++) {
    const x = -iw + 0.004 + (i / 21) * (2 * iw - 0.008);
    const h = ih * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x / iw), 2.2)), 1 / 2.2);
    sp.push(x, cy - h, 0, x, cy + h, 0);
  }
  for (let i = 0; i < 22; i++) {
    const y = -ih + 0.005 + (i / 21) * (2 * ih - 0.01);
    const w = iw * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y / ih), 2.2)), 1 / 2.2);
    sp.push(-w, cy + y, 0, w, cy + y, 0);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xf2efe6, transparent: true, opacity: 0.85 })));
  // T-joint and shaft
  const throatY = cy - headH / 2;
  const tj = mesh(new THREE.CylinderGeometry(0.0055, 0.0075, 0.03, 10), fm, 0, throatY - 0.012, 0, g);
  const shaftLen = 0.27;
  const shaft = mesh(new THREE.CylinderGeometry(0.0038, 0.0038, shaftLen, 12), fm, 0, throatY - 0.027 - shaftLen / 2, 0, g);
  const shaftDecal = mesh(new THREE.CylinderGeometry(0.0041, 0.0041, 0.09, 12), am, 0, throatY - 0.12, 0, g);
  // cone and handle
  const handleTop = throatY - 0.027 - shaftLen;
  mesh(new THREE.CylinderGeometry(0.0045, 0.0135, 0.03, 12), am2, 0, handleTop - 0.012, 0, g);
  const gripMat = new THREE.MeshStandardMaterial({ map: gripTexture(grip, gripStripe), roughness: 0.9 });
  const handle = mesh(new THREE.CylinderGeometry(0.0135, 0.0125, 0.195, 8), gripMat, 0, handleTop - 0.027 - 0.0975, 0, g);
  handle.rotation.y = Math.PI / 8;
  mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.012, 16), am, 0, handleTop - 0.127 - 0.1, 0, g);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* Feather shuttlecock, cork up ---------------------------------------- */
export function makeShuttle(scale = 1) {
  const g = new THREE.Group();
  const white = mat(0xffffff, { rough: 0.6 });
  mesh(new THREE.SphereGeometry(0.0128, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 0.014, 0, g);
  mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.016, 20), white, 0, 0.006, 0, g);
  // 16 feathers
  const fm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.064), fm);
    f.position.set(Math.cos(a) * 0.024, -0.03, Math.sin(a) * 0.024);
    f.rotation.y = -a + Math.PI / 2; f.rotation.x = 0; f.rotateX(-0.32);
    g.add(f);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0012, 6, 32), mat(0xc8102e));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.008; g.add(ring);
  const ring2 = ring.clone(); ring2.position.y = -0.022; ring2.scale.setScalar(1.25); g.add(ring2);
  g.scale.setScalar(scale);
  return g;
}

export function makeShuttleTube(scale = 1) {
  const g = new THREE.Group();
  cyl(0.037, 0.037, 0.36, 0x2a6f9e, 0, 0.18, 0, g, 24, { rough: 0.5 });
  cyl(0.039, 0.039, 0.03, 0xeeeeee, 0, 0.37, 0, g, 24);
  cyl(0.039, 0.039, 0.03, 0xeeeeee, 0, 0.0, 0, g, 24);
  const band = cyl(0.0375, 0.0375, 0.12, 0xf4f2ec, 0, 0.2, 0, g, 24);
  g.scale.setScalar(scale);
  return g;
}

/* Soccer ball: truncated icosahedron via Voronoi of 12+20 centres ----- */
export function makeSoccerBall(r = 0.11) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const pent = [];
  const p = ico.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    if (!pent.some((q) => q.distanceTo(v) < 1e-3)) pent.push(v);
  }
  const hex = [];
  for (let i = 0; i < p.count; i += 3) {
    hex.push(V(p.getX(i) + p.getX(i + 1) + p.getX(i + 2), p.getY(i) + p.getY(i + 1) + p.getY(i + 2), p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)).normalize());
  }
  const centres = pent.map((v) => [v, 1]).concat(hex.map((v) => [v, 0]));
  const geo = new THREE.SphereGeometry(r, 160, 120);
  const pos = geo.attributes.position, col = [];
  const n = new THREE.Vector3();
  const black = new THREE.Color(0x15191c), white = new THREE.Color(0xf7f7f3), seam = new THREE.Color(0x9a9a96);
  for (let i = 0; i < pos.count; i++) {
    n.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    let a1 = 9, a2 = 9, t1 = 0;
    for (const [c, t] of centres) {
      const a = n.angleTo(c);
      if (a < a1) { a2 = a1; a1 = a; t1 = t; } else if (a < a2) a2 = a;
    }
    const c = (a2 - a1) < 0.022 ? seam : t1 ? black : white;
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.6 }));
  m.castShadow = true;
  return m;
}

/* Stylised person with swinging limbs -------------------------------- */
export function makePerson({ top = 0x2fa7a4, bottom = 0x2b3640, skin = 0xc78f6b, hair = 0x1d1a18, scale = 1 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const topM = mat(top, { rough: 0.8 }), botM = mat(bottom, { rough: 0.85 }), skinM = mat(skin, { rough: 0.7 }), hairM = mat(hair, { rough: 0.9 });
  const torso = mesh(new THREE.CapsuleGeometry(0.22, 0.42, 6, 16), topM, 0, 1.18, 0, body);
  torso.scale.set(1, 1, 0.75);
  const head = mesh(new THREE.SphereGeometry(0.17, 24, 16), skinM, 0, 1.72, 0, body);
  const hairCap = mesh(new THREE.SphereGeometry(0.178, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 1.74, -0.01, body);
  hairCap.rotation.x = -0.25;
  const limb = (r, len, m) => {
    const piv = new THREE.Group();
    const s = mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m, 0, -len / 2 - r * 0.5, 0, piv);
    return piv;
  };
  const armL = limb(0.07, 0.5, topM), armR = limb(0.07, 0.5, topM);
  armL.position.set(-0.3, 1.5, 0); armR.position.set(0.3, 1.5, 0);
  const legL = limb(0.095, 0.62, botM), legR = limb(0.095, 0.62, botM);
  legL.position.set(-0.12, 0.88, 0); legR.position.set(0.12, 0.88, 0);
  for (const [leg, x] of [[legL, -0.12], [legR, 0.12]]) {
    const shoe = mesh(new THREE.BoxGeometry(0.15, 0.08, 0.28), mat(0xf4f2ec), 0, -0.82, 0.05, leg);
  }
  body.add(armL, armR, legL, legR);
  g.scale.setScalar(scale);
  g.userData = { body, armL, armR, legL, legR, phase: 0 };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function animatePerson(p, speed, dt) {
  const u = p.userData;
  u.phase += dt * (4 + speed * 2.2);
  const s = Math.min(1, speed / 4);
  const sw = Math.sin(u.phase) * 0.75 * s;
  u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
  u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
  u.body.position.y = Math.abs(Math.cos(u.phase)) * 0.06 * s;
}

/* Trees, rocks, benches ---------------------------------------------- */
export function makeTree(kind = 0) {
  const g = new THREE.Group();
  cyl(0.18, 0.26, 1.6, 0x7a5a3e, 0, 0.8, 0, g, 7, { flat: true });
  const leaf = [0x6ea862, 0x5d9a5a, 0x86b86a][kind % 3];
  if (kind % 2 === 0) {
    mesh(new THREE.ConeGeometry(1.5, 2.6, 7), mat(leaf, { flat: true }), 0, 2.6, 0, g);
    mesh(new THREE.ConeGeometry(1.1, 2.0, 7), mat(leaf, { flat: true }), 0, 3.7, 0, g);
  } else {
    mesh(new THREE.IcosahedronGeometry(1.5, 0), mat(leaf, { flat: true }), 0, 2.8, 0, g);
    mesh(new THREE.IcosahedronGeometry(1.0, 0), mat(leaf, { flat: true }), 0.6, 3.5, 0.3, g);
  }
  return g;
}
export function makeBench() {
  const g = new THREE.Group();
  box(1.8, 0.08, 0.5, 0xb88a5a, 0, 0.45, 0, g);
  box(1.8, 0.4, 0.06, 0xb88a5a, 0, 0.7, -0.22, g);
  for (const x of [-0.75, 0.75]) box(0.08, 0.45, 0.45, 0x3a4249, x, 0.22, 0, g);
  return g;
}
export function makeTruck(color = 0xd9473f, boxColor = 0xf4f2ec) {
  const g = new THREE.Group();
  box(5.2, 2.6, 2.3, boxColor, -0.6, 1.75, 0, g, { rough: 0.6 });
  box(1.6, 1.8, 2.2, color, 2.6, 1.35, 0, g, { rough: 0.5 });
  box(0.05, 0.8, 1.8, mat(0x8fc3d6, { rough: 0.1, metal: 0.3 }), 3.42, 1.7, 0, g);
  box(5.2, 0.35, 2.32, color, -0.6, 0.65, 0, g);
  for (const x of [-2.4, -1.2, 2.5]) for (const z of [-1.05, 1.05]) {
    const w = cyl(0.42, 0.42, 0.3, 0x1b1f22, x, 0.42, z, g, 16); w.rotation.x = Math.PI / 2;
  }
  return g;
}

/* Floating diamond marker for points of interest ---------------------- */
export function makeMarker(color = 0x2fa7a4) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, flatShading: true }));
  m.scale.y = 1.5;
  return m;
}
