# Ayyappan Arunachalam — portfolio

An interactive 3D portfolio built with three.js. The site is laid out as a chemical process plant: scroll to walk from unit to unit.

| Unit | Section |
|---|---|
| H-101 feed tank | Hobbies — badminton (3D rackets and the backhand cross-court drop), soccer (curling free kick and rabona), campus involvement |
| P-201 distillation column | Projects — ShuttleSense, TEG Loop Simulator, Kronos dashboard |
| C-301 warehouse | Career — Purolator, wAize, PrompToGo, HGC, UWaterloo research, PwC, MTO, GIP |
| L-401 stirred reactor | What I'm learning now |

The TEG Loop Simulator is served at `/teg/`.

## Run locally

It's a static site with no build step:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Import this repo into Vercel with framework preset **Other**, no build command, and output directory `.` (the root). Every push to `main` redeploys.
