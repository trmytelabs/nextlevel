# Everything, Then More — lyrics and Suno brief

A playable music video submitted to join the Deputy's Maximalists. Five eras of games tell three stories at once: how far the technology came, how far the tools at work came, and how far I came learning to use AI in my work, from doing everything by hand to directing a hundred agents.

128 BPM. One bar = 1.875 s. 96 bars = 3:00. The game is timed to the bar map below, so if Suno gives you a take with different section lengths, re-time the game rather than the song: the era starts live in `ERAS` and the line timings in `LYRICS`, both in `src/core.ts`, and both are in bars.

## Sound arc

The song ages forward the same way the game does. Each era has its own sound, and every switch lands on the bar where the game switches.

| Bars | Time | Era | Story | Sound |
|---|---|---|---|---|
| 0–19 | 0:00–0:36 | Arcade | Before AI. One form, one desk, by hand. | 8-bit chiptune. Square-wave lead, triangle bass, noise-channel hats, no real drums. Mono, dry, a little lonely. A four-note descending march under everything. |
| 19–37 | 0:36–1:09 | 32-bit 2D | The box talks back. Teaching myself to ask. | Colour arrives with the chorus. CD-era synthpop: FM bass into sampled drums, brass stabs, chimes on the offbeats. Bright and joyful. |
| 37–56 | 1:09–1:45 | Saturn 3D | Bringing it to work at the speed of light. | 90s breakbeat rave. Amen-style breaks, hoover and supersaw stabs, filtered pads, reverb opens up. Half-time on the verse, full-time on the chorus. |
| 56–75 | 1:45–2:20 | Mobile | AI in my hand, evolving every week. | Bright 2013 EDM pop. Clean plucks, sidechained chords, trap hi-hat rolls, phone pings and taps as percussion. The bridge thins to a heartbeat and one voice. |
| 75–96 | 2:20–3:00 | Agents | A hundred hands. Full automation. The ask. | Futuristic hyperpop synthwave. Every earlier era stacked at once: chiptune lead on top, breaks under the kick, FM bass, vocoded doubles, glitch edits, cinematic risers. Then one square-wave note alone. |

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

Section tags are in Suno's bracket format. The bracketed sound notes steer the arrangement; delete them if a take ignores the lyrics.

```
[Intro – 8-bit chiptune, square wave only, dry]
(instrumental, 4 seconds)

[Verse 1 – chiptune, half-spoken, sparse]
One form, one desk, one line to hold
Green text on glass in a room gone cold
Type, print, file, that's how I learned
A stack of them waiting, and I waited my turn

[Pre-Chorus – march speeds up, noise hats enter]
But I wanted it faster
I wanted something new

[Chorus – 16-bit FM synthpop bursts in, full colour, chanted]
Turn it all the way up, then a little bit more
That's the only setting I've been looking for
Turn it all the way up, let the whole thing run
I don't do a little, I do everything, then some

[Verse 2 – 16-bit, bouncy, chimes on the offbeats]
Then the box talked back, and I talked back too
Taught myself the questions till the answers came true
Ask on the beat, every answer's a drum
I was learning in weeks what took years to come

[Instrumental – transition, the beat tilts into 90s breakbeat]

[Verse 3 – breakbeat rave, half-time, filtered pads]
Brought it back to my desk at the speed of light
Fog at the edge where the backlog quits
Foot to the floor and the floor is a pipeline
A thousand problems, and I'm solving them tonight

[Chorus – full-time rave, hoover stabs, big reverb]
Turn it all the way up, then a little bit more
That's the only setting I've been looking for
Turn it all the way up, let the whole thing run
I don't do a little, I do everything, then some

[Instrumental – transition, breaks fall away to clean plucks]

[Verse 4 – 2013 EDM pop, sidechained, phone pings as percussion]
Now the whole toolbox fits in my hand
One thumb, one prompt, and it's solved again
Every week I'm evolving, I don't slow down
Wherever I ask is a place I can go

[Bridge – drums drop out, heartbeat kick, one voice, growing whispers]
Wait, who's drafting that?
I didn't write that there
I said what I needed out loud
And a hundred hands appeared

[Drop – hyperpop synthwave, every era layered, vocoded doubles]

[Verse 5 – fast, stacked, glitch edits on the beat]
A hundred little hands and they all learned from mine
Maximalist by trade, I don't wait in line
Spawn a plan, spawn a form, spawn a fix on the fly
I point at the problem, it's solved by the time I blink

[Final Chorus – biggest moment, chiptune lead on top of everything]
Turn it all the way up, then a little bit more
Every tool I ever learned is in here
Turn it all the way up, let the whole thing run
Deputy, I'm ready, make me a Maximalist

[Instrumental – everything strips away layer by layer]

[Outro – single square wave, dry, spoken]
One desk. One job.
Ready when you are. Press start.
```

## Bar map for lining up a take

Lines land on these bars in the game. Use it to check a generation against the timeline, or to re-time the game to the take you like.

| Bar | Time | Line |
|---|---|---|
| 2 | 0:03 | One form, one desk, one line to hold |
| 4 | 0:07 | Green text on glass in a room gone cold |
| 6 | 0:11 | Type, print, file, that's how I learned |
| 8 | 0:15 | A stack of them waiting, and I waited my turn |
| 12 | 0:22 | But I wanted it faster |
| 14 | 0:26 | I wanted something new |
| 19 | 0:35 | Turn it all the way up, then a little bit more (16-bit begins) |
| 21 | 0:39 | That's the only setting I've been looking for |
| 23 | 0:43 | Turn it all the way up, let the whole thing run |
| 25 | 0:46 | I don't do a little, I do everything, then some |
| 27.5 | 0:51 | Then the box talked back, and I talked back too |
| 29.5 | 0:55 | Taught myself the questions till the answers came true |
| 31.5 | 0:59 | Ask on the beat, every answer's a drum |
| 33.5 | 1:02 | I was learning in weeks what took years to come |
| 37 | 1:09 | (racer begins) |
| 38 | 1:11 | Brought it back to my desk at the speed of light |
| 40 | 1:15 | Fog at the edge where the backlog quits |
| 42 | 1:18 | Foot to the floor and the floor is a pipeline |
| 44 | 1:22 | A thousand problems, and I'm solving them tonight |
| 47 | 1:28 | Turn it all the way up, then a little bit more |
| 49 | 1:31 | That's the only setting I've been looking for |
| 51 | 1:35 | Turn it all the way up, let the whole thing run |
| 53 | 1:39 | I don't do a little, I do everything, then some |
| 56 | 1:45 | (mobile begins) |
| 57 | 1:46 | Now the whole toolbox fits in my hand |
| 59 | 1:50 | One thumb, one prompt, and it's solved again |
| 61 | 1:54 | Every week I'm evolving, I don't slow down |
| 63 | 1:58 | Wherever I ask is a place I can go |
| 66.5 | 2:04 | Wait, who's drafting that? |
| 68 | 2:07 | I didn't write that there |
| 69.5 | 2:10 | I said what I needed out loud |
| 71 | 2:13 | And a hundred hands appeared |
| 75 | 2:20 | A hundred little hands and they all learned from mine (agents begin) |
| 77 | 2:24 | Maximalist by trade, I don't wait in line |
| 79 | 2:28 | Spawn a plan, spawn a form, spawn a fix on the fly |
| 81 | 2:31 | I point at the problem, it's solved by the time I blink |
| 83 | 2:35 | Turn it all the way up, then a little bit more |
| 85 | 2:39 | Every tool I ever learned is in here |
| 87 | 2:43 | Turn it all the way up, let the whole thing run |
| 89 | 2:46 | Deputy, I'm ready, make me a Maximalist |
| 94 | 2:56 | One desk. One job. |
| 95 | 2:58 | Ready when you are. Press start. |

## Still open

Verse 5 line three, "spawn a plan, spawn a form, spawn a fix on the fly," is a placeholder for two or three real things automated at work. Swap in the real nouns before recording. One true, specific example here and on the end card is what turns the verse from swagger into evidence.

## Syncing the game to your Suno track

1. Export the track from Suno as MP3 and save it as `public/song.mp3`. Reload. The game now runs off the audio's clock and starts paused; press Play. The synthesized click track is muted automatically while a song is present.
2. Line up the start. The clock in the top right shows `SONG +0.00s`. Press `]` to push the game later against the song by 50 ms and `[` to pull it earlier, until the first chorus hits on bar 19. The offset is remembered in the browser.
3. If Suno's sections don't land on the bar map, tap them in. Play the song from the start and press `T` the moment each lyric line begins, all 40 lines, in order. The clock shows `TAP 12/40` as you go. Press `U` to clear and start over.
4. Press `Y` to download `timing.json`. Save it as `public/timing.json` and reload. Every line and every era switch now follows your taps instead of the bar map.

`timing.json` is plain JSON: `offset`, a `lines` array of seconds for each lyric line, and an `eras` array of seconds for each era start, derived from the chorus and verse taps. Edit it by hand if a tap was late.

## Getting Suno to change sound on the bar

Suno will not hold five genres in one prompt reliably. Build the song in pieces with Extend:

1. Custom mode. Paste the Intro, Verse 1, Pre-Chorus and first Chorus only. Style: the chiptune and 16-bit parts of the long prompt. Pick a take where the chorus arrives near 0:36.
2. Extend from the end of that chorus with Verse 2 and the first instrumental, style set to the 16-bit into breakbeat description.
3. Extend again with Verse 3 and Chorus 2 in the rave style, then again with Verse 4 and the Bridge in the EDM pop style, then the Drop, Verse 5, Final Chorus and Outro in the hyperpop synthwave style.
4. Put "128 BPM" in every style field so the extensions stay on grid. Listen for the kick staying at the same tempo across joins.
5. Once you have a full track, note the real time of each section start and the game can be re-timed to it. Everything else follows from the two tables in `src/core.ts`.

Keep the lyric text exactly as written if you can. The words are gameplay objects in every era, so a changed word changes what appears on screen. If you change a line, update `LYRICS` in `src/core.ts` to match.
