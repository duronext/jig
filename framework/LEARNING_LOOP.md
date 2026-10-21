# The Learning Loop

How Jig improves itself. LEARN is the last stage of the pipeline, and this loop is what it runs: a lesson goes in, and a reviewed change to the right skill comes out. Core changes then reach every team with the next release.

**Entry point:** the `postmortem` skill, whatever the input. A merged PR's review comments are one input; the others below go through the same skill.

```
CAPTURE → CLASSIFY → ROUTE → DRAFT → FIT REVIEW → PR → RELEASE → CLOSE
```

## 1. Capture

| Input | What it looks like | Evidence to bring |
|-------|--------------------|-------------------|
| Merged-PR review comments | Reviewer catches on a merged PR (`postmortem`'s Fetch PR Data and Analyze Comments) | The comments that led to a fix |
| Working sessions | A correction the user had to make, a failure hit twice; also incident write-ups and bug investigations whose lesson is about process (a `debug` session, an RCA) | What happened, and what fixed it |
| Project retrospectives | "Next time we would…" | Each item, with the work it came from |
| Another harness's notes or skills | A rule that held across the work | The rule and the work it held on, minus that harness's own mechanics |
| Direct requests | "Jig should do X" | The request and the incident behind it |
| Fit-review findings | The same divergence flagged again (e.g. "forgot to update PIPELINE.md") | The `framework-fit` findings from 3+ PRs |

Keep a lesson only when something happened: a fix, a failure, a correction. A guess about what might go wrong is not a lesson. A pattern seen once is still a lesson; postmortem's 3+ occurrence threshold decides when it becomes a specialist or checklist item.

## 2. Classify

Decide who the lesson holds for. That sets the level it lives at.

| Level | Holds for | Home |
|-------|-----------|------|
| Personal | One person | Their own harness config (user-level instructions or memory). Not the repo, not Jig. |
| Harness | One agent harness, in any project | That harness's own user-level config. Jig's `adapters/` only when it is about loading Jig there. |
| Team | One team or repo, including how the team's harness should work in this repo | `team/` skills and specialists, the project's CLAUDE.md, AGENTS.md or equivalent, `jig.config.md` |
| Pack | Teams that share a stack, tool or tracker | `packs/` |
| Core | Every team, on any stack, git host and harness | `core/` or `framework/`, through a PR to Jig |

The test for core: would a team on another language, another git host and another harness want this, whatever their preferences? If not, go down a level. When unsure, start at team; move the lesson up when another team hits it.

## 3. Route

Within its level, give each lesson one home, using `postmortem`'s routing (Route the Finding and its diagnosis tables, Where to Put Guidance, Apply Changes). A lesson that needs a new artifact goes through `extend`.

Fit-review findings route to the Fit Checklist itself. A divergence `framework-fit` flags in 3+ PRs sharpens the item that covers it; it becomes a new item only when none does, and past ten items `framework-fit` is split (postmortem's failure mode 5). One it missed goes through postmortem's Swarm Specialist Diagnosis. This is how the loop improves itself.

## 4. Draft

Plan each change against the Fit Checklist in `core/specialists/framework-fit.md` before editing, then check the draft against it again.

## 5. Fit Review

Run `review` with `mode: code, specialists: [framework-fit]` on the paths you changed. That dispatches `framework-fit` alone, with no other specialist and no logic reviewer, as a reviewer that did not write the change. Fix each finding, or record why it does not apply, and re-run. The fit review is done when `framework-fit` has no findings left except those recorded that way; a `framework-fit` that was skipped or reviewed no files is not a clean review. A fit review reads; it does not execute: before the PR, also run each new or changed command block or procedure once on a real input, and once on the input most likely to break it (a fork PR, a binary file, a name that looks like a number, an empty result, a repo with existing alerts or bot comments, a consumer repo). PR, below, says where the findings and the runs are recorded.

## 6. PR

Ship through `pr-create`. A learning PR's body opens with these sections, before the usual summary and test plan:

- **Benefits**: what goes wrong today, and what each change prevents.
- **How this follows Jig**: the Fit Checklist items the change touches, and how each holds.
- **Fit review**: every `framework-fit` finding, fixed or left standing with its reason, one line each. This is the record a later postmortem counts.

Its test plan lists each procedure run from the Fit Review, one item each with the input and the result, where an unticked item is an open finding; "No testing required" does not apply.

Name the lesson's input (the PR, session, retrospective or request) in a line. Commits and pushes wait for the user's approval, as everywhere in Jig.

## 7. Release and Propagate

Team-level changes take effect when they merge. Core and pack changes reach installed copies only after a release (see Releasing in Jig's CLAUDE.md), and teams then update as README's Updating section says. Until then the change exists only in the Jig repo.

A lesson that also lands at another level (a copy in a team's or a person's own config) is copied after the PR's reviews settle, not while they run. List each copy in the PR, and carry every later fix to each one; a copy taken mid-review keeps the bugs the review then finds.

## 8. Close the Loop

If the work behind the lesson has a live PRD, `postmortem` adds a `learn` entry to its log (see `LIVE_PRD.md`). Tell whoever raised the lesson where it landed.
