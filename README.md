# Everything, Then More

A three-minute music video that is also a game. Five eras of play, one continuous take, locked to a 128 BPM clock. It starts as Space Invaders and ends as a swarm of AI agents building a neon future city ahead of you while you play it. The lyrics are part of the gameplay in every era.

Prototype for the Maximalist team application. Canvas 2D for the first four eras, Three.js (WebGL) for the finale, Web Audio for sound. Built with Vite and TypeScript.

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
| A / D or Left / Right | Move, speed up, steer |
| W or Up | Jump |
| Space | Fire, place block |
| P or Escape | Pause |
| M | Sound (synthesized click track and SFX) |
| Q | Autopilot mode: when idle / on / off |
| L | Lyric captions on / off |
| 1 to 5 | Jump to an era |
| [ / ] | Nudge the song offset by 50 ms (when a track is loaded) |
| T / U / Y | Tap a lyric line start, clear taps, download `timing.json` |

Autopilot plays the whole piece by itself. Press any movement key to take over, and it returns after two idle seconds.

## The five eras

| Bars | Era | Play | Lyrics become |
|---|---|---|---|
| 0 to 19 | 1978 arcade | Space Invaders on a phosphor screen | Words descend like a crawl, you shoot them |
| 19 to 37 | 1991 16-bit | Autorun platformer | Word pickups along the platforms |
| 37 to 56 | 1997 32-bit | Low-poly 3D racer, software rendered | Words sit in the open gate lane |
| 56 to 75 | 2013 mobile | One-thumb flapping game on a phone, ghosts take over in the bridge | Words on signs in the pipe gaps |
| 75 to 96 | Now | Agents build a future city left to right while you run it | Neon signs to light, then words on the finale boss |

Era five is scripted and deterministic. Nothing is generated live, so every playthrough is identical and every build action lands on the beat.

## Where things live

`index.html` holds the markup, CSS and HUD, and loads `src/main.ts`. The modules under `src/`, in load order:

- `core.ts`: constants, `ERAS`, `LYRICS`, seeded RNG, the main canvas and low-res offscreen layers, keyboard input, and the synthesized audio. All timing is in bars. Hotkeys are routed through a small `HK` table that `main.ts` fills in.
- `era1.ts`, `era2.ts`, `era3.ts`: the arcade, platformer, and racer modules. The racer includes a small flat-shaded polygon renderer and the car, tree, and gate models.
- `era4.ts`: the mobile era, a phone on a desk running a flapping game, with the ghost players that become the agents.
- `world.ts`: shared agent roles, code snippets and colour helpers used by era 5 (the old isometric sandbox lives here too, unused).
- `era5gl.ts`: the WebGL renderer for era 5 (Three.js): lit geometry, fog, bloom, 3D agent drones, player and boss. It reads the era 5 simulation state each frame; if WebGL is unavailable the 2D renderer in `era5.ts` is used instead.
- `era5.ts`: the agents era simulation and 2D fallback renderer. `RULES` is the rule schedule, `genChunk` decides what each sector contains, `wire`, `fill`, and `lit` set how far ahead the agents build, and `agentModel` is the 3D drone.
- `main.ts`: transport, compositing, transitions, bloom, and HUD.

Each era exposes the same `init / update / draw / onBeat / on8th / onLine` surface, and `seek(t)` rebuilds every era's state from scratch at any time, which is what the scrubber uses.

TypeScript is deliberately loose (`strict` off) so the port from the single-file prototype stayed mechanical.

## Status

Pre-music until the Suno track lands. Drop it at `public/song.mp3` and the game runs off the audio clock; `LYRICS.md` explains the offset nudge and the tap-to-sync tool that writes `public/timing.json`. Without a track, a synthesized click stands in.
