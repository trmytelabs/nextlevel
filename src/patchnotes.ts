// ---------- PATCH NOTES: the end-card panel that shows what was built and how ----------
// Plain data so it is easy to keep current. No lyric text here (lyrics appear only in the caption and as gameplay).
// Keep every line true: it is the "what this project shows" page.
export const REPO_URL='https://github.com/trmytelabs/nextlevel';

type Sec={h:string,items:string[]};
export const NOTES:{title:string,sub:string,secs:Sec[]}={
 title:'PATCH NOTES',
 sub:'NEXT LEVEL · v1.0 · a playable music video by Ian Ginn',
 secs:[
  {h:'THE GAME',items:[
   'Five generations of games, five kinds of gameplay, one song. Each stage stands for a step in how I learned to work with AI.',
   'ARCADE: a retro-3D vector crawl. The lyrics fly in as voxel words you shoot apart.',
   '16-BIT: a platformer you steer yourself, with coins, caterpillars and ? blocks that release each line.',
   '3D CONSOLE: a racer on a Blender-built speedway. Each line is a gate to drive through.',
   'MOBILE: a one-thumb flyer on a phone, with notifications arriving as you play.',
   'VR: a synthwave saber lane. One saber follows your mouse or finger, and an AI co-pilot builds the arena from what you cut.',
   'Autopilot plays every stage and aims for every lyric. Press any key or touch to take over. Leave it alone on the title and a muted demo plays itself.',
   'Five hidden secrets, one per stage, for players who go exploring. Find all five for a special ending.',
   'Plays fully on phones: a thumb stick and action button beside the screen, or under it like a handheld when upright.']},
  {h:'THE SONG',items:[
   'Lyrics written to the story, then produced with Suno across several styles until one fit.',
   'Timed with faster-whisper: speech-to-text word timestamps, aligned to the lyric sheet with a sequence alignment (339 of 352 words matched).',
   'Swappable songs: each song is a small timing map (tempo, length, when every line starts). Every stage, lyric and set piece re-times itself to the loaded song.',
   'Tempo and length are measured from the audio itself by a small analysis tool, so a new song drops in without hand-timing.']},
  {h:'UNDER THE HOOD',items:[
   'TypeScript and Vite. Three.js (WebGL) for three stages, Canvas 2D for two, with a CRT shader for the retro stages.',
   'A deterministic simulation on the beat clock: any moment replays exactly, which is what makes it testable.',
   'Models built by code: Blender scripts generate the cars, track scenery and finale kit headlessly; the synthwave towers, palms and car are procedural.',
   'Each stage is a different kind of game engine: projection crawl, fixed-tick platform physics with a planning autopilot, a spline racetrack with traffic, a rhythm lane.']},
  {h:'QUALITY',items:[
   'An automated suite plays the whole video in a real headless browser: 65 checks on desktop and 97 more in an iPhone emulation pass.',
   'Gameplay checks cover collisions, deaths and respawns, lyric timing, autopilot coverage, the secrets and seeking to any moment.',
   'Visual-regression screenshots and a per-stage performance budget are checked on every run.']},
  {h:'CI/CD AND HOSTING',items:[
   'Public GitHub repo. GitHub Actions runs the full test suite on every push, on a self-hosted runner.',
   'Every merge to main builds and publishes to GitHub Pages, and deploys to my own server only if the tests pass.',
   'Deploys go through a restricted user that can only sync files into the site folder: no shell, no other access.',
   'The server: Caddy with automatic Let\'s Encrypt HTTPS and security headers (HSTS, a strict content policy), a firewall locked to SSH and web, fail2ban, unattended security updates and key-only SSH.',
   'My own domain, patchnotes.ca, with DNS on Cloudflare.',
   'Pull requests from forks never reach the build machine.']},
  {h:'HOW IT WAS MADE',items:[
   'Directed with AI agents (Claude Code) over about 100 commits: I set the vision, reviewed the work and asked why.',
   'Review agents played through every stage and reported problems. Each fix was confirmed by a test.',
   'Creative problem solving is the real skill now. The tools can build almost anything, so the work is knowing what to ask for.',
   'Every commit, test and decision is in the public repository.']},
 ]};
