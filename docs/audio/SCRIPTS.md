# Walkthrough voiceover scripts

The walkthrough (`docs/walkthrough.js`) plays one voiceover per section from
this folder: `voiceover-1.mp3` for the first section, `voiceover-2.mp3` for
the second, and so on. A section whose file is missing plays silently.

All nine were recorded in one take in ElevenLabs (Eleven v4, voice
"Jarnathan - Confident and Versatile"), with a `[pause]` tag between
sections, then split at the pauses.

## Re-recording

1. Paste the script below into ElevenLabs, one paragraph per section, with
   `[pause]` between paragraphs.
2. Split the take at the pauses. With ffmpeg, find them with
   `ffmpeg -i take.mp3 -af silencedetect=noise=-40dB:d=0.9 -f null -` and cut
   each section with
   `ffmpeg -ss <start> -to <end> -i take.mp3 -af aformat=sample_fmts=s16p -c:a libmp3lame -b:a 128k voiceover-N.mp3`.
   Leave the `aformat` in: without it the MP3 encoder can fail partway and
   write a silent clip. Check every clip has sound with
   `ffmpeg -i voiceover-N.mp3 -af volumedetect -f null -` (a `max_volume`
   near -91 dB means silence).
3. Save the clips as `voiceover-1.mp3` to `voiceover-9.mp3`, in section order.
4. Check each clip is shorter than its section (table below). The walkthrough
   moves on when the section's time is up, so a longer clip gets cut off.

If you add, remove or reorder a section, re-record the take so the numbers
still line up. A section can name its own file with `audio: 'name'`
(plays `voiceover-name.mp3`), or `audio: null` for no voiceover.

| # | Section | Section length | Clip |
|---|---------|----------------|------|
| 1 | Kickoff | 7 s | 5.0 s |
| 2 | Brainstorm | 18.5 s | 16.7 s |
| 3 | PRD | 11.5 s | 11.0 s |
| 4 | Spec | 16 s | 14.3 s |
| 5 | Plan | 14 s | 10.9 s |
| 6 | Build | 26 s | 22.2 s |
| 7 | Review | 13 s | 11.0 s |
| 8 | Ship | 14.5 s | 11.7 s |
| 9 | Learn | 10.5 s | 8.7 s |

## Script

> Kickoff sizes the work, opens the ticket and branch, and lays out the
> pipeline.
>
> [pause]
>
> Brainstorm starts with the problem. Jig weighs a few approaches side by
> side and recommends one. Then it runs the concerns checklist — security,
> error handling, testing — so nothing important is left for later. You
> approve the design before anything gets written.
>
> [pause]
>
> The PRD is plain language for the whole team: phases, an MVP cut,
> milestones and sign-off. It publishes as a live page the team and Jig keep
> current.
>
> [pause]
>
> Engineering writes the spec straight from the PRD link. It's the technical
> contract: the API, the data, the rules and the UI, each with acceptance
> criteria tagged by layer. Every task in the build is checked against it.
>
> [pause]
>
> Plan turns the spec into small, test-first tasks, each with the exact files
> it touches. Jig maps which tasks depend on which, so it knows what can run
> in parallel.
>
> [pause]
>
> Build reads the plan and picks a strategy. Here it runs three agents in
> parallel: frontend, backend and tests. Each one writes a failing test first,
> makes it pass, and commits. The test writer waits until the work it depends
> on is done. As tasks finish, a quality gate checks each one against the
> spec, then checks the code itself.
>
> [pause]
>
> Review sends out a swarm of specialists, each hunting one kind of problem.
> A logic reviewer traces the feature end to end, and catches a rule enforced
> in only one place.
>
> [pause]
>
> Ship opens the pull request with a clear description and a test plan. When
> a teammate leaves feedback, Jig reads it, makes the change, pushes it, and
> replies. Approved, and merged.
>
> [pause]
>
> The postmortem looks at what reviewers caught and turns each miss into a new
> specialist or a better skill. Jig gets sharper with every feature.
