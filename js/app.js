import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStudio, buildHall, buildPitch, buildGallery, buildMap, buildLab } from './stages.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 820;
const $ = (s) => document.querySelector(s);

/* ---------------- Renderer ---------------- */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.02, 1200);

const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: small ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.16, 0.5, 0.96);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); measure();
});

/* ---------------- Loading ---------------- */
const manager = new THREE.LoadingManager();
const bar = $('#loadBar'), pct = $('#loadPct');
manager.onProgress = (url, done, total) => { const p = done / total; bar.style.transform = `scaleX(${p})`; pct.textContent = Math.round(p * 100) + '%'; };
const tl = new THREE.TextureLoader(manager);
const T = (url, srgb = true) => { const t = tl.load(url); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const tex = {
  wood: T('assets/tex/hardwood2_diffuse.jpg'), woodRough: T('assets/tex/hardwood2_roughness.jpg', false), woodBump: T('assets/tex/hardwood2_bump.jpg', false),
  grass: T('assets/tex/grass.jpg'), map: T('assets/tex/map.jpg'),
  shuttlesense: T('assets/img/shuttlesense.jpg'), teg: T('assets/img/teg-sim.jpg'), kronos: T('assets/img/kronos-forecast.jpg'),
};
for (const k of ['wood', 'woodRough', 'woodBump']) { tex[k].wrapS = tex[k].wrapT = THREE.RepeatWrapping; tex[k].repeat.set(8, 5); tex[k].anisotropy = 16; }
let hdr = null, mapMeta = null;
new RGBELoader(manager).load('assets/tex/sky.hdr', (t) => { t.mapping = THREE.EquirectangularReflectionMapping; hdr = t; });
manager.itemStart('mapmeta');
fetch('assets/tex/map.json').then((r) => r.json()).then((j) => { mapMeta = j; manager.itemEnd('mapmeta'); });

/* ---------------- Places for the map ---------------- */
const places = [
  { id: 'purolator', lon: -79.7535, lat: 43.6195, color: 0xd9433b, camX: 0.1 },
  { id: 'waize', lon: -79.383, lat: 43.6532, color: 0x2fa7a4 },
  { id: 'promptogo', lon: -79.4111, lat: 43.7615, color: 0x7a5cc7 },
  { id: 'hgc', lon: -79.7598, lat: 43.6072, color: 0x3d7cc9, camX: -0.25 },
  { id: 'uw', lon: -80.5392, lat: 43.4732, color: 0xe8b43c },
  { id: 'pwc', lon: -79.3814, lat: 43.6418, color: 0xe0712c, camX: 0.2 },
  { id: 'mto', lon: -79.4795, lat: 43.7445, color: 0x2f8f4e },
  { id: 'gip', lon: -79.7335, lat: 43.8655, color: 0x8a6d4b },
];

/* ---------------- Build ---------------- */
let stages = {}, steps = [], ready = false;
const labelEl = $('#pinLabel');

manager.onLoad = async () => {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  const ctx = { tex, hdr, mapMeta };
  const S = (i) => new THREE.Vector3(i * 400, 0, 0);
  const list = [buildStudio(ctx, S(0)), buildHall(ctx, S(1)), buildPitch(ctx, S(2)), buildGallery(ctx, S(3), renderer), buildMap(ctx, S(4), places), buildLab(ctx, S(5))];
  for (const s of list) { stages[s.name] = s; scene.add(s.group); }
  // compile every stage up front so transitions never hitch
  try { await renderer.compileAsync(scene, camera); } catch (e) { renderer.compile(scene, camera); }
  for (const s of list) s.group.visible = false;
  measure();
  setStage(steps[0].stage);
  ready = true;
  document.body.classList.add('loaded');
  setTimeout(() => $('#loader')?.remove(), 1200);
};

/* ---------------- Scroll → story position ---------------- */
const stepEls = [...document.querySelectorAll('.step')];
steps = stepEls.map((el) => ({ el, stage: el.dataset.stage, key: el.dataset.key, pin: el.dataset.pin || null, center: 0 }));
function measure() {
  for (const s of steps) { const r = s.el.getBoundingClientRect(); s.center = r.top + scrollY + r.height / 2; }
}
function scrollPos() {
  const y = scrollY + innerHeight / 2;
  if (y <= steps[0].center) return 0;
  for (let i = 0; i < steps.length - 1; i++) {
    if (y < steps[i + 1].center) return i + (y - steps[i].center) / (steps[i + 1].center - steps[i].center);
  }
  return steps.length - 1;
}

/* ---------------- Stage switching ---------------- */
let current = null;
function setStage(name) {
  if (current === name) return;
  if (current) stages[current].group.visible = false;
  current = name;
  const s = stages[name]; s.group.visible = true;
  scene.background = s.env.background;
  scene.backgroundBlurriness = s.env.bgBlur || 0;
  scene.backgroundIntensity = 1;
  scene.environmentIntensity = s.env.envIntensity;
  scene.fog = s.env.fog;
  renderer.toneMappingExposure = s.env.exposure;
  document.body.dataset.stage = name;
}

/* ---------------- Camera ---------------- */
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
const wantPos = new THREE.Vector3(), wantTgt = new THREE.Vector3();
let fov = 36, first = true;
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
addEventListener('pointermove', (e) => mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));
const fade = $('#fade');
let vSmooth = 0;

function keyOf(i) { const s = steps[i]; return stages[s.stage].keys[s.key]; }

const clock = new THREE.Clock();
let t = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  if (!ready) return;
  const vTarget = scrollPos();
  vSmooth += (vTarget - vSmooth) * (reduce ? 1 : 1 - Math.exp(-dt * 5));
  if (Math.abs(vTarget - vSmooth) < 1e-4) vSmooth = vTarget;
  const i = Math.min(steps.length - 1, Math.floor(vSmooth)), f = vSmooth - i;
  const a = steps[i], b = steps[Math.min(steps.length - 1, i + 1)];
  const ka = keyOf(i), kb = keyOf(Math.min(steps.length - 1, i + 1));
  let fadeAmt = 0, f2;
  if (a.stage === b.stage) {
    setStage(a.stage); f2 = ease(f);
    wantPos.lerpVectors(ka.pos, kb.pos, f2); wantTgt.lerpVectors(ka.target, kb.target, f2); fov = ka.fov + (kb.fov - ka.fov) * f2;
  } else {
    // dolly a little, fade through dark at the midpoint, cut to the next stage
    const w = 0.2;
    fadeAmt = 1 - Math.min(1, Math.abs(f - 0.5) / w);
    if (f < 0.5) { setStage(a.stage); const d = ease(Math.min(1, f / 0.5)) * 0.12; wantPos.lerpVectors(ka.pos, ka.target, d); wantTgt.copy(ka.target); fov = ka.fov; }
    else { setStage(b.stage); const d = (1 - ease(Math.min(1, (f - 0.5) / 0.5))) * 0.12; wantPos.lerpVectors(kb.pos, kb.target, -d); wantTgt.copy(kb.target); fov = kb.fov; }
  }
  fade.style.opacity = (fadeAmt * fadeAmt * (3 - 2 * fadeAmt)).toFixed(3);
  // portrait screens: pull back so the subject fits above the text panel
  if (camera.aspect < 0.9) { const k2 = 1 + (0.9 - camera.aspect) * 0.9; wantPos.sub(wantTgt).multiplyScalar(k2).add(wantTgt); }
  // camera follows smoothly; snaps on stage cuts so we never fly through walls
  const cut = camera.userData.stage !== current; camera.userData.stage = current;
  const k = first || cut || reduce ? 1 : 1 - Math.exp(-dt * 7);
  camPos.lerp(wantPos, k); camTgt.lerp(wantTgt, k); first = false;
  // gentle handheld parallax from the pointer
  mouseS.lerp(mouse, 1 - Math.exp(-dt * 3));
  const offset = reduce || small ? 0 : 1;
  const dist = camPos.distanceTo(camTgt);
  const side = new THREE.Vector3().subVectors(camPos, camTgt).cross(camera.up).normalize();
  camera.position.copy(camPos).addScaledVector(side, mouseS.x * dist * 0.03 * offset).addScaledVector(camera.up, -mouseS.y * dist * 0.02 * offset);
  camera.lookAt(camTgt);
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // shift the picture right so the text panel on the left never covers the subject
  const shift = innerWidth > 820 ? 0.15 : 0, shiftY = innerWidth > 820 ? 0 : 0.11;
  if (camera.userData.shift !== shift || camera.userData.w !== innerWidth || camera.userData.h !== innerHeight) { camera.userData.shift = shift; camera.userData.w = innerWidth; camera.userData.h = innerHeight; camera.setViewOffset(innerWidth, innerHeight, -shift * innerWidth, shiftY * innerHeight, innerWidth, innerHeight); }

  const activeStep = Math.round(vSmooth);
  const activePin = steps[activeStep] && steps[activeStep].stage === 'map' ? steps[activeStep].pin : null;
  stages[current].update(t, vSmooth, activeStep, activePin, dt);
  updateUI(activeStep, activePin);
  composer.render(dt);
}
renderer.setAnimationLoop(frame);

/* ---------------- UI sync ---------------- */
const navLinks = [...document.querySelectorAll('[data-chapter]')];
let lastStep = -1;
const tmpV = new THREE.Vector3();
function updateUI(step, pinId) {
  if (step !== lastStep) {
    lastStep = step;
    stepEls.forEach((el, i) => el.classList.toggle('active', i === step));
    const chapter = stepEls[step]?.closest('[data-chapter-id]')?.dataset.chapterId;
    navLinks.forEach((a) => a.classList.toggle('on', a.dataset.chapter === chapter));
    const rail = $('#railFill'); if (rail) rail.style.transform = `scaleY(${step / (steps.length - 1)})`;
  }
  if (pinId && stages.map) {
    const p = stages.map.pins[pinId];
    tmpV.copy(p.world).project(camera);
    labelEl.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px, ${(-tmpV.y * 0.5 + 0.5) * innerHeight}px)`;
    if (labelEl.dataset.pin !== pinId) { labelEl.dataset.pin = pinId; labelEl.textContent = stepEls[step].dataset.label || ''; }
    labelEl.classList.add('show');
  } else labelEl.classList.remove('show');
}

/* nav: smooth scroll to chapters */
navLinks.forEach((a) => a.addEventListener('click', (e) => {
  const target = document.getElementById(a.dataset.chapter); if (!target) return;
  e.preventDefault(); target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}));
// photos open in a lightbox
const box = $('#lightbox'), boxImg = $('#lightbox img'), boxCap = $('#lightbox figcaption');
document.addEventListener('click', (e) => {
  const f = e.target.closest('figure.photo'); if (!f) return;
  const img = f.querySelector('img'); boxImg.src = img.src; boxImg.alt = img.alt; boxCap.innerHTML = f.querySelector('figcaption')?.innerHTML || '';
  box.showModal();
});
box.addEventListener('click', () => box.close());
window.__dbg = { steps, get v() { return vSmooth; }, stages, camera };
