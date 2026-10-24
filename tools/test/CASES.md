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

## Era 1 — 1978 arcade (`src/era1.ts`)  bars 0–19
- E1.1 the title card covers bars 0–2 and the first lyric crawl starts after it; a word is on screen by bar 3.5.
- E1.2 every lyric line dispatched in the era becomes crawl words (count words vs LYRICS lines with bar < 19).
- E1.3 autopilot fires and chips pixels: `chips`/score increase over the era; no word is deleted whole by a single hit.
- E1.4 the cannon dies only when a word's remaining pixels overlap the ship sprite; a death sets `dead`, respawn within 0.7 s, blink, then alive.
- E1.5 the shatter at bar 17 clears remaining words before the transition at bar 19; nothing from era 1 draws after bar 19.
- E1.6 words are readable: bitmap scale at ZNEAR gives letters ≥ 10 px tall on the 480×270 canvas (screenshot check).

## Era 2 — 1991 16-bit platformer (`src/era2.ts`)  bars 19–37
- E2.1 the player sprite is on screen on the very first frame of the era (bar 19.0, also at 18.9 during the transition).
- E2.2 autopilot collects word pickups; words collected ≥ 80% of words spawned by the end of the era.
- E2.3 enemies: walkers are stomped (count), flyers exist; the player never clips through ground (y never below ground level).
- E2.4 death is a hop then a fall, then a drop-in from above at the next platform (no teleport: x changes only after the drop-in starts; `p.dead` resolves in < 2 s).
- E2.5 arms/legs animate: the run frame index advances while moving.
- E2.6 camera never shows past the level end; SPEED gives a readable pace (player x advances ~50 px per beat).

## Era 3 — 1997 Saturn racer (`src/era3.ts`, `src/era3gl.ts`)  bars 37–56
- E3.1 GL renderer initialised (`gl.e3 === true`); car models load (GLB or loft fallback) without errors.
- E3.2 lyric words fly in over the cars (h 22 → 3.2) and are collected by lane; `words` ≥ 70% of dispatched words.
- E3.3 overtakes happen (`passes` increases), bumps are bounded (`bumps` < 25 for the era), position stays within 1..13.
- E3.4 the player stays on the road: |x| ≤ 0.9 at all probes.
- E3.5 HUD shows POS / SCORE / WORDS / KM/H / LAP (overlay text present; screenshot).
- E3.6 the chase camera never clips through the track; screenshots at bars 37.6, 46.5, 55.6 look like Daytona (stands, pits, banked turns).

## Era 4 — 2013 mobile / flappy (`src/era4.ts`)  bars 56–75
- E4.1 pipes spawn every 2 beats; word signs sit in the gaps; the phone frame + status bar draw.
- E4.2 autopilot flaps through: deaths ≤ 3 in the era, and auto-retry restarts within 1 s.
- E4.3 words collected ≥ 70%.
- E4.4 bridge (bars 66.5–75): ghost birds appear; at bar 73 the agents fly out right; the transition into era 5 at bar 75 is clean (no leftover phone frame after 75.3).

## Era 5 — NOW agents finale (`src/era5.ts`, `src/era5gl.ts`)  bars 75–96
- E5.1 GL renderer initialised (`gl.e5 === true`), no errors with shadows + Reflector (high) and without (low, `--q low`).
- E5.2 build front stays ahead of the player: for every probe, the first unbuilt chunk x > player x.
- E5.3 RULES unlock on schedule (77 run+jump, 79 weapon, 83 double jump, 86 low gravity, 89 boss); the rules panel lists them.
- E5.4 boss: plates with words spawn at 89, are hit, boss clears before 94; the player never falls below the floor.
- E5.5 all 18 agents have jobs after bar 76 (no agent idle for > 4 s before bar 93).
- E5.6 outro: bars 94–96 show the end card (title, credit, name) and the sim stays stable.

## Transport / cards / audio (`src/main.ts`, `src/music.ts`, `src/song.ts`)
- T1 captions (`#lyric`) show each LYRICS line within 0.1 s of its bar and hide after ≤ 1.9 bars.
- T2 seek determinism: `seek(x); step(4)` twice gives identical probes.
- T3 pause/play, restart, scrubber seek, era keys all keep the clock consistent (`BAR n · b` label).
- T4 with sound on, `MUSIC.beat`/`eighth` never throw for any era (run with `#click` toggled on; AudioContext exists in headless Chrome).
- T5 title card bars 0–2 and end card from bar 94.9 render (screenshots `bar0.6-era1`, `bar95.6-era5`).
