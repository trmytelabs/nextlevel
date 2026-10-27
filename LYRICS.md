# Next Level — lyrics and Suno brief

A playable music video about leveling up with AI the way gaming did, just a lot faster. The soundtrack is **Press Start**, made with Suno from the lyrics below (2:59, about 143 BPM).

The lyric text here matches `LYRICS` in `src/core.ts` word for word, and `src/core.ts` is the source of truth: the words are gameplay objects in every stage, so a lyric change starts there. The game is not tied to one tempo: each song in `public/songs/<id>/` has a `map.json` with the second every line starts, and the stages re-time themselves to it (see the README).

## 1. Lyric sheet (paste into Suno's lyrics field)

Plain section tags only. Style cues go in the style field (section 3), not in brackets, so Suno does not sing them.

```
[Intro]

[Verse 1]
One coin, one prompt, and the game was on
Green text on glass, half right, half wrong
Ask, read, retry, take another turn
It made things up, and that's how I learned
But I wanted it faster
And it kept getting new

[Chorus]
Turn it up to eleven, then a little bit more
That's the only setting I've been looking for
Turn it all the way up, let the whole thing run
I don't do a little, I do everything, then some

[Verse 2]
Then the box talked back, and I talked back too
Taught myself the questions till the answers came true
Emails and briefings, every answer's a drum
I was learning in weeks what took years to come

[Verse 3]
Back at my desk, and I built me a crew
One sums up the meetings, one gets the inbox through
Project plans, status notes, they race down the line
Every lap they come back, and I check what they find

[Chorus]
Turn it up to eleven, then a little bit more
That's the only setting I've been looking for
Turn it all the way up, let the whole thing run
I don't do a little, I do everything, then some

[Verse 4]
Now the whole toolbox fits in my hand
Coaching on the bus, a deck before I land
AI Champion for the team, and the whole team grows
The office is anywhere my signal goes

[Bridge]
Wait, what if I built it?
Not a draft, the real thing
I said what I wanted out loud
And it came back running

[Final Verse]
From the plan to the push, every call is mine
Ran with the AI Maximalists, I don't wait in line
Brief the room, plan the sprint, code the fix on the fly
Write the tests, ship the build, and I still ask why

[Final Chorus]
Turn it up to eleven, then a little bit more
Every tool I ever learned, now I know what it's for
Turn it all the way up, let the whole thing run
Deputy, I'm ready, next level, here I come

[Outro]
The only limit now is how creative we are.
Ready when you are. Press start.
```

## 2. Bar map (the canonical layout)

The game was laid out on this 128 BPM, 96-bar timeline. It is still the reference the stages and the test suite use; a song map moves every row to where that song sings it.

Time = bar x 1.875 s. Era switches are the rows with no lyric.

| Bar | Time | Section | Era | Line |
|---|---|---|---|---|
| 0 | 0:00.0 | Intro | 1 · Arcade, first prompts | (title card, instrumental) |
| 2 | 0:03.8 | Verse 1 | 1 · Arcade, first prompts | One coin, one prompt, and the game was on |
| 4 | 0:07.5 | Verse 1 | 1 · Arcade, first prompts | Green text on glass, half right, half wrong |
| 6 | 0:11.3 | Verse 1 | 1 · Arcade, first prompts | Ask, read, retry, take another turn |
| 8 | 0:15.0 | Verse 1 | 1 · Arcade, first prompts | It made things up, and that's how I learned |
| 12 | 0:22.5 | Verse 1 (lift) | 1 · Arcade, first prompts | But I wanted it faster |
| 14 | 0:26.3 | Verse 1 (lift) | 1 · Arcade, first prompts | And it kept getting new |
| 17 | 0:31.9 | Verse 1 (lift) | 1 · Arcade, first prompts | (screen shatters, build into the drop) |
| 19 | 0:35.6 | Chorus | 2 · 32-bit, learning to ask | Turn it up to eleven, then a little bit more |
| 21 | 0:39.4 | Chorus | 2 · 32-bit, learning to ask | That's the only setting I've been looking for |
| 23 | 0:43.1 | Chorus | 2 · 32-bit, learning to ask | Turn it all the way up, let the whole thing run |
| 25 | 0:46.9 | Chorus | 2 · 32-bit, learning to ask | I don't do a little, I do everything, then some |
| 27.5 | 0:51.6 | Verse 2 | 2 · 32-bit, learning to ask | Then the box talked back, and I talked back too |
| 29.5 | 0:55.3 | Verse 2 | 2 · 32-bit, learning to ask | Taught myself the questions till the answers came true |
| 31.5 | 0:59.1 | Verse 2 | 2 · 32-bit, learning to ask | Emails and briefings, every answer's a drum |
| 33.5 | 1:02.8 | Verse 2 | 2 · 32-bit, learning to ask | I was learning in weeks what took years to come |
| 37 | 1:09.4 | Verse 3 | 3 · 3D console, directing agents | (racer begins) |
| 38 | 1:11.3 | Verse 3 | 3 · 3D console, directing agents | Back at my desk, and I built me a crew |
| 40 | 1:15.0 | Verse 3 | 3 · 3D console, directing agents | One sums up the meetings, one gets the inbox through |
| 42 | 1:18.8 | Verse 3 | 3 · 3D console, directing agents | Project plans, status notes, they race down the line |
| 44 | 1:22.5 | Verse 3 | 3 · 3D console, directing agents | Every lap they come back, and I check what they find |
| 47 | 1:28.1 | Chorus | 3 · 3D console, directing agents | Turn it up to eleven, then a little bit more |
| 49 | 1:31.9 | Chorus | 3 · 3D console, directing agents | That's the only setting I've been looking for |
| 51 | 1:35.6 | Chorus | 3 · 3D console, directing agents | Turn it all the way up, let the whole thing run |
| 53 | 1:39.4 | Chorus | 3 · 3D console, directing agents | I don't do a little, I do everything, then some |
| 56 | 1:45.0 | Verse 4 | 4 · Mobile, working from anywhere | (phone begins) |
| 57 | 1:46.9 | Verse 4 | 4 · Mobile, working from anywhere | Now the whole toolbox fits in my hand |
| 59 | 1:50.6 | Verse 4 | 4 · Mobile, working from anywhere | Coaching on the bus, a deck before I land |
| 61 | 1:54.4 | Verse 4 | 4 · Mobile, working from anywhere | AI Champion for the team, and the whole team grows |
| 63 | 1:58.1 | Verse 4 | 4 · Mobile, working from anywhere | The office is anywhere my signal goes |
| 66.5 | 2:04.7 | Bridge | 4 · Mobile, working from anywhere | Wait, what if I built it? |
| 68 | 2:07.5 | Bridge | 4 · Mobile, working from anywhere | Not a draft, the real thing |
| 69.5 | 2:10.3 | Bridge | 4 · Mobile, working from anywhere | I said what I wanted out loud |
| 71 | 2:13.1 | Bridge | 4 · Mobile, working from anywhere | And it came back running |
| 75 | 2:20.6 | Final Verse | 5 · VR, full development | From the plan to the push, every call is mine |
| 77 | 2:24.4 | Final Verse | 5 · VR, full development | Ran with the AI Maximalists, I don't wait in line |
| 79 | 2:28.1 | Final Verse | 5 · VR, full development | Brief the room, plan the sprint, code the fix on the fly |
| 81 | 2:31.9 | Final Verse | 5 · VR, full development | Write the tests, ship the build, and I still ask why |
| 83 | 2:35.6 | Final Chorus | 5 · VR, full development | Turn it up to eleven, then a little bit more |
| 85 | 2:39.4 | Final Chorus | 5 · VR, full development | Every tool I ever learned, now I know what it's for |
| 87 | 2:43.1 | Final Chorus | 5 · VR, full development | Turn it all the way up, let the whole thing run |
| 89 | 2:46.9 | Final Chorus (peak) | 5 · VR, full development | Deputy, I'm ready, next level, here I come |
| 94 | 2:56.3 | Outro | 5 · VR, full development | The only limit now is how creative we are. |
| 95 | 2:58.1 | Outro | 5 · VR, full development | Ready when you are. Press start. |
| 96 | 3:00.0 | End | | |

## 3. Suno style prompts

The song that stuck, **Press Start**, came from a 2000s baroque-pop indie-rock brief (artist names are not accepted by Suno, so the sound is described):

```
2000s indie rock, baroque pop, anthemic, driving four-on-the-floor drums, urgent strummed guitars, soaring violins, piano, glockenspiel, accordion, building crescendos, earnest yelping male lead vocal, gang vocal chants, female harmonies, cathartic and euphoric
```

Exclude styles:

```
chiptune, dubstep, trap, rap, EDM, synthwave, autotune, country
```

Also tried along the way: synthwave pop, outrun synthwave, indie synth-rock with a cool breathy female vocal, and indie pop-punk with a powerful belted vocal. Any take works: the game re-times itself to whichever song is loaded.

## 4. Production notes per section

> Superseded 2026-10-25: the song is now one genre (section 3). This table describes the earlier genre-per-era plan and is kept only for history.

Same tempo, same key centre, every section. Each sound switch lands on the bar where the game switches era, so the change is heard and seen together.

| Section | Bars | Era | Sound | Energy |
|---|---|---|---|---|
| Intro | 0–2 | Arcade | Dry 8-bit chiptune. One square-wave lead, triangle bass, mono, no reverb. | Low, a little lonely. |
| Verse 1 | 2–19 | Arcade | Add noise-channel hats and the four-note descending march. Vocal half-spoken. Bars 12–16 ("But I wanted it faster") speed the march up; bar 17 is a short riser and glitch as the screen shatters. | Builds from sparse to tense. |
| Chorus 1 | 19–27.5 | 16-bit | 16-bit FM synthpop arrives on the downbeat of bar 19: FM bass, bright PCM drums, brass stabs, chanted hook. | First big lift; full colour. |
| Verse 2 | 27.5–37 | 16-bit | Stay 16-bit, bouncier: chimes on the offbeats, drums pulled back a little. Bars 35.5–37 tilt the beat into breaks. | Medium, playful. |
| Verse 3 | 37–47 | 3D console | 90s breakbeat rave: chopped breaks, hoover and supersaw stabs, filtered pads, reverb opens up. Half-time feel under the verse. | Driving, wider. |
| Chorus 2 | 47–56 | 3D console | Full-time rave chorus, filter fully open, stabs on the hook. | Bigger than chorus 1. |
| Verse 4 | 56–66.5 | Mobile | Bright 2013 EDM pop: clean plucks, sidechain pump on the chords, hi-hat rolls, phone taps and pings as percussion. | Light, quick, confident. |
| Bridge | 66.5–75 | Mobile | Thin to a heartbeat kick and one voice. Whispered doubles grow under "a hundred hands appeared". Riser through bars 73–75. | The breath before the drop. |
| Final Verse | 75–83 | VR | Hyperpop synthwave drop on bar 75, stacking everything: chiptune lead on top, FM bass, breaks under the kick, EDM plucks, vocoded doubles, glitch edits on the beat. | Full. |
| Final Chorus | 83–94 | VR | Biggest moment. Keep building through bars 83–89 so the ask, "Deputy, I'm ready, next level, here I come", lands on the peak at bar 89 (the game's tunnel run starts there). Hold the peak to bar 94. | Maximum. |
| Outro | 94–96 | VR | Everything strips away; one lonely square-wave note, dry, under a spoken outro. | Quiet, an invitation. |

Getting Suno to change sound on the bar: it rarely holds five genres in one generation. Build with Extend: (1) Intro, Verse 1 and Chorus 1 with a chiptune-into-16-bit style, keeping a take where the chorus arrives near 0:36; (2) extend with Verse 2 in 16-bit style; (3) Verse 3 and Chorus 2 in the rave style; (4) Verse 4 and Bridge in the EDM pop style; (5) Final Verse, Final Chorus and Outro in the hyperpop synthwave style. Put "128 BPM" in every style field and listen for the kick holding tempo across joins.

## 5. Syncing the game to a new song

1. Put the audio at `public/songs/<id>/song.mp3`.
2. `python tools/song/analyze.py <id>` measures duration, tempo and the first beat into `public/songs/<id>/map.json`.
3. `python tools/song/align.py <id>` (in a Python environment with `faster-whisper`) transcribes the song with word timestamps, aligns it to the lyric sheet and writes each line's start time into `map.json`. Press Start matched 339 of 352 words.
4. Or by ear: open the game with `?song=<id>`, press T at the start of each of the 40 lines and once when the last one ends, then Y to save `map.json`.
5. Open `?song=<id>` to play it; `DEFAULT_SONG` in `src/boot.ts` sets the song everyone gets. `[` / `]` nudge the audio against the game by 50 ms if a file and its map disagree slightly.
