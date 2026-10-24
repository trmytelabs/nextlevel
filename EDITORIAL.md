# Editorial pass — making the evolution legible

Scope: a targeted polish of the finished piece, not a rebuild. Sources: `CONTEXT-PROMPT.md`, `NIGHT.md`, `LYRICS.md`, the
code as of commit `ff69d3f`, and the latest recording (`out/run.mp4`, reviewed as contact sheets, one frame every 5 s).
"Observed" below means seen in that recording; "inferred" means read from code or notes.

The intent to land: **AI got better, and I got better at working with it, at the same time.** The game generations are
the metaphor for both curves. The destination: *look how far I've come as these tools evolved; imagine what we could
build together.* An application, not a claim.

## 1. Honest assessment (prioritised)

**What already works (observed)**
- The five-generation arc is unmistakable as *technology* evolving: phosphor arcade → CRT platformer → Saturn racer →
  phone → VR with bloom. Nobody will miss that the tools got better.
- The finale now shows *directing*: words you cut become the arena, with a visible co-pilot placing pieces. The
  "AI > PANEL FROM 'HANDS'" log and the co-pilot status make cause and effect readable.
- The chorus ("Turn it all the way up… I do everything, then some") carries energy and personality, and the ask at
  bar 89 lands exactly where the tunnel peaks.
- Gameplay is honest to each era (readable words in every era, one lyric event per line in the racer, real cuts in VR).

**Where the intended story is not yet carried (highest impact first)**
1. **Verse 1 tells the wrong story.** Observed: "One form, one desk… Type, print, file… a stack of them waiting" reads
   as a paper office before AI. The arcade era should be *my first clumsy prompts and the tool's early limits.* This is
   the single biggest fix, and it is lyrics only.
2. **Nothing tells the viewer the games are about me.** Observed: the title card says "Five eras of games. One desk at
   the GoA." That explains the device, not the metaphor. One line on the title card and a five-word chapter label at
   each era start would make the *my skills* curve explicit without competing with lyrics. (Inferred: the chapter label
   is cheap because era transitions already have a 1 s cross-fade with no caption on screen at bars 19, 37, 56, 75.)
3. **The "magic" lines undercut the growth story.** Observed in captions: "it's solved by the time I blink", "it's solved
   again", "A thousand problems… solving them tonight". They make AI the hero and you the bystander. Replacing three
   lines with checking / directing / judgment language changes the whole reading at no musical cost.
4. **The end card says "IAN GINN · DEPUTY'S MAXIMALISTS".** Observed. That reads as membership. Changed in this pass
   to "IAN GINN · FOR THE DEPUTY'S MAXIMALISTS" plus an invitation line (see section 5).
5. **The bridge-to-finale handoff is visually thin.** Observed: 14 coloured ghost birds leave the phone at bar 73, then
   the finale opens on a lens transition and a green co-pilot. The link is there in the code (same five role colours) but
   a viewer will not connect "ghosts" to "co-pilot". A one-second beat where the ghosts converge into the co-pilot orb
   fixes it.
6. **The first cut in the finale should be a teaching moment.** Observed: pieces appear 30 units ahead; the relationship
   "that word → that arch" is visible in the log text but not in the picture. For the first six cuts, a label of the cut
   word should fly from the cut point to the piece it becomes.
7. Minor, observed: "Maximalist by trade" (bar 77) is close to claiming the title; the placeholder at bar 79 is still
   in; the lyric "One desk. One job." at bar 94 belongs to the old desk story.

Not a problem: year labels. Observed: the years are already hidden from the HUD (only the scrubber shows era names), so
nobody will read 1978 as "when I started using AI".

## 2. Title

Keep "Everything, Then More" as the chorus hook; it is a better lyric than a headline. Candidates, best first:

| Title | Why | Risk |
|---|---|---|
| **Next Level** | Universal gaming phrase for progression, two words, reads as both "the tech advanced" and "I advanced". Pairs cleanly with the subtitle *My AI journey in five generations of games*. | Common; the subtitle does the specific work. |
| **New Game Plus** | The gamer's term for replaying with everything you learned carried over. That is exactly the story (each era starts with the last era's skills) and the ask (start the next run with better players). | Needs a gamer to get it; a deputy minister may not. |
| **Co-op Mode** | Names the ask: building with peers, and the AI co-pilot in the finale. Warm, short. | Says less about evolution. |
| **Press Start** | Already the last lyric; an invitation. | Generic; also used by countless pieces. |
| Evolving Together / Evolution at Play / Learning at the Speed of AI | On message but read as corporate slogans; "Learning at the Speed of AI" is a sentence, not a title. | Flat. |

Recommendation: **Next Level** as the title with the subtitle **"My AI journey, told through five generations of
games"**, "Everything, Then More" kept as the chorus. If you want the braver choice for a gaming-literate reader,
**New Game Plus**.

## 3. Lyric revisions (targeted; the rest stays)

Syllables are approximate counts for the sung slot; all bars and the 96-bar / 128 BPM structure are unchanged.
Lines not listed here are kept as they are.

| Bar | Original | Proposed | Why |
|---|---|---|---|
| 2 | One form, one desk, one line to hold (8) | **One prompt, one box, one line to hold** (8) | Same shape, now about the first prompt instead of a paper form. |
| 4 | Green text on glass in a room gone cold (9) | **Green text on glass, half right, half wrong** (8) | Early tool limits; keeps the phosphor image that matches the arcade era. |
| 6 | Type, print, file, that's how I learned (8) | **Ask, read, retry, that's how I learned** (8) | My early method and agency, same triplet rhythm. |
| 8 | A stack of them waiting, and I waited my turn (12) | **It made things up, I caught it, and I took my turn** (12) | Checking, not waiting; the first lesson about judgment. |
| 12 | But I wanted it faster (7) | *keep* | Still true for both curves. |
| 14 | I wanted something new (6) | **And it kept getting new** (6) | States that the tool was improving too (the second curve). |
| 27.5–33.5 | Then the box talked back… I was learning in weeks what took years to come | *keep* | Already the "learning to ask" verse; strongest personal lines. |
| 44 | A thousand problems, and I'm solving them tonight (13) | **Every meeting, every thread, I know what matters tonight** (13) | Grounded in the real use (summaries → follow-through) and drops the body count. |
| 59 | One thumb, one prompt, and it's solved again (10) | **One thumb, one prompt, and I'm prepared again** (10) | Coaching and prep before meetings; removes "solved" magic. |
| 77 | Maximalist by trade, I don't wait in line (10) | **Maximalist at heart, I don't wait in line** (10) | Aspiration, not a title you hold. |
| 79 | Spawn a plan, spawn a form, spawn a fix on the fly (12) | **Brief the room, plan the sprint, code the fix on the fly** (12) | The placeholder, replaced with the three real jobs: meeting follow-through, project management, coding your own tools. Keeps the triple hit. |
| 81 | I point at the problem, it's solved by the time I blink (13) | **I point at the problem, then I question what it thinks** (12) | Directing plus judgment; rhymes in the same slot (blink → thinks). |
| 94 | One desk. One job. | **Imagine what we could build.** | The destination line; the desk belonged to the old framing. |
| 95 | Ready when you are. Press start. | *keep* | The invitation. |

Optional if you want one more skills beat: bar 61 "Every week I'm evolving, I don't slow down" → "Every week I'm
evolving, and so's the tool" is tempting but clunkier; the title card and chapter labels carry that idea better.

Singability check: every replacement keeps the stressed syllables where the original had them (prompt/box/line;
ask/read/re-TRY; brief/plan/code; point/prob-lem/ques-tion). Nothing adds a syllable to a slot shorter than a beat.

## 4. Minimal visual changes

1. **Title card line** (done in this pass): "My AI journey, told through five generations of games." and
   "The tools got better. So did I." in place of the desk thesis. No new screen time.
2. **Chapter labels** (recommended, ~20 lines of code): at each era start, a small top-left label for 2.5 s, fading,
   in the era's own typeface: `1 · FIRST PROMPTS`, `2 · LEARNING TO ASK`, `3 · AT MY DESK`, `4 · IN MY POCKET`,
   `5 · DIRECTING AGENTS`. Positioned where the old year tag lived, so it never collides with captions (bottom) or the
   HUD (right). Skipped on phones narrower than 700 px to keep the layout clear.
3. **Ghosts become the co-pilot** (recommended): the fourteen ghost birds already fly out of the phone to the right at
   bar 73. Make the headset-on moment at bar 75 show them arriving as green sparks that converge into the co-pilot orb,
   and change the intro line to "CO-PILOT LINKED · 14 HANDS". That is the only visual thread between the bridge lyric
   ("a hundred hands appeared") and the finale.
4. **First cut becomes a piece** (recommended): for the first six cuts, a copy of the cut word flies from the cut point
   to the piece the co-pilot is placing, and the piece flashes once when it lands. After that the viewer has the rule.
5. Not recommended: on-screen explanations during lyrics, or extra text on the phone frame in era 4. Both compete with
   captions.

## 5. The ending (done in this pass)

End card now reads: title · "Built with AI agents, asking to build with people." · "IAN GINN · FOR THE DEPUTY'S
MAXIMALISTS" · "Imagine what we could build together." · "READY WHEN YOU ARE." With the bar-94 lyric changed to
"Imagine what we could build." the last fifteen seconds become the invitation rather than a sign-off.

## Suggested order of work

1. Lyrics (section 3) in `src/core.ts`; they drive the crawl, the pickups, the gantries, the signs and the blocks, so
   this is one edit with wide effect. 2. Title decision (section 2) in `src/main.ts` CARD and `index.html` title.
3. Chapter labels. 4. Ghost-to-co-pilot convergence. 5. First-cut word flight. 6. Re-run the harness, re-record, republish.
