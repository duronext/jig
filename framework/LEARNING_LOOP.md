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
| Team memory | Traps, root causes and lessons teammates saved (`MEMORY.md`), e.g. the same trap from several people | The notes' ids, each checked against its source |
| Fit-review findings | The same divergence flagged again (e.g. "forgot to update PIPELINE.md") | The `framework-fit` findings from 3+ PRs |

Keep a lesson only when something happened: a fix, a failure, a correction. A guess about what might go wrong is not a lesson. A pattern seen once is still a lesson; postmortem's 3+ occurrence threshold decides when it becomes a specialist or checklist item.

## 2. Classify

Decide who the lesson holds for. That sets the level it lives at.

| Level | Holds for | Home |
|-------|-----------|------|
| Personal | One person | Their own harness config (user-level instructions or memory, or a private team-memory note). Not the repo, not Jig. |
| Harness | One agent harness, in any project | That harness's own user-level config. Jig's `adapters/` only when it is about loading Jig there. |
| Team | One team or repo, including how the team's harness should work in this repo | `team/` skills and specialists, the harness's project folder (e.g. `.claude/`), the project's agent instruction files at any level (CLAUDE.md, AGENTS.md or a harness's equivalent), `jig.config.md` |
| Pack | Teams that share a stack, tool or tracker | `packs/` |
| Core | Every team, on any stack, git host and harness | `core/` or `framework/`, through a PR to Jig |

The test for core: would a team on another language, another git host and another harness want this, whatever their preferences? If not, go down a level. When unsure, start at team; move the lesson up when another team hits it.

## 3. Route

Within its level, give each lesson one home, using `postmortem`'s routing (Route the Finding and its diagnosis tables, Where to Put Guidance, Apply Changes). A lesson that needs a new artifact goes through `extend`.

Fit-review findings route to the Fit Checklist itself. A divergence `framework-fit` flags in 3+ PRs sharpens the item that covers it; it becomes a new item only when none does, and past ten items `framework-fit` is split (postmortem's failure mode 5). One it missed goes through postmortem's Swarm Specialist Diagnosis. This is how the loop improves itself.

## 4. Draft

Plan each change against the Fit Checklist in `core/specialists/framework-fit.md` before editing, then check the draft against it again. A new procedure first says which inputs it supports, and stops with a message on the rest (e.g. a merged PR, when it reads only open ones). Check each assumption it makes about host or git data on two or more real samples that differ in the way that matters (e.g. a PR merged before its base moved, and one merged after). A procedure that runs shell over untrusted input, or more than about ten commands, ships as a script with fixture tests that its prose names (e.g. `core/skills/prd/reference/test/run.sh`); the fixtures cover the case list (Fit Review, below).

When one check or rule has drawn findings in three review rounds (count them in the PR's **Fit review** record and its review threads), stop patching it and redesign it with fewer moving parts (e.g. compare object IDs or host data, not text).

## 5. Fit Review

Before each push, run these in order, and push only when all are clean. Bot reviews after the push then confirm rather than discover.

1. `npm run check`, in Jig's repo. It finds what it can mechanically (registrations, frontmatter, host rows, cited headings, repeated or drifted passages, known shell traps, repo paths in tool-less specialists); the reviews read for the rest.
2. The case list, below: every case against the current text, not only the one the last fix answers.
3. `review` with `mode: code, specialists: [framework-fit]` on the paths you changed. That dispatches `framework-fit` alone, with no other specialist and no logic reviewer, as a reviewer that did not write the change. Fix each finding, or record why it does not apply, and re-run. It is done when `framework-fit` has no findings left except those recorded that way; a `framework-fit` that was skipped or reviewed no files is not a clean review.
4. For an artifact that handles untrusted input (someone else's PR, its comments, a ticket, fork code), `review` with `mode: code, specialists: [security]`: `framework-fit` checks fit, not safety. It is done on the same terms as `framework-fit`; a skipped pass is not clean.

**The case list.** Every finding's trigger, from any reviewer, a test run or a bot, becomes a case: an input and its expected outcome. A fit review reads; it does not execute, so the list starts with each new or changed command block or procedure run once on a real input, and once on each input most likely to break it: a fork PR, a merged or closed PR, a binary file, a non-ASCII or spaced path, a rename, a name that looks like a number, an empty list or no result, a repo with existing alerts or bot comments, each documented value of every config key the procedure reads (including unset, `none`, and a name where a key is expected, e.g. from `scaffold/jig.config.md` and the packs), the user's or repo's git config (`diff.*`, `core.quotePath`, hooks, ignored submodules), host remote variants (an SSH alias, an alternate port), a consumer repo, a second harness, and the shell an agent actually uses (e.g. zsh). PR, below, says where the findings and the cases are recorded.

## 6. PR

Ship through `pr-create`. A learning PR's body opens with these sections, before the usual summary and test plan:

- **Benefits**: what goes wrong today, and what each change prevents.
- **How this follows Jig**: the Fit Checklist items the change touches, and how each holds.
- **Fit review**: every `framework-fit` finding, and every `security` finding when the artifact handles untrusted input (a skipped pass is listed as open), fixed or left standing with its reason, one line each, with the round it was found in and the check or rule it concerns. This is the record a later postmortem counts.
- **Copies**: each copy of the lesson at another level (Release and Propagate, below), added to the body when it is made.

Its test plan holds the case list (Fit Review), or names the fixtures that hold it: one item per case with the input and the result, where an unticked item is an open finding; "No testing required" does not apply.

Name the lesson's input (the PR, session, retrospective or request) in a line. Commits and pushes wait for the user's approval, as everywhere in Jig.

## 7. Release and Propagate

Team-level changes take effect when they merge. Core and pack changes reach installed copies only after a release (see Releasing in Jig's CLAUDE.md), and teams then update as README's Updating section says. Until then the change exists only in the Jig repo.

A lesson that also lands at another level (a copy in a team's or a person's own config) is copied after the PR's reviews settle, not while they run; a copy taken mid-review keeps the bugs the review then finds. Add each copy to the PR's Copies line and carry every later fix to it. A copy that only bridges the wait for a release ends with the release (Close the Loop, below); one that adapts the lesson to its level (e.g. one host's exact commands) stays and is kept in step.

## 8. Close the Loop

If the work behind the lesson has a live PRD, `postmortem` adds a `learn` entry to its log (see `LIVE_PRD.md`). Tell whoever raised the lesson where it landed. When a release reaches a level that holds a bridging copy (the PR's Copies line), whoever made the copy deletes it.
