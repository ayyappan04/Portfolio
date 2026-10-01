# Ayyappan Arunachalam — portfolio

A scroll-driven 3D portfolio built with three.js. As you scroll, the camera moves through six realistic scenes, with smooth damped camera moves inside a scene and a quick fade between scenes.

| Scene | What's there |
|---|---|
| Product studio | My two rackets (Yonex Astrox 88 D Pro and Astrox 99 Pro, 3rd gen), feather shuttles and a tube, lit like a product shoot |
| Badminton hall | Hardwood floor, a regulation court, and my backhand cross-court drop drawn as you scroll |
| Soccer pitch at sunrise | Real sky lighting, a regulation goal and a free-kick wall; the curling free kick plays as you scroll |
| Projects gallery | Real screenshots of ShuttleSense, the TEG Loop Simulator and Kronos on screens over a reflective floor |
| Career map table | A map of Waterloo to Toronto drawn from Natural Earth data, with a pin at every co-op office |
| Learning lab | Glass reactor, bench and the CHE 480 Haber loop whiteboard |

Real photos (Wikimedia Commons, credited on the page) appear in each section.

## Run locally

Static site, no build step:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. The TEG Loop Simulator is at `/teg/`.

## Code

- `js/app.js` renderer, post-processing, loading, scroll-to-camera mapping, transitions
- `js/stages.js` the six scenes and their camera keyframes
- `js/props.js` rackets, shuttlecocks, football, mannequins
- `assets/tex` wood, grass, sky HDR (three.js example assets) and the map texture
- `assets/img` photos and project screenshots

## Deploy

Import into Vercel with framework preset **Other**, no build command, output directory `.`.
