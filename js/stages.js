import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeRacket, makeShuttle, makeShuttleTube, makeBall, makeMannequin, roundedBox, netTexture } from './props.js';

RectAreaLightUniformsLib.init();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
function add(parent, geo, m, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = receive; parent.add(o); return o;
}
function sunLight(group, color, intensity, pos, target, size, mapSize = 2048) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.copy(pos); l.target.position.copy(target);
  l.castShadow = true; l.shadow.mapSize.set(mapSize, mapSize);
  Object.assign(l.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.1, far: pos.distanceTo(target) * 2.2 });
  l.shadow.bias = -0.0002; l.shadow.normalBias = 0.02; l.shadow.radius = 6;
  group.add(l, l.target);
  return l;
}
function softbox(group, color, intensity, w, h, pos, look) {
  const l = new THREE.RectAreaLight(color, intensity, w, h);
  l.position.copy(pos); l.lookAt(look); group.add(l);
  return l;
}
// sweep a (y,z) profile across x to make a seamless photo backdrop
function cyclorama(w, depth, height, radius, material) {
  const prof = [];
  prof.push([0, depth]);
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([radius - Math.cos(a) * radius, -Math.sin(a) * radius]); }
  prof.push([height, -radius]);
  const pos = [], uv = [], idx = [];
  const cols = 2;
  prof.forEach(([y, z], i) => { for (let c = 0; c < cols; c++) { pos.push(-w / 2 + c * w, y, z); uv.push(c, i / (prof.length - 1)); } });
  for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true;
  return m;
}
const ease = (t) => t * t * (3 - 2 * t);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/* =================================================================== */
/* 1. STUDIO: product shot of the two rackets                            */
/* =================================================================== */
export function buildStudio(ctx, origin) {
  const g = new THREE.Group(); g.position.copy(origin);
  const backdrop = cyclorama(30, 14, 14, 4, std(0xa9a8a3, { roughness: 0.96 }));
  backdrop.position.z = -3; g.add(backdrop);
  const plinth = roundedBox(1.5, 0.95, 0.9, 0.03, std(0xd8d6d1, { roughness: 0.85 }));
  plinth.position.set(0, 0.475, 0); g.add(plinth);
  // acrylic racket stand
  const acrylic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.04, roughness: 0.04, ior: 1.49 });
  const stand = roundedBox(0.62, 0.05, 0.12, 0.01, acrylic); stand.position.set(0, 0.975, -0.12); g.add(stand);
  const turn = new THREE.Group(); turn.position.set(0, 0.97, -0.12); g.add(turn);
  const r88 = makeRacket({ frame: 0xc8cdd1, accent: 0x111316, accent2: 0x8d969c });
  const r99 = makeRacket({ frame: 0x15181b, accent: 0x2ec96f, accent2: 0x2ec96f, gripStripe: '#1f4f33' });
  r88.position.set(-0.15, 0.02, 0); r88.rotation.set(0, 0.45, 0.04);
  r99.position.set(0.15, 0.02, 0.01); r99.rotation.set(0, -0.45, -0.04);
  turn.add(r88, r99);
  // shuttles and tube on the plinth
  const shuttles = [[-0.48, 0.25, 1.1], [-0.36, 0.33, 2.2], [0.44, 0.28, 0.4]];
  shuttles.forEach(([x, z, r]) => { const s = makeShuttle(); s.position.set(x, 0.962, z); s.rotation.set(Math.PI / 2 - 0.08, 0, r); g.add(s); });
  const upright = makeShuttle(); upright.position.set(0.56, 1.01, 0.12); g.add(upright);
  const tube = makeShuttleTube(); tube.rotation.set(0, 0.5, Math.PI / 2); tube.position.set(0.3, 0.987, 0.28); g.add(tube);

  softbox(g, 0xfff3e2, 7, 2.2, 1.6, V(-2.6, 2.8, 2.2), V(0, 1.1, 0));
  softbox(g, 0xdde8ff, 6, 1.4, 2.6, V(2.8, 2.2, -1.2), V(0, 1.2, 0));
  softbox(g, 0xffffff, 1.6, 3, 1, V(0, 4, 1), V(0, 1, 0));
  sunLight(g, 0xfff8ee, 0.9, V(1.2, 6, 3.5), V(0, 0.9, 0), 2.2);

  const W = (x, y, z) => V(x, y, z).add(origin);
  return {
    name: 'studio', group: g,
    env: { background: new THREE.Color(0xa9a8a3), envIntensity: 0.35, exposure: 1.0, fog: null },
    keys: {
      hero: { pos: W(0.95, 1.5, 2.05), target: W(0.0, 1.27, -0.1), fov: 30 },
      r88: { pos: W(-0.75, 1.62, 0.82), target: W(-0.13, 1.55, -0.12), fov: 26 },
      r99: { pos: W(0.85, 1.5, 0.75), target: W(0.14, 1.5, -0.1), fov: 26 },
      end: { pos: W(-1.6, 1.9, 3.4), target: W(0, 1.2, -0.1), fov: 30 },
    },
    update(t, v, step) {
      // slow turntable on the wide shots, settle square for close-ups
      const wide = step === 0 || step >= 24;
      const want = wide ? Math.sin(t * 0.25) * 0.35 : 0;
      turn.rotation.y += (want - turn.rotation.y) * 0.05;
    },
  };
}

/* =================================================================== */
/* 2. BADMINTON HALL                                                     */
/* =================================================================== */
function courtTexture() {
  const S = 300; // px per metre
  const W = 15.4, H = 8.1, c = document.createElement('canvas'); c.width = Math.round(W * S); c.height = Math.round(H * S);
  const g = c.getContext('2d');
  g.fillStyle = '#2b6b57'; g.fillRect(0, 0, c.width, c.height);
  // subtle PU surface grain
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 8; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const ox = 1 * S, oy = 1 * S, lw = 0.04 * S;
  g.fillStyle = '#f4f4ef';
  const R = (x, y, w, h) => g.fillRect(ox + x * S - lw / 2, oy + y * S - lw / 2, w * S + lw, h * S + lw);
  const hl = (y) => R(0, y, 13.4, 0), vl = (x) => R(x, 0, 0, 6.1);
  [0, 0.46, 6.1 - 0.46, 6.1].forEach(hl);
  [0, 0.76, 13.4 - 0.76, 13.4, 6.7 - 1.98, 6.7 + 1.98].forEach(vl);
  R(0, 3.05, 6.7 - 1.98, 0); R(6.7 + 1.98, 3.05, 6.7 - 1.98, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}
function slatTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  for (let x = 0; x < 512; x += 16) { g.fillStyle = x % 32 ? '#58616a' : '#525a62'; g.fillRect(x, 0, 14, 64); g.fillStyle = '#30363b'; g.fillRect(x + 14, 0, 2, 64); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function buildHall(ctx, origin) {
  const g = new THREE.Group(); g.position.copy(origin);
  const tx = ctx.tex;
  const wood = new THREE.MeshStandardMaterial({ map: tx.wood, roughnessMap: tx.woodRough, bumpMap: tx.woodBump, bumpScale: 0.6, roughness: 0.55, envMapIntensity: 0.7 });
  add(g, new THREE.PlaneGeometry(34, 22), wood, 0, 0, 0, { cast: false }).rotation.x = -Math.PI / 2;
  const mat = new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.62, envMapIntensity: 0.5 });
  add(g, new THREE.BoxGeometry(15.4, 0.006, 8.1), mat, 0, 0.003, 0, { cast: false });
  // net, posts
  const steel = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, metalness: 0.8, roughness: 0.25 });
  for (const z of [-3.1, 3.1]) {
    add(g, new THREE.CylinderGeometry(0.022, 0.026, 1.55, 16), steel, 0, 0.775, z);
    add(g, new THREE.CylinderGeometry(0.2, 0.22, 0.12, 32), std(0x22262a, { roughness: 0.5 }), 0, 0.06, z);
  }
  const nt = netTexture(6, 1.2, 'rgba(18,18,18,1)'); nt.repeat.set(24, 3);
  const net = add(g, new THREE.PlaneGeometry(6.1, 0.76), new THREE.MeshStandardMaterial({ map: nt, alphaMap: nt, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, color: 0x161616 }), 0, 1.144, 0, { cast: false });
  net.rotation.y = Math.PI / 2;
  nt.colorSpace = THREE.SRGBColorSpace;
  const tape = add(g, new THREE.BoxGeometry(0.012, 0.075, 6.1), std(0xffffff, { roughness: 0.6 }), 0, 1.512, 0);
  // walls with acoustic slats, ceiling with LED panels
  const slat = slatTexture(); slat.repeat.set(10, 1);
  const wallM = new THREE.MeshStandardMaterial({ map: slat, roughness: 0.9 });
  add(g, new THREE.PlaneGeometry(34, 10), wallM, 0, 5, -11, { cast: false });
  const side = add(g, new THREE.PlaneGeometry(22, 10), wallM.clone(), -17, 5, 0, { cast: false }); side.rotation.y = Math.PI / 2;
  const side2 = add(g, new THREE.PlaneGeometry(22, 10), wallM.clone(), 17, 5, 0, { cast: false }); side2.rotation.y = -Math.PI / 2;
  add(g, new THREE.BoxGeometry(34, 1.2, 0.05), std(0x2b6b57, { roughness: 0.7 }), 0, 0.6, -10.97, { cast: false }); // dado band
  const ceil = add(g, new THREE.PlaneGeometry(34, 22), std(0x1d2124), 0, 10, 0, { cast: false }); ceil.rotation.x = Math.PI / 2;
  const led = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff6e8, emissiveIntensity: 2.2 });
  for (const x of [-9, -3, 3, 9]) for (const z of [-5, 0, 5]) {
    const p = add(g, new THREE.PlaneGeometry(2.4, 0.6), led, x, 9.98, z, { cast: false, receive: false }); p.rotation.x = Math.PI / 2;
  }
  for (const x of [-6, 6]) softbox(g, 0xfff4e6, 7, 8, 3, V(x, 9.5, 0), V(x, 0, 0));
  softbox(g, 0xfff4e6, 4, 6, 2, V(0, 9.5, 6), V(0, 0, 6));
  sunLight(g, 0xfff4e6, 1.3, V(-3, 14, 5), V(0, 0, 0), 9);
  // bench with shuttle tubes and a racket
  const bench = new THREE.Group(); bench.position.set(-3.5, 0, 5.4); g.add(bench);
  bench.add(at(roundedBox(2.4, 0.06, 0.45, 0.01, std(0xc9a37a, { roughness: 0.6 })), 0, 0.46, 0));
  for (const x of [-1, 1]) bench.add(at(roundedBox(0.05, 0.44, 0.4, 0.008, std(0x2a2e33, { metalness: 0.6, roughness: 0.4 })), x, 0.22, 0));
  for (let i = 0; i < 3; i++) { const t = makeShuttleTube(); t.rotation.set(0, 0.06 * i, Math.PI / 2); t.position.set(-0.7 + i * 0.09, 0.53, 0.02 * i); bench.add(t); }
  const rk = makeRacket({ frame: 0x15181b, accent: 0x2ec96f }); rk.rotation.set(-Math.PI / 2, 0, 0.3); rk.position.set(0.25, 0.505, 0.15); bench.add(rk);
  // loose shuttles by the service line
  [[-2.4, 1.2], [-2.6, 1.5], [-2.2, 1.7]].forEach(([x, z], i) => { const s = makeShuttle(); s.position.set(x, 0.013, z); s.rotation.set(Math.PI / 2 - 0.1, 0, i * 1.4); g.add(s); });

  // the drop: rear backhand corner (x<0, z<0) cross-court to opponent's front (x>0, z>0)
  const P = (x, y, z) => V(x, y, z);
  const path = new THREE.CatmullRomCurve3([P(-5.6, 2.45, -2.25), P(-3.4, 2.62, -1.25), P(-1.4, 2.25, -0.1), P(0, 1.78, 0.75), P(0.85, 1.15, 1.35), P(1.45, 0.45, 1.8), P(1.75, 0.04, 2.05)], false, 'centripetal');
  const SEG = 200, RAD = 8;
  const ribbon = add(g, new THREE.TubeGeometry(path, SEG, 0.016, RAD), new THREE.MeshStandardMaterial({ color: 0xe8b040, emissive: 0xe8a530, emissiveIntensity: 0.5, roughness: 0.4 }), 0, 0, 0, { cast: false, receive: false });
  ribbon.geometry.setDrawRange(0, 0);
  const shuttle = makeShuttle(); shuttle.scale.setScalar(2.4); g.add(shuttle);
  const contact = add(g, new THREE.RingGeometry(0.1, 0.16, 48), new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0, side: THREE.DoubleSide }), 1.75, 0.012, 2.05, { cast: false, receive: false });
  contact.rotation.x = -Math.PI / 2;
  const up = V(0, 1, 0), tmp = V(), dir = V();

  const W = (x, y, z) => V(x, y, z).add(origin);
  return {
    name: 'hall', group: g,
    env: { background: new THREE.Color(0x15191c), envIntensity: 0.4, exposure: 1.05, fog: new THREE.Fog(0x15191c, 30, 60) },
    keys: {
      wide: { pos: W(-12.5, 6.4, 9.5), target: W(-0.5, 0.8, 0), fov: 38 },
      drop: { pos: W(-5.2, 2.5, -8.8), target: W(-0.6, 1.25, 0.9), fov: 42 },
      club: { pos: W(3.8, 1.25, 7.8), target: W(-2.4, 0.6, 4.6), fov: 34 },
    },
    update(t, v) {
      // shuttle flies while scrolling from the wide shot to the drop shot
      const k = clamp01((v - 3.15) / 1.35);
      const u = 1 - Math.pow(1 - k, 1.6);
      path.getPointAt(u, tmp);
      path.getTangentAt(u, dir);
      shuttle.position.copy(tmp);
      shuttle.quaternion.setFromUnitVectors(up, dir.clone().negate().normalize());
      ribbon.geometry.setDrawRange(0, Math.floor(u * SEG) * RAD * 6);
      contact.material.opacity = k >= 1 ? 0.5 + 0.3 * Math.sin(t * 3) : 0;
    },
  };
}

/* =================================================================== */
/* 3. SOCCER PITCH AT SUNSET                                             */
/* =================================================================== */
export function buildPitch(ctx, origin) {
  const g = new THREE.Group(); g.position.copy(origin);
  const grass = ctx.tex.grass; grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(60, 60); grass.anisotropy = 16;
  const gm = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95, color: 0xb9c9a0 });
  gm.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <map_fragment>', '#include <map_fragment>\nfloat stripe = step(0.5, fract((vW.x - ' + origin.x.toFixed(1) + ') / 11.0));\ndiffuseColor.rgb *= mix(0.86, 1.06, stripe);\nfloat far = smoothstep(80.0, 160.0, length(vW.xz - vec2(' + origin.x.toFixed(1) + ', 0.0)));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42,0.5,0.36), far*0.6);');
  };
  add(g, new THREE.PlaneGeometry(400, 400), gm, 0, 0, 0, { cast: false }).rotation.x = -Math.PI / 2;
  const line = std(0xf5f5f0, { roughness: 0.7 });
  const L = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = add(g, new THREE.BoxGeometry(len + 0.12, 0.004, 0.12), line, (x1 + x2) / 2, 0.003, (z1 + z2) / 2, { cast: false });
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  };
  const GX = 52.5; // goal line
  L(GX, -34, GX, 34); L(0, -34, 0, 34); L(-GX, -34, GX, -34); L(-GX, 34, GX, 34);
  L(GX, -20.16, GX - 16.5, -20.16); L(GX - 16.5, -20.16, GX - 16.5, 20.16); L(GX - 16.5, 20.16, GX, 20.16);
  L(GX, -9.16, GX - 5.5, -9.16); L(GX - 5.5, -9.16, GX - 5.5, 9.16); L(GX - 5.5, 9.16, GX, 9.16);
  const arc = add(g, new THREE.RingGeometry(9.09, 9.15, 64, 1, Math.PI - 0.93, 1.86), line, GX - 11, 0.004, 0, { cast: false }); arc.rotation.x = -Math.PI / 2;
  const spot = add(g, new THREE.CircleGeometry(0.12, 24), line, GX - 11, 0.004, 0, { cast: false }); spot.rotation.x = -Math.PI / 2;
  const cc = add(g, new THREE.RingGeometry(9.09, 9.15, 96), line, 0, 0.004, 0, { cast: false }); cc.rotation.x = -Math.PI / 2;
  // goal: aluminium frame and net
  const alu = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, metalness: 0.3, roughness: 0.35 });
  for (const z of [-3.66, 3.66]) add(g, new THREE.CylinderGeometry(0.06, 0.06, 2.44, 24), alu, GX, 1.22, z);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 7.44, 24), alu, GX, 2.44, 0).rotation.x = Math.PI / 2;
  const nt = netTexture(10, 1.6, 'rgba(255,255,255,1)'); nt.repeat.set(30, 10);
  const netM = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, alphaMap: nt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 });
  const back = add(g, new THREE.PlaneGeometry(7.32, 2.44), netM, GX + 2, 1.22, 0, { cast: false }); back.rotation.y = Math.PI / 2;
  const topN = add(g, new THREE.PlaneGeometry(2, 7.32), netM, GX + 1, 2.44, 0, { cast: false }); topN.rotation.x = -Math.PI / 2;
  for (const z of [-3.66, 3.66]) { const s = add(g, new THREE.PlaneGeometry(2, 2.44), netM, GX + 1, 1.22, z, { cast: false }); }
  for (const z of [-3.66, 3.66]) add(g, new THREE.CylinderGeometry(0.03, 0.03, 2.44, 8), alu, GX + 2, 1.22, z);
  // corner flag and floodlight masts
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), std(0xf0f0ea), GX, 0.75, -34);
  const flag = add(g, new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0xc7243a, side: THREE.DoubleSide }), GX + 0.2, 1.35, -34);
  for (const [x, z] of [[GX + 14, -42], [GX + 14, 42], [-10, -48], [-10, 48]]) {
    add(g, new THREE.CylinderGeometry(0.25, 0.45, 32, 12), std(0x8b9095, { metalness: 0.7, roughness: 0.4 }), x, 16, z);
    const head = add(g, new THREE.BoxGeometry(5, 3, 0.6), std(0x6f757a, { metalness: 0.6 }), x, 32.5, z); head.lookAt(origin.x, 0, origin.z);
    const lamp = add(g, new THREE.PlaneGeometry(4.4, 2.4), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xfff2d6, emissiveIntensity: 3 }), x, 32.5, z, { cast: false }); lamp.lookAt(origin.x, 0, origin.z); lamp.translateZ(0.32);
  }
  // free kick: ball on the right of the D, wall 9.15 m away, curl into the top-left corner
  const ballStart = V(GX - 22, 0.11, 7.5);
  const goalTarget = V(GX + 0.2, 2.18, -3.25);
  const toGoal = goalTarget.clone().setY(0).sub(ballStart.clone().setY(0)).normalize();
  const wallC = ballStart.clone().setY(0).addScaledVector(toGoal, 9.15);
  const sideV = V(-toGoal.z, 0, toGoal.x);
  for (let i = 0; i < 4; i++) {
    const m = makeMannequin(); m.position.copy(wallC).addScaledVector(sideV, (i - 1.2) * 0.58); m.position.y = 0.1;
    m.lookAt(ballStart.x, 0.1, ballStart.z); g.add(m);
  }
  const ball = makeBall(0.11); ball.position.copy(ballStart); g.add(ball);
  const path = new THREE.CatmullRomCurve3([
    ballStart.clone(), V(GX - 17, 1.25, 7.6), V(GX - 12.5, 2.35, 6.6), V(GX - 7.5, 2.85, 4.2), V(GX - 3, 2.6, 0.4), goalTarget.clone(), V(GX + 1.4, 1.85, -3.45),
  ], false, 'centripetal');
  const SEG = 220, RAD = 8;
  const ribbon = add(g, new THREE.TubeGeometry(path, SEG, 0.045, RAD), new THREE.MeshStandardMaterial({ color: 0xe8b040, emissive: 0xe8a530, emissiveIntensity: 0.45, roughness: 0.4 }), 0, 0, 0, { cast: false, receive: false });
  ribbon.geometry.setDrawRange(0, 0);
  // low golden-hour sun matching the HDR sky
  sunLight(g, 0xffc98a, 3.2, V(GX - 60, 14, -40), V(GX - 12, 0, 2), 26, 4096);
  g.add(new THREE.HemisphereLight(0xbfd6ff, 0x3a4a2a, 0.35));
  const tmp = V();

  const W = (x, y, z) => V(x, y, z).add(origin);
  return {
    name: 'pitch', group: g,
    env: { background: ctx.hdr, envIntensity: 0.8, exposure: 0.9, fog: new THREE.Fog(0xcfc3ae, 140, 420), bgBlur: 0.0 },
    keys: {
      wide: { pos: W(GX - 29, 1.7, 10.5), target: W(GX - 2, 1.4, -1), fov: 40 },
      fk: { pos: W(GX - 14, 7.5, 21), target: W(GX - 9.5, 1.0, 2.5), fov: 42 },
      crane: { pos: W(GX - 34, 16, 22), target: W(GX - 6, 0, 0), fov: 40 },
    },
    update(t, v) {
      const k = clamp01((v - 6.15) / 1.45);
      const u = 1 - Math.pow(1 - k, 1.35);
      path.getPointAt(u, tmp); ball.position.copy(tmp);
      ball.rotation.y = u * 28; ball.rotation.x = u * 9;
      ribbon.geometry.setDrawRange(0, Math.floor(u * SEG) * RAD * 6);
      flag.rotation.y = Math.sin(t * 2.2) * 0.25;
    },
  };
}

/* =================================================================== */
/* 4. PROJECTS GALLERY                                                   */
/* =================================================================== */
export function buildGallery(ctx, origin, renderer) {
  const g = new THREE.Group(); g.position.copy(origin);
  const mirror = new Reflector(new THREE.PlaneGeometry(40, 30), { textureWidth: Math.min(1024, innerWidth), textureHeight: Math.min(1024, innerHeight), color: 0x8a8a8a });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.002; g.add(mirror);
  const conc = add(g, new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.7, transparent: true, opacity: 0.86 }), 0, 0, 0, { cast: false });
  conc.rotation.x = -Math.PI / 2;
  add(g, new THREE.PlaneGeometry(40, 12), std(0x1b1d1f, { roughness: 0.95 }), 0, 6, -9, { cast: false });
  const shots = [['shuttlesense', -5.2, -4.2, 0.42], ['teg', 0, -5.4, 0], ['kronos', 5.2, -4.2, -0.42]];
  const screens = {};
  for (const [id, x, z, ry] of shots) {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s);
    const tex = ctx.tex[id]; tex.anisotropy = 16;
    const aspect = tex.image.width / tex.image.height, h = 2.25, w = h * aspect;
    s.add(at(roundedBox(w + 0.12, h + 0.12, 0.07, 0.02, std(0x0d0e10, { metalness: 0.5, roughness: 0.35 })), 0, 2.2, 0));
    const scr = add(s, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: id === 'kronos' ? 0.42 : 0.8, roughness: 0.25 }), 0, 2.2, 0.037, { cast: false });
    add(s, new THREE.BoxGeometry(0.08, 1.1, 0.08), std(0x2a2d31, { metalness: 0.7, roughness: 0.3 }), 0, 0.55, -0.02);
    add(s, new THREE.BoxGeometry(0.9, 0.03, 0.5), std(0x2a2d31, { metalness: 0.7, roughness: 0.3 }), 0, 0.015, 0);
    const sp = new THREE.SpotLight(0xfff1dc, 60, 12, 0.5, 0.7, 1.6); sp.position.set(0, 6, 2.5); sp.target = scr; s.add(sp);
    screens[id] = { group: s, w, h };
  }
  g.add(new THREE.AmbientLight(0xffffff, 0.22));
  const W = (x, y, z) => V(x, y, z).add(origin);
  const front = (id, d) => { const s = screens[id].group; const n = V(Math.sin(s.rotation.y), 0, Math.cos(s.rotation.y)); const c = W(s.position.x, 2.2, s.position.z); return { pos: c.clone().addScaledVector(n, d).add(V(0, 0.1, 0)), target: c, fov: 32 }; };
  return {
    name: 'gallery', group: g,
    env: { background: new THREE.Color(0x111214), envIntensity: 0.12, exposure: 1.0, fog: new THREE.Fog(0x111214, 16, 34) },
    keys: { wide: { pos: W(0, 2.6, 9.5), target: W(0, 1.9, -4.5), fov: 40 }, shuttlesense: front('shuttlesense', 6.4), teg: front('teg', 6.6), kronos: front('kronos', 6.0) },
    update() {},
  };
}

/* =================================================================== */
/* 5. CAREER MAP TABLE                                                   */
/* =================================================================== */
export function buildMap(ctx, origin, places) {
  const g = new THREE.Group(); g.position.copy(origin);
  const meta = ctx.mapMeta; const MW = 3.4, MH = MW * meta.h / meta.w;
  add(g, new THREE.PlaneGeometry(40, 40), std(0x1a1816, { roughness: 0.9 }), 0, 0, 0, { cast: false }).rotation.x = -Math.PI / 2;
  const walnut = new THREE.MeshStandardMaterial({ map: ctx.tex.wood, color: 0x6a4a34, roughness: 0.45, bumpMap: ctx.tex.woodBump, bumpScale: 0.4 });
  const top = roundedBox(MW + 0.3, 0.07, MH + 0.3, 0.02, walnut); top.position.y = 0.9; g.add(top);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) add(g, new THREE.BoxGeometry(0.07, 0.87, 0.07), walnut, x * (MW / 2), 0.435, z * (MH / 2));
  ctx.tex.map.anisotropy = 16;
  const mapM = add(g, new THREE.PlaneGeometry(MW, MH), new THREE.MeshStandardMaterial({ map: ctx.tex.map, roughness: 0.75 }), 0, 0.937, 0, { cast: false }); mapM.rotation.x = -Math.PI / 2;
  // brass edge trim
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 0.9, roughness: 0.3 });
  for (const s of [-1, 1]) { add(g, new THREE.BoxGeometry(MW + 0.02, 0.012, 0.012), brass, 0, 0.94, s * MH / 2); add(g, new THREE.BoxGeometry(0.012, 0.012, MH + 0.02), brass, s * MW / 2, 0.94, 0); }
  // pendant light
  add(g, new THREE.CylinderGeometry(0.004, 0.004, 1.6, 6), std(0x111111), 0, 3.4, 0);
  add(g, new THREE.ConeGeometry(0.32, 0.3, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), 0, 2.5, 0);
  add(g, new THREE.CircleGeometry(0.3, 32), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffe2b8, emissiveIntensity: 1.1 }), 0, 2.36, 0, { cast: false }).rotation.x = Math.PI / 2;
  const pend = new THREE.SpotLight(0xffe7c4, 9, 8, 0.95, 0.85, 1.2); pend.position.set(0, 2.35, 0); pend.target.position.set(0, 0.9, 0);
  pend.castShadow = true; pend.shadow.mapSize.set(2048, 2048); pend.shadow.bias = -0.0003; pend.shadow.radius = 4; g.add(pend, pend.target);
  g.add(new THREE.AmbientLight(0xfff2e0, 0.12));
  softbox(g, 0xffeedd, 1.2, 3.6, 2.4, V(0, 2.3, 0), V(0, 0, 0));
  // pins
  const toXZ = (lon, lat) => V((lon - meta.W) / (meta.E - meta.W) * MW - MW / 2, 0.937, (meta.N - lat) / (meta.N - meta.S) * MH - MH / 2);
  const pins = {};
  for (const p of places) {
    const at = toXZ(p.lon, p.lat);
    const pg = new THREE.Group(); pg.position.copy(at); g.add(pg);
    add(pg, new THREE.CylinderGeometry(0.0022, 0.0022, 0.11, 8), new THREE.MeshStandardMaterial({ color: 0xd8dadc, metalness: 1, roughness: 0.2 }), 0, 0.055, 0);
    const head = add(pg, new THREE.SphereGeometry(0.026, 32, 16), new THREE.MeshPhysicalMaterial({ color: p.color, roughness: 0.15, clearcoat: 1, emissive: p.color, emissiveIntensity: 0 }), 0, 0.118, 0);
    const halo = add(pg, new THREE.RingGeometry(0.025, 0.032, 48), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0 }), 0, 0.002, 0, { cast: false, receive: false });
    halo.rotation.x = -Math.PI / 2;
    pins[p.id] = { group: pg, head, halo, world: at.clone().add(origin).add(V(0, 0.14, 0)) };
  }
  const W = (x, y, z) => V(x, y, z).add(origin);
  const keys = { overview: { pos: W(0.15, 3.45, 2.55), target: W(0.05, 0.9, 0.12), fov: 36 } };
  for (const p of places) {
    const w = pins[p.id].world;
    keys[p.id] = { pos: w.clone().add(V(0.45 + (p.camX || 0), 1.15, 1.35)), target: w.clone().add(V(0, -0.14, 0)), fov: 34 };
  }
  return {
    name: 'map', group: g, pins,
    env: { background: new THREE.Color(0x141210), envIntensity: 0.25, exposure: 1.0, fog: new THREE.Fog(0x141210, 8, 22) },
    keys,
    update(t, v, step, activeId) {
      for (const id in pins) {
        const on = id === activeId; const p = pins[id];
        const s = on ? 1.25 + Math.sin(t * 4) * 0.08 : 1;
        p.head.scale.setScalar(p.head.scale.x + (s - p.head.scale.x) * 0.15);
        p.head.material.emissiveIntensity += ((on ? 0.6 : 0) - p.head.material.emissiveIntensity) * 0.1;
        p.halo.material.opacity = on ? 0.4 + 0.3 * Math.sin(t * 4) : 0;
        p.halo.scale.setScalar(on ? 1 + ((t * 0.8) % 1) * 1.8 : 1);
      }
    },
  };
}

/* =================================================================== */
/* 6. LEARNING LAB                                                       */
/* =================================================================== */
function whiteboardTexture() {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 1600, 900);
  g.strokeStyle = '#1d2a33'; g.fillStyle = '#1d2a33'; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round';
  g.font = '600 52px "Segoe Print", "Comic Sans MS", cursive'; g.fillText('Haber loop, CHE 480', 70, 100);
  g.font = '500 40px "Segoe Print", "Comic Sans MS", cursive';
  const blk = (x, y, t) => { g.strokeRect(x, y, 230, 120); g.fillText(t, x + 26, y + 75); };
  blk(80, 330, 'Feed'); blk(420, 330, 'Comp'); blk(760, 330, 'Reactor'); blk(1150, 330, 'Flash');
  g.strokeStyle = '#1f7a74';
  [[310, 390, 420], [650, 390, 760], [990, 390, 1150]].forEach(([a, y, b]) => { g.beginPath(); g.moveTo(a, y); g.lineTo(b - 10, y); g.stroke(); g.beginPath(); g.moveTo(b - 30, y - 16); g.lineTo(b - 8, y); g.lineTo(b - 30, y + 16); g.stroke(); });
  g.strokeStyle = '#c0392b'; g.setLineDash([22, 16]); g.beginPath(); g.moveTo(1265, 450); g.lineTo(1265, 640); g.lineTo(535, 640); g.lineTo(535, 460); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#c0392b'; g.fillText('recycle H2 / N2', 760, 700);
  g.fillStyle = '#1d2a33'; g.font = '500 36px "Segoe Print", "Comic Sans MS", cursive';
  g.fillText('N2 + 3H2 ⇌ 2NH3     ΔH = -92 kJ/mol', 80, 820);
  g.fillText('NH3 out ↓', 1290, 560);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}
export function buildLab(ctx, origin) {
  const g = new THREE.Group(); g.position.copy(origin);
  const backdrop = cyclorama(30, 14, 14, 4, std(0xbdbbb5, { roughness: 0.95 })); backdrop.position.z = -3.5; g.add(backdrop);
  const bench = roundedBox(3.2, 0.06, 1.1, 0.015, std(0xf4f4f2, { roughness: 0.35 })); bench.position.set(0, 0.92, 0); g.add(bench);
  const cab = roundedBox(3.1, 0.86, 1.0, 0.02, std(0x2e3a40, { roughness: 0.6 })); cab.position.set(0, 0.45, 0); g.add(cab);
  // glass jacketed reactor on a retort stand
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.02, roughness: 0.03, ior: 1.47, specularIntensity: 1 });
  const vessel = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.36, 12, 48), glass); vessel.position.set(-0.3, 1.33, -0.05); g.add(vessel);
  const liquid = add(g, new THREE.CylinderGeometry(0.145, 0.145, 0.26, 48), new THREE.MeshPhysicalMaterial({ color: 0x5fb7ae, transmission: 0.6, thickness: 0.3, roughness: 0.1, ior: 1.33, transparent: true, opacity: 0.9 }), -0.3, 1.24, -0.05, { cast: false });
  add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.1, 24), std(0x2f3438, { metalness: 0.6 }), -0.3, 1.74, -0.05);
  const imp = new THREE.Group(); imp.position.set(-0.3, 1.18, -0.05); g.add(imp);
  add(imp, new THREE.CylinderGeometry(0.005, 0.005, 0.56, 8), std(0xd0d4d8, { metalness: 1, roughness: 0.2 }), 0, 0.28, 0);
  for (let i = 0; i < 4; i++) { const b = add(imp, new THREE.BoxGeometry(0.08, 0.03, 0.006), std(0xd0d4d8, { metalness: 1, roughness: 0.2 }), Math.cos(i * Math.PI / 2) * 0.045, 0, Math.sin(i * Math.PI / 2) * 0.045); b.rotation.y = -i * Math.PI / 2; }
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 1.0, 12), std(0xc9ced2, { metalness: 1, roughness: 0.25 }), -0.62, 1.45, -0.25);
  add(g, new THREE.BoxGeometry(0.3, 0.02, 0.2), std(0x2f3438, { metalness: 0.5 }), -0.62, 0.96, -0.25);
  add(g, new THREE.BoxGeometry(0.34, 0.012, 0.012), std(0xc9ced2, { metalness: 1, roughness: 0.25 }), -0.46, 1.7, -0.25).rotation.y = -0.5;
  // stir plate + beakers + notebook
  add(g, new THREE.BoxGeometry(0.22, 0.06, 0.22), std(0xeeeeec, { roughness: 0.5 }), 0.45, 0.98, 0.05);
  const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 40, 1, true), glass); beaker.position.set(0.45, 1.08, 0.05); g.add(beaker);
  add(g, new THREE.CylinderGeometry(0.047, 0.047, 0.06, 40), new THREE.MeshPhysicalMaterial({ color: 0xe8b04a, transmission: 0.5, roughness: 0.1, transparent: true, opacity: 0.85 }), 0.45, 1.045, 0.05, { cast: false });
  const flask = new THREE.Mesh(new THREE.LatheGeometry([V(0, 0, 0), V(0.07, 0.005, 0), V(0.075, 0.03, 0), V(0.03, 0.12, 0), V(0.018, 0.16, 0), V(0.018, 0.2, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 40), glass);
  flask.position.set(0.78, 0.95, -0.15); g.add(flask);
  const book = roundedBox(0.42, 0.025, 0.3, 0.005, std(0x1f6f6a, { roughness: 0.7 })); book.position.set(0.95, 0.965, 0.25); book.rotation.y = 0.3; g.add(book);
  // whiteboard
  const wb = add(g, new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshStandardMaterial({ map: whiteboardTexture(), roughness: 0.55 }), 0.2, 2.05, -1.1, { cast: false });
  add(g, new THREE.BoxGeometry(2.5, 1.45, 0.04), std(0xbfc4c8, { metalness: 0.7, roughness: 0.35 }), 0.2, 2.05, -1.125);
  softbox(g, 0xfff3e2, 5, 2, 1.4, V(-2.5, 3, 2.4), V(0, 1.2, 0));
  softbox(g, 0xe2ecff, 3, 1.4, 2.2, V(2.6, 2.4, 1.5), V(0, 1.2, 0));
  sunLight(g, 0xffffff, 0.8, V(1.5, 6, 3.5), V(0, 1, 0), 2.5);
  const W = (x, y, z) => V(x, y, z).add(origin);
  return {
    name: 'lab', group: g,
    env: { background: new THREE.Color(0xbdbbb5), envIntensity: 0.3, exposure: 1.0, fog: null },
    keys: {
      wide: { pos: W(1.9, 1.9, 3.4), target: W(0.1, 1.45, -0.4), fov: 34 },
      close: { pos: W(-1.05, 1.5, 0.95), target: W(-0.3, 1.32, -0.05), fov: 30 },
    },
    update(t, v, step, a, dt) { imp.rotation.y += (dt || 0.016) * 4; },
  };
}
