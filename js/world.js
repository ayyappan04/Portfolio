import { THREE, scene, PAL, mat, mesh, box, cyl, V, rng, sign, signTexture, strip, colliders, addBoxCollider, addCircleCollider, zones, addLabel, tickers, reduce, cutaways } from './core.js';
import { makeRacket, makeShuttle, makeShuttleTube, makeSoccerBall, makePerson, animatePerson, makeTree, makeBench, makeTruck, makeMarker } from './models.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export const events = new EventTarget();
const emit = (name, detail) => events.dispatchEvent(new CustomEvent(name, { detail }));

function zone(id, title, kicker, x, z, r, district, labelY = 0, labelSub = '') {
  zones.push({ id, title, kicker, x, z, r, district });
  if (labelY) addLabel(title, labelSub || kicker, V(x, labelY, z), { zone: id, near: 70 });
}
function marker(x, y, z, color) {
  const m = makeMarker(color); m.position.set(x, y, z); scene.add(m);
  const base = y;
  tickers.push((dt, t) => { m.rotation.y = t * 1.2; m.position.y = base + Math.sin(t * 2) * 0.25; });
  return m;
}

/* ================= PATHS & ROAD ===================================== */
strip([[0, 0], [-12, -6], [-26, -12], [-36, -16]], 3.2, PAL.path);
strip([[0, 0], [12, -8], [24, -18], [34, -24]], 3.2, PAL.path);
strip([[0, 0], [16, 2], [32, 4]], 3.2, PAL.path);
strip([[0, 0], [6, 14], [10, 26], [10, 32]], 3.2, PAL.path);
strip([[-36, -16], [-40, -8], [-42, -6]], 3.2, PAL.path);
strip([[-84, 36], [-40, 36], [0, 36], [40, 36], [84, 36]], 8, PAL.asphalt, 0.03, { dashed: true });
// sidewalks
strip([[-82, 31], [82, 31]], 1.6, PAL.concrete, 0.025);
strip([[-82, 41], [82, 41]], 1.6, PAL.concrete, 0.025);

/* ================= PLAZA ============================================ */
{
  const plaza = mesh(new THREE.CircleGeometry(10, 64), mat(0xe2d6bf), 0, 0.04, 0, scene, { cast: false });
  plaza.rotation.x = -Math.PI / 2;
  const ring = mesh(new THREE.RingGeometry(10, 10.6, 64), mat(PAL.teal), 0, 0.045, 0, scene, { cast: false });
  ring.rotation.x = -Math.PI / 2;
  // fountain: a little stirred-tank nod
  cyl(2.4, 2.6, 0.6, PAL.concrete, 0, 0.3, -5.5);
  const water = cyl(2.2, 2.2, 0.1, PAL.water, 0, 0.6, -5.5, scene, 32, { rough: 0.15 });
  cyl(0.25, 0.3, 1.8, PAL.concrete, 0, 1.2, -5.5);
  addCircleCollider(0, -5.5, 2.7);
  const drops = [];
  for (let i = 0; i < 24; i++) {
    const d = mesh(new THREE.SphereGeometry(0.07, 6, 4), mat(0xbfe7ef, { rough: 0.1 }), 0, 2, -5.5, scene, { cast: false });
    d.userData = { a: (i / 24) * Math.PI * 2, o: i / 24 }; drops.push(d);
  }
  tickers.push((dt, t) => drops.forEach((d) => {
    const k = (t * 0.6 + d.userData.o) % 1;
    const r = 0.3 + k * 1.7;
    d.position.set(Math.cos(d.userData.a) * r, 2.1 + Math.sin(k * Math.PI) * 0.9 - k * 1.4, -5.5 + Math.sin(d.userData.a) * r);
  }));
  // signpost
  const post = cyl(0.12, 0.12, 3.6, 0x3a4249, 6.5, 1.8, 3.5);
  addCircleCollider(6.5, 3.5, 0.4);
  const arrows = [['Hobbies', -2.4, 2.4], ['Projects', 0.9, 2.9], ['Learning', 1.6, 2.2], ['Career', 2.9, 1.5]];
  arrows.forEach(([txt, rot, y], i) => {
    const s = sign([{ text: txt + '  →', size: 0.5, weight: 750 }], 2.2, 0.5, 6.5, y + 0.4 * i * 0, 3.5, rot, scene, { bg: '#2fa7a4', fg: '#ffffff', accent: '#2fa7a4' });
    s.position.y = 3.1 - i * 0.55;
    s.children.forEach((c) => (c.position.x = 1.1));
  });
  // benches and planters
  for (const [x, z, r] of [[-7, 4, 0.9], [7.5, -3, -1.6], [-6.5, -3.5, 1.9]]) {
    const b = makeBench(); b.position.set(x, 0, z); b.rotation.y = r; scene.add(b);
  }
  zone('welcome', 'Welcome', 'Start here', 0, 2, 9, 'welcome');
}

/* 3D name on the plaza --------------------------------------------- */
new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
  const make = (text, size, y, z, color) => {
    const g = new TextGeometry(text, { font, size, depth: size * 0.35, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 });
    g.computeBoundingBox(); const w = g.boundingBox.max.x - g.boundingBox.min.x;
    const m = mesh(g, mat(color, { rough: 0.45, metal: 0.1 }), -w / 2, y, z);
    return m;
  };
  make('AYYAPPAN', 1.15, 0.05, -10.4, PAL.ink);
  make('chemical engineer who builds things', 0.32, 0.05, -9.2, PAL.tealDark).rotation.x = -Math.PI / 2;
  addBoxCollider(0, -10.1, 10.5, 1);
});

/* ================= SPORTS PARK: BADMINTON HALL ====================== */
export const badminton = {};
{
  const cx = -50, cz = -30;
  const hall = new THREE.Group(); hall.position.set(cx, 0, cz); scene.add(hall);
  // floor and court
  box(28, 0.25, 17, 0xc9a477, 0, 0.12, 0, hall); // wooden floor
  const courtG = new THREE.Group(); courtG.position.y = 0.26; hall.add(courtG);
  box(13.4, 0.02, 6.1, 0x2f7d63, 0, 0.01, 0, courtG, { rough: 0.7 });
  const lm = mat(0xffffff, { rough: 0.5 });
  const L = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const b = box(len + 0.04, 0.012, 0.04, lm, (x1 + x2) / 2, 0.025, (z1 + z2) / 2, courtG);
    b.rotation.y = -Math.atan2(z2 - z1, x2 - x1); b.castShadow = false;
  };
  for (const z of [-3.05, 3.05, -2.59, 2.59]) L(-6.7, z, 6.7, z);
  for (const x of [-6.7, 6.7, -5.94, 5.94, -1.98, 1.98]) L(x, -3.05, x, 3.05);
  L(-6.7, 0, -1.98, 0); L(1.98, 0, 6.7, 0);
  // net
  for (const z of [-3.1, 3.1]) cyl(0.035, 0.05, 1.55, 0xe6e6e6, 0, 0.78, z, courtG, 12, { metal: 0.6, rough: 0.3 });
  const netC = document.createElement('canvas'); netC.width = 256; netC.height = 64;
  const ng = netC.getContext('2d'); ng.strokeStyle = 'rgba(30,30,30,.9)'; ng.lineWidth = 1.5;
  for (let x = 0; x < 256; x += 5) { ng.beginPath(); ng.moveTo(x, 0); ng.lineTo(x, 64); ng.stroke(); }
  for (let y = 0; y < 64; y += 5) { ng.beginPath(); ng.moveTo(0, y); ng.lineTo(256, y); ng.stroke(); }
  const netTex = new THREE.CanvasTexture(netC); netTex.wrapS = THREE.RepeatWrapping; netTex.repeat.x = 6;
  const net = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 0.76), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }));
  net.rotation.y = Math.PI / 2; net.position.set(0, 1.15, 0); courtG.add(net);
  box(0.03, 0.05, 6.1, 0xffffff, 0, 1.53, 0, courtG);
  // pavilion: columns and a sloped roof, open sides so you can see in
  const colM = mat(0xf2efe8, { rough: 0.6 });
  for (const x of [-13, -6.5, 0, 6.5, 13]) for (const z of [-8, 8]) {
    cyl(0.25, 0.25, 7, colM, x, 3.5, z, hall, 16);
    addCircleCollider(cx + x, cz + z, 0.45);
  }
  const roofG = new THREE.Group(); hall.add(roofG);
  const roof = box(28.5, 0.35, 17.5, 0xe8e4dc, 0, 7.2, 0, roofG);
  box(28.7, 0.5, 0.3, PAL.teal, 0, 7.1, 8.8, roofG);
  box(28.7, 0.5, 0.3, PAL.teal, 0, 7.1, -8.8, roofG);
  for (const x of [-8, 0, 8]) box(4, 0.05, 15, mat(0xfff7d6, { emissive: 0xfff2c8, ei: 0.6 }), x, 7.0, 0, roofG);
  cutaways.push({ obj: roofG, x0: cx - 14, z0: cz - 8.5, x1: cx + 14, z1: cz + 8.5 });
  // back wall with sign
  box(28, 3, 0.3, 0xf2efe8, 0, 1.6, -8.4, hall);
  addBoxCollider(cx, cz - 8.4, 28, 0.6);
  sign([{ text: 'Badminton hall', size: 0.34, weight: 800 }, { text: 'Director, school badminton club', size: 0.2, weight: 500, color: '#bfe3e1' }], 6, 1.6, 0, 4.8, -8.2, 0, hall);
  // half wall on the far end
  box(0.3, 1.2, 17, 0xf2efe8, -13.9, 0.85, 0, hall);
  addBoxCollider(cx - 13.9, cz, 0.6, 17);
  // court collider ring so you walk around players, not through the net
  addBoxCollider(cx, cz, 0.3, 6.6);

  // racket display podiums, scaled up 4x so you can see the detail
  const podium = (x, z, racket, title, sub) => {
    const pg = new THREE.Group(); pg.position.set(x, 0.25, z); hall.add(pg);
    cyl(0.9, 1.0, 0.9, 0x22303a, 0, 0.45, 0, pg, 32, { rough: 0.4 });
    const top = cyl(0.92, 0.92, 0.06, PAL.teal, 0, 0.93, 0, pg, 32, { emissive: PAL.teal, ei: 0.3 });
    const glass = mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.3, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 0, 2.6, 0, pg, { cast: false, receive: false });
    racket.scale.setScalar(4.6); racket.position.set(0, 1.05, 0); pg.add(racket);
    const spot = new THREE.SpotLight(0xffffff, 40, 10, 0.5, 0.6, 1.2);
    spot.position.set(0, 5.6, 1.5); spot.target = racket; pg.add(spot);
    addCircleCollider(cx + x, cz + z, 1.1);
    tickers.push((dt, t) => { racket.rotation.y = t * 0.5 + (x > 0 ? 0 : Math.PI / 2); });
    return pg;
  };
  podium(10.5, -4.6, makeRacket({ frame: 0xcfd4d8, accent: 0x14181b, accent2: 0x9aa3a8 }), 'Astrox 88 D Pro', '3rd gen');
  podium(10.5, 4.6, makeRacket({ frame: 0x15191c, accent: 0x34d17a, accent2: 0x34d17a }), 'Astrox 99 Pro', '3rd gen');
  addLabel('Yonex Astrox 88 D Pro', '3rd gen · silver / black', V(cx + 10.5, 5.4, cz - 4.6), { zone: 'rackets', near: 26 });
  addLabel('Yonex Astrox 99 Pro', '3rd gen · black / green', V(cx + 10.5, 5.4, cz + 4.6), { zone: 'rackets', near: 26 });

  // bench with shuttle tubes and loose shuttles
  const bench = makeBench(); bench.position.set(cx + 2, 0.25, cz + 7); scene.add(bench);
  for (let i = 0; i < 3; i++) {
    const tube = makeShuttleTube(3.2); tube.position.set(cx + 1.2 + i * 0.5, 0.75, cz + 7); tube.rotation.z = Math.PI / 2; tube.rotation.y = 0.1 * i; scene.add(tube);
  }
  for (let i = 0; i < 6; i++) {
    const s = makeShuttle(4); s.position.set(cx - 7 + rng() * 4, 0.35, cz + 3.6 + rng() * 2); s.rotation.set(Math.PI / 2, 0, rng() * 6); scene.add(s);
  }

  // rally: two players and a shuttle
  const me = makePerson({ top: PAL.teal }); me.position.set(cx - 5.4, 0.25, cz - 1.6); me.rotation.y = Math.PI / 2; scene.add(me);
  const opp = makePerson({ top: 0xf0b23c, skin: 0xe0b28e, hair: 0x5a3b26 }); opp.position.set(cx + 4.2, 0.25, cz + 0.3); opp.rotation.y = -Math.PI / 2; scene.add(opp);
  for (const p of [me, opp]) {
    const r = makeRacket({ frame: 0xd0d4d8, accent: 0x111111 }); r.scale.setScalar(1.25); r.rotation.z = -0.5; r.position.set(0.05, -0.55, 0.1);
    p.userData.armR.add(r);
  }
  const shuttle = makeShuttle(3.2); scene.add(shuttle);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xf0b23c });
  const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), trailMat, 80); trail.count = 0; scene.add(trail);
  const W = (x, y, z) => V(cx + x, 0.25 + y, cz + z);
  const shots = {
    clearAB: [W(-5.2, 2.4, -1.4), W(-2, 6.5, -0.8), W(2.5, 6.2, 0), W(4.6, 2.6, 0.4)],
    clearBA: [W(4.6, 2.6, 0.4), W(1.5, 6.4, -0.2), W(-3, 6.2, -1), W(-5.2, 2.4, -1.4)],
    drop: [W(-5.2, 2.5, -1.4), W(-3, 2.6, -0.4), W(-1, 2.15, 0.8), W(0, 1.75, 1.35), W(0.9, 1.15, 1.8), W(1.6, 0.4, 2.1), W(1.9, 0.02, 2.2)],
  };
  const curves = Object.fromEntries(Object.entries(shots).map(([k, p]) => [k, new THREE.CatmullRomCurve3(p, false, 'centripetal')]));
  const plan = ['clearAB', 'clearBA', 'clearAB', 'clearBA', 'drop'];
  let step = 0, t0 = 0, pause = 0;
  const up = V(0, 1, 0), prev = V(), dir = V(), d = new THREE.Object3D();
  const startShot = (k) => { badminton.cur = k; t0 = 0; trail.count = 0; prev.copy(curves[k].getPointAt(0)); };
  badminton.playDrop = () => { step = plan.length - 1; pause = 0; startShot('drop'); };
  startShot(plan[0]);
  tickers.push((dt, t, player) => {
    if (player && player.position.distanceTo(V(cx, 0, cz)) > 60) return; // only animate nearby
    if (pause > 0) { pause -= dt; if (pause <= 0) { step = (step + 1) % plan.length; startShot(plan[step]); } return; }
    const k = badminton.cur, dur = k === 'drop' ? 1.6 : 1.25;
    t0 = Math.min(1, t0 + dt / dur);
    const u = k === 'drop' ? 1 - Math.pow(1 - t0, 1.7) : t0;
    const p = curves[k].getPointAt(u);
    dir.subVectors(p, prev); if (dir.lengthSq() > 1e-8) shuttle.quaternion.setFromUnitVectors(up, dir.normalize());
    prev.copy(p); shuttle.position.copy(p);
    if (k === 'drop' && trail.count < 80) { d.position.copy(p); d.updateMatrix(); trail.setMatrixAt(trail.count++, d.matrix); trail.instanceMatrix.needsUpdate = true; }
    // swing whoever is hitting
    const hitter = k === 'clearBA' ? opp : me;
    hitter.userData.armR.rotation.x = t0 < 0.15 ? -2.6 + t0 * 14 : -0.4;
    // opponent lunges late for the drop
    if (k === 'drop') { opp.position.x = cx + 4.2 - Math.max(0, t0 - 0.35) * 2.2; opp.position.z = cz + 0.3 + Math.max(0, t0 - 0.35) * 2.2; animatePerson(opp, t0 > 0.35 && t0 < 1 ? 4 : 0, dt); }
    else { opp.position.set(cx + 4.2, 0.25, cz + 0.3); }
    if (t0 >= 1) { pause = k === 'drop' ? 2.2 : 0.05; }
  });

  zone('badminton', 'Badminton hall', 'Hobbies', cx - 2, cz, 13, 'hobbies', 9, 'Hobbies · H-101');
  zone('rackets', 'In the bag', 'Hobbies', cx + 10.5, cz, 5.5, 'hobbies');
  marker(cx - 2, 8.6, cz + 9.5, PAL.teal);
}

/* ================= SPORTS PARK: SOCCER PITCH ======================== */
export const soccer = {};
{
  const cx = -44, cz = 6, HL = 17, HW = 11; // half length / width
  // striped grass
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
  const g2 = cv.getContext('2d');
  for (let i = 0; i < 10; i++) { g2.fillStyle = i % 2 ? '#4f9a4e' : '#5aa856'; g2.fillRect(i * 51.2, 0, 51.2, 64); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const pitch = mesh(new THREE.PlaneGeometry(HL * 2 + 4, HW * 2 + 4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), cx, 0.03, cz, scene, { cast: false });
  pitch.rotation.x = -Math.PI / 2;
  const lm = mat(0xffffff, { rough: 0.6 });
  const L = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const b = box(len + 0.15, 0.02, 0.15, lm, cx + (x1 + x2) / 2, 0.045, cz + (z1 + z2) / 2); b.castShadow = false;
    b.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  };
  L(-HL, -HW, HL, -HW); L(-HL, HW, HL, HW); L(-HL, -HW, -HL, HW); L(HL, -HW, HL, HW); L(0, -HW, 0, HW);
  for (const s of [-1, 1]) { L(s * HL, -6, s * (HL - 5), -6); L(s * (HL - 5), -6, s * (HL - 5), 6); L(s * (HL - 5), 6, s * HL, 6); }
  const circle = mesh(new THREE.RingGeometry(3.2, 3.38, 48), lm, cx, 0.046, cz, scene, { cast: false }); circle.rotation.x = -Math.PI / 2;
  // goals
  const GW = 3.2, GH = 2.1;
  const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, wireframe: true });
  for (const s of [-1, 1]) {
    const gx = cx + s * HL;
    for (const z of [-GW, GW]) { cyl(0.07, 0.07, GH, 0xffffff, gx, GH / 2, cz + z, scene, 12); addCircleCollider(gx, cz + z, 0.2); }
    const bar = cyl(0.07, 0.07, GW * 2, 0xffffff, gx, GH, cz, scene, 12); bar.rotation.x = Math.PI / 2;
    const back = mesh(new THREE.PlaneGeometry(GW * 2, GH, 16, 6), netMat, gx + s * 1.4, GH / 2, cz); back.rotation.y = Math.PI / 2; back.castShadow = false;
    const top = mesh(new THREE.PlaneGeometry(GW * 2, 1.4, 16, 4), netMat, gx + s * 0.7, GH, cz); top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.castShadow = false;
    addBoxCollider(gx + s * 1.4, cz, 0.3, GW * 2);
  }
  // keeper and a wall for the free kick
  const keeper = makePerson({ top: 0xf0b23c, skin: 0xd9a27e, hair: 0x2b2018 }); keeper.position.set(cx - HL + 0.8, 0, cz); keeper.rotation.y = Math.PI / 2; scene.add(keeper);
  const wall = [];
  for (let i = 0; i < 4; i++) { const w = makePerson({ top: 0x1f3a5f, bottom: 0x1f3a5f, skin: [0xc78f6b, 0xe0b28e, 0x8d5a3b, 0xd9a27e][i] }); w.position.set(cx - 8.2, 0, cz - 0.4 + i * 0.55); w.rotation.y = -Math.PI / 2; w.visible = false; scene.add(w); wall.push(w); }
  // the ball you can kick
  const ball = makeSoccerBall(0.32); ball.position.set(cx, 0.32, cz); scene.add(ball);
  const vel = V(0, 0, 0); let shot = null, resetT = 0;
  soccer.ball = ball;
  const goalToast = () => emit('toast', 'Goal!');
  const shotDefs = {
    fk: { from: V(cx - 1.5, 0.32, cz + 4.5), pts: (f) => [f, V(cx - 4.5, 1.6, cz + 3.6), V(cx - 8.2, 2.7, cz + 1.8), V(cx - 12.5, 2.6, cz - 0.6), V(cx - 16.4, 1.75, cz - 2.6), V(cx - 17.8, 1.5, cz - 2.8)], wall: true },
    rabona: { from: V(cx - 5, 0.32, cz - 8), pts: (f) => [f, V(cx - 8, 1.4, cz - 5.8), V(cx - 12, 2.4, cz - 2), V(cx - 15.5, 2.1, cz + 1.7), V(cx - 16.9, 1.7, cz + 2.7), V(cx - 18, 1.5, cz + 2.8)], wall: false },
  };
  soccer.play = (k) => {
    const def = shotDefs[k];
    ball.position.copy(def.from); vel.set(0, 0, 0);
    wall.forEach((w) => (w.visible = def.wall));
    const curve = new THREE.CatmullRomCurve3(def.pts(def.from.clone()), false, 'centripetal');
    shot = { curve, t: 0, keeper: k === 'fk' ? -2.6 : 2.6 };
    keeper.position.set(cx - HL + 0.8, 0, cz); keeper.rotation.z = 0;
  };
  tickers.push((dt, t, player) => {
    if (shot) {
      shot.t = Math.min(1, shot.t + dt / (reduce ? 0.3 : 1.3));
      ball.position.copy(shot.curve.getPointAt(1 - Math.pow(1 - shot.t, 1.3)));
      ball.rotation.y += dt * 14; ball.rotation.x += dt * 5;
      const k = Math.max(0, (shot.t - 0.45) / 0.55);
      keeper.position.z = cz + shot.keeper * k * 0.8; keeper.position.y = Math.sin(k * Math.PI) * 0.6; keeper.rotation.x = -Math.sign(shot.keeper) * k * 1.1;
      wall.forEach((w, i) => (w.position.y = Math.sin(Math.min(1, shot.t * 2.2) * Math.PI) * (0.5 + i * 0.03)));
      if (shot.t >= 1) { shot = null; goalToast(); resetT = 2.2; }
      return;
    }
    if (resetT > 0) {
      resetT -= dt;
      if (resetT <= 0) { ball.position.set(cx, 0.32, cz); vel.set(0, 0, 0); keeper.position.set(cx - HL + 0.8, 0, cz); keeper.rotation.set(0, Math.PI / 2, 0); wall.forEach((w) => { w.visible = false; w.position.y = 0; }); }
      return;
    }
    // kick: walk into the ball
    if (player) {
      const dx = ball.position.x - player.position.x, dz = ball.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.95 && player.userData.speed > 0.5) {
        const pow = 5 + player.userData.speed * 1.6;
        vel.set(dx / dist * pow, 0, dz / dist * pow);
      }
    }
    if (vel.lengthSq() > 1e-4) {
      ball.position.addScaledVector(vel, dt);
      const sp = vel.length();
      ball.rotateOnWorldAxis(V(vel.z, 0, -vel.x).normalize(), (sp * dt) / 0.32);
      vel.multiplyScalar(Math.exp(-dt * 0.9));
      const lx = ball.position.x - cx, lz = ball.position.z - cz;
      if (Math.abs(lz) > HW + 1.5) { vel.z *= -0.7; ball.position.z = cz + Math.sign(lz) * (HW + 1.5); }
      if (Math.abs(lx) > HL) {
        if (Math.abs(lz) < GW - 0.3) { if (Math.abs(lx) > HL + 0.6) { vel.set(0, 0, 0); goalToast(); resetT = 1.8; } }
        else if (Math.abs(lx) > HL + 1.5) { vel.x *= -0.7; ball.position.x = cx + Math.sign(lx) * (HL + 1.5); }
      }
    }
  });
  zone('soccer', 'Soccer pitch', 'Hobbies', cx, cz, 15, 'hobbies', 6, 'Walk into the ball to kick it');
  marker(cx, 5, cz - HW - 2, PAL.amber);
  // little stand with scarf colours (blue/claret stripes)
  const stand = new THREE.Group(); stand.position.set(cx, 0, cz + HW + 4.5); scene.add(stand);
  for (let i = 0; i < 3; i++) box(20, 0.5, 1.2, 0xd8d3c8, 0, 0.25 + i * 0.5, i * 1.1, stand);
  addBoxCollider(cx, cz + HW + 5.6, 20, 3.4);
  for (let i = 0; i < 9; i++) box(1.8, 1.1, 0.06, i % 2 ? 0xa50044 : 0x004d98, -8 + i * 2, 2.4, 2.6, stand);
}

/* ================= PROJECTS EXPO ==================================== */
function pavilion(x, z, color, title) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  cyl(6.5, 6.8, 0.4, 0xe9e4da, 0, 0.2, 0, g, 6, { flat: true });
  const ring = cyl(6.55, 6.55, 0.08, color, 0, 0.42, 0, g, 6, { emissive: color, ei: 0.25 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    if (i === 1) continue; // entrance gap facing the path
    cyl(0.18, 0.18, 5, 0xf4f2ec, Math.cos(a) * 6, 2.9, Math.sin(a) * 6, g, 12);
  }
  const roof = mesh(new THREE.ConeGeometry(7.4, 1.6, 6, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide, flatShading: true }), 0, 6.2, 0, g);
  cutaways.push({ obj: roof, x0: x - 6.5, z0: z - 6.5, x1: x + 6.5, z1: z + 6.5 });
  return g;
}
// ShuttleSense: phone on a tripod watching a mini court, with a live pose screen
{
  const x = 20, z = -34;
  const g = pavilion(x, z, PAL.teal, 'ShuttleSense');
  box(5, 0.04, 2.5, 0x2f7d63, -0.5, 0.44, 1.5, g);
  const ply = makePerson({ top: 0xf4f2ec }); ply.position.set(0.8, 0.42, 1.6); ply.rotation.y = -Math.PI / 2; g.add(ply);
  // tripod + phone
  for (let i = 0; i < 3; i++) { const l = cyl(0.03, 0.03, 1.5, 0x22303a, -3.4 + Math.cos(i * 2.1) * 0.3, 1.1, 1.5 + Math.sin(i * 2.1) * 0.3, g, 6); l.rotation.z = Math.cos(i * 2.1) * 0.2; l.rotation.x = -Math.sin(i * 2.1) * 0.2; }
  box(0.08, 0.6, 0.32, 0x111417, -3.4, 2.05, 1.5, g);
  // big screen with a live skeleton overlay
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 288;
  const sg = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = mesh(new THREE.PlaneGeometry(5.2, 2.9), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 3.4, -3.4, g);
  box(5.5, 3.2, 0.2, 0x111417, 0, 3.4, -3.55, g);
  let acc = 0;
  tickers.push((dt, t, player) => {
    acc += dt; if (acc < 1 / 15) return; acc = 0;
    if (player && player.position.distanceTo(g.position) > 45) return;
    sg.fillStyle = '#0d1b20'; sg.fillRect(0, 0, 512, 288);
    sg.strokeStyle = 'rgba(255,255,255,.55)'; sg.lineWidth = 2;
    sg.beginPath(); sg.moveTo(60, 250); sg.lineTo(452, 250); sg.lineTo(390, 120); sg.lineTo(122, 120); sg.closePath(); sg.stroke();
    sg.beginPath(); sg.moveTo(256, 120); sg.lineTo(256, 250); sg.stroke();
    const k = Math.sin(t * 2.4), px = 200 + Math.sin(t * 0.9) * 60, py = 120;
    const J = { head: [px, py], neck: [px, py + 18], hipL: [px - 10, py + 70], hipR: [px + 10, py + 70], kneeL: [px - 18 - k * 8, py + 100], kneeR: [px + 16 + k * 8, py + 102], ankL: [px - 22 - k * 14, py + 132], ankR: [px + 22 + k * 12, py + 132], shL: [px - 18, py + 24], shR: [px + 18, py + 24], elR: [px + 34, py + 4 - k * 10], wrR: [px + 40, py - 26 - k * 16], elL: [px - 30, py + 44], wrL: [px - 36, py + 64] };
    const bones = [['head', 'neck'], ['neck', 'shL'], ['neck', 'shR'], ['shR', 'elR'], ['elR', 'wrR'], ['shL', 'elL'], ['elL', 'wrL'], ['neck', 'hipL'], ['neck', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR']];
    sg.strokeStyle = '#2fd1cc'; sg.lineWidth = 4; sg.lineCap = 'round';
    bones.forEach(([a, b]) => { sg.beginPath(); sg.moveTo(...J[a]); sg.lineTo(...J[b]); sg.stroke(); });
    sg.fillStyle = '#f0b23c'; Object.values(J).forEach(([u, v]) => { sg.beginPath(); sg.arc(u, v, 4, 0, 7); sg.fill(); });
    sg.fillStyle = '#ffffff'; sg.font = '600 16px Archivo, Arial'; sg.fillText('pose 0.84 conf', 18, 26);
    sg.fillStyle = '#f0b23c'; sg.fillText('court 0.89 · tracking: low confidence', 18, 48);
  });
  addCircleCollider(x, z - 3.5, 2.8);
  zone('shuttlesense', 'ShuttleSense', 'Project', x, z, 7.5, 'projects', 8.5, 'AI badminton coach');
}
// TEG loop: server racks → heat exchanger → TEG array → battery, with flowing coolant
{
  const x = 38, z = -42;
  const g = pavilion(x, z, PAL.red, 'TEG');
  const leds = [];
  for (let i = 0; i < 3; i++) {
    box(0.9, 2.4, 1.1, 0x1b2329, -4 + i * 1.0, 1.62, -2.6, g, { rough: 0.4, metal: 0.4 });
    for (let j = 0; j < 8; j++) { const l = box(0.6, 0.04, 0.02, mat(0x2fd1cc, { emissive: 0x2fd1cc, ei: 1 }), -4 + i * 1.0, 0.7 + j * 0.26, -2.04, g); l.castShadow = false; leds.push(l); }
  }
  // shell-and-tube exchanger
  const hx = cyl(0.55, 0.55, 3.2, 0xb8c2c7, 0, 1.3, -1.2, g, 24, { metal: 0.7, rough: 0.3 }); hx.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const head = mesh(new THREE.SphereGeometry(0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xb8c2c7, { metal: 0.7, rough: 0.3 }), s * 1.6, 1.3, -1.2, g); head.rotation.z = -s * Math.PI / 2; }
  for (const xx of [-1.0, 0, 1.0]) box(0.12, 0.6, 0.12, 0x3a4249, xx, 0.75, -1.2, g);
  // TEG modules: hot red plates, cold blue plates
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    box(0.38, 0.06, 0.38, 0xd9473f, 2.3 + i * 0.45, 0.9 + j * 0.42, 1.0, g);
    box(0.38, 0.06, 0.38, 0x3b82c4, 2.3 + i * 0.45, 1.05 + j * 0.42, 1.0, g);
  }
  // battery pack with a state-of-charge bar
  box(1.4, 1.4, 0.9, 0x22303a, -2.2, 1.1, 2.4, g, { rough: 0.5 });
  const soc = box(0.15, 1.0, 0.02, mat(0x5cd17a, { emissive: 0x5cd17a, ei: 0.8 }), -1.7, 1.1, 2.86, g);
  // coolant pipe with flow dots
  const path = new THREE.CatmullRomCurve3([V(-3, 0.9, -2), V(-1.6, 1.3, -1.2), V(1.6, 1.3, -1.2), V(2.9, 1.0, 0.2), V(2.9, 0.8, 1.6), V(-1.5, 0.8, 2.4)].map((p) => p.add(V(x, 0, z))));
  mesh(new THREE.TubeGeometry(path, 80, 0.09, 8), mat(0x6f7f88, { metal: 0.6, rough: 0.35 }), 0, 0, 0);
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8a5c }), 24); scene.add(dots);
  const dd = new THREE.Object3D(); let off = 0;
  tickers.push((dt, t) => {
    off = (off + dt * 0.12) % 1;
    for (let i = 0; i < 24; i++) { path.getPointAt((off + i / 24) % 1, dd.position); dd.updateMatrix(); dots.setMatrixAt(i, dd.matrix); }
    dots.instanceMatrix.needsUpdate = true;
    const lvl = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.5)); soc.scale.y = lvl; soc.position.y = 0.6 + lvl * 0.5;
    leds.forEach((l, i) => (l.visible = Math.sin(t * 6 + i * 1.7) > -0.6));
  });
  addCircleCollider(x - 1, z - 2, 3.2); addCircleCollider(x + 2.9, z + 1, 1.2);
  zone('teg', 'TEG Loop Simulator', 'Capstone project', x, z, 7.5, 'projects', 8.5, 'Data-centre waste heat → power');
}
// Kronos: 3D candlestick chart with a forecast band
{
  const x = 56, z = -28;
  const g = pavilion(x, z, PAL.amber, 'Kronos');
  let p = 2.2;
  const N = 22;
  for (let i = 0; i < N; i++) {
    const o = p, c = p + (rng() - 0.48) * 0.7; const hi = Math.max(o, c) + rng() * 0.3, lo = Math.min(o, c) - rng() * 0.3;
    const up = c >= o, col = up ? 0x3fbf7f : 0xd9473f;
    const xx = -4.2 + i * 0.32;
    box(0.2, Math.max(0.05, Math.abs(c - o)), 0.2, mat(col, { emissive: col, ei: 0.15 }), xx, 0.5 + (o + c) / 2, -1.5, g);
    box(0.04, hi - lo, 0.04, col, xx, 0.5 + (hi + lo) / 2, -1.5, g);
    p = c;
  }
  // forecast cone
  const shape = []; for (let i = 0; i <= 12; i++) shape.push([i * 0.3, p + i * 0.05, i * 0.07]);
  const fpos = [];
  shape.forEach(([dx, m, w], i) => { if (i === 0) return; const [dx0, m0, w0] = shape[i - 1]; const X0 = 2.9 + dx0, X1 = 2.9 + dx; fpos.push(X0, 0.5 + m0 - w0, -1.5, X1, 0.5 + m - w, -1.5, X1, 0.5 + m + w, -1.5, X0, 0.5 + m0 - w0, -1.5, X1, 0.5 + m + w, -1.5, X0, 0.5 + m0 + w0, -1.5); });
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
  const band = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xf0b23c, transparent: true, opacity: 0.45, side: THREE.DoubleSide })); g.add(band);
  box(9, 0.05, 0.05, 0x22303a, -0.2, 0.5, -1.5, g);
  sign([{ text: 'Forecast vs actual', size: 0.3, weight: 800 }, { text: 'MAE · RMSE · direction hit-rate', size: 0.18, weight: 500, color: '#bfe3e1' }], 3.4, 1.0, 0, 1.0, 2.6, Math.PI, g);
  addCircleCollider(x, z - 1.5, 2.2);
  zone('kronos', 'Kronos dashboard', 'Project', x, z, 7.5, 'projects', 8.5, 'Forecasts that grade themselves');
}
marker(36, 9, -36, PAL.red);

/* ================= LEARNING LAB ===================================== */
{
  const x = 40, z = 6;
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  cyl(7, 7, 0.3, 0xe9e4da, 0, 0.15, 0, g, 40);
  // glass reactor with spinning impeller
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcdeff0, transmission: 0.85, roughness: 0.05, thickness: 0.3, transparent: true, opacity: 0.35 });
  mesh(new THREE.CapsuleGeometry(1.3, 1.8, 10, 32), glass, 0, 2.6, -1, g, { cast: false });
  const liquid = mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.6, 32), mat(0x2fa7a4, { emissive: 0x2fa7a4, ei: 0.25, opacity: 0.75 }), 0, 1.95, -1, g, { cast: false });
  cyl(0.35, 0.35, 0.7, 0x5b6a72, 0, 5.1, -1, g, 20, { metal: 0.6 });
  const imp = new THREE.Group(); imp.position.set(0, 1.6, -1); g.add(imp);
  cyl(0.05, 0.05, 3.5, 0xc0c8cc, 0, 1.75, 0, imp, 8, { metal: 0.8 });
  for (let i = 0; i < 4; i++) { const b = box(0.7, 0.28, 0.05, 0xc0c8cc, Math.cos(i * Math.PI / 2) * 0.4, 0, Math.sin(i * Math.PI / 2) * 0.4, imp, { metal: 0.8 }); b.rotation.y = -i * Math.PI / 2; }
  for (const [lx, lz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cyl(0.07, 0.07, 1.3, 0x5b6a72, lx * 0.85, 0.85, -1 + lz * 0.85, g, 8);
  tickers.push((dt) => { imp.rotation.y += dt * 3; });
  // bookshelf
  box(3, 2.6, 0.6, 0x8a6a4a, -4.2, 1.6, -0.5, g);
  const bookCols = [0x2fa7a4, 0xd9473f, 0xf0b23c, 0x3b82c4, 0x6b4f9e, 0x22303a];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 10; i++) box(0.18 + rng() * 0.06, 0.55 + rng() * 0.15, 0.4, bookCols[(i + r) % 6], -5.4 + i * 0.26, 0.75 + r * 0.8, -0.45, g);
  // whiteboard: Haber loop flowsheet
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 576;
  const c = cv.getContext('2d'); c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, 1024, 576);
  c.strokeStyle = '#22303a'; c.lineWidth = 6; c.font = '700 36px Archivo, Arial'; c.fillStyle = '#22303a';
  c.fillText('CHE 480 · Haber loop in Aspen Plus', 40, 64);
  const blk = (bx, by, t) => { c.strokeRect(bx, by, 170, 90); c.font = '600 28px Archivo, Arial'; c.fillText(t, bx + 18, by + 55); };
  blk(60, 200, 'Feed'); blk(300, 200, 'Comp.'); blk(540, 200, 'Reactor'); blk(780, 200, 'Flash');
  c.strokeStyle = '#2fa7a4'; c.beginPath(); [[230, 245, 300, 245], [470, 245, 540, 245], [710, 245, 780, 245]].forEach(([a, b, d, e]) => { c.moveTo(a, b); c.lineTo(d, e); }); c.stroke();
  c.strokeStyle = '#d9473f'; c.setLineDash([16, 12]); c.beginPath(); c.moveTo(865, 290); c.lineTo(865, 420); c.lineTo(385, 420); c.lineTo(385, 290); c.stroke();
  c.setLineDash([]); c.fillStyle = '#d9473f'; c.font = 'italic 600 28px Archivo, Arial'; c.fillText('recycle', 560, 460);
  const wbT = new THREE.CanvasTexture(cv); wbT.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(4.2, 2.36), new THREE.MeshStandardMaterial({ map: wbT, roughness: 0.4 }), 4.1, 2.2, -0.6, g).rotation.y = -0.5;
  box(0.1, 2.5, 4.4, 0x3a4249, 4.2, 2.2, -0.7, g).rotation.y = -0.5 + Math.PI / 2;
  addCircleCollider(x, z - 1, 1.8); addBoxCollider(x - 4.2, z - 0.5, 3.2, 0.8); addCircleCollider(x + 4.1, z - 0.6, 1.6);
  zone('learning', 'Learning lab', 'Currently learning', x, z + 2, 8, 'learning', 7, 'L-401 · Fall 2026');
  marker(x, 8, z - 1, 0x6b4f9e);
}

/* ================= CAREER STREET ==================================== */
function office(id, x, z, facing, { title, role, address, years, build, w, d, labelH, h = 10 }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = facing === 'north' ? 0 : Math.PI; scene.add(g); // north-side buildings face south onto the street
  build(g);
  addBoxCollider(x, z, w, d, 0, h);
  // address board on the sidewalk in front
  const sz = facing === 'north' ? z + d / 2 + 2.2 : z - d / 2 - 2.2;
  const s = sign([{ text: title, size: 0.24, weight: 800 }, { text: role, size: 0.15, weight: 600, color: '#bfe3e1' }, { text: address, size: 0.13, weight: 500, color: '#d8dcd6' }, { text: years, size: 0.13, weight: 700, color: '#f0b23c' }], 3.4, 1.9, x + w / 2 - 1.6, 2.1, sz, facing === 'north' ? 0 : Math.PI);
  cyl(0.06, 0.06, 1.2, 0x3a4249, x + w / 2 - 2.8, 0.6, sz); cyl(0.06, 0.06, 1.2, 0x3a4249, x + w / 2 - 0.4, 0.6, sz);
  addBoxCollider(x + w / 2 - 1.6, sz, 3.6, 0.4);
  const zz = facing === 'north' ? z + d / 2 + 4.5 : z - d / 2 - 4.5;
  zone(id, title, role, x, zz, 6.5, 'career', labelH, `${years} · ${address.split(',')[0]}`);
  return g;
}
const windows = (g, w, h, d, floors, cols, color, glassCol = 0x9ccbe0, y0 = 0.6) => {
  const gm = mat(glassCol, { rough: 0.15, metal: 0.3, emissive: 0x9fd2e6, ei: 0.08 });
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const wx = -w / 2 + (c + 0.5) * (w / cols), wy = y0 + (f + 0.5) * (h / floors);
    box(w / cols * 0.62, h / floors * 0.55, 0.06, gm, wx, wy, d / 2 + 0.02, g).castShadow = false;
  }
};

// 2023 · GIP · Caledon: asphalt plant with silos, drum mixer and stockpiles
office('gip', -62, 52, 'south', {
  title: 'GIP', role: 'Materials & Manufacturing Engineer', address: '10 Airport Rd, Caledon, ON', years: 'May – Aug 2023', w: 22, d: 14, labelH: 12, h: 9,
  build(g) {
    for (let i = 0; i < 3; i++) {
      cyl(1.4, 1.4, 7, 0xc7cdd1, -7 + i * 3.2, 5.5, -3, g, 20, { metal: 0.5, rough: 0.4 });
      mesh(new THREE.ConeGeometry(1.4, 1.6, 20), mat(0xc7cdd1, { metal: 0.5 }), -7 + i * 3.2, 1.2, -3, g).rotation.x = Math.PI;
      for (const [lx, lz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cyl(0.08, 0.08, 2, 0x3a4249, -7 + i * 3.2 + lx, 1, -3 + lz, g, 6);
    }
    const drum = cyl(1.2, 1.2, 7, 0x5b6a72, 3, 2.6, -2.5, g, 24, { metal: 0.5 }); drum.rotation.z = Math.PI / 2 - 0.08;
    const conv = box(9, 0.25, 0.8, 0x3a4249, 2, 3.4, 2, g); conv.rotation.z = 0.35;
    // aggregate stockpiles
    [[7.5, 3.5, 2.2, 0x9b9488], [4.5, 4.5, 1.8, 0x7d6b5a], [-3, 4.5, 2, 0xa9a196]].forEach(([px, pz, r, cc]) => mesh(new THREE.ConeGeometry(r, r * 1.1, 9), mat(cc, { flat: true }), px, r * 0.55, pz, g));
    // QC lab trailer
    box(5, 2.4, 2.6, 0xf4f2ec, -6, 1.4, 4, g); box(0.9, 1.6, 0.05, 0x22303a, -7, 1.2, 5.32, g);
    sign([{ text: 'QC lab · recycled asphalt', size: 0.34, weight: 750 }], 3.2, 0.5, -5, 2.3, 5.36, 0, g, { bg: '#2fa7a4', fg: '#fff', accent: '#2fa7a4' });
  },
});

// Jan–Apr 2024 · MTO · 87 Sir William Hearst Ave: provincial office block + highway gantry
office('mto', -40, 23, 'north', {
  title: 'Ministry of Transportation', role: 'Asset Management Engineer', address: '87 Sir William Hearst Ave, Toronto', years: 'Jan – Apr 2024', w: 16, d: 11, labelH: 15, h: 11.6,
  build(g) {
    box(16, 11, 11, 0xd9cdb5, 0, 5.6, 0, g, { rough: 0.9 });
    box(16.4, 0.5, 11.4, 0xb9ab90, 0, 11.3, 0, g);
    windows(g, 16, 10, 11, 5, 8, 0xd9cdb5);
    box(3.2, 3, 0.4, 0x2b3640, 0, 1.6, 5.6, g);
    // flagpole and a green highway gantry sign
    cyl(0.07, 0.07, 9, 0xdddddd, 6, 4.5, 8, g, 8);
    const flag = box(1.8, 1, 0.03, 0xd9473f, 6.95, 8.4, 8, g);
    const gy = 5.2;
    cyl(0.15, 0.15, gy, 0x6f7f88, -7.4, gy / 2, 8.5, g, 8); cyl(0.15, 0.15, gy, 0x6f7f88, -2.6, gy / 2, 8.5, g, 8);
    sign([{ text: 'Ride Quality Index', size: 0.3, weight: 800 }, { text: '$700M portfolio · 95% model', size: 0.2, weight: 600 }], 5.4, 1.6, -5, gy, 8.5, 0, g, { bg: '#1f6b3a', fg: '#ffffff', accent: '#ffffff' });
  },
});

// Sep–Dec 2024 · PwC · 18 York St: glass tower
office('pwc', -20, 52, 'south', {
  title: 'PwC', role: 'Risk Services Associate', address: '18 York St, Toronto', years: 'Sep – Dec 2024', w: 12, d: 12, labelH: 35, h: 33,
  build(g) {
    const gm = new THREE.MeshPhysicalMaterial({ color: 0x8fbad0, metalness: 0.4, roughness: 0.08, clearcoat: 1 });
    mesh(new THREE.BoxGeometry(12, 30, 12), gm, 0, 15, 0, g);
    for (let i = 1; i < 30; i += 1.5) box(12.1, 0.12, 12.1, 0xdfe7ea, 0, i, 0, g).castShadow = false;
    for (let i = -6; i <= 6; i += 1.5) { box(0.1, 30, 0.1, 0xdfe7ea, i, 15, 6.02, g).castShadow = false; }
    box(9, 3, 9, 0xdfe7ea, 0, 31.5, 0, g);
    box(12.5, 4, 3, 0x2b3640, 0, 2, 7, g);
  },
});

// May–Aug 2025 · UWaterloo E6 · research
office('uw', 0, 23, 'north', {
  title: 'University of Waterloo, E6', role: 'Process Optimization Researcher', address: 'Engineering 6, 200 University Ave W, Waterloo', years: 'May – Aug 2025', w: 18, d: 11, labelH: 13, h: 11,
  build(g) {
    box(18, 4, 11, 0x2b3237, 0, 2, 0, g, { rough: 0.6 });
    const gm = mat(0x9fc9dc, { rough: 0.1, metal: 0.3 });
    box(20, 6.5, 12, gm, 1, 7.25, 0.5, g); // cantilevered glass upper storeys
    for (let i = -9; i <= 11; i += 1.2) box(0.08, 6.5, 0.1, 0x2b3237, i, 7.25, 6.55, g).castShadow = false;
    box(20.2, 0.4, 12.2, 0xf0b23c, 1, 10.7, 0.5, g); // Waterloo gold trim
    box(4, 3, 0.3, 0xf0b23c, -5, 1.6, 5.6, g);
  },
});
// Campus ambassador booth next to E6
{
  const x = -16, z = 24;
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  for (const [px, pz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) cyl(0.06, 0.06, 2.6, 0xdddddd, px, 1.3, pz, g, 8);
  mesh(new THREE.ConeGeometry(2.6, 1.2, 4), mat(0xf0b23c, { flat: true }), 0, 3.2, 0, g).rotation.y = Math.PI / 4;
  box(2.6, 0.9, 0.8, 0x22303a, 0, 0.45, 0.9, g);
  for (let i = 0; i < 5; i++) box(0.3, 0.02, 0.4, [0xffffff, 0x2fa7a4, 0xf0b23c][i % 3], -1 + i * 0.5, 0.92, 0.9, g);
  const host = makePerson({ top: 0xf0b23c }); host.position.set(0, 0, -0.4); g.add(host);
  addBoxCollider(x, z + 0.9, 3, 1.2);
  zone('campus', 'Engineering Ambassador', 'Hobbies · campus', x, z + 4, 5, 'hobbies', 5, 'Chem eng exec ambassador');
}

// Sep–Dec 2025 · HGC · 2000 Argentia Rd, Plaza 1: low office + sound meter with rings
office('hgc', 20, 50, 'south', {
  title: 'HGC Noise Vibration Acoustics', role: 'Engineering Consultant', address: '2000 Argentia Rd, Plaza 1, Mississauga', years: 'Sep – Dec 2025', w: 14, d: 11, labelH: 10, h: 7.5,
  build(g) {
    box(14, 7, 11, 0xa9b8be, 0, 3.6, 0, g, { rough: 0.7 });
    windows(g, 14, 6.2, 11, 2, 6, 0xa9b8be, 0x6fa3bd);
    box(14.4, 0.4, 11.4, 0x7d8d94, 0, 7.2, 0, g);
    box(2.5, 2.8, 0.3, 0x2b3640, -4, 1.5, 5.6, g);
    // sound level meter on a tripod with expanding rings
    const mx = 3.5, mz = 8.3;
    for (let i = 0; i < 3; i++) { const l = cyl(0.03, 0.03, 1.4, 0x22303a, mx + Math.cos(i * 2.1) * 0.25, 0.7, mz + Math.sin(i * 2.1) * 0.25, g, 6); }
    box(0.15, 0.5, 0.12, 0xf0b23c, mx, 1.6, mz, g);
    const rings = [];
    for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(0.4, 0.025, 6, 40), new THREE.MeshBasicMaterial({ color: 0x2fa7a4, transparent: true }), mx, 1.9, mz, g, { cast: false }); rings.push(r); }
    tickers.push((dt, t) => rings.forEach((r, i) => { const k = (t * 0.5 + i / 4) % 1; r.scale.setScalar(1 + k * 5); r.material.opacity = 1 - k; }));
  },
});

// May 2026 → now · Purolator · 2600 Meadowvale Blvd: sorting terminal
office('purolator', 48, 54, 'south', {
  title: 'Purolator', role: 'Process Engineer', address: '2600 Meadowvale Blvd, Mississauga', years: 'May 2026 – now', w: 28, d: 15, labelH: 11, h: 8.2,
  build(g) {
    box(28, 8, 15, 0xe9e6df, 0, 4, 0, g, { rough: 0.7 });
    box(28.2, 0.6, 15.2, 0xd9473f, 0, 7.9, 0, g);
    for (let i = 0; i < 6; i++) {
      box(3, 3.6, 0.2, 0x3a4249, -11 + i * 4.4, 1.9, 7.55, g);
      box(3.2, 0.25, 0.4, 0xf0b23c, -11 + i * 4.4, 3.95, 7.6, g);
    }
    // trucks at the docks
    for (const [i, xx] of [[0, -11], [2, -2.2], [4, 6.6]]) { const tr = makeTruck(); tr.rotation.y = -Math.PI / 2; tr.position.set(xx, 0, 11.3); g.add(tr); }
    // outdoor conveyor with moving parcels
    box(26, 0.2, 1.1, 0x22303a, 0, 1.0, -8.5, g);
    const boxes = []; const bm = mat(0xc49a6c);
    for (let i = 0; i < 14; i++) { const s = 0.5 + (i % 3) * 0.15; const b = box(s, s * 0.7, s, bm, 0, 1.1 + s * 0.35, -8.5, g); boxes.push(b); }
    tickers.push((dt, t) => boxes.forEach((b, i) => { b.position.x = ((t * 1.6 + i * 1.86) % 26) - 13; }));
    // CCTV pole for the computer-vision pilot
    cyl(0.1, 0.1, 6, 0x3a4249, 13.5, 3, 9, g, 8);
    const cam = box(0.6, 0.35, 0.35, 0xf4f2ec, 13.2, 6, 9, g); cam.rotation.y = 0.6;
    const cone = mesh(new THREE.ConeGeometry(2.2, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x2fd1cc, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }), 11.5, 3.3, 9.6, g, { cast: false });
    cone.rotation.z = -0.9; cone.rotation.y = 0.2;
  },
});

// Ventures: wAize studio and PrompToGo classroom
office('waize', 46, 24, 'north', {
  title: 'wAize', role: 'COO · AI consultancy', address: 'Toronto, ON', years: '2025 – now', w: 12, d: 9, labelH: 9, h: 6.2,
  build(g) {
    box(12, 6, 9, 0x22303a, 0, 3, 0, g, { rough: 0.5 });
    box(10, 4, 0.1, mat(0x9fd8f0, { rough: 0.1, emissive: 0x7ad0f0, ei: 0.25 }), 0, 3, 4.52, g);
    for (let i = 0; i < 3; i++) box(2.4, 1.4, 0.05, mat(0x2fd1cc, { emissive: 0x2fd1cc, ei: 0.7 }), -3.3 + i * 3.3, 3.2, 4.4, g);
    box(12.3, 0.3, 9.3, 0x2fa7a4, 0, 6.1, 0, g);
  },
});
office('promptogo', 66, 24, 'north', {
  title: 'PrompToGo', role: 'Co-founder · AI classes for teens', address: 'London, ON & North York', years: '2025 – now', w: 12, d: 9, labelH: 9, h: 7,
  build(g) {
    box(12, 5.5, 9, 0xf3e3c6, 0, 2.75, 0, g, { rough: 0.8 });
    const roof = mesh(new THREE.ConeGeometry(8.4, 2.6, 4), mat(0xd9473f, { flat: true }), 0, 6.8, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.75;
    windows(g, 12, 4.4, 9, 1, 4, 0xf3e3c6, 0x9fd8f0, 0.4);
    box(2, 2.8, 0.2, 0x2fa7a4, 0, 1.5, 4.6, g);
  },
});

/* ================= SCENERY ========================================== */
{
  const keepOut = [[0, 0, 14], [-48, -30, 17], [-44, 6, 21], [20, -34, 9], [38, -42, 9], [56, -28, 9], [40, 6, 9], [-16, 24, 4]];
  const clear = (x, z) => keepOut.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r) && Math.abs(z - 36) > 26 && Math.hypot(x, z) < 90;
  let placed = 0, tries = 0;
  while (placed < 90 && tries < 3000) {
    tries++;
    const a = rng() * Math.PI * 2, r = 12 + rng() * 78, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!clear(x, z)) continue;
    const t = makeTree(Math.floor(rng() * 4)); t.position.set(x, 0, z); const s = 0.8 + rng() * 0.7; t.scale.setScalar(s); t.rotation.y = rng() * 6;
    t.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(t); addCircleCollider(x, z, 0.5 * s); placed++;
  }
  // street trees and lamps along career street
  for (let x = -76; x <= 76; x += 12) {
    for (const z of [29.6, 42.4]) {
      if (Math.abs(x - 10) < 4 && z < 36) continue; // keep the path from the plaza clear
      const l = cyl(0.08, 0.1, 4.5, 0x3a4249, x + 6, 2.25, z, scene, 8);
      const lamp = mesh(new THREE.SphereGeometry(0.28, 12, 8), mat(0xfff3c8, { emissive: 0xffe8a8, ei: 0.9 }), x + 6, 4.6, z);
    }
  }
  // clouds
  const cm = mat(0xffffff, { rough: 1, flat: true });
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) mesh(new THREE.IcosahedronGeometry(3 + rng() * 3, 0), cm, j * 4 - 6, rng() * 2, rng() * 3, c, { cast: false, receive: false });
    const a = rng() * Math.PI * 2, r = 70 + rng() * 120;
    c.position.set(Math.cos(a) * r, 40 + rng() * 25, Math.sin(a) * r); scene.add(c);
    const sp = 0.4 + rng() * 0.6;
    tickers.push((dt) => { c.position.x += dt * sp; if (c.position.x > 220) c.position.x = -220; });
  }
}

/* District entry points for the quick-travel menu ------------------- */
export const districts = {
  welcome: { x: 0, z: 6, face: 0, title: 'Plaza' },
  hobbies: { x: -38, z: -18, face: 0.9, title: 'Hobbies' },
  projects: { x: 34, z: -24, face: -0.4, title: 'Projects' },
  career: { x: -64, z: 36, face: Math.PI / 2 + 0.4, title: 'Career' },
  learning: { x: 40, z: 15, face: 0, title: 'Learning' },
};
