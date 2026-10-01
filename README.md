# Ayyappan Arunachalam — portfolio

A walkable 3D portfolio built with three.js. You arrive on a small island and walk your character into each area to read about it.

| Area | What's there |
|---|---|
| Plaza | Welcome card, fountain, signposts to every district |
| Badminton hall | Live rally ending in my backhand cross-court drop, and my two Yonex rackets (Astrox 88 D Pro, Astrox 99 Pro 3rd gen) on lit display podiums |
| Soccer pitch | A ball you can dribble and shoot, plus a replay of a curling free kick and a rabona into the top corner |
| Projects expo | ShuttleSense (live pose-tracking screen), TEG Loop Simulator (coolant loop, TEG array, battery), Kronos (3D candlestick forecast) |
| Career street | One building per role at its real address: GIP (10 Airport Rd, Caledon), MTO (87 Sir William Hearst Ave), PwC (18 York St), UWaterloo E6, HGC (2000 Argentia Rd, Plaza 1), Purolator (2600 Meadowvale Blvd), plus wAize and PrompToGo |
| Learning lab | Stirred reactor, bookshelf and the CHE 480 Haber loop whiteboard |

**Controls:** WASD or arrow keys to walk, Shift to run, drag to look, scroll to zoom, click the ground to walk there. On a phone, use the joystick or tap. The area buttons, labels and minimap all fast-travel. "Read as a page" shows every section as plain text.

The TEG Loop Simulator is served at `/teg/`.

## Run locally

It's a static site with no build step:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Code

- `js/core.js` renderer, sky, island, lighting, shared helpers
- `js/models.js` rackets, shuttles, soccer ball, people, trees, trucks
- `js/world.js` every district and its animations
- `js/player.js` movement, collisions, follow camera
- `js/hud.js` cards, labels, minimap, quick travel, reader mode

## Deploy

Import this repo into Vercel with framework preset **Other**, no build command, and output directory `.` (the root). Every push to `main` redeploys.
