import { THREE, scene, camera, canvas, colliders, occluders, cutaways, ISLAND_R, sun, V, reduce, mobile } from './core.js';
import { makePerson, animatePerson } from './models.js';

export const player = makePerson({ top: 0x2fa7a4, bottom: 0x26313a, skin: 0xb98463, hair: 0x15110f });
player.position.set(0, 0, 3);
player.userData.speed = 0;
scene.add(player);

// ground ring under the player
const halo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
halo.rotation.x = -Math.PI / 2; halo.position.y = 0.06; scene.add(halo);
// click target marker
const dest = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0x2fa7a4, transparent: true }));
dest.rotation.x = -Math.PI / 2; dest.position.y = 0.07; dest.visible = false; scene.add(dest);

/* Camera rig ---------------------------------------------------------- */
export const rig = { yaw: 0, pitch: 0.72, dist: mobile ? 22 : 19, targetYaw: 0, look: V(0, 1.4, 3) };
const camPos = V(0, 30, 50);
camera.position.copy(camPos);

/* Input -------------------------------------------------------------- */
const keys = new Set();
let target = null;          // click-to-walk destination
export let autopilot = null; // {x,z,face} quick-travel
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, [contenteditable]')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', 'shift'].includes(k)) {
    if (k.startsWith('arrow') && document.activeElement && document.activeElement !== document.body && document.activeElement !== canvas) return;
    keys.add(k); target = null; autopilot = null; dest.visible = false;
    if (k.startsWith('arrow')) e.preventDefault();
  }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// drag to orbit, click/tap to walk, wheel to zoom
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: rig.targetYaw, pitch: rig.pitch, moved: false, id: e.pointerId }; });
addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 6) drag.moved = true;
  if (drag.moved) {
    rig.targetYaw = drag.yaw - dx * 0.006;
    rig.pitch = Math.min(1.25, Math.max(0.25, drag.pitch + dy * 0.004));
  }
});
addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const wasDrag = drag.moved; drag = null;
  if (wasDrag || e.target !== canvas) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), 0), p) && Math.hypot(p.x, p.z) < ISLAND_R - 3) walkTo(p.x, p.z);
});
canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.dist = Math.min(40, Math.max(9, rig.dist + e.deltaY * 0.02)); }, { passive: false });

export function walkTo(x, z) {
  target = V(x, 0, z); autopilot = null;
  dest.position.set(x, 0.07, z); dest.visible = true; dest.scale.setScalar(1);
}
export function travelTo(x, z, face) {
  autopilot = { x, z, face }; target = null; dest.visible = false;
}

/* Joystick for touch -------------------------------------------------- */
const stick = { x: 0, y: 0 };
const joy = document.getElementById('joystick');
if (joy) {
  const knob = joy.querySelector('span');
  let jid = null;
  const set = (e) => {
    const r = joy.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    stick.x = x; stick.y = y; knob.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
  };
  joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); set(e); target = null; autopilot = null; });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) set(e); });
  const end = () => { jid = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}

/* Collision resolution ----------------------------------------------- */
const R = 0.45;
function resolve(p) {
  for (const c of colliders) {
    if (c.r !== undefined) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + R;
      if (d < min && d > 1e-6) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
    } else if (p.x > c.x0 - R && p.x < c.x1 + R && p.z > c.z0 - R && p.z < c.z1 + R) {
      const pen = [p.x - (c.x0 - R), (c.x1 + R) - p.x, p.z - (c.z0 - R), (c.z1 + R) - p.z];
      const i = pen.indexOf(Math.min(...pen));
      if (i === 0) p.x = c.x0 - R; else if (i === 1) p.x = c.x1 + R; else if (i === 2) p.z = c.z0 - R; else p.z = c.z1 + R;
    }
  }
  const d = Math.hypot(p.x, p.z), max = ISLAND_R - 2;
  if (d > max) { p.x *= max / d; p.z *= max / d; }
}

/* Update ------------------------------------------------------------- */
const move = V(0, 0, 0), fwd = V(), right = V();
let heading = Math.PI, stuck = 0;
export function updatePlayer(dt, t) {
  rig.yaw += (rig.targetYaw - rig.yaw) * Math.min(1, dt * 8);
  if (keys.has('q')) rig.targetYaw += dt * 1.6;
  if (keys.has('e')) rig.targetYaw -= dt * 1.6;
  fwd.set(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw));
  right.set(-fwd.z, 0, fwd.x);
  move.set(0, 0, 0);
  const k = (a, b) => (keys.has(a) || keys.has(b) ? 1 : 0);
  move.addScaledVector(fwd, k('w', 'arrowup') - k('s', 'arrowdown') - stick.y);
  move.addScaledVector(right, k('d', 'arrowright') - k('a', 'arrowleft') + stick.x);
  let speedMax = keys.has('shift') ? 11 : 6.5;
  if (autopilot) {
    move.set(autopilot.x - player.position.x, 0, autopilot.z - player.position.z);
    const d = move.length();
    speedMax = Math.min(16, 4 + d * 0.9);
    if (d < 0.4) { if (autopilot.face != null) rig.targetYaw = autopilot.face; autopilot = null; move.set(0, 0, 0); }
  } else if (target) {
    move.set(target.x - player.position.x, 0, target.z - player.position.z);
    if (move.length() < 0.3) { target = null; dest.visible = false; move.set(0, 0, 0); }
  }
  const len = move.length();
  const before = player.position.clone();
  if (len > 0.01) {
    move.multiplyScalar(1 / Math.max(1, len));
    const step = speedMax * Math.min(1, len) * dt;
    if (autopilot) {
      // fly over obstacles when quick-travelling
      player.position.addScaledVector(move, step);
    } else {
      player.position.addScaledVector(move, step); resolve(player.position);
    }
    const want = Math.atan2(move.x, move.z);
    let dh = want - heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    heading += dh * Math.min(1, dt * 12);
    player.rotation.y = heading;
  }
  const moved = player.position.distanceTo(before);
  player.userData.speed = moved / Math.max(dt, 1e-4);
  // give up on a click target we can't reach
  if (target && moved < 0.002) { if ((stuck += dt) > 0.4) { target = null; dest.visible = false; stuck = 0; } } else stuck = 0;
  animatePerson(player, player.userData.speed, dt);
  halo.position.set(player.position.x, 0.06, player.position.z);
  if (dest.visible) { dest.scale.setScalar(1 + Math.sin(t * 6) * 0.12); }

  // camera follow
  const look = V(player.position.x, 1.5, player.position.z);
  rig.look.lerp(look, Math.min(1, dt * (reduce ? 20 : 6)));
  const cp = Math.cos(rig.pitch), sp = Math.sin(rig.pitch);
  const want = V(rig.look.x + Math.sin(rig.yaw) * cp * rig.dist, rig.look.y + sp * rig.dist, rig.look.z + Math.cos(rig.yaw) * cp * rig.dist);
  // pull the camera in front of any building between it and the player
  const dir = want.clone().sub(rig.look); let tMin = 1;
  for (const o of occluders) {
    let t0 = 0, t1 = 1; let ok = true;
    for (const [a, lo, hi] of [['x', o.x0, o.x1], ['y', o.y0, o.y1], ['z', o.z0, o.z1]]) {
      const s = rig.look[a], dd = dir[a];
      if (Math.abs(dd) < 1e-6) { if (s < lo || s > hi) { ok = false; break; } continue; }
      let ta = (lo - s) / dd, tb = (hi - s) / dd; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 > 0 && t0 < tMin) tMin = t0;
  }
  if (tMin < 1) want.copy(rig.look).addScaledVector(dir, Math.max(0.25, tMin - 0.04));
  camPos.lerp(want, Math.min(1, dt * (reduce ? 20 : tMin < 1 ? 10 : 4)));
  for (const c of cutaways) c.obj.visible = !(player.position.x > c.x0 && player.position.x < c.x1 && player.position.z > c.z0 && player.position.z < c.z1);
  camera.position.copy(camPos);
  camera.lookAt(rig.look);
  // shadows follow the player
  sun.position.set(player.position.x + 40, 70, player.position.z + 30);
  sun.target.position.set(player.position.x, 0, player.position.z);
}
