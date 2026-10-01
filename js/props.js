import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- Badminton racket: 675 mm, isometric head, PBR ---------- */
function gripTexture(base, stripe) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 512);
  g.strokeStyle = stripe; g.lineWidth = 7;
  for (let y = -128; y < 640; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + 36); g.stroke(); }
  // fine towel-like noise
  const d = g.getImageData(0, 0, 128, 512);
  for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeRacket({ frame, accent, accent2 = accent, grip = '#1b1d20', gripStripe = '#2a2e33', strings = 0xf2efe6 }) {
  const g = new THREE.Group();
  const paint = (c, rough = 0.28) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.35, roughness: rough, clearcoat: 1, clearcoatRoughness: 0.08 });
  const fm = paint(frame), am = paint(accent, 0.25), am2 = paint(accent2, 0.25);
  const L = 0.675, headW = 0.215, headH = 0.246, cy = L - headH / 2 - 0.004;
  const sq = (v, k) => Math.sign(v) * Math.pow(Math.abs(v), k);
  const headPt = (a, grow = 0) => {
    const s = Math.sin(a), c = Math.cos(a), k = c < 0 ? 0.8 : 0.9;
    return V(sq(s, k) * (headW / 2 + grow), cy + sq(c, k) * (headH / 2 + grow), 0);
  };
  const pts = []; for (let i = 0; i < 128; i++) pts.push(headPt((i / 128) * Math.PI * 2));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const frameMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 320, 0.0058, 10, true), fm);
  frameMesh.scale.z = 1.35; g.add(frameMesh);
  const grom = new THREE.Mesh(new THREE.TubeGeometry(curve, 320, 0.0032, 6, true), new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.55 }));
  grom.scale.set(0.982, 1, 2.2); grom.position.y = cy * 0.018; g.add(grom);
  const arc = []; for (let i = 0; i <= 48; i++) arc.push(headPt(-1.3 + (2.6 * i) / 48, 0.0022));
  const sweep = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 120, 0.0041, 8), am); sweep.scale.z = 1.5; g.add(sweep);
  for (const sgn of [-1, 1]) {
    const s = []; for (let i = 0; i <= 20; i++) s.push(headPt(Math.PI - sgn * (0.5 + 0.8 * i / 20), 0.0024));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s), 50, 0.0039, 8), am2); m.scale.z = 1.5; g.add(m);
  }
  // strings as thin cylinders would be heavy; fine lines read well at this scale
  const sp = [], iw = headW / 2 - 0.006, ih = headH / 2 - 0.006;
  for (let i = 0; i < 22; i++) {
    const x = -iw + 0.004 + (i / 21) * (2 * iw - 0.008);
    const h = ih * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x / iw), 2.2)), 1 / 2.2);
    sp.push(x, cy - h, 0, x, cy + h, 0);
  }
  for (let i = 0; i < 23; i++) {
    const y = -ih + 0.005 + (i / 22) * (2 * ih - 0.01);
    const w = iw * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y / ih), 2.2)), 1 / 2.2);
    sp.push(-w, cy + y, 0, w, cy + y, 0);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: strings, transparent: true, opacity: 0.9 })));
  const throatY = cy - headH / 2;
  const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); return o; };
  add(new THREE.CylinderGeometry(0.0055, 0.0078, 0.032, 12), fm, throatY - 0.013);
  const shaftLen = 0.27;
  add(new THREE.CylinderGeometry(0.0037, 0.0037, shaftLen, 16), fm, throatY - 0.029 - shaftLen / 2);
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 16), am, throatY - 0.12);
  const handleTop = throatY - 0.029 - shaftLen;
  add(new THREE.CylinderGeometry(0.0045, 0.0136, 0.032, 16), am2, handleTop - 0.013);
  const gripMat = new THREE.MeshStandardMaterial({ map: gripTexture(grip, gripStripe), roughness: 0.92 });
  const handle = add(new THREE.CylinderGeometry(0.0136, 0.0126, 0.196, 8), gripMat, handleTop - 0.029 - 0.098);
  handle.rotation.y = Math.PI / 8;
  add(new THREE.CylinderGeometry(0.0146, 0.0146, 0.011, 20), am, handleTop - 0.232);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ---------- Feather shuttlecock (cork up, 85 mm tall) ---------- */
const featherShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.0035, 0); s.lineTo(0.0035, 0);
  s.lineTo(0.0072, 0.045); s.quadraticCurveTo(0.0072, 0.064, 0, 0.066); s.quadraticCurveTo(-0.0072, 0.064, -0.0072, 0.045);
  s.closePath(); return s;
})();
const featherGeo = new THREE.ShapeGeometry(featherShape, 6);
const featherMat = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf6, roughness: 0.75, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.94 });
const corkMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f3ee, roughness: 0.5, clearcoat: 0.4 });
export function makeShuttle() {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.0128, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), corkMat); dome.position.y = 0.013; g.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.017, 32), corkMat); base.position.y = 0.0045; g.add(base);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.01295, 0.01295, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0x1a3d6e, roughness: 0.6 })); band.position.y = 0.004; g.add(band);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const piv = new THREE.Group(); piv.rotation.y = -a; g.add(piv);
    const f = new THREE.Mesh(featherGeo, featherMat);
    f.position.set(0, -0.004, 0.0105); f.rotation.x = Math.PI + 0.36; piv.add(f);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0004, 0.064, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    shaft.position.set(0, -0.034, 0.022); shaft.rotation.x = -0.36; piv.add(shaft);
  }
  for (const [y, r] of [[-0.016, 0.0165], [-0.03, 0.021]]) {
    const thread = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0011, 6, 48), new THREE.MeshStandardMaterial({ color: 0x1a3d6e, roughness: 0.7 }));
    thread.rotation.x = Math.PI / 2; thread.position.y = y; g.add(thread);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeShuttleTube() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.38, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x2f5d8a, roughness: 0.35, clearcoat: 0.6 })); body.position.y = 0.19; g.add(body);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0362, 0.0362, 0.16, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xf2f2ef, roughness: 0.4, clearcoat: 0.6 })); label.position.y = 0.2; g.add(label);
  for (const y of [0.005, 0.375]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 48), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.45 })); c.position.y = y; g.add(c); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ---------- Football: truncated icosahedron with grooved seams ---------- */
export function makeBall(r = 0.11) {
  const ico = new THREE.IcosahedronGeometry(1, 0); const p = ico.attributes.position;
  const pent = [];
  for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)).normalize(); if (!pent.some((q) => q.distanceTo(v) < 1e-3)) pent.push(v); }
  const hex = [];
  for (let i = 0; i < p.count; i += 3) hex.push(V(p.getX(i) + p.getX(i + 1) + p.getX(i + 2), p.getY(i) + p.getY(i + 1) + p.getY(i + 2), p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)).normalize());
  const centres = pent.map((v) => [v, 1]).concat(hex.map((v) => [v, 0]));
  const geo = new THREE.SphereGeometry(r, 192, 144);
  const pos = geo.attributes.position, col = [], n = V();
  const black = new THREE.Color(0x111315), white = new THREE.Color(0xf4f3ef), seam = new THREE.Color(0x77756f);
  for (let i = 0; i < pos.count; i++) {
    n.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    let a1 = 9, a2 = 9, t1 = 0;
    for (const [c, t] of centres) { const a = n.angleTo(c); if (a < a1) { a2 = a1; a1 = a; t1 = t; } else if (a < a2) a2 = a; }
    const d = a2 - a1; const groove = d < 0.03;
    // push seams slightly inward and puff panels for a stitched look
    const puff = groove ? -0.012 : 0.004 * Math.min(1, d / 0.12);
    pos.setXYZ(i, n.x * r * (1 + puff), n.y * r * (1 + puff), n.z * r * (1 + puff));
    const c = groove ? seam : t1 ? black : white; col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
  m.castShadow = true;
  return m;
}

/* ---------- Free-kick training mannequin ---------- */
export function makeMannequin() {
  const s = new THREE.Shape();
  s.moveTo(-0.24, 0); s.lineTo(-0.2, 1.05); s.lineTo(-0.28, 1.12); s.lineTo(-0.27, 1.5);
  s.quadraticCurveTo(-0.22, 1.56, -0.12, 1.58); s.lineTo(-0.09, 1.62);
  s.absarc(0, 1.72, 0.11, -Math.PI * 0.75, Math.PI * 1.75, false);
  s.lineTo(0.12, 1.58); s.quadraticCurveTo(0.22, 1.56, 0.27, 1.5); s.lineTo(0.28, 1.12); s.lineTo(0.2, 1.05); s.lineTo(0.24, 0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  geo.translate(0, 0, -0.0175);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x1f3d7a, roughness: 0.45, clearcoat: 0.5 }));
  m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x8c9196, metalness: 0.8, roughness: 0.3 })); pole.position.set(0, -0.1, 0); g.add(pole);
  return g;
}

/* ---------- Furniture helpers ---------- */
export function roundedBox(w, h, d, r, material) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------- Net texture (alpha) ---------- */
export function netTexture(cell = 8, line = 1.4, color = 'rgba(28,28,28,0.95)', size = 256) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d'); g.strokeStyle = color; g.lineWidth = line;
  for (let x = 0; x <= size; x += cell) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, size); g.stroke(); }
  for (let y = 0; y <= size; y += cell) { g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
