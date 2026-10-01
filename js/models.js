import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* Badminton racket, ~2.2 units long, head centred at y = 1.55 ------- */
export function makeRacket({ frame, accent, grip }) {
  const g = new THREE.Group();
  const fm = new THREE.MeshStandardMaterial({ color: frame, metalness: 0.65, roughness: 0.28 });
  const am = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.4, roughness: 0.35, emissive: accent, emissiveIntensity: 0.12 });
  const gm = new THREE.MeshStandardMaterial({ color: grip, metalness: 0.1, roughness: 0.85 });
  const cy = 1.55, rx = 0.4, ry = 0.5;

  // isometric head: slightly squarer than an ellipse
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const s = Math.sin(a), c = Math.cos(a);
    const k = 0.9;
    pts.push(V(Math.sign(s) * Math.pow(Math.abs(s), k) * rx, cy + Math.sign(c) * Math.pow(Math.abs(c), k) * ry, 0));
  }
  const headCurve = new THREE.CatmullRomCurve3(pts, true);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(headCurve, 200, 0.03, 10, true), fm));

  // accent stripe around the top of the frame
  const arc = [];
  for (let i = 0; i <= 30; i++) {
    const a = -1.25 + (2.5 * i) / 30;
    const s = Math.sin(a), c = Math.cos(a);
    arc.push(V(Math.sign(s) * Math.pow(Math.abs(s), 0.9) * (rx + 0.026), cy + Math.pow(Math.abs(c), 0.9) * (ry + 0.026), 0));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 60, 0.014, 6), am));

  // strings
  const sp = [];
  const irx = rx - 0.025, iry = ry - 0.025;
  for (let x = -irx + 0.03; x < irx; x += 0.034) {
    const h = iry * Math.sqrt(Math.max(0, 1 - (x / irx) ** 2));
    sp.push(x, cy - h, 0, x, cy + h, 0);
  }
  for (let y = -iry + 0.03; y < iry; y += 0.034) {
    const w = irx * Math.sqrt(Math.max(0, 1 - (y / iry) ** 2));
    sp.push(-w, cy + y, 0, w, cy + y, 0);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.7 })));

  // T-joint, shaft, handle
  const joint = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.045), fm);
  joint.position.y = cy - ry - 0.02; g.add(joint);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.62, 12), fm);
  shaft.position.y = cy - ry - 0.33; g.add(shaft);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.06, 16), am);
  collar.position.y = 0.46; g.add(collar);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.48, 8), gm);
  handle.position.y = 0.2; g.add(handle);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 16), am);
  cap.position.y = -0.06; g.add(cap);
  return g;
}

/* Feather shuttlecock. Cork points along +y. ------------------------ */
export function makeShuttle(scale = 1) {
  const g = new THREE.Group();
  const cork = new THREE.Mesh(
    new THREE.SphereGeometry(0.0135, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.6 })
  );
  cork.position.y = 0.012;
  const corkBase = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.016, 20), cork.material);
  corkBase.position.y = 0.004;
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.034, 0.07, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.94 })
  );
  skirt.position.y = -0.039;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.0205, 0.0016, 6, 24), new THREE.MeshBasicMaterial({ color: 0xc8102e }));
  band.rotation.x = Math.PI / 2; band.position.y = -0.022;
  g.add(cork, corkBase, skirt, band);
  g.scale.setScalar(scale);
  return g;
}

/* Simple stylised figure ------------------------------------------- */
export function makePlayer(color, height = 1.8) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  const r = height * 0.13;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, height * 0.5, 6, 14), m);
  body.position.y = r + height * 0.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.75, 18, 12), m);
  head.position.y = height * 0.5 + r * 2 + r * 0.6;
  g.add(body, head);
  return g;
}

/* Football with panel lines ---------------------------------------- */
export function makeBall(radius = 0.11) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.45 })));
  const ico = new THREE.IcosahedronGeometry(radius * 1.01, 1);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(ico), new THREE.LineBasicMaterial({ color: 0x1b2a30 })));
  return g;
}

/* Grid of line segments spanning a parallelogram p0 + a*u + b*v ----- */
export function lineGrid(p0, u, v, nu, nv, material) {
  const pos = [];
  for (let i = 0; i <= nu; i++) {
    const a = p0.clone().addScaledVector(u, i / nu);
    const b = a.clone().add(v);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let j = 0; j <= nv; j++) {
    const a = p0.clone().addScaledVector(v, j / nv);
    const b = a.clone().add(u);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(geo, material);
}
