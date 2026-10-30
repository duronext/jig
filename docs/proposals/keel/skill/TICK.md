# Keel tick runbook

`F` = feature dir, `W` = worktree from `keel.json`, `TS` = `date -u +%Y%m%dT%H%MZ`, `S` = this skill
dir, `A` = the stack adapter (`keel.json` → `stack`). Record the start and end of every phase in
`F/runs/TS/timings.md`. If a phase fails, write why in `F/runs/TS/log.md`, mark it FAILED in the
report, and continue with the next phase that does not depend on it. A tick never ends without
Phase 7.

## Phase 0: Preflight (≤5 min)
1. `mkdir F/lock`. If it exists and is younger than 4 h, another tick is running: log and exit.
   If older, remove it and note "stale lock recovered".
2. `mkdir -p F/runs/TS`; read `keel.json`, `state.json`, `stack.md`, `ledger.md`, the last
   `STATUS.md`.
3. Worktree health in W: `git status --porcelain`. First restore the files the dev services
   rewrite at boot (`A.noisePaths`) unless a stack plan owns them. If a rebase was interrupted
   (`$(git -C W rev-parse --git-dir)/rebase-merge` exists, for example the laptop slept), finish
   or abort it deliberately and log how. If still dirty (a crashed tick), save
   `git diff HEAD > F/runs/TS/recovered.patch` and the untracked file list, then clean **only
   inside W**, and log it.
4. Services: run `A.dev.health`. Record UP/DOWN per service. If anything is DOWN, try the
   adapter's recovery recipe, then poll health for up to 3 min. Still DOWN → UAT BLOCKED(env),
   reason in STATUS.
5. Tools: confirm the design tool, tracker, docs and browser MCP each answer a trivial read. A
   missing tool marks its sensor or UAT BLOCKED, not the whole tick.

## Phase 1: Sense (≤15 min) → `F/snapshots/TS/`
Each file is `{source, at, items:[{id, hash, meta}]}`. Hashes are sha256 (first 16 hex) computed
with `shasum -a 256` on a temp file; never invent a hash.
1. **code**: `S/bin/sense-code.sh F F/snapshots/TS/code.json` (schema on main + open PRs that
   touch the watched paths).
2. **design**: for each design file and page in `keel.json`, run `S/bin/figma-sensor.js` through
   the design MCP (read-only), one page per call. It hashes rendered properties only (type, size,
   visibility, text, fills, variant props), not layer names, so renames are not changes. Large
   pages: walk only listed sections and split frames across calls. A call that times out can drop
   other calls on the same file, so serialize per file.
3. **tracker**: read each ticket in `keel.json` plus new children of the feature ticket. Hash
   `status|assignee|title|description`; keep the previous hash when `updatedAt` is unchanged.
4. **prd**: read the PRD with comments. Split on top-level `##` / `###` headings; one item per
   section, plus one for comments when they exist.
5. **inbox**: `S/bin/sense-inbox.sh F F/snapshots/TS/inbox.json` (files the engineer drops in
   `F/inbox/`).
**A sensor that fails** (auth expired, tool missing, timeout) writes
`{"source": "<name>", "blocked": true, "reason": "<exact error>"}`. The diff then reports the
source as unavailable, never as removed. Each blocked sensor goes to STATUS "Needs the engineer".

## Phase 2: Diff (≤2 min)
`python3 S/bin/diff-snapshots.py <previous snapshot dir> F/snapshots/TS F/impact-map.json F/runs/TS/changes.json`
(previous = newest older dir in `F/snapshots`). Then write `F/runs/TS/changes.md`: one line per
change in plain words.

## Phase 3: Triage and re-plan (≤20 min)
Classify each change and act. Record every decision in `F/runs/TS/decisions.md` and, if it
changes a plan, in `ledger.md` Decisions as `agent`.
- **Noise** (hash churn without meaning): note, no action.
- **WIP design** (frame under a work-in-progress section, or an unmapped new frame): read it,
  summarize it, map it to PRs in `impact-map.json` if it clearly belongs; change a plan only if
  that plan cites the frame.
- **Spec change** (PRD section, annotation, approved frame, ticket acceptance): update the
  affected plans and mark those PRs `dirty: true` with the reason.
- **API change** (schema hash moved on main or in an open PR): for each gap in `stubs.md`, check
  its swap signal. Landed on main → close the gap and add a SWAP task to the PRs that stub it.
  Only in an open PR → note "in flight", no build change.
- **Inbox item**: a fresh agent reads it in full. For a recording or transcript, extract
  requirements, decisions, open questions and UI details with timestamps (and frames when
  provided) into `F/discovery/inbox-<name>.md`, then treat each item like a spec change.
  Conflicts with the PRD or designs go to STATUS "Needs the engineer" with the default taken.
- **Ticket change** (status, assignee, new sub-issue): update ticket facts and blockers; a new
  backend ticket may open or close a gap.
- **Engineer-level decision** (scope, naming, product rule): hard rule 8.

## Phase 3b: Re-review changed plans (≤20 min)
Follow `REVIEW.md` "Re-review" for every plan whose hash differs from `reviewedPlanHash`: one
fresh reviewer per plan plus its stack neighbors, a fresh fixer for `fix` verdicts (each writes
a `KEEL-REVIEW` record for the version it leaves), then `S/bin/stamp-reviewed.py F <plan-ids>`.
It stamps only at a recorded, `clear` hash. A refused or blocked plan stays unbuildable this tick.

## Phase 3c: Follow main (≤30 min, every tick)
Keeps every stack branch on the latest main so the stack never drifts.
1. Fetch main. If it equals `state.json` `mainSha`, record "current" and skip to Phase 4.
2. Check out the top built branch and run `git rebase --update-refs origin/main`. This moves
   every stack branch in one pass. Nothing is pushed.
3. **On conflict**, a fresh **resolver** agent gets the conflicted files, the commit being
   replayed and the owning plan. It resolves only files a stack PR changes (keep main's change,
   re-apply ours). Generated files: take main's copy, regenerate after the rebase. Source files
   that only look generated (for example locale catalogs) are three-way merged, never replaced.
   If a conflict needs a product judgment, or the same commit conflicts twice: abort, keep the
   old base, and log "stack cannot follow main" under "Needs the engineer".
4. **Post-sync upkeep** from `A.postSync`, only for what changed on main (dependency install,
   package builds, schema composition). Check that built artifacts reflect the new tip before
   the gate.
5. **Full-suite gate** (`A.gate`): typecheck and unit suites from the top branch, with Keel's own
   tripwire tests switched on for the tick only. A failure in a file a stack PR owns marks that
   PR dirty. A failure in a file no stack PR touches is labeled "main-side" and dirties nothing.
6. Record `mainSha`, commits pulled in, and conflicts resolved in `F/runs/TS/sync.md`.

## Phase 4: Build (until the queue is empty)
0. **Baseline**: before the first build, run the suites once on main and save failing test names
   to `F/runs/TS/baseline-failures.json`; the gate treats those as main-side.
Work queue: (a) dirty PRs that are already built, in stack order; (b) the next unbuilt PR. Never
build above an unbuilt base, never from an unreviewed plan. Blocked PRs are built too, with stubs.
1. For each queue item, spawn a **fresh builder** subagent. Model: the session model; `fable` when
   the plan says `complexity: high`; on a credit or capacity error retry once with the session
   model and log it.
2. **Contract sync**: when a PR reaches level 1, built names win over plan text. A fresh agent
   corrects every unbuilt plan that imports from it, writes a `KEEL-REVIEW` record for each
   plan it changed, and re-stamps them.
3. After each builder: check its evidence, update `state.json` (`level: 1` only after Phase 5).
4. Missing design alone means a design stub (shared layout patterns, real data, a visible "design
   pending" marker in dev only), registered as a design gap. Pipeline: evaluate PR N while PR
   N+1 builds.

### Builder brief (paste into the subagent prompt)
> You build one PR of a stacked feature. Worktree: W. Plan: <plan path> (read it fully first).
> PR #<n>, branch <branch>, base <base>. The hard rules in <S>/SKILL.md apply. Local commits only.
> New PR: check out <base> and create <branch> (or reuse an empty one). Copy the plan into the
> repo where the ticket's References say, with personal names replaced by roles. Implement with
> TDD (test first, see it fail, implement, see it pass); use the plan's commit messages.
> Rebuild: on the TOP built branch, commit `--fixup=<last commit of branch n>`, then
> `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash --update-refs origin/main`. On conflict, abort,
> commit on <branch> instead and restack descendants; if that conflicts too, abort and report.
> Before every commit restore `A.noisePaths` and check `git status` shows only files your plan
> touches. Never start watchers or long-lived processes; one-shot builds only.
> Accessibility: decorative icons hidden from assistive tech; every control has an accessible
> name that carries its state; dialogs return focus; one role-and-name test per new control.
> Stubs only through the stub registry, keyed by gap id; list each in your report.
> Verify before reporting (`A.verify`): typecheck, the plan's targeted tests, lint on touched files.
> Report: commits, files changed, verify commands with their exact output tail, stubs added or
> removed, anything you could not do and why.

## Phase 5: Evaluate (≤30 min)
For each PR built or rebuilt this tick, a **fresh evaluator** (never the builder; `jig:code-review`
when available) reviews `git diff <base>..<branch>` against the plan's acceptance, the design
frames it cites and the repo's conventions. Each finding: severity, file:line, claim, evidence,
and a verdict:
- **fix**: correctness, security, accessibility, an acceptance item, design fidelity on an
  approved frame, a documented convention.
- **won't-fix**: theoretical, pre-existing on main, out of this PR's scope (name where it
  belongs), or style. Always with a reason.
Write `F/reviews/NN-TS.md`. Apply `fix` verdicts with a fresh builder (rebuild path). At most 2
evaluate→fix rounds per PR per tick; unresolved `fix` findings keep the PR at level 0. Then run
the full suite once from the top; a red result marks the breaking PR dirty and holds every PR
above it.

## Phase 6: UAT (≤40 min)
Run when anything was built this tick, or the last UAT is older than 24 h.
1. Services DOWN → every scenario BLOCKED(env); skip.
2. Check out the top level-1 branch in W; make sure the served app reflects it (`A.uat.ready`).
3. A **fresh UAT worker** runs `uat/UAT-SCRIPT.md` in its own isolated browser context, logged
   in, acting only on `UAT-KEEL-*` records (it asserts the record name before every mutating
   step). One screenshot per scenario; results PASS / FAIL / BLOCKED-BY-API (gap id) / NOT-BUILT
   / MANUAL; each FAIL names expected vs actual and the owning PR. It cleans up what it created
   and never writes credentials anywhere.
4. Each FAIL becomes a dirty reason for the next tick.

## Phase 7: Report (≤10 min, always runs)
1. Overwrite `STATUS.md`:
   - **Header:** last tick, next tick, ticks run, health, sensors read vs blind, "stack based on
     main @ <sha>, 0 behind" or the sync blocker.
   - **1. How far along:** per PR (title, level, built sha, active stubs, rebuilds, last change
     reason); totals and one honest sentence.
   - **2. What blocks a demo:** stubbed API gaps (what the user would see), design questions,
     environment problems, failing demo-critical scenarios.
   - **3. Latest UAT:** counts, every FAIL with its screenshot, BLOCKED reasons.
   - **4. What changed upstream and what Keel did.**
   - **5. Needs the engineer:** defaults taken, level regressions, conflicts.
2. Overwrite ledger Status; append ledger Decisions.
3. Update `state.json` (`lastTick`, `mainSha`, per-PR fields).
4. Append to `learnings.md`: phase timings, what worked, what needed a workaround, any rule that
   should change, and a one-line "generalize?" note.
5. `rmdir F/lock`.
