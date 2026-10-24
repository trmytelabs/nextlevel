# Morning report (2026-10-24, written ~1:40 AM)

**Play it:** https://claude.ai/artifact/BtigJtQXJGtrXoycKL3Xvm (version 7). On the phone: open the link, turn the phone
sideways, hold the left/right edge to move, tap the top half to jump, tap the bottom half to fire. The FX button (or G)
switches to the light graphics tier; phones default to it. Sound is off until you press SOUND (phones need a tap first).

**What changed overnight**
- Title card (your name, "For the Deputy's Maximalists", thesis lines) over bars 0–2 and an end card at bar 95.
- A generative Web Audio score that changes with each era (square-wave arcade → FM 16-bit → rave → EDM plucks → everything
  at once), with a soft limiter. It mutes itself once a real Suno track exists at `public/song.mp3`.
- Phone support: rotate card in portrait, safe-area insets, touch-zone hints, smaller control bar, PWA manifest + icons
  (Add to Home Screen works), Open Graph preview image, graphics quality tier.
- Finale: pivoted runner with cape trails, agent thruster ribbons, labels that no longer pile up, cinematic camera for
  the bar-75 drop / bar-89 boss / outro, mood lighting that shifts with the rules, a three-layer skyline, tower crowns,
  signs and boss word plates that the autopilot can actually reach (they were above jump height before).
- Six verification agents ran per era; their fixes landed (era 1 pixel-exact dodge, era 2 landing oracle, era 3 word
  pacing and banking, era 4 word distribution, phone CSS). A headless test harness (`node tools/test/run.mjs`) now drives
  the whole three minutes in Edge with software WebGL: **69 cases pass, 0 page errors**, words are collected in every era
  under autopilot (e2 56/77, e3 70/87, e4 54/54, e5 81 + boss). `.github/workflows/test.yml` runs it on every push.
- `node tools/test/record.mjs` records an MP4 of the autopilot run (ffmpeg installed, user scope). Recorded: `out/run.mp4`
  (1280 wide, 138 MB) and `out/run-960.mp4` (36 MB, sent to you in chat). Mux the song later with
  `ffmpeg -i out/run.mp4 -i public/song.mp3 -c:v copy -c:a aac -shortest out/run-with-song.mp4`.
- Repo: everything is committed and pushed on `scaffold-vite` (PR #1 still open, see below).

**Needs you (a few minutes)**
1. Merge PR #1 and make the repo public + enable Pages: the permission classifier blocked me from doing both. From a
   terminal: `gh pr merge 1 --repo trmytelabs/maximalist --merge`, then
   `gh repo edit trmytelabs/maximalist --visibility public --accept-visibility-change-consequences`, then
   `gh api -X POST repos/trmytelabs/maximalist/pages -f build_type=workflow`. The site then deploys to
   https://trmytelabs.github.io/maximalist/ on every push to main. A custom domain is a CNAME record pointing at
   `trmytelabs.github.io` plus `public/CNAME` containing the domain.
2. Suno: make the track from `LYRICS.md`, drop it at `public/song.mp3`, then nudge `[ ]` and tap-sync `T` / save `Y`.
3. Verse 5 still has the placeholder "Spawn a plan, spawn a form, spawn a fix on the fly" — give me three real examples.
4. Confirm "IAN GINN" on the cards and the end-card credit "Built in a day with AI agents."

---

# Overnight run — status and hand-off

Project: **Everything, Then More** — a 3-minute playable music video submitted to join the Deputy's Maximalists
(Government of Alberta). Five eras of games (1978 arcade crawl → 1991 16-bit platformer → 1995 Saturn racer →
2013 mobile flappy → NOW: AI agents building the level ahead of the player), lyrics are gameplay, all on a 128 BPM
clock (96 bars = 3:00). Owner: Ian Ginn. The user's standing instruction: *"Work all night to make this the best
submission. I approve all actions. I want to wake up with something incredible. Don't stop, keep improving."*

## How to resume (for a fresh session)
1. `cd C:\dev\maximalist` — repo `trmytelabs/maximalist`, branch `scaffold-vite`, PR #1 open.
2. Dev server: `npx vite` (prints the port; currently http://localhost:5173/maximalist/). Pass `--url <that>/` to the harness if it is not 5174.
3. Verify: `node tools/test/run.mjs` (full run), `--era N`, `--controls`, `--mobile`, `--q low`. Cases live in
   `tools/test/cases/`, spec in `tools/test/CASES.md`, screenshots in `tools/test/shots/`.
4. Type-check: `npx tsc --noEmit -p .`. Commit with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
5. Publish the claude.ai artifact after each milestone: `npx vite build --base ./`, strip the html skeleton into
   `dist/artifact.html` (see README "Artifact publish"), base64 `dist/models/*.glb` → `.glb.txt`, publish to
   https://claude.ai/artifact/BtigJtQXJGtrXoycKL3Xvm with root `dist` and a files map.
6. Keep this file current: tick items below, add findings. If the usage window runs out again, create a one-time
   scheduled task for a few minutes after the reset that says "read C:\dev\maximalist\NIGHT.md and continue".

## Plan (approved by the user)
- [x] 1. Title card (bars 0–2) and end card (bar 94.9+) — `src/main.ts cards()`.
- [x] 2. Generative Web Audio score per era — `src/music.ts` (muted when a Suno track exists at public/song.mp3).
- [x] 2b. Phone support: rotate card, safe areas, touch hints, FX quality tier (G key / FX button, `?q=low`).
- [x] 2c. Headless test harness (puppeteer-core + Edge SwiftShader) — `tools/test/run.mjs`; full run passes clean.
- [~] 3. Finale (first pass landed: pivoted runner with cape trails, agent thruster ribbons, distance-scaled de-cluttered labels,
      cinematic intro/boss/outro camera, mood lighting by bar, 3-layer skyline, tower crowns). Still open: a Blender-rigged
      character, more sector variety, less overlap between the rule banner and the build-front label at the top.
      Original brief: rigged runner character, agent drones with thruster trails,
      architecture kit for sector variety, cinematic camera at bar 75 drop and bar 89 boss, denser skyline,
      de-cluttered agent labels (they overlap at the build front), evolving lighting. Files: `src/era5.ts`, `src/era5gl.ts`,
      Blender scripts under `tools/blender/`.
- [x] 4. Per-era verification agents ran (cut off by the usage limit but their fixes landed and type-check): era 1 pixel-exact
      dodge, era 2 landing oracle, era 3 word pacing/lanes, era 4 word distribution, audio limiter, phone CSS. Case files for
      eras 1,3,4,5 + transport exist. Era 5 signs/boss words were unreachable under autopilot — fixed. Words now collected in
      every era under autopilot (e2 56/77, e3 70/87, e4 54/54, e5 81 + boss).
- [ ] 5. Packaging: merge PR #1 → main, make repo public, GitHub Pages workflow (`.github/workflows/pages.yml`), CI
      workflow that runs the harness on push (Chrome is preinstalled on ubuntu runners; set `EDGE=/usr/bin/google-chrome`
      and start `vite preview` first), README screenshots + credits, LYRICS.md final text.
- [ ] 6. "Full-blown app" extras: PWA manifest + icons (Add to Home Screen), Open Graph tags for link previews,
      `public/CNAME` placeholder for a custom domain (user must buy the domain and point DNS at GitHub Pages),
      optional MP4 recording of the autopilot run.

## Known issues / observations from the last full run (2026-10-23 night)
- (fixed) Eras 2/3/5 WORDS 0 under autopilot. Root causes: era 2/3 placement, era 5 signs placed above jump height, and the
  headless harness never dispatched lyric lines while paused (ETM.step now dispatches).
- ffmpeg installed via winget (user scope); `node tools/test/record.mjs` records an MP4 of the autopilot run (no audio).
- The one-time scheduled resume task was disabled after this session resumed itself; re-enable/re-create it if needed.
- Software GL render cost era 5 ≈ 74 ms/frame (SwiftShader, not representative); keep the low tier for phones.

## Needs the user (cannot be done overnight)
- Suno vocal track → drop at `public/song.mp3`, then nudge `[ ]` / tap-sync `T`, save `Y` → `public/timing.json`.
- Real verse-5 examples replacing the placeholder line "Spawn a plan, spawn a form, spawn a fix on the fly".
- Confirm the name on the cards ("IAN GINN"). Optional Beardmonkey car GLB via a Sketchfab account.
- A domain name, if wanted (then point DNS to GitHub Pages and set `public/CNAME`).
