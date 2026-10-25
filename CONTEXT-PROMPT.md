# Context prompt — "Next Level" (chorus: "Everything, Then More")

Paste everything below this line into a new session (Claude, ChatGPT, a coding agent) to continue the project with full context.

---

You are helping Ian Ginn finish **"Next Level"** (working title was "Everything, Then More", now the chorus hook), a three-minute **playable music video** he is submitting to join the **Deputy's Maximalists**, a new program announced by the Deputy Minister of Technology and Innovation (Government of Alberta, "GoA"). The post asked people to make a music video explaining why they want to join. Ian's angle: show, through five eras of video games that he actually plays as the song runs, how far technology came, how far the tools at work came, and how far he personally came learning to use AI in his work: from doing everything by hand, to asking an AI questions, to bringing it to his desk, to AI in his pocket, to the work building the work. The ask at the end is the chorus line: *"Deputy, I'm ready, make me a Maximalist."* He is **not** claiming to already be on the team.

## The thing itself

- A web app (Vite + TypeScript, Canvas 2D + Three.js) that runs a **96-bar, 128 BPM, 3:00** piece. One bar = 1.875 s. Everything (era switches, lyric lines, enemies, pickups, builds) is timed in bars so it locks to the song.
- **Five eras, one continuous take**, each a different type of gameplay and a different era of graphics, getting progressively higher-fidelity:

| Bars | Era | Looks like | Gameplay | How the lyrics are played |
|---|---|---|---|---|
| 0–19 | 1978 · ARCADE | Space Invaders phosphor screen on a CRT, Star Wars opening crawl | A cannon at the bottom; the lyric lines come down the screen in a 3D perspective crawl as big bitmap words. You shoot to **chip pixels off** the words (a word is never deleted in one hit). The cannon dies only when a word's remaining pixels actually overlap the cannon sprite (pixel-exact), then respawns in 0.7 s. At bar 17 everything shatters. | The words are the enemies |
| 19–37 | 1991 · 16-BIT | Super Mario World style platformer on a CRT: grass, bricks, pipes, clouds, hills | Player-controlled run and jump (SMW-style acceleration, skid, variable jump) over pits, steps and pipes; stomp walkers, dodge flyers; brick rows float four tiles up: plain bricks shatter when hit from below, ? blocks pop a phrase of the lyric; a clean death is a hop + fall then a drop-in from above. | Phrases in ? blocks, hit from below |
| 37–56 | 1995 · SATURN 3D | Daytona USA (Three Seven Speedway): tri-oval, banked turns, stadium stands, pits, forest, rock overhang with slot reels, ROLLING START board, 12 stock cars with liveries (Blender-built GLB models) | Arcade racer; overtake traffic; HUD with POS / SCORE / KM/H / LAP. | **Each lyric line is one overhead gantry** every two bars with the racing line lit on one lane; drive under it in that lane to take the line (HUD: LINES n/m). We replaced per-word floating text because words every half second were unreadable. |
| 56–75 | 2013 · MOBILE | A phone on a dark desk: status bar, notifications ("7-day streak", "Rate FLAP!"), a thumb tapping | Flappy-Bird style one-thumb game: pipes every two beats, game-over card, auto-retry. The bridge (bars 66.5–75) adds ghost birds that become the AI; at bar 73 they fly out of the phone to the right. | The words are signs in the pipe gaps |
| 75–96 | NOW · VR + AI | A VR rhythm game (Beat Saber style) with a Thumper-style tunnel finale, full Three.js: bloom, mirror floor, neon grid, synthwave sun, three-layer skyline | **Headset-on** lens transition at bar 75. One saber that follows the mouse or finger and reaches into the lane to the hit plane (two sabers were tried and dropped: closer to Beat Saber, but the gameplay didn't work with one pointer). Word blocks fly in on the beat with the word printed bold on the face; swipe the saber through a block as it reaches the hit plane to cut it. Props are Blender-built GLBs (tools/blender/finale.py → public/models/finale/). An **AI co-pilot** (glowing orb with a build beam and status readout) turns **every cut word into a piece of arena** ahead of you: arches, pillars, word panels, beams, rings. Bar 89: tunnel run at 1.35x, chorus words echo back faster. Bar 94: you coast to a stop and the camera cranes up over the arena you built for the end card. | The blocks are the words; the arena is built from them |

- **Title card** (bars 0–2): "NEXT LEVEL / IAN GINN / FOR THE DEPUTY'S MAXIMALISTS / My AI journey, told through five generations of games. / The tools got better. So did I. / PRESS START · OR JUST WATCH". Chapter labels at each era start: 1 · FIRST PROMPTS, 2 · LEARNING TO ASK, 3 · DIRECTING AGENTS, 4 · WORKING FROM ANYWHERE, 5 · FULL DEVELOPMENT. **End card** (bar 94.9+): title, "Built with AI agents, asking to build with people.", "IAN GINN · FOR THE DEPUTY'S MAXIMALISTS", "Imagine what we could build together.", "READY WHEN YOU ARE."
- **Autopilot** plays the whole piece by itself (so it works as a video); any movement key takes over, and autopilot resumes after 2 idle seconds. Modes: when idle / on / off.
- **Sound**: a synthesized **generative score** (Web Audio) that changes with each era (square-wave arcade → FM 16-bit → rave → EDM plucks → everything stacked), plus drums and SFX, through a soft limiter. It mutes itself when a real song exists at `public/song.mp3`, and the game then runs off the audio clock with an offset nudge and tap-to-sync tool.
- **Phone support**: landscape layout with safe-area insets, a rotate card in portrait, touch zones (hold left/right edge to move, tap top half to jump, tap bottom half to fire), touch-zone hints for the first two bars, smaller control bar, PWA manifest + icons (Add to Home Screen), Open Graph preview image, and a graphics quality tier (G key / FX button; phones default to the light tier: no reflections, no shadows, half-res bloom).

## Lyrics (locked, 40 lines; numbers are the bar each line starts)

```
2    One prompt, one box, one line to hold
4    Green text on glass, half right, half wrong
6    Ask, read, retry, that's how I learned
8    It made things up, I caught it, and I took my turn
12   But I wanted it faster
14   And it kept getting new
19   Turn it all the way up, then a little bit more          (CHORUS)
21   That's the only setting I've been looking for
23   Turn it all the way up, let the whole thing run
25   I don't do a little, I do everything, then some
27.5 Then the box talked back, and I talked back too
29.5 Taught myself the questions till the answers came true
31.5 Ask on the beat, every answer's a drum
33.5 I was learning in weeks what took years to come
38   Brought it back to my desk at the speed of light
40   Fog at the edge where the backlog quits
42   Foot to the floor and the floor is a pipeline
44   Every meeting, every thread, I know what matters tonight
47   Turn it all the way up, then a little bit more          (CHORUS)
49   That's the only setting I've been looking for
51   Turn it all the way up, let the whole thing run
53   I don't do a little, I do everything, then some
57   Now the whole toolbox fits in my hand
59   One thumb, one prompt, and I'm prepared again
61   Every week I'm evolving, I don't slow down
63   Wherever I ask is a place I can go
66.5 Wait, who's drafting that?                               (BRIDGE)
68   I didn't write that there
69.5 I said what I needed out loud
71   And a hundred hands appeared
75   A hundred little hands and they all learned from mine   (FINAL VERSE)
77   Maximalist at heart, I don't wait in line
79   Brief the room, plan the sprint, code the fix on the fly
81   I point at the problem, then I question what it thinks
83   Turn it all the way up, then a little bit more          (FINAL CHORUS)
85   Every tool I ever learned is in here
87   Turn it all the way up, let the whole thing run
89   Deputy, I'm ready, make me a Maximalist
94   Imagine what we could build.                                       (OUTRO)
95   Ready when you are. Press start.
```

Story arc of the lyrics: verse 1 = first clumsy prompts into a basic tool, learning to check it; verse 2 = the first time the "box talked back" and teaching himself to ask; verse 3 = bringing it to the desk at the speed of light, the backlog melting; verse 4 = AI in his pocket, evolving every week; bridge = the moment the work started doing itself; final verse/chorus = a hundred hands, full automation, and the ask.

The **Suno brief** lives in `LYRICS.md`: genre-evolving 128 BPM pop (8-bit chiptune intro → 16-bit FM synthpop → 90s breakbeat rave → bright 2013 EDM → hyperpop synthwave finale → one lonely square-wave note), with section tags, a bar map, and sync instructions. Ian could not sign in to Suno from his phone yet; the track is still to come.

## Controls

WASD / arrows move (A/D steer; W/up jump; space fire; the mouse or finger drives the saber in the finale). Settings keys are separate: **Q** autopilot mode, **M** sound, **L** captions, **G** graphics tier (reloads at the same bar), **P / Esc** pause, **1–5** jump to an era, **[ ]** nudge song offset, **T / U / Y** tap a lyric start / clear taps / download timing.json. Touch: hold left/right edge, tap top to jump, tap bottom to fire.

## Code map (repo `trmytelabs/maximalist`, branch `scaffold-vite`, PR #1 open to `main`)

- `index.html` markup/CSS/HUD; `src/main.ts` transport, compositing, cards, HUD, `window.ETM` debug/test hook (seek/step/probe/render/input).
- `src/core.ts` constants, `ERAS`, `LYRICS`, canvases, input (keyboard + touch), audio helpers, quality tier, `MOBILE`.
- `src/music.ts` generative score. `src/song.ts` Suno track clock + tap sync.
- `src/era1.ts` arcade crawl; `src/era2.ts` 16-bit platformer; `src/era3.ts` + `src/era3gl.ts` racer sim + Three.js renderer (GLB cars with procedural fallback; lyric gantries); `src/era4.ts` phone/flappy; `src/era5.ts` + `src/era5gl.ts` VR saber lane sim + renderer; `src/crt.ts` CRT shader for eras 1–2; `src/world.ts` legacy helpers.
- `tools/blender/car.py` headless Blender (4.2 portable at `C:/Users/iangi/Tools/blender-4.2.23-windows-x64/blender.exe`) that builds the 13 textured stock cars → `public/models/car_N.glb`.
- `tools/test/run.mjs` headless harness (puppeteer-core + Edge, software WebGL): drives the deterministic sim through `window.ETM`, checks no errors / no NaN / era boundaries / reaching 3:00, runs case files in `tools/test/cases/*.mjs` (spec: `tools/test/CASES.md`), `--controls`, `--mobile`, `--era N`, `--q low`, screenshots to `tools/test/shots/`. `.github/workflows/test.yml` runs it on push; `.github/workflows/pages.yml` deploys to GitHub Pages from `main`.
- `tools/test/record.mjs` records an MP4 of the autopilot run (ffmpeg installed via winget, user scope). `tools/artifact_prep.py` prepares `dist/` for the claude.ai artifact (strips the HTML skeleton, base64-encodes GLBs as `.glb.txt` because artifacts cannot serve `.glb`). `tools/icons.py` generates PWA/OG images without Pillow.
- `NIGHT.md` = live plan / status / hand-off; `README.md`; `LYRICS.md`.
- Hosted copy for playing on a phone: https://claude.ai/artifact/BtigJtQXJGtrXoycKL3Xvm (private; republish after `npx vite build --base ./` + `python tools/artifact_prep.py`).

## Decisions made along the way, and why

1. **Deterministic, not real AI.** The "AI" in the finale is scripted: every playthrough is identical and every build lands on the beat. Ian explicitly did not want live agents generating the game.
2. **Lyrics are gameplay in every era**, but one readable lyric event per line beats per-word streams (racer lesson).
3. **Eras**: 1978 arcade → 1991 16-bit → 1995 Saturn 3D (Daytona USA shipped on Saturn in 1995; we had 1997 and fixed it) → 2013 mobile (Flappy Bird's year) → NOW VR + AI. The 1995→2013 jump is deliberate for a three-minute piece.
4. **Era 4 was an isometric sandbox first**; it did not work, so it became the Flappy-style phone game to represent mobile gaming.
5. **Era 5 was "AI agents building a neon city ahead of a runner"** (over-the-shoulder third person, 18 scripted agent drones with jobs, rules unlocking, a boss made of word plates). Ian liked the agent idea but said it was not landing; from five options he chose a **VR saber lane + tunnel**, with the condition that the last era must obviously be a new, future type of gameplay with AI mixed in. The AI co-pilot that builds the arena from your cut words is how the agent idea survived.
6. **Daytona cars**: Kenney models were rejected as cartoonish; Sketchfab needed a login we could not do; so Blender was installed (portable zip, after winget stalled on a UAC prompt) and the cars were built procedurally in Blender with textures and liveries.
7. **Chorus A** was chosen ("Turn it all the way up..."); earlier chorus drafts were rejected as weak. Lyrics were rewritten to be about Ian's own progression (speed of light, evolving, maximalist), and to ask rather than claim membership.
8. **Phone first for playback**: Ian reviews from an iPhone remotely, so the artifact, touch controls, quality tier and rotate card matter more than desktop polish.

## Bugs we hit and fixed together (so you do not reintroduce them)

- Era 1: words unreadable → higher-res canvas, bigger bitmap font, true perspective crawl; cannon died when words did not touch it → pixel-exact overlap test against the ship sprite; death is a quick respawn, not a punishment.
- Era 2: character missing on the first frame after era 1 → spawns visible immediately; teleporting on death → hop, fall, drop-in; too fast → slower SPEED; walking animation added; autopilot fell into pits → a "landing oracle" that simulates the jump before committing; word pickups unreachable → placed relative to the platform under them.
- Era 3: lyric words streamed every 0.45 s and nobody could read them → one gantry per line; words were attached to cars → detached; banking sign was inverted; GLB loading on the artifact host → base64 fallback.
- Era 4: words clumped on one pipe → distributed across the pipes of the line; gap heights jumped too far between neighbours → smoothed; deaths right before the hand-off → invulnerable after bar 74.4.
- Era 5 (old agents version, lessons kept): signs placed above jump height so the autopilot never collected words; agent labels piled up at the build front; progress rings and impact flashes bloomed into white discs near the camera; the sun reflected as a huge disc in the mirror floor; the outro camera ended inside towers; the "PRESS START" prompt doubled the end card. The new finale avoids all of these by design (one co-pilot, distance-scaled elements, bloom threshold 0.86, crane-up outro).
- Transport: the headless harness never dispatched lyric lines while paused, so every "words collected" number read zero → `ETM.step` now dispatches lines; a test shim that forced `playing=true` corrupted runs → removed; the Vite dev server dies when the browser pane closes → restart with `npx vite` and pass `--url` to the harness.
- Phone: control bar overflowed, buttons wrapped, captions overlapped the autopilot line, no safe-area handling → fixed with coarse-pointer CSS, a hidden time label, `dvh` sizing and `env(safe-area-inset-*)`.
- Audio: finale stacked gains could clip → soft limiter; a riser fired on every beat instead of once per bar.

## Verification status (last clean runs)

Full three-minute autopilot run under the harness: 69 cases pass, 0 page errors, no NaN; words collected in every era under autopilot (era 2: 56/77, era 3: 8/9 lines, era 4: 54/54, era 5: 108/108 blocks). Phone layout tests pass (landscape fit, no overflow, rotate card in portrait). A screenshot-per-5-seconds review of the recorded MP4 was done and its findings fixed.

## Still open / needs Ian

1. **Merge PR #1, make the repo public, enable GitHub Pages** (the coding agent's permission classifier blocked these): `gh pr merge 1 --repo trmytelabs/maximalist --merge`, `gh repo edit trmytelabs/maximalist --visibility public --accept-visibility-change-consequences`, `gh api -X POST repos/trmytelabs/maximalist/pages -f build_type=workflow`. Site then lives at https://trmytelabs.github.io/maximalist/. A custom domain = a CNAME DNS record to `trmytelabs.github.io` + `public/CNAME`.
2. **Suno track** from `LYRICS.md` → `public/song.mp3`, then nudge `[ ]`, tap-sync `T`, save `Y` (writes `public/timing.json`).
3. (done) Verse 5 line 3 is now grounded in Ian's real work: briefing meetings, planning projects, coding his own tools.
4. Confirm the name on the cards ("IAN GINN") and the credit line.
5. Ideas not yet done: a Blender-rigged runner or hands model, more arena-piece variety, muxing the finished song into the MP4 (`ffmpeg -i out/run.mp4 -i public/song.mp3 -c:v copy -c:a aac -shortest out/run-with-song.mp4`), an intro/outro voice line.

## How to work on it

`cd C:\dev\maximalist`, `npm install`, `npx vite` (note the port), open `/maximalist/`. Type-check with `npx tsc --noEmit -p .`. Verify with `node tools/test/run.mjs --url http://localhost:<port>/maximalist/` (add `--era N` to focus). In the browser, `ETM.seek(bar*1.875); ETM.step(seconds); ETM.probe()` drives the sim deterministically. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Keep everything deterministic (seeded `hash`/`rngf`, never `Math.random` in sim code), keep lyrics readable, and keep each era reading as a clearly different kind of game.
