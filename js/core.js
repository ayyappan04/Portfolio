import * as THREE from 'three';

export { THREE };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;

export const PAL = {
  grass: 0x9cc46f, grass2: 0x8bb862, path: 0xeae0cc, asphalt: 0x50565c, sand: 0xe8d4a8,
  water: 0x4fa3b5, teal: 0x2fa7a4, tealDark: 0x1f6f73, ink: 0x22303a, white: 0xf4f2ec,
  amber: 0xf0b23c, red: 0xd9473f, brick: 0xb9785a, glass: 0x8fc3d6, concrete: 0xd3cfc6,
};

/* Renderer, scene, camera -------------------------------------------- */
export const canvas = document.getElementById('world');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3dcc0, 90, 260);
export const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 900);

/* Sky dome: warm late-afternoon gradient ----------------------------- */
{
  const geo = new THREE.SphereGeometry(500, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x6fa9cf) }, mid: { value: new THREE.Color(0xb9d4dc) }, low: { value: new THREE.Color(0xf6d6b2) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.7, h)) : mix(low, mid, smoothstep(-0.05, 0.18, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(geo, mat));
}

/* Lights ------------------------------------------------------------- */
export const hemi = new THREE.HemisphereLight(0xdbeeff, 0x7a8f5a, 1.15);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.position.set(40, 70, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 200 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/* Helpers ------------------------------------------------------------ */
const matCache = new Map();
export function mat(color, { flat = false, rough = 0.85, metal = 0, emissive = 0, ei = 0, opacity = 1 } = {}) {
  const key = [color, flat, rough, metal, emissive, ei, opacity].join('|');
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, flatShading: flat, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei,
      transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
    }));
  }
  return matCache.get(key);
}
export function mesh(geo, material, x = 0, y = 0, z = 0, parent = scene, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive;
  parent.add(m); return m;
}
export function box(w, h, d, color, x, y, z, parent = scene, opts) {
  return mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'object' ? color : mat(color, opts), x, y, z, parent);
}
export function cyl(rt, rb, h, color, x, y, z, parent = scene, seg = 24, opts) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'object' ? color : mat(color, opts), x, y, z, parent);
}
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* Seeded random for repeatable scenery ------------------------------- */
let seed = 7;
export const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/* Canvas-texture signs ----------------------------------------------- */
export function signTexture(lines, { w = 1024, h = 512, bg = '#22303a', fg = '#f4f2ec', accent = '#2fa7a4', align = 'left' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = accent; g.fillRect(0, 0, w, h * 0.04);
  let y = h * 0.2;
  g.textAlign = align; g.textBaseline = 'top';
  const x = align === 'center' ? w / 2 : w * 0.07;
  for (const ln of lines) {
    const size = ln.size * h;
    g.font = `${ln.weight || 700} ${size}px Archivo, "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = ln.color || fg;
    g.fillText(ln.text, x, y, w * 0.86);
    y += size * (ln.gap || 1.25);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function sign(lines, width, height, x, y, z, rotY = 0, parent = scene, opts = {}) {
  const ratio = width / height;
  const tex = signTexture(lines, { w: 1024, h: Math.round(1024 / ratio), ...opts });
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  face.position.z = 0.06; g.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.1), mat(0x1a252c));
  back.castShadow = true; g.add(back);
  return g;
}

/* World registries --------------------------------------------------- */
export const colliders = []; // {x0,z0,x1,z1} axis-aligned boxes or {x,z,r} circles
export const occluders = []; // camera-blocking boxes {x0,y0,z0,x1,y1,z1}
export const addBoxCollider = (cx, cz, w, d, pad = 0, h = 0) => {
  colliders.push({ x0: cx - w / 2 - pad, z0: cz - d / 2 - pad, x1: cx + w / 2 + pad, z1: cz + d / 2 + pad });
  if (h) occluders.push({ x0: cx - w / 2, y0: 0, z0: cz - d / 2, x1: cx + w / 2, y1: h, z1: cz + d / 2 });
};
export const cutaways = []; // {obj, x0,z0,x1,z1} hidden while the player stands inside
export const addCircleCollider = (x, z, r) => colliders.push({ x, z, r });
export const zones = [];   // {id, title, kicker, x, z, r, tpl, color, district}
export const labels = [];  // {el, pos: Vector3, near}
export const tickers = []; // fn(dt, t, player)
export const ISLAND_R = 96;

/* Island, water ------------------------------------------------------ */
{
  // ground with soft noise colouring
  const g = new THREE.CircleGeometry(ISLAND_R, 96, 0, Math.PI * 2);
  g.rotateX(-Math.PI / 2);
  const col = []; const c1 = new THREE.Color(PAL.grass), c2 = new THREE.Color(PAL.grass2), c = new THREE.Color();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const n = 0.5 + 0.5 * Math.sin(x * 0.11) * Math.cos(z * 0.13) * Math.sin((x + z) * 0.05);
    c.copy(c1).lerp(c2, n); col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; ground.name = 'ground'; scene.add(ground);
  // cliff + beach
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R + 3, 3, 96, 1, true), mat(0xc9b083, { flat: true }));
  cliff.position.y = -1.5; scene.add(cliff);
  const beach = new THREE.Mesh(new THREE.RingGeometry(ISLAND_R + 2.5, ISLAND_R + 9, 96), mat(PAL.sand));
  beach.rotation.x = -Math.PI / 2; beach.position.y = -2.2; beach.receiveShadow = true; scene.add(beach);
  const water = new THREE.Mesh(new THREE.CircleGeometry(700, 64), new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.25, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -2.4; scene.add(water);
  // gentle shimmer rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(ISLAND_R + 10, ISLAND_R + 10.6, 96), ringMat.clone());
    r.rotation.x = -Math.PI / 2; r.position.y = -2.35; scene.add(r); rings.push(r);
  }
  tickers.push((dt, t) => rings.forEach((r, i) => {
    const k = ((t * 0.08 + i / 3) % 1);
    r.scale.setScalar(1 + k * 0.35); r.material.opacity = 0.22 * (1 - k);
  }));
}

/* Paths and roads ---------------------------------------------------- */
export function strip(points, width, color, y = 0.02, { dashed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => V(p[0], y, p[1])), false, 'catmullrom', 0.2);
  const n = Math.max(2, Math.round(curve.getLength() * 1.5));
  const pos = [], idx = [];
  const tan = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u);
    curve.getTangentAt(u, tan); side.set(-tan.z, 0, tan.x).normalize().multiplyScalar(width / 2);
    pos.push(p.x + side.x, y, p.z + side.z, p.x - side.x, y, p.z - side.z);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  if (dashed) {
    const dm = mat(0xf5e6b8);
    for (let i = 0; i < n; i += 3) {
      const u = i / n, p = curve.getPointAt(u); curve.getTangentAt(u, tan);
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 1.6), dm);
      d.rotation.x = -Math.PI / 2; d.rotation.z = -Math.atan2(tan.z, tan.x) + Math.PI / 2;
      d.position.set(p.x, y + 0.01, p.z); d.receiveShadow = true; scene.add(d);
    }
  }
  return curve;
}

/* HTML labels anchored to 3D points ---------------------------------- */
const labelLayer = document.getElementById('labels');
export function addLabel(title, sub, pos, { zone = null, near = 42, cls = '' } = {}) {
  const el = document.createElement(zone ? 'button' : 'div');
  el.className = 'tag3d ' + cls;
  el.innerHTML = `<strong>${title}</strong>${sub ? `<span>${sub}</span>` : ''}`;
  if (zone) { el.type = 'button'; el.dataset.zone = zone; }
  labelLayer.appendChild(el);
  const l = { el, pos, near };
  labels.push(l);
  return l;
}

export function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
