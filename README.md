# Next Level

![The finale: a synthwave saber lane with neon towers, palms and a pacing sports car](docs/era5-saber.jpg)

**Next Level** is a three-minute music video you can play, made by Ian Ginn for the Deputy's Maximalists (Government of Alberta). Five generations of games stand for how he leveled up with AI, the same way gaming did, just a lot faster: from first prompts in a retro arcade to full development in a synthwave VR finale. The song, the stages and the end card all tell that story.

- Play it: https://trmytelabs.github.io/nextlevel/ (and on the project's own server, https://nextlevel.patchnotes.ca, once its first deploy lands)
- It plays itself. Press any key or touch a pad to take over; the autopilot picks back up after two idle seconds. Leave the title screen alone and a muted demo runs.

## The five stages

| Stage | Chapter | How you play the lyrics |
|---|---|---|
| ARCADE | FIRST PROMPTS | A retro-3D vector crawl. Each lyric line flies in as voxel words; shoot pixels off them. |
| 16-BIT | LEARNING TO ASK | A platformer you steer yourself. "?" blocks release each line when hit from below; bricks break, coins wait in arcs over pits, caterpillars patrol. |
| 3D CONSOLE | DIRECTING AGENTS | A racer on a Blender-built speedway. One overhead gate per line; drive under it in the lit lane. |
| MOBILE | WORKING FROM ANYWHERE | A one-thumb flyer on a phone. Words hang on signs in the pipe gaps while notifications arrive. |
| VR | FULL DEVELOPMENT | A synthwave saber lane. Word blocks fly in on the beat; one saber follows your mouse or finger, and an AI co-pilot builds the arena from what you cut. |

| | |
|---|---|
| ![Arcade: voxel lyric words in the vector crawl](docs/era1-arcade.jpg) | ![16-bit: the platformer with a "?" block ahead](docs/era2-platformer.jpg) |
| **Arcade · first prompts.** The words are the targets. | **16-bit · learning to ask.** Lines hide in "?" blocks. |
| ![3D console: the speedway with a lyric gate](docs/era3-racer.jpg) | ![Mobile: the phone game with a notification](docs/era4-phone.jpg) |
| **3D console · directing agents.** One gate per line. | **Mobile · working from anywhere.** Words in the pipe gaps. |
| ![VR: the saber lane](docs/era5-saber.jpg) | ![End card](docs/end-card.jpg) |
| **VR · full development.** Cut words become the arena. | **End card.** Source code and patch notes, one click away. |

There are five secrets, one per stage, for players who go exploring. Find all five for a different ending. The autopilot never finds them.

The "AI" in the finale is scripted, not live: every playthrough is deterministic and every build lands on the beat.

## The song

The soundtrack is **Press Start**, written to the story and produced with Suno. The game does not assume a tempo or length: it follows whichever song is loaded.

- `public/songs/<id>/` holds the audio and a `map.json`: tempo, duration, and the second each of the 40 lyric lines starts. `?song=<id>` picks a song (`?song=none` runs the original 128 BPM layout with a generated score).
- Every stage start, lyric event and set piece is anchored to those line times, so stages stretch or shrink with the song and the end card holds through its outro.
- `tools/song/analyze.py <id>` measures duration, tempo and the first beat from the audio (ffmpeg plus a pure-Python onset autocorrelation).
- `tools/song/align.py <id>` times the lyrics with [faster-whisper](https://github.com/SYSTRAN/faster-whisper): word timestamps from speech-to-text, aligned to the lyric sheet with a Needleman-Wunsch alignment. Press Start matched 339 of 352 words.
- No Whisper? Play the song with `?song=<id>`, press T at the start of each lyric line, then Y to save `map.json`.

Lyrics and the Suno brief live in `LYRICS.md`.

## Controls

| Input | Action |
|---|---|
| A / D or Left / Right | Move, steer |
| W or Up | Jump |
| S or Down | Down (you will know when) |
| Space | Fire, jump |
| Mouse (finale) | Moves the saber |
| Q | Autopilot: when idle / on / off |
| M | Sound on / off |
| L | Lyric captions on / off |
| G | Graphics tier high / low (reloads at the same moment; phones default to low) |
| P or Escape | Pause |
| 1 to 5 | Jump to a stage |

**Phones:** in landscape a thumb stick sits left of the game and the action button right of it (labelled per stage); upright, both sit under the game like a handheld. In the finale either pad is a trackpad for the saber.

## Run it

```bash
npm install
npx vite
```

Open http://localhost:5173/nextlevel/ (add `?q=high` or `?q=low` to force a graphics tier). `npm run build` type-checks and writes the static site to `dist/`.

## Verify

```bash
node tools/test/run.mjs --url http://localhost:5173/nextlevel/
```

The harness drives the deterministic simulation through `window.ETM` in headless Edge with software WebGL: page errors, NaN state, stage boundaries, the run reaching the end, and the case files in `tools/test/cases/` (gameplay, autopilot coverage, lyric timing, controls, the end card, the secrets). 65 checks on desktop; `--mobile --controls` adds an iPhone landscape and portrait pass, 97 checks. The harness runs the original 128 BPM layout, so its expectations do not move when the song changes.

| Flag | Effect |
|---|---|
| `--era N` | One stage only (1 to 5) |
| `--from A --to B` | A bar range (`--chunk S` sets the step in seconds) |
| `--controls` | Keyboard, touch pads and settings keys |
| `--mobile` | iPhone landscape and portrait layout checks |
| `--q low` | Low graphics tier |

Screenshot regression: `node tools/test/visual/snap.mjs` compares frames against `tools/test/visual/baseline/` (`--update` accepts them). `node tools/test/docshots.mjs` regenerates the screenshots in this README. In a browser console, `ETM.seek(seconds); ETM.step(seconds); ETM.render(); ETM.probe()` drives the same simulation by hand.

## CI/CD and hosting

- **Tests:** `.github/workflows/test.yml` runs the harness on every push, on a self-hosted runner. Pull requests from forks are skipped, so outside code never runs on it.
- **GitHub Pages:** every push to `main` runs `pages.yml`, which builds and publishes https://trmytelabs.github.io/nextlevel/.
- **Own server:** after the tests pass on `main`, `deploy.yml` builds with `--base /` and rsyncs `dist/` to the VPS as a restricted `deploy` user whose key can only sync files into the site folder (rrsync, no shell). It is switched on by the `DEPLOY_ENABLED` repository variable; `deploy/set-github-secrets.cmd <server-ip>` stores the key and host as secrets.
- **The server** (`deploy/server-setup.sh`): Caddy with automatic Let's Encrypt HTTPS and security headers (HSTS, a strict Content-Security-Policy, caching rules in `deploy/Caddyfile`), ufw locked to SSH and web, fail2ban, unattended security upgrades and key-only SSH. DNS for patchnotes.ca is on Cloudflare; deploys use the server's IP because SSH does not go through Cloudflare's proxy.
- **WordPress on the same box:** `deploy/wp/` (Docker Compose, backup and restore scripts, `REBUILD.md`).

## Architecture

`index.html` holds the markup, CSS and HUD and loads `src/boot.ts`, which applies the song map before the stages load. Every stage exposes the same `init / update / draw / onBeat / on8th / onLine` surface, and `seek(t)` rebuilds every stage's state from scratch at any moment.

| File | Role |
|---|---|
| `src/boot.ts` | Loads `public/songs/<id>/map.json` and applies it, then loads the game |
| `src/core.ts` | Constants, `ERAS`, `LYRICS`, the song-map timeline (`applySongMap`, `cb`), seeded RNG, input (keys, touch pads), quality tier |
| `src/main.ts` | Transport, demo mode, compositing, transitions, HUD, captions, patch notes panel, the `window.ETM` test hook |
| `src/song.ts` | The song as master clock, offset nudge, tap-to-time |
| `src/startgl.ts` | The voxel synthwave title screen |
| `src/era1.ts`, `src/era1gl.ts` | Arcade crawl and its Three.js voxel renderer |
| `src/era2.ts` | Platformer (fixed-tick physics, planning autopilot, secret room) |
| `src/era3.ts`, `src/era3gl.ts` | Racer simulation and its Three.js speedway |
| `src/era4.ts` | Phone flyer |
| `src/era5.ts`, `src/era5gl.ts`, `src/synthkit.ts` | Saber lane, its renderer and end card, procedural towers / palms / car / fireworks |
| `src/eggs.ts` | The five secrets |
| `src/patchnotes.ts` | The in-game patch notes |
| `src/crt.ts` | CRT pass for the retro stages |
| `src/music.ts` | Generated score, used only with `?song=none` |

The simulation is deterministic: seeded hashes, never `Math.random`, in sim code. `tools/blender/*.py` build the cars, speedway scenery and finale kit headlessly into `public/models/`.

## Credits

- Song: Press Start, made with [Suno](https://suno.com)
- Textures: CC0 from [Poly Haven](https://polyhaven.com) (see `public/textures/LICENSE.txt`)
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38
- Rendering: [Three.js](https://threejs.org); models: [Blender](https://www.blender.org); lyric timing: [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- Built by Ian Ginn with [Claude Code](https://claude.com/claude-code)
