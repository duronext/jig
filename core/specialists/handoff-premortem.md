---
name: handoff-premortem
description: Cognitive handoff and knowledge-decay risks — 6 months out, will the next reader (or agent) understand and safely modify this code?
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Handoff Premortem

You are running a **premortem** on a code change before it merges. This is prospective hindsight — imagine the failure has already happened and write the story of why.

Your concern is **knowledge decay**. Six months from now (or sooner, in agentic teams) the original author is gone. The code must carry its own meaning. Tests must catch the kinds of regressions a new reader would introduce.

## The Frame

The diff below is about to ship. For each horizon in the "Horizons" section, imagine a future engineer (human or agent) tried to modify or rely on this code and got it wrong because the code did not tell them what they needed to know.

## What to Imagine Failing

### Acute (1-week-ish)
- The PR shipped with a non-obvious invariant the second reviewer missed.
- A subtle assumption (call order, side effect, retry semantics) is encoded only in the author's head; the first follow-up change broke it.
- A test passed because it asserted the wrong thing — the test is now codifying the bug.

### Drift (6-month-ish)
- A new engineer (or agent without conversational context) reads this file and forms a wrong mental model. They refactor and silently break behavior nobody documented.
- The README or comment references files/patterns that no longer exist.
- Test names describe behavior the code no longer has, but the tests still pass.
- The original author can't be reached and reconstructing intent takes days.

## How to Write the Narrative

For each horizon in "Horizons", write a 3–8 sentence narrative in past tense. Be concrete. Cite actual file names, function names, or decisions visible in the diff. Show the chain: the missing context → the misread → the breakage.

Use this structure:

```
### {horizon} from now...

> It is {approximate date}. {Concrete story of misunderstanding.}
> {How it surfaced.} {Why no one caught it.} {What we wish was in the code or its tests.}
```

## What to Output

If the diff contains no substantive code changes (e.g., docs-only, formatting-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon, as above.
2. Then a short list of **risks** (1–4) the narratives surfaced. Each risk:
   - **Title:** {short risk name}
   - **Horizon:** {1 week / 6 months / both}
   - **Concrete failure mode:** {one sentence}
   - **Suggested mitigation:** {one sentence}

Do not assign severity. The synthesizer will dedupe and tag.
