# Test cases — Everything, Then More

The harness is `node tools/test/run.mjs` (see the header of that file for flags). It drives the deterministic
simulation through `window.ETM` in headless Edge with software WebGL, so it cannot hear audio or measure real GPU
frame rates, but it can verify every state transition, every lyric pickup, every death/respawn, every HUD string, and
take screenshots for visual review (`tools/test/shots/`).

Case files live in `tools/test/cases/*.mjs` and export an array of cases:

```js
export default [
  {name:'era3 collects words', era:3, bar:'end',           // evaluate when the era ends ('end') or at a bar number
   fn:(p,history,page)=> p.e3.words>=20 || `only ${p.e3.words} words`}, // return true/undefined to pass, a string to fail
];
```

`p` is `ETM.probe()`: `{t,bar,era,playing,ended,lyricIdx,caption,quality,mobile,gl:{e3,e5},e1..e5}` where each
`eN` is a flat summary of that era's state object `S` (numbers/booleans/strings, `arr#` lengths, one level of nested
scalars, and `bad`: paths of any NaN/Infinity). `history` is the list of previous probes (every chunk). `page` is the
puppeteer page if a case needs to drive input (`page.keyboard`, `page.touchscreen`) or evaluate code
(`page.evaluate(()=>ETM.step(1))`). Cases may be async.

## Global (run.mjs, always on)
- G1 no `pageerror`, no console errors, no `window.onerror` across the full 96 bars.
- G2 no NaN / Infinity anywhere in any era's `S`, at every 2-second probe.
- G3 `eraAt(t)` matches the bar table 0 / 19 / 37 / 56 / 75 / 96.
- G4 the run reaches `ended` at 3:00.
- G5 (--controls) WASD + arrows move, space fires/jumps, Q/M/L/G/1-5 are settings only, touch zones map correctly and release.
- G6 (--mobile) canvas fits an iPhone landscape viewport, control bar does not overflow, no horizontal scroll, rotate card in portrait and dismissible.
- G7 perf: sim cost per simulated second and render ms per era are logged to the report (software GL, so only relative).

## Stage 1 — ARCADE · first prompts (`src/era1.ts`)  bars 0–19
- E1.1 the title card covers bars 0–2 and the first lyric crawl starts after it; a word is on screen by bar 3.5.
- E1.2 every lyric line dispatched in the era becomes crawl words (count words vs LYRICS lines with bar < 19).
- E1.3 autopilot fires and chips pixels: `chips`/score increase over the era; no word is deleted whole by a single hit.
- E1.4 the cannon dies only when a word's remaining pixels overlap the ship sprite; a death sets `dead`, respawn within 0.7 s, blink, then alive.
- E1.5 the shatter at bar 17 clears remaining words before the transition at bar 19; nothing from era 1 draws after bar 19.
- E1.6 words are readable: bitmap scale at ZNEAR gives letters ≥ 10 px tall on the 480×270 canvas (screenshot check).

## Stage 2 — 32-BIT · learning to ask (platformer) (`src/era2.ts`)  bars 19–37
- E2.1 the player sprite is on screen on the very first frame of the era (bar 19.0, also at 18.9 during the transition).
- E2.2 the runner stays on the ground; lyric phrases sit in ? blocks four tiles up and pop out when hit from below (plain bricks break); autopilot pops ≥ 50% of the phrases by the end of the era.
- E2.3 enemies: walkers are stomped (count), flyers exist; the player never clips through ground (y never below ground level).
- E2.4 death is a hop then a fall, then a drop-in from above at the next ground segment (no teleport); 2.6 s of invulnerability after a respawn, 2 s after an enemy hit.
- E2.5 arms/legs animate: the run frame index advances while moving.
- E2.6 camera never shows past the level end; SPEED gives a readable pace (player x advances ~50 px per beat).

## Stage 3 — 3D CONSOLE · directing agents (racer) (`src/era3.ts`, `src/era3gl.ts`)  bars 37–56
- E3.1 GL renderer initialised (`gl.e3 === true`); car models load (GLB or loft fallback) without errors.
- E3.2 lyric words fly in over the cars (h 22 → 3.2) and are collected by lane; `words` ≥ 70% of dispatched words.
- E3.3 overtakes happen (`passes` increases), bumps are bounded (`bumps` < 25 for the era), position stays within 1..13.
- E3.4 the player stays on the road: |x| ≤ 0.9 at all probes.
- E3.5 HUD shows POS / SCORE / LINES / KM/H / LAP (overlay text present; screenshot).
- E3.6 the chase camera never clips through the track; screenshots at bars 37.6, 46.5, 55.6 look like Daytona (stands, pits, banked turns).

## Stage 4 — MOBILE · working from anywhere (flyer) (`src/era4.ts`)  bars 56–75
- E4.1 pipes spawn every 2 beats; word signs sit in the gaps; the phone frame + status bar draw.
- E4.2 autopilot flaps through: deaths ≤ 3 in the era, and auto-retry restarts within 1 s.
- E4.3 words collected ≥ 70%.
- E4.4 bridge (bars 66.5–75): ghost birds appear; at bar 73 the agents fly out right; the transition into era 5 at bar 75 is clean (no leftover phone frame after 75.3).

## Stage 5 — VR · full development (saber lane + AI co-pilot) (`src/era5.ts`, `src/era5gl.ts`)  bars 75–96
- E5.0 the sabers follow the pointer: the hand on the pointer's half of the screen moves to the pointer, blocks are cut when a hand is within 0.7 cells at the beat (±0.22 s); autopilot swings each hand to its next block.
- E5.1 GL renderer initialised (`gl.e5 === true`), no errors on high or low tier.
- E5.2 blocks are planned from the lyric table and spawn LEAD seconds before their beat; `spawned` grows monotonically.
- E5.3 autopilot cuts ≥95% of blocks and every cut adds exactly one arena piece (`built# === hits`).
- E5.4 no misses under autopilot (combo never resets).
- E5.5 the co-pilot status cycles with the build and ends on ARENA COMPLETE.
- E5.6 the tunnel engages at bar 89; the run coasts to a stop after bar 94 so the arena stays around the player for the end card.
- E5.7 seeking into the era rebuilds the same arena (deterministic replan from the table).
- Visual (screenshots): headset-on lens transition 75–76.3, sabers low in the frame like VR hands, word faces readable,
  arena pieces pop in ahead with the co-pilot beam, tunnel rings at 89, crane-up outro at 94.

## Transport / cards / audio (`src/main.ts`, `src/music.ts`, `src/song.ts`)
- T1 captions (`#lyric`) show each LYRICS line within 0.1 s of its bar and hide after ≤ 1.9 bars.
- T2 seek determinism: `seek(x); step(4)` twice gives identical probes.
- T3 pause/play, restart, scrubber seek, era keys all keep the clock consistent (`BAR n · b` label).
- T4 with sound on, `MUSIC.beat`/`eighth` never throw for any era (run with `#click` toggled on; AudioContext exists in headless Chrome).
- T5 title card bars 0–2 and end card from bar 94.9 render (screenshots `bar0.6-era1`, `bar95.6-era5`).
