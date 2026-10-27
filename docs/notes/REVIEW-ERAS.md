# Review: era modules, `world.ts`, and the test cases

Read-only review of `src/era1.ts`, `src/era2.ts`, `src/era3.ts`, `src/era3gl.ts`, `src/era4.ts`, `src/era5.ts`,
`src/era5gl.ts`, `src/world.ts` and `tools/test/cases/*.mjs`, cross-checked against `src/core.ts`, `src/main.ts`,
`index.html`, the harness reports (`tools/test/report-full8.json`, `report-full7.json`, `report-mob7.json`,
`report-e5final.json`, `report-era*.json`) and the screenshots in `tools/test/shots/`.

Line numbers are from the files as they were at ~09:40 MDT on 2026-10-24 (mtimes: era1 08:13, era2 08:35, era3/era3gl
08:17, era4 08:13, era5 08:24, era5gl 08:25, core 09:35). Five agents are editing these files, so treat a line number as
"the statement that does X" rather than an exact anchor. `npx tsc --noEmit -p .` passed on that snapshot.

Severity: **High** = wrong result / breaks the stated determinism contract or a real phone-side failure; **Medium** =
visible defect or real perf/memory cost; **Low** = fragile or cosmetic; **Nit** = tidy-up.

The determinism contract I reviewed against (CONTEXT-PROMPT.md): `seek(t)` must reproduce the same state a continuous
play-through reaches at `t`, and nothing in simulation code may use `Math.random` / `Date.now`.

---

## 1. `src/era1.ts` — 1978 arcade crawl (bars 0–19)

**How it works.** `E1` is a closure module with a single state object `S` rebuilt by `init(t)` (seeded `rngf(7)` for
particles, `rngf(3)` for the 150 starfield points). `onLine(words,t)` rasterises every word of a lyric line into its
own small canvas with `Press Start 2P` at 16 px (`makeWord`), lays the words out in rows on a `BW=324` px wide
"plane texture" (`layout`), and pushes a line record `{words,t0,bh,tex,xo}`. The plane is drawn with a true
perspective: depth `z = ZFAR − (t−t0)/TRAVEL·(ZFAR−ZNEAR)` per line, and each screen row `y` maps back to a texture row
via `z = F/(y−VPY)` (`draw` line 64), so the text crawls toward the cannon over 2.6 bars. Bullets are intersected in
texture space (`update` lines 40–46) and `chip()` zeroes alpha in a disc of the word's `ImageData`, so a word is only
"dead" when fewer than 16 % of its pixels remain. The cannon dies only when `hitAt()` finds a live word pixel under one
of the sprite's `X` cells (pixel-exact), respawns after 0.7 s with 2.6 s of blink. Autopilot aims with `target()` and
sidesteps with `dodge()` (a 6-sample look-ahead that reuses `hitAt`). At bar 17 `shatter()` converts the live text to
falling debris and clears `S.lines`.

### Findings

**E1-1 · High (determinism) · `era1.ts:36` — `Math.random()` inside `update()`.**
```ts
for(const st of S.stars){st.d+=...;if(st.d>LW*0.95){st.d=4+Math.random()*20;st.a=Math.random()*Math.PI*2}}
```
The starfield lives in `S.stars`, so `seek()` + `step()` no longer reproduces the same `S`. `ETM.probe()` happens to
skip it (arrays > 64 entries are not walked), which is why T2 passes; the state is still non-deterministic and the
recorded MP4 differs run to run. Patch: use the module's seeded generator (it is already in `S`):
```ts
if(st.d>LW*0.95){st.d=4+S.rng()*20;st.a=S.rng()*Math.PI*2}
```

**E1-2 · Low · `era1.ts:44` — `blip(1200+Math.random()*400,…)`.** Audio only, so not state, but it is the same rule
violation and is trivially fixable: `blip(1200+S.rng()*400,0.04,0.08)`. (Note `S.rng` is then consumed in a
different order than before; fine because it is only ever consumed in `update`.)

**E1-3 · Medium (determinism / visual) · `era1.ts:14` — word bitmaps depend on whether the web font has loaded.**
`makeWord` calls `measureText`/`fillText` with `'Press Start 2P',monospace` at the moment a line is dispatched (bar 2,
≈3.75 s after load). If the Google Font is still loading (slow phone, first visit, `?t=` deep link, pressing `1`
immediately) the fallback monospace glyphs are rasterised instead, the word widths differ, `layout()` produces different
rows, and the pixel-overlap death test behaves differently. Nothing re-rasterises when the font arrives. The same
applies to `era3gl.ts:12 lineTex` and `era5gl.ts:28 wordTex`, both of which *cache* the texture forever, so a word
rendered once with the fallback stays wrong for the whole run. Patch (one place, `main.ts` before the first
`requestAnimationFrame`): gate the clock on the font.
```ts
const fontReady=document.fonts?document.fonts.load("16px 'Press Start 2P'").catch(()=>{}):Promise.resolve();
fontReady.then(()=>{seek(isFinite(t0)?t0:0);requestAnimationFrame(frame)});
```
and keep `lo1`'s first frame black until then (the title card is drawn by `cards()` anyway).

**E1-4 · Low (determinism) · `era1.ts:13` — `init(t)` past bar 17 yields an empty `debris` array.**
`if(t>=shatterT)S.debris=[]` means `seek(bar 18)` shows an empty floor while a play-through shows the shattered words
lying on the ground until bar 19. Cheap fix: replay the lines that were alive at bar 17 and shatter them.
```ts
if(t>=shatterT){for(const [b,txt] of LYRICS){if(b>=17)break;if(bar(b)+TRAVEL>shatterT)onLineAt(txt.split(' '),bar(b))}shatter()}
```
where `onLineAt` is `onLine` without the `t>=shatterT` guard (pass the dispatch time explicitly).

**E1-5 · Low (allocation) · `era1.ts:21, 61` — `compose()` redraws every line texture every frame and `draw()` sorts a copy of `S.lines`.**
`compose` clears and re-blits all words of all live lines each frame even when nothing was chipped. Set a dirty flag in
`chip()` / on death and only recompose then; replace `S.lines.slice().sort(...)` with an in-place sort of a persistent
array (lines never reorder because `t0` is monotonic, so the sort can be dropped entirely: later lines have larger
`zOf`, so iterate `S.lines` in reverse).

**E1-6 · Low (cost) · `era1.ts:30–32` — `dodge()` is O(words × 6 × 60 × 36) per frame on autopilot.** Up to ~10 live
words × 6 time samples × 60 candidate x positions × 36 sprite cells ≈ 130 k `hitAt` cell tests per frame in the worst
case. It is fine on desktop (era-1 sim is 11 ms per simulated second in the report) but it runs on the phone too.
Bail out of the x scan as soon as a safe x is found (it does), and skip words whose row band cannot reach the ship in
0.45 s before building `th` (the `spb.y>=sh.y-1&&spt.y<=sh.y+9` test already does this; the remaining cost is the
60-position scan — cap it to `o<=48`).

**E1-7 · Nit · `era1.ts:7, 72`** — expose the perspective constants as `K` (like `E3.K`/`E5.K`) so `tools/test/cases/era1.mjs:16`
stops hard-coding `ZFAR/ZNEAR/TRAVEL/ROWD/F/VPY` (see §9).

HUD: 8 px bitmap text on the 480-wide low-res canvas (×2 to 960) — `SCORE 000000` / `CHIPS 62` and the 45-char
"A long time ago…" line (360 px) all fit; no overflow risk found.

---

## 2. `src/era2.ts` — 1991 16-bit platformer (bars 19–37)

**How it works.** A 320×180 low-res canvas, `SPEED=50/BEAT` px/s autorun, gravity `G=900`, jump `JV=-380`. `gen(to)`
extends the level deterministically from `rngf(21)`: ground segments with the occasional pit or raised grass step,
pipes, a 3–6 tile brick row four tiles up (`y=top-56`), walkers and flyers; it then prunes everything more than 400 px
behind the camera. `onLine` picks up to four free bricks in the next 420 px (preferring "calm" ones away from pipes and
walkers), creating bricks on the fly if there are not enough, and splits the line's words across them as `?` blocks.
`update` runs the player (ground test via `under()`, head-bump test against brick bottoms that either pops the phrase
into a floating `coin` or breaks the brick), enemies (stomp vs. hit with 2 s stun), death (hop, fall, then a drop-in from
above once `safe()` says a landing exists) and particles. The autopilot uses `safe()`, an 80-frame forward simulation
of the exact movement rules, as a landing oracle for jump decisions and air-steering. `draw` is pure (parallax, tiles,
sprites, HUD).

### Findings

**E2-1 · Medium (determinism, latent) · `era2.ts:22` — generation gates depend on how many platforms are still in `S.plats`.**
```ts
const idx=S.plats.filter(q=>q.kind==='ground'||q.kind==='grass').length; ... if(idx>2&&roll<0.13)gap=... ; if(...idx>1...) ; if(r()<0.16&&idx>3)
```
`idx` is the count of *surviving* ground/grass platforms, and `gen()` prunes at the end of every call. During play
`gen` is called every frame (prune after each new platform, `idx` ≈ 5–8); after `init(t)` it is called once and builds
hundreds of platforms with no pruning (`idx` grows to 50+). The streams coincide today only because every gate is
`idx > 1..3` and `idx` never drops that low in play; the moment someone adds a gate like `idx%4===0` or raises the
prune distance, seek and play diverge, and because `r()` is consumed *inside* gated branches the whole RNG stream shifts.
Patch: a monotonic counter.
```ts
// init: S.nGround=0;   gen: const idx=S.nGround; ... S.plats.push({x,y:top,w,f:0,kind});S.nGround++;
```

**E2-2 · Medium (HUD overflow) · `era2.ts:107` — the collected-phrase line can be wider than the 320 px canvas.**
`S.line.join(' ')` is drawn at 6 px bitmap (1 em per glyph) centred at `LW/2`. "Taught myself the questions till the
answers came true" (bar 29.5) is 54 characters = 324 px when all four phrases are collected, so the first and last
glyphs are clipped. Patch: shrink or wrap.
```ts
const txt=S.line.join(' ');const fs=txt.length*6>LW-8?5:6;x.font=fs+"px 'Press Start 2P',monospace";
```
(5 px bitmap text is still readable at ×3.) Same check for the 47-char lines at 27.5 and 33.5 (282 px, fits).

**E2-3 · Low (allocation) · `era2.ts:33, 35` — `under()` allocates an array per call and `safe()` calls it 80 times.**
Autopilot calls `safe()` up to ~6 times per frame (lines 49, 55, 56, 51, 76) → ~500 short-lived arrays per frame. Make
`under` iterate without allocating, or give `safe` a cheap "platform under x" lookup (platforms are sorted by x; a
single pass that tracks the current one is enough). Era-2 sim cost is only 25 ms/sim-second in the report, so this is
GC hygiene for the phone rather than a hot spot.

**E2-4 · Low · `era2.ts:69` — `S.plats=S.plats.filter(q=>!q.broken)` runs every airborne frame even when nothing broke.**
Guard it with the `q.broken=true` assignment (set a `S.dirty` flag) or splice in place.

**E2-5 · Low (correctness of the oracle) · `era2.ts:35` — `safe()` ignores enemies and brick ceilings.**
The oracle simulates platforms only; the autopilot can commit to a jump that lands on a walker (handled as a stomp if
`vy>80`, otherwise a stun) or hits a brick bottom and gets pushed down (`p.vy=90`) into a pit. The report shows 0
deaths in era 2 for the full run, so this is latent; if deaths return after level tweaks, this is where to look.

**E2-6 · Nit · `era2.ts:18`** — `'KCCK.KcWccWcK.KCCK'.slice(0,16)` is an 18-character row trimmed to 16; write the
16-char row literally so the sprite reads as drawn.

**E2-7 · Nit · naming** — `coins`, `coinsGot`, `coinsAll` are the lyric phrases (HUD says WORDS). See §8.

Boundaries: `update`/`onLine` guard `t<start-TRANS||t>=end`, `draw` is only called for era index 1 and during the
era-1 transition, and `init` computes `camX` from `start-TRANS` consistently with `update`, so seek and play agree
(verified by reasoning; there is no era-2 case file to verify it mechanically — see §9).

---

## 3. `src/era3.ts` — Saturn racer simulation (bars 37–56)

**How it works.** A closed Catmull-Rom tri-oval (`curve`, length `L`), `frame(s)` returns position/tangent/right/up
with banking derived from the local curvature (`cr` of the tangent 4 units ahead). The player has an arc-length `S.s`
(advances at `SPEED·speedK`), a lane offset `S.x∈[-0.85,0.85]` and 12 traffic cars with their own `s`, lane target
`tx` (re-rolled from `hash(c.i, floor(t))`) and speed 0.9–0.95 × SPEED so they are overtaken. `onLine` spawns one
gantry per lyric line 2 s ahead, choosing the lane where the pack will not be (`rel(c)+(c.sp−SPEED)·ta`). `update`
counts passes (car goes from ahead to behind), bumps (|Δs|<3.2 and |Δx|<0.3 → shove, 0.86 speed), and resolves a gantry
when the player crosses its `s` (got if |x−lane|<0.36 else missed). `overlay` draws the DOM-independent HUD (POS,
SCORE, LINES n/m, PASSES, KM/H, LAP, the collected line, cyan flash).

### Findings

**E3-1 · High (determinism) · `era3.ts:14` — `init(t)` places the player with `Math.max(0,t-start)` but `update` runs from `start-TRANS`.**
```ts
S={s:Math.max(0,t-start)*SPEED, ...}        // init
function update(dt,t,...){if(t<start-TRANS||t>=end)return; ... S.s+=SPEED*S.speedK*dt   // runs from bar 35.5
```
A continuous play-through has advanced `TRANS·SPEED ≈ 202` arc units (and spent 2.8 s of car lane-changes) by bar 37;
`seek(bar 37)` starts at `s=0`. From then on every gantry position, car position, pass and bump differs between the two
runs. E5 avoids exactly this by making `xAt(t)` the single source of truth. Patch:
```ts
const t0=start-TRANS;S={s:Math.max(0,t-t0)*SPEED, ...}
```
and then catch the cars up deterministically (they are cheap: 12 cars × ≤ 2 200 frames):
```ts
for(let tt=t0;tt<t;tt+=1/60){for(const c of S.cars){/* the car block of update(), minus audio */}}
```
or better, make car motion analytic: `c.s = c.s0 + c.sp*(t-t0)` and derive `tx` from `hash(c.i, floor(t*3))` only
(it already is), then `c.x` is the only integrated quantity left and can be re-derived by a short catch-up loop.

**E3-2 · Medium · `era3.ts:31` — cars that drop 45 units behind are teleported half a lap ahead, so `passes` and POS are inflated.**
`if(d<-45){c.s+=L*0.5+45;c.ahead=true}` means the same car is passed again and again; POS is `1+NCARS−passes` clamped to
1..13, so it reaches 1 and sticks. The screenshot at bar 52 shows "POS 8/13" with 5 passes, fine, but by bar 55 passes
is 9 → POS 4 with only 12 real cars never actually being behind. If POS is meant to be honest, count a pass once per car
(`if(!c.passed){c.passed=true;S.passes++}`) and show `PASSES` as the running total.

**E3-3 · Low (frame-rate dependence) · `era3.ts:27`** — `S.vx=lerp(S.vx,(S.x-ox)/Math.max(dt,0.001),0.2)` smooths with a
constant 0.2 regardless of `dt`; cosmetic (car roll in `era3gl.ts:134`), but use `1-Math.pow(0.03,dt)` like the rest
of the file.

**E3-4 · Low · `era3.ts:23` — gantry id is `String(t)`.** Works because dispatch times are unique, but two lines
dispatched in the same frame (a seek landing exactly on a line boundary dispatches one; fine) would collide in
`era3gl`'s `gantries` map. Use `S.spawned` as the id.

**E3-5 · Nit · HUD copy** — the HUD says `LINES n/m` while CASES.md E3.5, the harness pixel probe (`era3.mjs:14 words`)
and the older screenshots say WORDS. Pick one (LINES is correct now).

HUD widths at 960: `LINES 8/9   PASSES 12` at 9 px ≈ 190 px, the collected line at 9 px (longest era-3 line is 56
chars = 504 px) — all fit.

---

## 4. `src/era3gl.ts` — Saturn racer renderer

**How it works.** A dedicated `THREE.WebGLRenderer` (pixel ratio ≤ 1.5) with its own scene: sky sphere, 22 cloud
sprites, hemisphere + directional light, a 2 600 m textured grass plane, road/curb strips lofted along `E3.frame(s)`
in 640 segments (asphalt + normal map + separate markings mesh), walls every 9 units, grandstands/pits on the start
straight, pine billboards on the back section, light towers, lyric billboards, start gantry, the rock overhang with slot
reels, 30 palms, and 13 cars. Cars are built procedurally (`loft()` with per-livery canvas textures) and then replaced
by `public/models/car_N.glb` if a HEAD probe finds them (with a `.glb.txt` base64 fallback for hosts that cannot serve
`.glb`). `render(t)` places cars with `place()`, syncs one gantry group per live `S.lyr` entry (created lazily, removed
when the sim drops the line), spins the reels, and runs a chase camera 10.5 units behind the player.

### Findings

**E3GL-1 · Medium (allocation) · `era3.ts:12–13` + `era3gl.ts:131–143` — ~150 `Vector3`/`Matrix4` allocations per frame.**
`E3.frame()` allocates eight vectors per call (`getPointAt`, `getTangentAt` ×2, `crossVectors`, three clones); it is
called 13× for cars, 2× for the camera and once per visible gantry every frame, and `place()` adds four more. On a phone
at 60 fps that is ~9 000 short-lived objects per second feeding the GC during the heaviest 2D+GL era. Patch: give
`frame` an `out` parameter and scratch vectors.
```ts
const _p=new THREE.Vector3(),_T=new THREE.Vector3(),_T2=new THREE.Vector3(),_r0=new THREE.Vector3();
function frame(s,out={p:new THREE.Vector3(),T:new THREE.Vector3(),right:new THREE.Vector3(),up:new THREE.Vector3(),bank:0,curv:0}){
  const u=...;curve.getPointAt(u,out.p);curve.getTangentAt(u,out.T);curve.getTangentAt(u2,_T2); ... return out}
```
`place()` can keep one `Matrix4` in module scope. (`E3.frame` is also used by `era3gl.init`, which is fine as is.)

**E3GL-2 · Low (determinism of the video) · `era3gl.ts:143`** — camera shake uses `Math.random()`. Renderer-only, but
the MP4 then differs between recordings. `hash(t*61)-0.5` gives the same look.

**E3GL-3 · Low · `era3gl.ts:142`** — `r.rotation.x+=0.02` is frame-rate dependent and accumulates (after a seek the
reels are wherever they were). Use `r.rotation.x=t*1.2`.

**E3GL-4 · Low · `era3gl.ts:137`** — `new Set()` and a Map walk per frame for gantry sync; store `gt` on the sim entry
(`w._gt`) or key the map by `S.spawned` and prune by comparing lengths. Also `makeGantry` allocates five geometries
and five materials per line and `scene.remove` never disposes them; nine lines → fine, but `dispose()` them in the
prune loop or pool two gantries (at most two are ever alive).

**E3GL-5 · Low (phone memory) · `era3gl.ts:12`** — `lineTex` is 1024×256 RGBA (1 MB) per line, nine lines = 9 MB,
never disposed; halve it (512×128 reads fine at gantry distance) or dispose when the gantry is pruned.

**E3GL-6 · Nit · `era3gl.ts:10`** — `anisotropy=8` without consulting `renderer.capabilities.getMaxAnisotropy()`
(three clamps it, so harmless). `fileTex` also sets `colorSpace` on the fallback image path, fine.

**E3GL-7 · Nit · `era3gl.ts:124`** — `fit()` loads `car_N.glb` thirteen times with thirteen `GLTFLoader.load` calls
and `gl.scene.clone(true)`; fine for 13 small files, but the probe does one `HEAD` + one `GET` per car, so 26 requests
at era-3 start on a phone network. Consider a single manifest or loading them at idle after the title card.

Visual check (`full8-bar37.6/46.5/55.6-era3.png`, `era3-words-*.png`): stands, pits, banked turns, gantries and cars
render as described; the HUD is legible at 1280×800. No camera clipping visible.

---

## 5. `src/era4.ts` — 2013 mobile / flappy (bars 56–75)

**How it works.** Everything is closed-form in `t`: pipe `k` is at `pipeX(k,t)=PIPE0+k·SPACING−(t−s4)·V`, its gap centre
is `gapY(k)` (sine + hash), so there is no integrated world state apart from the bird. `onLine` distributes the line's
words over the pipes that will pass the bird before the next line (`S.words: Map<pipeIndex,phrase>`), and `update`
counts a pipe when its right edge passes `BX−10`, collecting the phrase if present. `autoFlap` is a one-line policy
(flap when below the gap centre and not already rising). Death (pipe or ground) before bar 74.4 sets `alive=false`, shows
the GAME OVER card, and auto-retries after two beats with four beats of invulnerability. The bridge spawns up to 14
ghost birds (perfect players) that become "agents" at bar 73 and fly out of the phone to the right. `draw` renders desk
bokeh, phone body, screen (clipped), status bar, thumb + tap ripples, notification cards and the agents.

### Findings

**E4-1 · Medium (seek ≠ play) · `era4.ts:16–17` — `init(t)` never re-dispatches the line that is in progress.**
After `seek(bar 60)` the pipes carry no signs until the bar-61 line arrives, and `S.total/S.got/S.line` restart at 0,
whereas a play-through has 10/16 at that point (full8 history). E5 solves the same problem by planning from `LYRICS` in
`init`; E4 can do the same cheaply because `onLine` is already a pure function of `(words,t)`:
```ts
function init(t){ ...; for(const [b,txt] of LYRICS){if(b<56||b>=75)continue;const lt=bar(b);if(lt<t)onLine(txt.split(' '),lt)}
 // then: everything whose pipe already passed counts as collected
 for(const [k,w] of [...S.words]){if(pipeX(k,t)+PWD<BX-10){S.words.delete(k);S.got+=w.split(' ').length;S.line.push(w)}}
 S.signs=S.words.size; S.score=...}
```
(`onLine` does `S.line=[]`? no — it only appends, so the above is safe.)

**E4-2 · Medium (phone legibility) · `era4.ts:71, 73, 88, 102`** — 5–7 px bitmap text at 960-logical width.
The notification bodies (7 px), agent role labels (5 px), sign phrases (6–7 px) and the collected line (6 px) are drawn
at canvas resolution. On an 844×390 phone the canvas is ~630 CSS px wide, so a 6 px glyph becomes ~4 CSS px
(`after-android640x360-bar58.5.png`: "Game Center connected" is a smear). This is a cross-cutting issue (§8), but era 4
is the worst offender because the phone screen is only 230 canvas px wide. Minimum fix: a `MOBILE` font floor.
```ts
import {MOBILE} from './core'; const F=(px)=>`${MOBILE?Math.max(px,9):px}px 'Press Start 2P',monospace`;
```
and widen the sign pill accordingly (`tw=w.length*fs+12` already scales with `fs`).

**E4-3 · Low (allocation) · `era4.ts:49, 86`** — 14 radial gradients for bokeh + 2 linear gradients per visible pipe
+ several more per frame; Canvas gradients are objects that must be re-created when their geometry changes, but the
bokeh ones are static (position/radius from `hash(i)`), so build them once in `init` (they are cheap to keep). Era-4
render is 1 ms in the report, so this is phone hygiene only.

**E4-4 · Low · `era4.ts:32`** — on respawn `for(let i=0;i<=k;i++){S.counted.add(i);S.words.delete(i)}` deletes the
phrases on pipes ≤ k, so the words of the pipe the bird is respawned *into* (`b.y=gapY(k)`) are lost even though the
bird will fly through it. Use `i<k`.

**E4-5 · Low · `era4.ts:88`** — a sign for a 3-word phrase can be 120 px wide against a 122 px pipe spacing, so two
adjacent signs can touch when the distribution puts long phrases on consecutive pipes. Cap `fs` by
`Math.min(7,Math.floor((SPACING-16)/w.length))`.

**E4-6 · Nit · `era4.ts:41–42`** — `onBeat`/`on8th` are empty stubs that `main.ts` still calls; drop them from the
interface or make the call sites optional (`E4.onBeat?.()`).

Boundary check: `update` guards `t<s4-TRANS||t>=s5`; `hit&&t<bar(74.4)` grants the hand-off invulnerability; `draw`
is called for era index 3 (including the 73.5–75 transition under the era-5 wipe). `era4-bar75.3.png` confirms the
phone is gone by 75.3 and the lens is opening. Verified in full8: 54/54 words, 0 deaths, 14/14 agents out by 74.2.

---

## 6. `src/era5.ts` — VR saber lane simulation (bars 75–96)

**How it works.** `plan()` turns every lyric line in [75,94) into one block per word, hitting the plane on an 8th-note
grid inside its line (`step=max(0.5, floor(12/n)/2)` beats; side alternates L/R per word; column and row from `hash`).
After the last line it appends "echo" blocks every 8th until bar 93.8 so the build continues into the tunnel. `init(t)`
plans, then marks everything with `hitT<t` as already cut and pushes arena pieces for them (so a seek has the arena
behind you). `xAt(t)` is the analytic player position (coasts to a stop at `OUT+1.2`). `update` activates blocks `LEAD`
seconds early; autopilot glides each hand toward its next block and cuts at `hitT`; manual mode maps the pointer to
column/row on one hand and cuts any block within 0.7 cells and ±0.22 s; blocks past `hitT+WIN` are missed (combo reset).
`cut()` scores with a combo multiplier, appends the word to the caption line, and for every other word (or every echo)
pushes a `piece` `{word,kind,x,side,t}` and sets the co-pilot status. `overlay` draws the lens-open transition, the
score panel and the one-time hint. `draw` is a 2D fallback.

### Findings

**E5-1 · High (seek ≠ play) · `era5.ts:21–22` vs `era5.ts:26` — `init` rebuilds the arena with different rules than `cut`.**
Live `cut()` builds a piece only when `b.k%2===0||b.echo`, places it at `S.dist+30+hash(li*7+k)*6`, and scores
`100·mult`. The seek path builds a piece for *every* block, at `xAt(hitT)+30` with no jitter, scoring `hits·100`. So
`seek(bar 94)` gives 107 pieces / score 10 700 while the play-through in `report-full8.json` ends with 70 pieces /
38 300, and the pieces that do coincide stand in different places. E5.7 passes only because it compares two seeks.
Patch: one code path. Make `cut` pure in `(b, tCut, silent)` and have `init` replay it:
```ts
function cut(b,t,silent=false){ ...; if(b.k%2===0||b.echo){const p=piece(b,S.built.length);p.x=xAt(b.hitT)+30+hash(b.li*7+b.k)*6; ...}
  if(!silent){blip(...);blip(...)} }
function init(t){ S={...};for(const b of S.blocks){if(b.hitT<t){b.active=true;S.spawned++;cut(b,b.hitT,true)}}
  if(S.built.length){S.copilot.pi=S.built.length-1;S.copilot.status='BUILDING';S.copilot.since=t} }
```
Using `xAt(b.hitT)` instead of `S.dist` in the live path also removes the frame-quantisation jitter (the autopilot
cuts at the first frame `t>=hitT`, so `S.dist` is up to one frame late).

**E5-2 · Medium (correctness) · `era5.ts:38` — the co-pilot can get stuck on `STANDING BY` and never reach `ARENA COMPLETE`.**
```ts
if(t-S.copilot.since>BEAT*3&&S.copilot.status!=='STANDING BY'){S.copilot.status=t>=OUT?'ARENA COMPLETE':'STANDING BY';...}
```
If the last cut happens more than three beats before `OUT` (any lyric edit, or a manual player who misses the last echo
blocks), status becomes `STANDING BY` at ~bar 93.6 and the `!=='STANDING BY'` guard then prevents the transition at 94.
E5.5 would fail. Patch: separate the two transitions.
```ts
if(t>=OUT){if(S.copilot.status!=='ARENA COMPLETE'){S.copilot.status='ARENA COMPLETE';S.copilot.since=t}}
else if(t-S.copilot.since>BEAT*3&&S.copilot.status!=='STANDING BY'){S.copilot.status='STANDING BY';S.copilot.since=t}
```

**E5-3 · Medium · `era5.ts:35` — manual mode can only ever swing one hand.** The pointer drives the hand on its half of
the screen and the other hand returns to rest, so every block on the other side is missed and the combo resets; on a
phone that means a touch player watches half the words fly past uncut. Either let one pointer cut either side when the
hit-plane positions overlap (drop the `b.side!==side` requirement in the proximity test — it already iterates both
hands), or make the resting hand auto-cut its own side (hybrid: `if(!manual(side))` use the autopilot branch for that
hand). The former is a one-line change: in the proximity loop the `sd` loop already checks both hands, so the real
blocker is that the resting hand is parked at `(0.6,0.9)/(2.4,0.9)`; park it instead at the next block of its side.

**E5-4 · Low · `era5.ts:14` — lines of ≥ 9 words run into the next line's first block.** `step` floors to 0.5 beats, so
a 12-word line (bar 79) takes 6.5 beats of an 8-beat window; fine today, but a 16-word line would overlap the next
line. Add an assertion in `plan()` (dev only) or compress `step` to `Math.min(step, (nextLineStart-t0)/n)`.

**E5-5 · Low (HUD) · `era5.ts:54`** — "MOUSE OR FINGER · LEFT HALF = MAGENTA HAND · RIGHT HALF = CYAN HAND" at 7 px
is 497 px wide at 960 and ~4.6 CSS px tall on a phone; it is also wrong on a phone (no mouse). Use `MOBILE` to pick
"FINGER · LEFT HALF = MAGENTA · RIGHT HALF = CYAN" at ≥ 9 px.

**E5-6 · Nit · `era5.ts:39–41`** — empty `onBeat/on8th/onLine` stubs, same as E4-6.

Determinism otherwise: no `Math.random`, `hash` everywhere, `WIN`/`LEAD` constants exported via `K`. The order of
autopilot-cut (line 34) before miss-check (line 37) guarantees zero misses even on a dropped frame — good.

---

## 7. `src/era5gl.ts` — VR saber lane renderer

**How it works.** Own renderer + `EffectComposer` (RenderPass, UnrealBloom at threshold 0.86, Film + SMAA on high,
OutputPass), ACES tone mapping, PMREM room environment. Static dressing: gradient sky sphere, sun sprite, 600 stars,
two instanced skyline groups that leapfrog along +x, a floor group (Reflector on high / plain plane on low, additive
grid, two rails, lane lines) snapped to the camera, a cut line. Pools: 56 block groups, 24 cut halves, 100 arena pieces
(each a group containing an arch, pillar, word panel, beam and ring with one visible), 26 tunnel rings, 28 passing
pillars, 2 sabers with ribbon trails, the co-pilot orb with build beam, a 400-particle spark system, 14 "arrival" dots
and 6 word-flight sprites. `render(t)` positions the camera via `cinema()` (lens-open at 75–76.3, crane-up after 94),
syncs every pool from `E5.S`, and blends fog/light colours through `MOOD`.

### Findings

**E5GL-1 · High (perf on phone, and the "sim" spikes in the report) · `era5gl.ts:42, 78` — a `PointLight` inside every one of the 56 pooled blocks.**
Only lights on visible objects are counted, so the point-light count the scene sees changes every time a block pops in
or out (2 → ~14 and back). three.js compiles a separate program for every distinct light count per material, so each
new count triggers shader compilation for every `MeshStandardMaterial` variant on screen. Evidence in
`report-full8.json`: era-5 "sim" cost is 862 ms per simulated second (eras 1–4: 3–55 ms), yet the three follow-up
`ETM.render()` calls average 4.8 ms. `ETM.step` ends with one `render()`, so the time is the first render of each
chunk — compiles — not the sim; the per-chunk `ms` column goes 579 → 1 789 → 13 → 14 → 4 388 (bar 85.5) → 3 710 (bar
89.8, rings appear with a new emissive material) → 3 936 (bar 94, crane-up), which is exactly the signature of program
variants being compiled as the light count and material set change. On a phone each compile is a visible hitch in the
first seconds of the finale. Patch: remove the per-block lights (the emissive cube + bloom already read as glow) and
keep the light count constant.
```ts
// makeBlock: drop `glow`; in updateBlocks drop `o.glow.*`
// keep exactly: sabers.L.light, sabers.R.light, copilot light, sunL, rim, hemiL (constant 3 point + 2 dir + 1 hemi)
```
If you want the floor to pick up block colour, use one shared `PointLight` that follows the nearest active block.
Also warm the remaining programs once at init (`renderer.compile(scene,camera)` with one block/piece/ring/half
visible) so no compile happens during bars 75–76.

**E5GL-2 · Medium (GPU memory on phone) · `era5gl.ts:28, 98, 113` — one 512×256 RGBA texture per distinct word (and per colour), never disposed.**
~85 distinct block words plus the pink/cyan panel variants ≈ 150 textures × 0.5 MB = ~75 MB of texture memory by the
end of the era, on a phone that is already running a Reflector and bloom. Patch: 256×128 (plenty for a 0.72×0.36 face
at ≤ 20 units), and dispose a block's texture when the block scrolls out and no piece uses the word — or draw all words
into one 2048² atlas at init (deterministic: the word list is known from `plan()`), and set `face.material.map.offset/
repeat` per block. The atlas also removes `material.needsUpdate=true` on every pooled-block reassignment (line 98,
113): swapping between two non-null textures does not need it, and setting it bumps the material version.

**E5GL-3 · Medium (init cost) · `era5gl.ts:42–50, 78–80` — ~200 geometries where six would do.**
Each `makePiece()` creates two `TorusGeometry`s and an `EdgesGeometry`; each `makeBlock()` a `CircleGeometry`; each ring
its own `TorusGeometry`; 24 halves each their own `MeshStandardMaterial`. That is 100 arches + 100 rings + 26 tunnel
rings + 56 circles created at page load (E5GL.init runs before the title card). Share them:
```ts
const geo={...,arch:new THREE.TorusGeometry(2.4,0.09,8,28,Math.PI),ring:new THREE.TorusGeometry(2.9,0.1,8,36),tunnel:new THREE.TorusGeometry(3.3,0.1,8,40),disc:new THREE.CircleGeometry(0.42,20),planeEdges:new THREE.EdgesGeometry(geo.plane)};
```
and let `makePiece` reuse them. Materials per piece are needed (per-piece emissive intensity), but halves can share
two materials (magenta/cyan) since their emissive is set by side.

**E5GL-4 · Medium (load time on phone) · `main.ts:70` (call site) — `E5GL.init()` and `E3GL.init()` run synchronously at page load.**
Three WebGL contexts (CRT, E3GL, E5GL), the PMREM environment bake, 300+ meshes and the Reflector target are created
before the first frame of the title card. Defer: init E3GL at bar 33 and E5GL at bar 71 (`requestIdleCallback` with a
deadline, falling back to a direct call two bars before the era), keeping `E5GL.ok` false until then and the 2D
fallback ready. The harness only needs `gl.e5` true by bar 75.5 (E5.1 is evaluated at 75.5).

**E5GL-5 · Low (determinism of the video) · `era5gl.ts:58, 90, 97, 120` — `Math.random()` in sparks, half-cube velocities, camera shake and the beam flicker.**
Renderer-only, so `seek()` state is unaffected, but every MP4 render differs and the harness's screenshot diffs are
noisy. `hash(t*997+k)` or a module-level `rngf(5)` re-seeded in a `reset()` called from `E5.init` gives identical frames.

**E5GL-6 · Low (coupling) · `era5gl.ts:97, 123`** — the renderer writes `b._split` and `p._flash` into the simulation's
state objects. Harmless today (the probe skips `_` keys and `plan()` makes fresh objects on seek), but a renderer
mutating sim state is how the next determinism bug arrives. Keep the flags in renderer-side `WeakMap`s.

**E5GL-7 · Low (allocation) · `era5gl.ts:103–106, 120`** — ~14 `Vector3` per frame in `updateSabers` plus two in the
beam; module-scope scratch vectors, as in `cinema()`.

**E5GL-8 · Low · `era5gl.ts:129`** — `camera.fov=lerp(camera.fov,cin.f,0.1)` is frame-rate dependent; use
`1-Math.pow(0.002,dt)` (`dt` is already computed on line 128).

**E5GL-9 · Low (end card legibility) · `era5gl.ts:89` (outro camera) with `main.ts:47` (cards).**
`full8-bar95.6-era5.png`: "IAN GINN · FOR THE DEPUTY'S MAXIMALISTS" sits directly over a bright cyan arch and the
`#cfd3dc` text nearly vanishes. Either darken the frame under the card (the MOOD row at 95.2 already fades fog to black
— extend it to a `scene` dim via `renderer.toneMappingExposure` → 0.3 over bars 94.9–95.4) or give the card a
translucent panel. This is the ask of the whole piece; it should be the most legible frame.

**E5GL-10 · Nit · `era5gl.ts:136`** — `window.__E5GL` debug hook ships to production; gate it on `import.meta.env.DEV`.

Visual check: `full8-bar75.6-era5.png` (lens opening, sabers low like VR hands, word faces bold), `full8-bar85.5-era5.png`
(co-pilot orb, pieces ahead, readable near words) match the description. The `e5final-*` and `after-*-bar80` screenshots
are from the retired agents version and should be deleted so nobody reviews them by mistake.

---

## 8. Cross-cutting notes

### 8.1 Duplicated helpers that belong in `core.ts`
| Helper | Copies | Suggested `core.ts` export |
|---|---|---|
| `canvasTex(w,h,fn)` | `era3gl.ts:11`, `era5gl.ts:27` (differ only by `magFilter`) | `canvasTex(w,h,fn,{nearest})` |
| `textSprite` + `texCache` | `era3gl.ts:20`, `era5gl.ts:29` | one `TextSprites` cache with `dispose()` |
| `pulse = 1-((t/BEAT)%1)` | `era2.ts:91`, `era4.ts:46`, `era5.ts:46`, `era5gl.ts:114,126,128,131` | `beatPulse(t)` |
| smoothstep `q*q*(3-2*q)` | `era5.ts:49`, `era5gl.ts:123,124` while `core.smooth` exists | use `smooth` |
| exponential damping `x+=(tx-x)*(1-Math.pow(k,dt))` | every era | `damp(a,b,k,dt)` |
| stroke+fill HUD text | `era2.ts:106`, `era3.ts:37–40`, `era4.ts:96–102` | `hudText(ctx,txt,x,y,fill,stroke)` with the `MOBILE` font floor from E4-2 |
| era guard `if(t<start-TRANS||t>=end)return` | E2, E3, E4 | `inEra(i,t)` (and have `main.ts` skip `update` for eras that are not live instead of calling all five every frame) |
| `rrect`, `hexa` | `era4.ts:45,75` (also in retired `world.ts` as `rgb`) | `core` |
| `hex(n)` | `era3gl.ts:22` | `core` |

### 8.2 Inconsistent naming
- The same concept — lyric pickups — is `words/kills` (E1), `coins/coinsGot/coinsAll` (E2), `words/spawned/missed`
  (E3, where they are *lines*), `got/total/signs` (E4), `hits/misses/spawned/built` (E5). Cases and CASES.md have to
  know all five. Suggest a common `S.collect={got,total}` in every era plus era-specific extras.
- `ERAS[4].name` is `'NOW · AGENTS'` (`core.ts:23`; scrubber shows "AGENTS") while the chapter label is
  "5 · DIRECTING AGENTS" and CONTEXT-PROMPT says "NOW · VR + AI". CASES.md still says "1997 Saturn racer" (it is 1995).
- E3 HUD `LINES` vs case/doc `WORDS` (E3-5). E5.3's CASES.md text ("built# === hits") no longer matches the case
  ("at least every other cut") or the code (every other word).
- Module objects are `E1..E5`, `E3GL`, `E5GL`, but the retired one is `WORLD`/`WD`.

### 8.3 Fonts, HUD scale and phones
All in-canvas HUD text is bitmap text sized for the 960-logical canvas; on an 844-px-wide iPhone the canvas is ~630 CSS
px, so 5–8 px fonts render at 3.3–5.3 CSS px (eras 3, 4, 5 overlays). Eras 1 and 2 are immune because they draw at
480/320 and scale up. A `MOBILE` font floor (E4-2) in a shared `hudText` fixes it everywhere at once. Also gate the
first frame on the web font (E1-3) — three modules cache glyphs forever.

### 8.4 Three WebGL contexts and a 2D composite
CRT, E3GL and E5GL each own a renderer; `main.ts` `drawImage`s the GL canvas onto the 2D canvas every frame
(1920×1080 at dpr 2). iOS Safari caps live contexts and each costs memory; the copy is bandwidth on the phone. A single
renderer with three scenes (or `renderer.setRenderTarget` per era) and drawing the 2D HUD on top with an orthographic
pass would remove two contexts and the per-frame readback-free copy. Not urgent, but it is the structural reason the
phone tier needs "low".

### 8.5 `world.ts`
`src/world.ts` (132 lines, 23 KB) is the retired isometric sandbox + agents era. **Nothing imports it**: grep over
`src/`, `index.html`, `tools/` finds no `from './world'`, no `WORLD`, `WD`, `CODE_RAIN`, `mixc` or `rgb` use outside
the file itself. It still contains `Math.random()` in simulation code (`world.ts:29, 57`), draws into `cv` directly
for a 2D bloom, and `README.md:66` wrongly says era 5 uses its "agent roles, code snippets and colour helpers" (era 5
now has its own `MAG/CYAN/GRN/YEL` and the ROLE names live in `era4.ts:11 ROLES`). Vite tree-shakes it out of the
bundle, but `tsc` still type-checks it and every reader has to work out whether it is live. Recommendation: delete it
(it is in git history) and fix the README line; if the agent-role table is wanted for the era-4 notifications, move the
five `[colour,name]` pairs into `core.ts` and import them in `era4.ts`.

### 8.6 Verification against the reports
- `report-full8.json` (08:37): 59 pass / 1 fail / 2 page errors. The failure is E5.3 under its *previous* wording
  ("builds one arena piece per cut": hits 107, built 70) — the case was since relaxed to "at least every other cut".
  The two errors (`HK.toggleCaptions is not a function`, `HK.seek is not a function`) come from key presses racing
  module init; `core.ts` now uses `HK.x?.()`, so a re-run should be clean — it has not been re-run since (core.ts
  09:35 > report 08:37).
- `report-full7.json` / `report-mob7.json`: T1 failed with "parsed 0 lyric lines from src/core.ts" — the case parses
  `LYRICS` out of the TypeScript source with a regex (§9).
- The e1/e2 fields of the final history rows (bars 56–96) show `score 0 / coinsAll 0`: not a regression. Case helpers
  (`era3.mjs run()`, `era4.mjs replay()`) call `ETM.seek` from inside non-"isolated" cases, and `seek()` re-inits all
  five eras, so the history after bar 56 reflects re-initialised E1/E2 state (§9, C-5). During bars 19–37 the same
  history shows era 2 collecting 19/31 phrases with 3 stomps and 0 deaths.
- Era 5 "sim" 862 ms per simulated second → shader compiles inside the one render per step (E5GL-1), not sim cost.

---

## 9. Case files (`tools/test/cases/*.mjs`) — brittleness

**C-1 · High · `era1.mjs:15, 89`, pattern `import(new URL('src/era1.ts',location.href).href)`.** Only the Vite dev server
serves TypeScript at `/nextlevel/src/era1.ts`; against `vite preview`, GitHub Pages or the artifact host the import
404s, the harness matches `dynamically imported module|Failed to fetch` and **silently skips** E1.4 and E1.6 (the two
cases that actually test the pixel-exact death and readability). Patch: expose what the cases need from the page and
import nothing.
```ts
// main.ts
(window as any).ETM={..., mod:{E1,E2,E3,E4,E5}, lo:{lo1,lo2,lo3}, lyrics:LYRICS, eras:ERAS}
// era1.mjs
const {E1}=ETM.mod,{lo1}=ETM.lo;
```

**C-2 · High · `transport.mjs:5`, `era1.mjs:41`, `era4.mjs:23` — `LYRICS` regex-parsed from `src/core.ts` source.**
`^\[([\d.]+),"(.*)"\],?\]?;?$` breaks on any reformatting (trailing comment, a line with an apostrophe escaped
differently, two entries on one line, CRLF without `\r` stripping in `era4.mjs`). It already failed twice
(`report-full7`, `report-mob7`: "parsed 0 lyric lines"). Read `ETM.lyrics` from the page instead (C-1), and keep the
40-line sanity check.

**C-3 · Medium · `era1.mjs:6, 58, 69` — `LINE1='One form, one desk, one line to hold'` is not the current first line** ("One prompt, one box, one line to hold"). The test drives E1 directly so it still runs, but `x0=231` "centred under the line" and E1.6's "tallest glyph" measurement now describe a line that is not in the piece. Take `LINE1=ETM.lyrics[0][1]` and compute the centre from `E1.S.lines[0]` instead of a constant.

**C-4 · Medium · `era1.mjs:16` mirrors `ZFAR/ZNEAR/TRAVEL/ROWD/F/VPY`** from `era1.ts:5–7`; drift is silent. Export `E1.K`
(E1-7) and read it.

**C-5 · Medium · `run.mjs:113` `isolated=c=>/ETM\.seek\(/.test(String(c.fn))`** — detects isolation by regexing the case
source, so a seek hidden in a helper (`era3.mjs run()`, `era4.mjs replay()`, `transport.mjs at()`) is not detected.
Those cases then run *inside* the main loop, `seek()` re-inits every era, and every later history row for the finished
eras is garbage (see 8.6). Make it explicit: `{name,era,bar,isolated:true,fn}` and have `seek` not be reachable from
inline cases (or snapshot/restore `ETM.probe()`-relevant state around them).

**C-6 · Medium — no `era2.mjs`.** CASES.md lists E2.1–E2.6 (first-frame sprite, ground contact, ? blocks ≥ 50 %,
stomps, hop-fall-drop-in death, run-frame animation, camera/speed) and none is implemented; era 2 is only covered by
the global NaN/era-index checks. The full8 history (19/31 phrases, 3 stomps, 0 deaths) would satisfy E2.2/E2.3 today,
so the cases can be written against `history` alone in ~30 lines.

**C-7 · Low · `era3.mjs:1–5`, `era4.mjs:2–5`, `era1.mjs:8–11`** — headers still say "main.ts only dispatches lyric
lines while `playing` is true"; `main.ts:58` now dispatches when `stepping`, E1.0 passes, and `SHIM` in `era1.mjs:11`
is defined but never used. The `ETM.setPlaying(true)` wrappers in `era3.mjs:9` and `era4.mjs:13` are therefore
unnecessary — and risky: `setPlaying(true)` calls `songPlay()`, so with `public/song.mp3` present the harness would
start the audio element and the next real frame would read `songTime()` from it. Remove the wrappers and the comments.

**C-8 · Low · `era3.mjs:14`, `era4.mjs:18–19`** — HUD and phone geometry probed by hard-coded pixel boxes
(`cnt(18,74,220,90)`, `px(480-131+5,300)`, `365+20+i*45`). Any HUD move or phone resize fails the case with an
unhelpful message. Read the constants from the page (`E4.K={PW,PX0,SX,SY,GW,GH}`) or probe by colour in a larger area.

**C-9 · Low · `era4.mjs:36, 40, 44`** — `at(S,74.9).e4` throws `TypeError` if the replay stopped early; `at` should
return the last sample or the case should fail with a message.

**C-10 · Low · `transport.mjs:21` T2** — seek determinism is only checked for era 3 (bar 40). Add one per era
(`[3, 22, 40, 60, 80]`), and a *play-vs-seek* check (`seek(a); step(b-a)` vs `seek(b); step(0.05)` compared on the
scalar fields) — that is the check that would have caught E3-1, E5-1 and E4-1.

**C-11 · Low · `era5.mjs:7`** — E5.3's bound `built# >= hits*0.5` encodes the "every other word" rule twice (code and
test); if the rule changes to "every word that is a noun" the test is wrong, not the game. Read the expected count from
`E5.S.blocks.filter(b=>b.hit&&(b.k%2===0||b.echo)).length` via a probe extension, or assert `built# === S.builtExpected`
maintained by the sim.

**C-12 · Nit — stale screenshots.** `tools/test/shots/` holds 324 files including the retired era-5 set
(`e5final-*`, `e5v2-*`, `after-*-bar80`) and `before-*`/`after-*` sets from earlier layout work. Have `run.mjs` write to
`shots/<tag>/` and delete the directory at the start of a tagged run.

---

## 10. Top five changes I would make first

1. **Unify seek and play in E5 and E3** (E5-1, E3-1): one `cut()` path replayed by `init`, and `E3.init` starting
   from `start-TRANS` with a deterministic car catch-up. These are the two places where the stated contract is false
   today, and C-10 (play-vs-seek case) makes it stay true.
2. **Remove the 56 per-block `PointLight`s and warm the shaders** (E5GL-1). It is the single biggest phone-side hitch,
   it explains the 862 ms/s "sim" number, and it is a deletion.
3. **Gate the first frame on the web font and add a `MOBILE` font floor in a shared `hudText`** (E1-3, E4-2, E5-5,
   §8.3). Fixes three cached-texture modules and makes the phone HUD readable in one pass.
4. **Make the cases independent of the dev server and of `core.ts` source text** (C-1, C-2, C-5): expose `ETM.mod`,
   `ETM.lyrics`, mark isolated cases explicitly. Until then E1.4/E1.6 silently skip on production builds and T1 fails
   whenever someone touches the lyric table.
5. **Delete `world.ts`, fix README:66, add `era2.mjs`, kill the three stray `Math.random` calls in sim code**
   (§8.5, C-6, E1-1, E1-2). Small, mechanical, and it closes the "legacy helpers" question for the next reader.

Second tier, in order: E5-2 (co-pilot stuck on STANDING BY), E5GL-9 (end-card legibility), E4-1 (re-dispatch the line
in progress on seek), E5GL-2/3 (texture size and shared geometries), E3GL-1 (scratch vectors), E2-1 (monotonic
generation counter), E2-2 (54-char HUD line).
