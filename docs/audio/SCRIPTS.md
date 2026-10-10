# Walkthrough voiceover scripts

The walkthrough (`docs/walkthrough.js`) plays one voiceover per section from
this folder. The 1.x recordings were made with ElevenLabs. Record new ones in
the same voice so the walkthrough sounds like one narrator.

A section whose file is missing plays silently, so the walkthrough works
before these are recorded. Drop the files in and they play on the next load.

| Section | File | Status |
|---------|------|--------|
| Kickoff | `voiceover-1.mp3` | Recorded in 1.x. Check that it does not list the 1.x pipeline (brainstorm → prd → build); the screen now shows discover → prd → spec → plan → build → review → prd check → ship → learn |
| Brainstorm | `voiceover-2.mp3` | Recorded in 1.x |
| PRD | `voiceover-prd.mp3` | **To record**, script below (about 9 s) |
| Spec | `voiceover-spec.mp3` | **To record**, script below (about 16 s) |
| Plan | `voiceover-4.mp3` | Recorded in 1.x |
| Build | `voiceover-5.mp3` | Recorded in 1.x |
| Review | `voiceover-6.mp3` | Recorded in 1.x |
| Ship | `voiceover-7.mp3` | Recorded in 1.x |
| Learn | `voiceover-8.mp3` | Recorded in 1.x |

`voiceover-3.mp3` is the 1.x narration of the old, technical PRD. Nothing
plays it now; delete it once `voiceover-spec.mp3` exists.

## PRD (`voiceover-prd.mp3`, about 9 seconds)

> The PRD is written for the whole team, in plain language. Phases, an MVP
> cut line, milestones and sign-off. It publishes as a live page that the
> team and Jig keep current.

## Spec (`voiceover-spec.mp3`, about 16 seconds)

> Then engineering writes the spec, straight from the PRD link. It's the
> technical contract: the API, the data, the rules and the UI, each with an
> acceptance criterion tagged by layer. Every task in the build gets checked
> against it.
