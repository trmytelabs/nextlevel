# Overnight run — status and hand-off

Project: **Everything, Then More** — a 3-minute playable music video submitted to join the Deputy's Maximalists
(Government of Alberta). Five eras of games (1978 arcade crawl → 1991 16-bit platformer → 1997 Saturn racer →
2013 mobile flappy → NOW: AI agents building the level ahead of the player), lyrics are gameplay, all on a 128 BPM
clock (96 bars = 3:00). Owner: Ian Ginn. The user's standing instruction: *"Work all night to make this the best
submission. I approve all actions. I want to wake up with something incredible. Don't stop, keep improving."*

## How to resume (for a fresh session)
1. `cd C:\dev\maximalist` — repo `trmytelabs/maximalist`, branch `scaffold-vite`, PR #1 open.
2. Dev server: `npx vite --port 5174` (serves http://localhost:5174/maximalist/). Check it is up before testing.
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
- [ ] 3. Finale must read as a real new game: rigged runner character, agent drones with thruster trails,
      architecture kit for sector variety, cinematic camera at bar 75 drop and bar 89 boss, denser skyline,
      de-cluttered agent labels (they overlap at the build front), evolving lighting. Files: `src/era5.ts`, `src/era5gl.ts`,
      Blender scripts under `tools/blender/`.
- [ ] 4. Per-era verification agents (running): era1–4 fix in place, era5 + transport verify-only. Merge their case files,
      re-run the full harness, fix what they report.
- [ ] 5. Packaging: merge PR #1 → main, make repo public, GitHub Pages workflow (`.github/workflows/pages.yml`), CI
      workflow that runs the harness on push (Chrome is preinstalled on ubuntu runners; set `EDGE=/usr/bin/google-chrome`
      and start `vite preview` first), README screenshots + credits, LYRICS.md final text.
- [ ] 6. "Full-blown app" extras: PWA manifest + icons (Add to Home Screen), Open Graph tags for link previews,
      `public/CNAME` placeholder for a custom domain (user must buy the domain and point DNS at GitHub Pages),
      optional MP4 recording of the autopilot run.

## Known issues / observations from the last full run (2026-10-23 night)
- Era 2 at bar 29: SCORE 0, WORDS 0 — autopilot may not be collecting word pickups. (era2 agent)
- Era 3 at bar 47: WORDS 0 — lyric words fly in but are never collected under autopilot. (era3 agent)
- Era 5 at bar 86: agent status labels pile up and overlap at the build front; WORDS stays 0 until the boss (bar 89).
- Software GL render cost era 5 ≈ 74 ms/frame (SwiftShader, not representative); keep the low tier for phones.

## Needs the user (cannot be done overnight)
- Suno vocal track → drop at `public/song.mp3`, then nudge `[ ]` / tap-sync `T`, save `Y` → `public/timing.json`.
- Real verse-5 examples replacing the placeholder line "Spawn a plan, spawn a form, spawn a fix on the fly".
- Confirm the name on the cards ("IAN GINN"). Optional Beardmonkey car GLB via a Sketchfab account.
- A domain name, if wanted (then point DNS to GitHub Pages and set `public/CNAME`).
