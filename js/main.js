import { renderer, scene, camera, tickers } from './core.js';
import './world.js';
import { player, updatePlayer, rig } from './player.js';
import { updateHud } from './hud.js';

const clock = { last: performance.now(), t: 0 };
let first = true;
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - clock.last) / 1000); clock.last = now; clock.t += dt;
  updatePlayer(dt, clock.t);
  for (const f of tickers) f(dt, clock.t, player);
  updateHud();
  renderer.render(scene, camera);
  if (first) { first = false; document.body.classList.add('ready'); }
});

// handy for debugging from the console
window.__world = { player, rig };
