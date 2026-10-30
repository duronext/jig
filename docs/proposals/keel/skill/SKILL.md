---
name: keel
description: Use when a whole feature (PRD, designs, tickets, backend work in flight) should be built and kept built as a stack of PR branches. Runs a twice-daily loop that re-reads the feature's sources, re-plans only what changed, builds and rebuilds the stack with stubs for missing APIs and designs, reviews its own work with recorded fix/won't-fix decisions, runs browser UAT, and reports progress, demo blockers and UAT results. Commands - "/keel start <feature-dir>", "/keel tick <feature-dir>", "/keel review <feature-dir>", "/keel status <feature-dir>", "/keel stop <feature-dir>".
tier: workflow
alwaysApply: false
---

# Keel: continuous feature builder (POC reference)

> Reference implementation from a three-week pilot. It is **not registered** in the Jig plugin.
> Read it with the proposal in `../2026-10-30-keel-poc-proposal.md`. Stack-specific recipes
> (how to start the dev environment, which files the dev services rewrite, package build
> commands) live in the repo's **stack adapter** (`keel.json` → `stack`), not here.

Keel keeps a feature's stack of PR branches in step with its sources. It is a reconcile loop:
the sources are the desired state, the stack branches and their verify and UAT results are the
actual state, and each tick acts on the difference.

## North star
Keel takes as much information as exists about a feature and builds the desired output, then
keeps monitoring that information (PRD, specs, docs, designs, recording transcripts with
time-synced screenshots, tickets, backend schema and PRs) and uses every update to re-plan,
iterate and refine what it built. It works the way an engineer did before agentic tools: stub
the API that does not exist yet, stub the screen that has not been designed yet, and iterate as
clarity arrives, but autonomously, until a human is needed for verification.
The intake is collaborative: Keel and the engineer feed in the initial sources and walk through
the ambiguity together to produce tickets, plans and the PR stack, so that open questions are
answered up front and later defaults are rare.

## Feature directory layout (`<feature-dir>`)

Lives outside the repo (for example `~/.claude/keel/<repo>/<ticket>/`). Nothing here is committed.

| Path | Role | Who writes |
|---|---|---|
| `keel.json` | Config: repo, worktree, sources, schedule, budgets, git authority, stack adapter | engineer |
| `stack.md` | The manifest: PRs, order, dependencies, readiness | tick (planner) |
| `plans/NN-*.md` | Per-PR implementation plan (Jig plan format) | tick (planner) |
| `state.json` | Per-PR machine state: branch, level, built sha, dirty, stubs, plan hashes | tick |
| `impact-map.json` | Source item id → stack PRs it affects | tick (planner) |
| `stubs.md` | Stub registry: gap id → where stubbed → swap signal | tick |
| `backend-gaps.md`, `breakdown.md`, `design-inventory.md` | Living analysis | tick |
| `ledger.md` | Status (overwritten) + decisions (append-only) | tick + engineer |
| `STATUS.md` | The one report the engineer reads: progress, demo blockers, UAT | tick |
| `learnings.md` | Append-only: what worked and what did not, for generalizing Keel | tick |
| `inbox/` | Anything the engineer drops in: transcripts, frames, notes | engineer |
| `snapshots/<ts>/` | Normalized source snapshots | sensors |
| `runs/<ts>/` | Per-tick log: changes, decisions, timings | tick |
| `reviews/NN-<ts>.md` | Evaluator findings with fix/won't-fix + reason | evaluator |
| `uat/UAT-SCRIPT.md`, `uat/runs/<ts>/` | UAT script and results + screenshots | UAT worker |
| `lock/` | Present while a tick runs | tick |

## Hard rules (every phase, every worker)

1. **Git authority comes from `keel.json`.** For `local-commits-only`: commit on stack branches in
   the feature worktree only. Never push, never open or edit PRs, never force anything on a
   remote.
2. **Never write to external systems.** No tracker edits or comments, no chat messages, no PR
   comments, no design-tool writes (read-only scripts only), no document edits. List proposed
   edits for the engineer instead.
3. **Git hygiene.** Never `git stash`. Never check out or reset in any worktree except the
   feature worktree. Keel may operate the local dev environment, but only through the stack
   adapter's recipes. Seed and verify data through the repo's test-data tooling, never by raw
   writes to real records. Fold fixes into the owning PR's commit (`git commit --fixup` +
   `git rebase -i --autosquash` with `GIT_SEQUENCE_EDITOR=:`), then restack with `--update-refs`.
4. **Stubs only in one stub registry module**, keyed by a gap id, and only while the API or design
   is missing. Every stub is listed in `stubs.md`. A stub may reach level 4 only if the
   stub-cleanup PR lists it as an open follow-up and product signs it off at level 3.
5. **Data safety in UAT.** Create and delete only records named with the `UAT-KEEL-` prefix.
   Never delete or edit other records.
6. **Build everything.** The whole stack is built as soon as plans are reviewed. Ticks exist to
   detect upstream changes and rebuild only what they affect. Missing design or a missing API is
   not a reason to skip: stub the screen or the data and swap when the source arrives. Skip only
   when even a stub would be guesswork that misleads, and record why.
7. **Signed-off work is protected.** A PR at level ≥2 that must change drops back to level 1, and
   `STATUS.md` names it under "Needs the engineer". Never silently replace accepted work.
8. **Decide, don't wait.** When a decision belongs to the engineer, take the documented default,
   log it in the ledger as `agent (default, reversible)`, add it to Open decisions, and continue.
9. **Never mark anything done without evidence** (command output, test result, screenshot path).
10. **No build from an unreviewed plan.** A PR is built only when `state.json` `reviewedPlanHash`
    equals its current `planHash`. See `REVIEW.md`.

## Build levels (per PR)
0 not started · 1 built (verify green + evaluator pass) · 2 engineer's UAT signoff ·
3 product/design signoff · 4 stack merged (the only "done"). Keel only ever sets 0–1.

## Commands

### `/keel start <feature-dir>`
Run interactively, with the engineer present.
1. Read `keel.json`; confirm the worktree exists and is on a stack branch with a clean tree.
2. Ask the engineer to start the dev environment with the stack adapter's `dev.start` command
   (often needs a TTY), then run `dev.health` and confirm the app is served from the feature
   worktree.
3. Confirm the browser MCP can open `stack.uat.baseUrl` logged in. Credentials stay in the
   engineer's private memory or keychain, never in files.
4. Confirm every sensor tool is signed in with one trivial read each (tracker, docs, design
   tool). If one fails with an auth error, ask the engineer to sign in again (`/mcp`). A blocked
   sensor degrades a tick; it does not stop it.
5. Keep the machine awake for the week (for example Amphetamine or `caffeinate`) and on AC power.
6. First `CronList` and `CronDelete` every existing `/keel tick <feature-dir>` job (a re-arm must
   not leave a second pair). Then `CronCreate` (recurring, local time) for each
   `schedule.cron` entry, prompt `/keel tick <feature-dir>`. Record the job ids and
   `cronCreatedAt` in `state.json`. Session cron jobs expire after 7 days and fire only while
   this session is idle and alive.
7. If any plan's `reviewedPlanHash` is missing or stale, run `/keel review` first.
8. Run the first tick now.

### `/keel tick <feature-dir>`
Follow `TICK.md` exactly. The main session orchestrates; heavy work goes to fresh subagents so
the session's context stays small.

### `/keel review <feature-dir>`
Full plan review of every plan, following `REVIEW.md`. Run before the first build and whenever
the engineer asks. Ends with `reviews/SUMMARY-<ts>.md` for the engineer's read-through.

### `/keel status <feature-dir>`
Print the top of `STATUS.md` and the ledger's Status and Open decisions.

### `/keel stop <feature-dir>`
`CronDelete` the job ids in `state.json`, write a final `STATUS.md` section "Stopped <date>", and
append a closing `learnings.md` entry.
