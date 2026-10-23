# Everything, Then More — lyrics and Suno brief

128 BPM. One bar = 1.875 s. 96 bars = 3:00. The game is timed to the bar map below, so if Suno gives you a take with different section lengths, re-time the game rather than the song: the era starts live in `ERAS` and the line timings in `LYRICS`, both in `src/core.ts`, and both are in bars.

## Sound arc

The song should age forward the same way the game does. Each era has its own sound, and every switch lands on the bar where the game switches.

| Bars | Time | Era | Sound |
|---|---|---|---|
| 0–19 | 0:00–0:36 | Arcade | 8-bit chiptune. Square-wave lead, triangle bass, noise-channel hats, no real drums. Mono, dry, a little lonely. The four-note descending invader march under everything. |
| 19–37 | 0:36–1:09 | 16-bit | Colour arrives with the chorus. FM synth bass, bright PCM drums, Genesis / SNES brass stabs, coin chimes on the offbeats. Still crunchy, now joyful. |
| 37–56 | 1:09–1:45 | 32-bit | 90s breakbeat rave. Amen-style breaks, hoover and supersaw stabs, filtered pads, reverb opens up for the first time. Half-time feel on the verse, full-time on the chorus. |
| 56–75 | 1:45–2:20 | Mobile | Bright 2013 EDM pop. Clean plucks, sidechained chords, trap hi-hat rolls, phone notification pings and tap sounds as percussion. Polished and a bit too clean. The bridge thins to a heartbeat and a single voice before the drop. |
| 75–96 | 2:20–3:00 | Agents | Futuristic hyperpop synthwave. Everything that came before stacked at once: the chiptune lead on top, the breakbeat under the four-on-the-floor kick, the FM bass, vocoded doubles, glitch edits on the beat, cinematic risers. Maximal, then one square-wave note alone to end. |

## Suno style prompt

Short, under 200 characters:

```
128 BPM genre-evolving pop: 8-bit chiptune intro, 16-bit FM synthpop, 90s breakbeat rave, bright 2013 EDM pop, futuristic hyperpop synthwave finale; euphoric, glitchy, always building
```

Long, if your Suno version allows a longer style field:

```
A three-minute journey at a constant 128 BPM that ages forward through video game eras. Opens as dry 8-bit chiptune (square-wave lead, triangle bass, noise hats, a four-note descending march). The first chorus bursts into 16-bit FM synthpop with bright PCM drums and brass stabs. The second verse becomes 90s breakbeat rave with hoover stabs and big reverb. The third verse is clean 2013 EDM pop with plucks, sidechain and trap hi-hats, thinning to a heartbeat in the bridge. The final drop is futuristic hyperpop synthwave layering every previous era at once with vocoded doubles and glitch edits, ending on a single lonely square-wave note. Clear confident lead vocal, slightly vocoded in the finale. Euphoric, nostalgic, relentless forward motion.
```

## Lyrics with section tags

Section tags are in Suno's bracket format. The bracketed sound notes are there to steer the arrangement; delete them if a take ignores the lyrics.

```
[Intro – 8-bit chiptune, square wave only, dry]
(instrumental, 4 seconds)

[Verse 1 – chiptune, half-spoken, sparse]
One pixel, one life, one line to hold
Green light on glass in a room gone cold
Left, right, fire, that's all we knew
A row of them falling, a little of me too

[Pre-Chorus – march speeds up, noise hats enter]
But every wave came faster
And every wave came new

[Chorus – 16-bit FM synthpop bursts in, full colour]
Give me everything, then give me more
Every screen I ever sat in front of
Give me everything, then give me more
I don't want the game, I want what it's made of

[Verse 2 – 16-bit, bouncy, coin chimes on the offbeats]
Now I've got legs and the ground's got springs
Coins in the sky and the sky's got rings
Jump on the beat, every block's a drum
Wherever I land is where I'm from

[Instrumental – transition, the beat tilts into 90s breakbeat]

[Verse 3 – breakbeat rave, half-time, filtered pads]
Spin the world till it shows me a horizon
Fog at the edge where the polygons quit
Foot to the floor and the floor is a texture
A thousand triangles chasing the light

[Chorus – full-time rave, hoover stabs, big reverb]
Give me everything, then give me more
Every screen I ever sat in front of
Give me everything, then give me more
I don't want the game, I want what it's made of

[Instrumental – transition, breaks fall away to clean plucks]

[Verse 4 – 2013 EDM pop, sidechained, phone pings as percussion]
Now the whole arcade fits in my hand
One thumb, one tap, and I'm up again
Thread the gap and don't look down
Wherever I tap is a place I can go

[Bridge – drums drop out, heartbeat kick, one voice, growing whispers]
Wait, who's flying that?
I didn't tap that there
I said what I wanted out loud
And a hundred hands appeared

[Drop – hyperpop synthwave, every era layered, vocoded doubles]

[Verse 5 – fast, stacked, glitch edits on the beat]
A hundred little hands and they all learned from mine
Writing out a world while I'm still reading the line
Spawn a sky, spawn a road, spawn a rule I don't know
I'll play whatever you make me, just don't stop, go

[Final Chorus – biggest moment, chiptune lead on top of everything]
Give me everything, then give me more
Every game I ever played is in here
Give me everything, then give me more
Now the game is building a game, and it's building it for me

[Instrumental – everything strips away layer by layer]

[Outro – single square wave, dry, whispered]
One pixel. One life.
Press start.
```

## Bar map for lining up a take

Lines land on these bars in the game. Use it to check a generation against the timeline, or to re-time the game to the take you like.

| Bar | Time | Line |
|---|---|---|
| 2 | 0:04 | One pixel, one life, one line to hold |
| 4 | 0:08 | Green light on glass in a room gone cold |
| 6 | 0:11 | Left, right, fire, that's all we knew |
| 8 | 0:15 | A row of them falling, a little of me too |
| 12 | 0:23 | But every wave came faster |
| 14 | 0:26 | And every wave came new |
| 19 | 0:36 | Give me everything, then give me more (16-bit begins) |
| 21 | 0:39 | Every screen I ever sat in front of |
| 23 | 0:43 | Give me everything, then give me more |
| 25 | 0:47 | I don't want the game, I want what it's made of |
| 27.5 | 0:52 | Now I've got legs and the ground's got springs |
| 29.5 | 0:55 | Coins in the sky and the sky's got rings |
| 31.5 | 0:59 | Jump on the beat, every block's a drum |
| 33.5 | 1:03 | Wherever I land is where I'm from |
| 37 | 1:09 | (racer begins) |
| 38 | 1:11 | Spin the world till it shows me a horizon |
| 40 | 1:15 | Fog at the edge where the polygons quit |
| 42 | 1:19 | Foot to the floor and the floor is a texture |
| 44 | 1:22 | A thousand triangles chasing the light |
| 47 | 1:28 | Give me everything, then give me more |
| 49 | 1:32 | Every screen I ever sat in front of |
| 51 | 1:36 | Give me everything, then give me more |
| 53 | 1:39 | I don't want the game, I want what it's made of |
| 56 | 1:45 | (mobile begins) |
| 57 | 1:47 | Now the whole arcade fits in my hand |
| 59 | 1:51 | One thumb, one tap, and I'm up again |
| 61 | 1:54 | Thread the gap and don't look down |
| 63 | 1:58 | Wherever I tap is a place I can go |
| 66.5 | 2:05 | Wait, who's flying that? |
| 68 | 2:07 | I didn't tap that there |
| 69.5 | 2:10 | I said what I wanted out loud |
| 71 | 2:13 | And a hundred hands appeared |
| 75 | 2:20 | A hundred little hands and they all learned from mine (agents begin) |
| 77 | 2:24 | Writing out a world while I'm still reading the line |
| 79 | 2:28 | Spawn a sky, spawn a road, spawn a rule I don't know |
| 81 | 2:32 | I'll play whatever you make me, just don't stop, go |
| 83 | 2:36 | Give me everything, then give me more |
| 85 | 2:39 | Every game I ever played is in here |
| 87 | 2:43 | Give me everything, then give me more |
| 89 | 2:47 | Now the game is building a game, and it's building it for me |
| 94 | 2:56 | One pixel. One life. |
| 95 | 2:58 | Press start. |

## Getting Suno to change sound on the bar

Suno will not hold five genres in one prompt reliably. The way to get the arc exactly is to build the song in pieces with Extend:

1. Custom mode. Paste the Intro, Verse 1, Pre-Chorus and first Chorus only. Style: the chiptune and 16-bit parts of the long prompt. Pick a take where the chorus arrives near 0:36.
2. Extend from the end of that chorus with Verse 2 and the first instrumental, style set to the 16-bit into breakbeat description.
3. Extend again with Verse 3 and Chorus 2 in the rave style, then again with Verse 4 and the Bridge in the EDM pop style, then the Drop, Verse 5, Final Chorus and Outro in the hyperpop synthwave style.
4. Put "128 BPM" in every style field so the extensions stay on grid. Listen for the kick staying at the same tempo across joins.
5. Once you have a full track, note the real time of each section start and I'll re-time `ERAS` and `LYRICS` to it. Everything else in the game follows from those two tables.

Keep the lyric text exactly as written if you can. The words are gameplay objects in every era, so a changed word changes what appears on screen. If you do change a line, tell me and I'll update the game to match.
