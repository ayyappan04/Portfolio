import { THREE, camera, zones, labels, ISLAND_R, colliders, reduce, mobile } from './core.js';
import { player, travelTo, walkTo } from './player.js';
import { districts, badminton, soccer, events } from './world.js';

const $ = (s, r = document) => r.querySelector(s);

/* Wire interactive bits inside a card ------------------------------- */
function wireTabs(root) {
  root.querySelectorAll('.ptabs').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const panels = [...list.parentElement.querySelectorAll(':scope > .ppanels > [role="tabpanel"]')];
    const sel = (i, focus) => tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; if (focus && i === j) t.focus(); });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => sel(i));
      t.addEventListener('keydown', (e) => {
        const n = tabs.length, map = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
        if (e.key in map) { e.preventDefault(); sel(map[e.key], true); }
      });
    });
  });
  root.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.action;
    if (a === 'drop') { badminton.playDrop(); toast('Watch the court'); }
    if (a === 'fk' || a === 'rabona') { soccer.play(a); }
    if (a.startsWith('go:')) go(a.slice(3));
    if (a.startsWith('zone:')) goZone(a.slice(5));
  }));
}

/* Card drawer -------------------------------------------------------- */
const card = $('#card'), cardBody = $('#cardBody'), cardKicker = $('#cardKicker'), cardTitle = $('#cardTitle');
let openId = null, pinned = false;
export function openCard(id, pin = false) {
  const z = zones.find((q) => q.id === id); const tpl = document.getElementById('z-' + id);
  if (!z || !tpl) return;
  if (openId !== id) {
    cardKicker.textContent = z.kicker; cardTitle.textContent = z.title;
    cardBody.replaceChildren(tpl.content.cloneNode(true)); wireTabs(cardBody);
    cardBody.scrollTop = 0;
  }
  openId = id; pinned = pin || pinned;
  card.classList.add('open'); card.setAttribute('aria-hidden', 'false'); document.body.classList.add('card-open');
  document.querySelectorAll('.chips button').forEach((b) => b.classList.toggle('on', b.dataset.go === z.district));
}
export function closeCard() { openId = null; pinned = false; card.classList.remove('open'); card.setAttribute('aria-hidden', 'true'); document.body.classList.remove('card-open'); }
$('#cardClose').addEventListener('click', () => { const z = currentZone(); closeCard(); dismissed = z ? z.id : null; });
let dismissed = null;

function currentZone() {
  let best = null;
  for (const z of zones) {
    const d = Math.hypot(player.position.x - z.x, player.position.z - z.z);
    if (d < z.r && (!best || z.r < best.r)) best = z;
  }
  return best;
}

/* Quick travel ------------------------------------------------------- */
function go(key) {
  const d = districts[key]; if (!d) return;
  travelTo(d.x, d.z, d.face); dismissed = null; pinned = false;
  if (mobile) closeCard();
}
function goZone(id) {
  const z = zones.find((q) => q.id === id); if (!z) return;
  travelTo(z.x, z.z, Math.atan2(-(z.x - player.position.x), -(z.z - player.position.z)) || 0);
  dismissed = null; pinned = false;
}
document.querySelectorAll('.chips button').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
document.getElementById('labels').addEventListener('click', (e) => { const b = e.target.closest('[data-zone]'); if (b) goZone(b.dataset.zone); });

/* Toasts ------------------------------------------------------------- */
const toastEl = $('#toast'); let toastT = 0;
export function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1800); }
events.addEventListener('toast', (e) => toast(e.detail));

/* Minimap ------------------------------------------------------------ */
const mm = $('#minimap'), mg = mm.getContext('2d');
const MM = mm.width, S = MM / (ISLAND_R * 2 + 8);
const toMap = (x, z) => [MM / 2 + x * S, MM / 2 + z * S];
const distColor = { hobbies: '#2fa7a4', projects: '#d9473f', career: '#f0b23c', learning: '#6b4f9e', welcome: '#22303a' };
let mmBase = null;
function drawBase() {
  const c = document.createElement('canvas'); c.width = c.height = MM; const g = c.getContext('2d');
  g.fillStyle = '#4fa3b5'; g.beginPath(); g.arc(MM / 2, MM / 2, MM / 2, 0, 7); g.fill();
  g.fillStyle = '#9cc46f'; g.beginPath(); g.arc(MM / 2, MM / 2, ISLAND_R * S, 0, 7); g.fill();
  g.fillStyle = '#50565c'; g.fillRect(...toMap(-84, 32), 168 * S, 8 * S);
  g.fillStyle = 'rgba(34,48,58,.55)';
  for (const c2 of colliders) if (c2.x0 !== undefined && (c2.x1 - c2.x0) * (c2.z1 - c2.z0) > 20) g.fillRect(...toMap(c2.x0, c2.z0), (c2.x1 - c2.x0) * S, (c2.z1 - c2.z0) * S);
  mmBase = c;
}
function drawMinimap() {
  if (!mmBase) drawBase();
  mg.clearRect(0, 0, MM, MM); mg.drawImage(mmBase, 0, 0);
  for (const z of zones) {
    if (z.id === 'rackets' || z.id === 'welcome') continue;
    const [x, y] = toMap(z.x, z.z);
    mg.fillStyle = distColor[z.district] || '#fff'; mg.beginPath(); mg.arc(x, y, z.id === openId ? 5 : 3.2, 0, 7); mg.fill();
  }
  const [px, py] = toMap(player.position.x, player.position.z);
  mg.save(); mg.translate(px, py); mg.rotate(-player.rotation.y + Math.PI);
  mg.fillStyle = '#ffffff'; mg.strokeStyle = '#22303a'; mg.lineWidth = 2;
  mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2.5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
}
mm.addEventListener('click', (e) => {
  const r = mm.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width * MM - MM / 2) / S, z = ((e.clientY - r.top) / r.height * MM - MM / 2) / S;
  if (Math.hypot(x, z) < ISLAND_R - 3) travelTo(x, z, null);
});

/* Labels ------------------------------------------------------------- */
const tmp = new THREE.Vector3();
function updateLabels() {
  for (const l of labels) {
    const d = Math.hypot(l.pos.x - player.position.x, l.pos.z - player.position.z);
    tmp.copy(l.pos).project(camera);
    const vis = d < l.near && tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
    l.el.classList.toggle('show', vis);
    if (vis) {
      l.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
      l.el.style.opacity = Math.min(1, (l.near - d) / 10);
    }
  }
}

/* Read-as-page fallback --------------------------------------------- */
const reader = $('#reader');
$('#readBtn').addEventListener('click', () => {
  const body = $('#readerBody');
  if (!body.childElementCount) {
    const groups = [['Hobbies', ['badminton', 'rackets', 'soccer', 'campus']], ['Projects', ['shuttlesense', 'teg', 'kronos']], ['Career', ['purolator', 'waize', 'promptogo', 'hgc', 'uw', 'pwc', 'mto', 'gip']], ['Learning', ['learning']]];
    for (const [h, ids] of groups) {
      const sec = document.createElement('section'); sec.innerHTML = `<h2>${h}</h2>`;
      for (const id of ids) {
        const z = zones.find((q) => q.id === id); const tpl = document.getElementById('z-' + id); if (!z || !tpl) continue;
        const art = document.createElement('article'); art.innerHTML = `<p class="kicker">${z.kicker}</p><h3>${z.title}</h3>`;
        art.append(tpl.content.cloneNode(true)); art.querySelectorAll('[data-action]').forEach((b) => b.remove());
        sec.append(art);
      }
      body.append(sec);
    }
    wireTabs(body);
  }
  reader.hidden = false; $('#readerClose').focus();
});
$('#readerClose').addEventListener('click', () => { reader.hidden = true; $('#readBtn').focus(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!reader.hidden) reader.hidden = true; else closeCard(); } });

/* Intro -------------------------------------------------------------- */
const intro = $('#intro');
$('#enterBtn').addEventListener('click', () => { intro.classList.add('gone'); setTimeout(() => intro.remove(), 700); document.getElementById('world').focus(); openCard('welcome'); });

/* Per-frame ----------------------------------------------------------- */
let lastZone = null;
export function updateHud() {
  const z = currentZone();
  if ((z && z.id) !== (lastZone && lastZone.id)) {
    lastZone = z;
    if (z && z.id !== dismissed) openCard(z.id);
    else if (!z && !pinned) closeCard();
    if (!z) dismissed = null;
  }
  updateLabels();
  drawMinimap();
  const near = zones.find((q) => q.id === (z && z.id));
  $('#where').textContent = near ? near.title : 'Exploring';
}
