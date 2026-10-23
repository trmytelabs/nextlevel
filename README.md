# Everything, Then More

A three-minute music video that is also a game. Five eras of play, one continuous take, locked to a 128 BPM clock. It starts as Space Invaders and ends as a swarm of AI agents building a neon future city ahead of you while you play it. The lyrics are part of the gameplay in every era.

Prototype for the Maximalist team application. Canvas 2D and Web Audio, no runtime dependencies beyond one Google font. Built with Vite and TypeScript.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:5173/maximalist/). `npm run build` type-checks and writes a static site to `dist/`; `npm run preview` serves that build.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`, which builds the site and publishes `dist/` to GitHub Pages. Once Pages is enabled for the repo (Settings → Pages → Source: GitHub Actions) the site lives at:

https://trmytelabs.github.io/maximalist/

GitHub Pages is only available on private repos with a paid plan; on the free plan the repo has to be public for the deploy to work. `vite.config.ts` sets `base` to `/maximalist/` so asset paths resolve under that prefix.

## Controls

| Key | Action |
|---|---|
| Left / Right | Move, speed up, steer |
| Up | Jump |
| Space | Fire, place block |
| P | Pause |
| M | Sound (synthesized click track and SFX) |
| A | Autopilot mode: when idle / on / off |
| L | Lyric captions on / off |
| 1 to 5 | Jump to an era |

Autopilot plays the whole piece by itself. Press any key to take over, and it returns after two idle seconds.

## The five eras

| Bars | Era | Play | Lyrics become |
|---|---|---|---|
| 0 to 19 | 1978 arcade | Space Invaders on a phosphor screen | Words descend like a crawl, you shoot them |
| 19 to 37 | 1991 16-bit | Autorun platformer | Word pickups along the platforms |
| 37 to 56 | 1997 32-bit | Low-poly 3D racer, software rendered | Words sit in the open gate lane |
| 56 to 75 | 2016 sandbox | Isometric voxel builder | Words stamped on blocks as they're placed |
| 75 to 96 | Now | Agents build a future city left to right while you run it | Neon signs to light, then words on the finale boss |

Era five is scripted and deterministic. Nothing is generated live, so every playthrough is identical and every build action lands on the beat.

## Where things live

`index.html` holds the markup, CSS and HUD, and loads `src/main.ts`. The modules under `src/`, in load order:

- `core.ts`: constants, `ERAS`, `LYRICS`, seeded RNG, the main canvas and low-res offscreen layers, keyboard input, and the synthesized audio. All timing is in bars. Hotkeys are routed through a small `HK` table that `main.ts` fills in.
- `era1.ts`, `era2.ts`, `era3.ts`: the arcade, platformer, and racer modules. The racer includes a small flat-shaded polygon renderer and the car, tree, and gate models.
- `world.ts`: `WD` and `WORLD`, the isometric sandbox, plus its renderer and the shared colour helpers.
- `era5.ts`: the agents era. `RULES` is the rule schedule, `genChunk` decides what each sector contains, `wire`, `fill`, and `lit` set how far ahead the agents build, and `agentModel` is the 3D drone.
- `main.ts`: transport, compositing, transitions, bloom, and HUD.

Each era exposes the same `init / update / draw / onBeat / on8th / onLine` surface, and `seek(t)` rebuilds every era's state from scratch at any time, which is what the scrubber uses.

TypeScript is deliberately loose (`strict` off) so the port from the single-file prototype stayed mechanical.

## Status

Prototype, pre-music. The synthesized click track stands in for the song. When the track exists, swap it for an audio element and read its current time as the master clock in the frame loop.
