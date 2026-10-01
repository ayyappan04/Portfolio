const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Tabs ------------------------------------------------------------- */
function wireTabs(list, panels) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (i, focus) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const map = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
      if (e.key in map) { e.preventDefault(); select(map[e.key], true); }
    });
  });
}
document.querySelectorAll('.tabs').forEach((list) => {
  const panels = [...list.querySelectorAll('[role="tab"]')].map((t) => document.getElementById(t.getAttribute('aria-controls')));
  wireTabs(list, panels);
});
document.querySelectorAll('.project').forEach((proj, pi) => {
  const list = proj.querySelector('.ptabs');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = [...proj.querySelectorAll('.ppanels > [role="tabpanel"]')];
  tabs.forEach((t, i) => {
    t.id = `pt${pi}-${i}`; panels[i].id = `pp${pi}-${i}`;
    t.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('aria-labelledby', t.id);
  });
  wireTabs(list, panels);
});

/* Career: filter + expand ------------------------------------------ */
const roles = [...document.querySelectorAll('.role')];
document.querySelectorAll('.filters button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.filter;
    roles.forEach((r) => { r.hidden = f !== 'all' && !r.dataset.cat.split(' ').includes(f); });
  });
});
roles.forEach((r) => {
  const head = r.querySelector('.rhead'), body = r.querySelector('.rbody');
  head.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const open = head.getAttribute('aria-expanded') !== 'true';
    head.setAttribute('aria-expanded', open);
    body.hidden = !open;
  });
});
if (roles[0]) roles[0].querySelector('.rhead').click();

/* Nav state --------------------------------------------------------- */
const links = [...document.querySelectorAll('.top nav a')];
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach((s) => io.observe(s));

/* Tilt: project cards lean toward the pointer ----------------------- */
if (!reduce && matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1100px) rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
      el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
      el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* Count-up for hero stats ------------------------------------------- */
document.querySelectorAll('[data-count]').forEach((el) => {
  const end = +el.dataset.count;
  if (reduce) { el.textContent = end; return; }
  let start = null;
  const step = (ts) => {
    start ??= ts;
    const p = Math.min(1, (ts - start) / 1400);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  setTimeout(() => requestAnimationFrame(step), 900);
});

// If WebGL never reports in, don't leave the loader up.
setTimeout(() => { const l = document.getElementById('loader'); if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 700); } }, 6000);
