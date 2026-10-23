# Everything, Then More

A three-minute music video that is also a game. Five eras of play, one continuous take, locked to a 128 BPM clock. It starts as Space Invaders and ends as a swarm of AI agents building a neon future city ahead of you while you play it. The lyrics are part of the gameplay in every era.

Prototype for the Maximalist team application. Single file, no build step, no dependencies beyond one Google font.

## Run it

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://localhost:8765/. Opening `index.html` directly also works.

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

Everything is in `index.html`, in order:

- Constants, `ERAS`, and `LYRICS`. All timing is in bars.
- `E1`, `E2`, `E3`: the arcade, platformer, and racer modules. The racer includes a small flat-shaded polygon renderer and the car, tree, and gate models.
- `WD` and `WORLD`: the isometric sandbox.
- `E5`: the agents era. `RULES` is the rule schedule, `genChunk` decides what each sector contains, `wire`, `fill`, and `lit` set how far ahead the agents build, and `agentModel` is the 3D drone.
- Transport, compositing, transitions, bloom, and HUD.

## Status

Prototype, pre-music. The synthesized click track stands in for the song. When the track exists, swap it for an audio element and read its current time as the master clock in the frame loop.
