# Proposal: Keel, a continuous feature builder above `kickoff`

- **Date:** 2026-10-30
- **Status:** POC proposal, for discussion. Nothing here is registered in the plugin.
- **Type:** New capability (feature level, above the per-ticket pipeline)
- **Audience:** Jig maintainers and engineers who ship large features
- **Size:** Large; proposed as staged POC work, each stage useful on its own
- **Source:** A three-week personal pilot on a production frontend feature (Vendor Management),
  with a 19-branch PR stack. Reference skill in [`skill/`](skill/).

## 1. Problem

Jig's unit of work is one ticket and one PR. Large features do not arrive that way. One
feature in the pilot brought:

- a PRD that kept changing
- two design files with twelve pages, some still marked work in progress
- 41 tracker tickets across engineering and design
- backend APIs that other engineers were still building
- a main branch that moved every day, including toolchain changes

An earlier feature done by hand (16 stacked PRs) showed where a manual method breaks:

- status notes went stale within a day
- UAT fixes piled into the wrong PR
- about 25 throwaway restack scripts were lost after the run
- it worked only for the engineer who ran it

## 2. The idea

**Sources are the desired state. The stack of PR branches is the actual state. Every tick
closes the gap.**

Keel is a reconcile loop, the same shape as an infrastructure controller, applied to a
feature. Twice a day a tick does five things:

1. senses every source
2. re-plans only what changed
3. moves the whole stack onto current main
4. rebuilds what is dirty, with a different agent reviewing each build
5. runs UAT in a real browser and writes one status page

It works the way engineers worked before agentic tools. It stubs the API that does not exist
yet and the screen that is not designed yet, then swaps in the real thing when it lands.

A swap works through a tripwire. A stub-cleanup test turns red on purpose when the backend
change reaches main, and the next tick rebuilds the owning PR.

Keel only ever takes a PR to **level 1**: built, tests green, reviewed by an agent that did not
build it. People own the rest:

| Level | Meaning | Owner |
|---|---|---|
| 2 | UAT signoff | The engineer |
| 3 | Product and design signoff | Product and design |
| 4 | Merged, the only "done" | The team |

## 3. What the pilot showed

**Results** (status as of 2026-10-29):

| Measure | Result |
|---|---|
| Stack PRs at level 1, on current main | 18 / 18 (one more PR built on top) |
| Ticks run since 2026-10-12 | 26 |
| Tests green on the top branch | 9,447 |
| UAT scenarios in the browser | 61 passed, 0 failed |
| Built screens audited beside their design frames | 47 |
| Commits pushed | 0 (104 local commits wait for human UAT, by design) |

**What broke:**

- **Session cron dies with the session.** Session-scoped cron jobs expire after 7 days, and they
  also die when the session restarts. The pilot's schedule lapsed twice.
- **Quiet ticks are expensive.** A tick with no upstream change still spent about 300k tokens,
  almost all of it on sensing.
- **Main's toolchain moved under the stack.** A toolchain change on main forced one "convention
  fold" across 107 files. That is a real class of work, not cleanup.
- **The dev environment is the weak joint, not the code.** Most blocked UAT runs were caused by
  stopped services or stale build output.
- **Small mismatches hide.** A clone's commit shas are not the worktree's shas, and hooks behave
  differently in clones than in the real worktree.

## 4. Proposed POC work

Each stage below is useful on its own. They are listed in the proposed order.

### 4.1 Package and generalize

- Replace every stack-specific recipe with a **stack adapter** in `keel.json`: dev start and
  health commands, noise paths, post-sync upkeep, gate and verify commands, and the UAT base URL.
  The reference skill in `skill/` is already written this way.
- Add a durable schedule. Use a desktop scheduled task when the engineer's machine is awake. Add
  a cloud routine that only detects upstream changes and notifies.
- Add a **cheap change check** before full sensing: the main sha, the newest tracker `updatedAt`,
  the design file's last-modified time and the doc's modified time. If none moved, the tick
  stays quiet.

### 4.2 `keel resource`: one way to feed Keel

```
/keel resource https://www.figma.com/design/…?node-id=…   — the empty state
/keel resource
- https://linear.app/…/issue/ENG-1234
- https://www.loom.com/share/…                              — the walkthrough for the picker
- https://<chat>/archives/…/p…                              — the decision thread
```

Keel classifies each input by URL, checks access with one read, and registers it:

| Input | Becomes |
|---|---|
| Design link | A watched page or node |
| Ticket | A watched ticket |
| Document | A PRD or doc source |
| Recording | The timeline pipeline (4.3) |
| Chat thread | A new chat sensor |
| Pull request | A watched branch |
| File | The inbox |

- Each input gets a stable id in `resources.md`, a first snapshot and an impact-map entry.
- `keel resource` with no arguments lists every source with how fresh it is and whether it can
  be read.

### 4.3 Recording timelines: frames tied to transcript timestamps

In the pilot, a desktop agent turned design walkthrough recordings into a package. The package
held frames named by timestamp and a short label (`v1-01m12s-alias-match-shows-result.png`),
the transcripts, and an index. Builders then had visual and written context for each part of
the feature. Keel should produce that package itself:

1. **At intake, with the engineer present:** the browser extension opens the recording, reads the
   transcript with timestamps and gets the video when the page allows it. This is the same
   method the desktop agent used.
2. **In ticks, unattended:** `ffmpeg -ss <t> -i video -frames:v 1` grabs a frame for each moment.
   Frames are chosen at transcript sentence boundaries plus scene changes. A vision pass labels
   frames and drops near-duplicates.
3. **Then map and test:** each moment maps to PRs and design nodes, so each builder gets only its
   slice. The pilot's hand-made package serves as the golden test.

Claude Code has no documented handoff to the desktop agent today; the opposite direction exists.
So Keel must do this capture itself.

### 4.4 Generated UAT

When a plan cites design frames or touches UI paths, Keel generates the UAT scenarios from five
sources:

- design prototype connections, which give the step order
- variants, which give the states (empty, error, loading)
- design annotations
- PRD and ticket acceptance criteria
- timeline moments

Each scenario carries its source references and a **reference image** (a design frame or a
recording frame) for the UAT worker to compare against. Scenarios are hashed, re-reviewed and
regenerated through the impact map, like plans. Signed-off scenarios are protected.

### 4.5 One PR or a stack, with drafted tickets

After discovery, a **shape** step uses data Keel already collects:

- requirements in scope
- screens
- distinct code areas
- backend gaps and how ready they are
- estimated lines per slice

It then recommends one of two shapes:

| Shape | When | Next step |
|---|---|---|
| **Single PR** | One screen, no backend gap, a small estimate | Hand straight to `/jig:kickoff` |
| **Stack** | Anything bigger | Slices ordered by readiness, with the evidence and the alternative |

Keel then drafts tracker tickets under an existing parent ticket or a new one. Drafts carry
acceptance criteria, an estimate and blocked-by links. **Writes happen only after the engineer
approves the exact drafts shown.** This changes Keel's "no external writes" rule into "no
external writes without approval of the shown draft". The tracker pack needs documented
parent, sub-issue and relation operations. Manual sub-issue ordering stays a human step.

### 4.6 Reporting the engineer can trust

**Verified versus in flux.** STATUS gets one row per requirement with one of five states:

- **Verified:** its PR is at level 1 or higher, its UAT passed, and its sources have been stable
  for N ticks.
- **Built, unverified.**
- **In flux:** a recent source change, a work-in-progress frame, an open chat thread or an open
  decision.
- **Blocked by a gap.**
- **Not started.**

A churn column shows how often each source changed in the last 7 days.

**Ticks and cost.** Each tick writes `runs/<ts>/usage.json` with tokens per phase and model,
taken from subagent and workflow usage plus the session transcript. STATUS shows per-tick and
cumulative totals. Tokens come first; a dollar figure is an estimate, because model prices,
cache reads and the plan type all change it.

**UAT confidence, built from evidence.** Confidence is scored per screen and per source, never
as one gut-feel number:

| Source | Evidence |
|---|---|
| Design | A screenshot compared with its frame, a judge's fidelity verdict and state coverage |
| Recordings | Each timeline moment has a passing scenario and a judged side-by-side |
| PRD | Each requirement has at least one passing scenario |

- **Deductions:** active stubs, design stubs, sources in flux and manual-only scenarios.
- **Output:** High, Medium or Low, with the reasons listed.
- **Calibration:** score agreement against human audit verdicts (the pilot has 47). A model that
  says "high" where a human said "fail" is visibly wrong.

## 5. Horizons

| Horizon | What | State |
|---|---|---|
| 1. Build | The autonomous build loop from every source: PRD, designs, tickets, pull requests and main, recordings with frames tied to transcript timestamps | Piloting now |
| 2. Continuous development | An agent owns a mature feature and watches its sources. A bug that is really a feature request changes the PRD or designs, and the work is picked up on its own | Next |
| 3. Scale | One Keel per ticket or feature, coordinated by a top-level agent that owns the shared local stack (builds, branch switching, database seeding, browser verification) | Unvetted |

**What a top-level Keel could own.** The first three already cost the pilot something with
only one Keel running; the rest are unvetted:

1. **Shared sensing.** Read every source once and wake only the Keels whose sources moved.
2. **Convention folds done once.** Solve a toolchain change on main once and apply it to every
   stack.
3. **A lease on the local stack.** There is one dev environment, one browser and one database;
   hand out exclusive turns.
4. **Gap broker.** When an API lands, swap the stubs in every Keel that uses it, across features.
5. **Conflict radar.** Detect two Keels touching the same files or contracts, then order them or
   name one owner.
6. **One decision inbox.** Merge every Keel's open decisions, ranked by what each unblocks.
7. **Budget and models.** Spend by deadline, the strongest model for the hardest slices, and
   park stalled Keels.
8. **Demo assembly.** Build a combined branch of several features for one review, then take it
   apart.
9. **Cycle-risk drafts.** Flag tickets that are slipping because a gap is open, and draft
   updates for approval.
10. **Learnings aggregator.** Merge every Keel's lessons into proposed changes to Keel itself.

## 6. Not in scope

- Registering Keel in the plugin or moving it into core. Where it lands (a pack, core or its
  own plugin) is an open question.
- Pushing or opening PRs autonomously. Git authority stays `local-commits-only` until level 2.
- Tracker, chat or design-tool writes without an approved draft.
- Backend work owned by other engineers. Keel tracks it as gaps and blockers.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Schedules that die with the session | Desktop scheduled tasks plus a cloud change detector; record when cron was created and compute its expiry |
| Browser steps in unattended ticks | Browser only at intake; `ffmpeg` and APIs in ticks |
| Recording download terms | Check the vendor's terms; fall back to manual capture |
| Token cost at scale | Cheap change check; shared sensing in horizon 3 |
| Over-trust in agent confidence | Evidence-based scoring calibrated against human verdicts |
| Approval-gated tracker writes widen the blast radius | Show the exact draft; one approval per batch; read back and reconcile |

## 8. Open questions

| # | Question | Holding position |
|---|---|---|
| OQ-1 | Where does Keel live: a Jig pack, core or its own plugin? | Decide after a second engineer runs it |
| OQ-2 | Can a desktop scheduled task use the browser extension? | Test with "Run now" |
| OQ-3 | Can a script seek a recording and save frames from the browser extension? | 10-minute test at intake |
| OQ-4 | Level 3: product and design signoff, or either? | Either, recorded by name |
| OQ-5 | Which feature runs Keel next, and who runs it? | Open |

## 9. Suggested next step

A second engineer runs Keel on their own feature using the reference skill and stages 4.1–4.2.
That run decides OQ-1.
