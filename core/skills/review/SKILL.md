---
name: review
description: >
  Use when reviewing code before PRs or as quality gate during parallel execution.
  Dispatches parallel specialist review agents via the swarm architecture. Invoked
  by code-review agent, team-dev quality gate, or /review.
tier: workflow
alwaysApply: false
---

# Review Swarm Engine

**PURPOSE**: Dispatch parallel specialist review agents, each focused on one concern. Operates in four modes: **code** (diff review), **prd** (product requirements review, read as a non-engineer would), **spec** (technical spec review), and **plan** (implementation plan review). The orchestrator coordinates discovery, dispatch, scoring, and reporting across all modes.

**CONFIGURATION**: Reads `jig.config.md` for `swarm-tiers` (code), `prd-swarm-tiers` (prd), `spec-swarm-tiers` (spec), `plan-swarm-tiers` (plan), `deep-review-model`, `plan-deep-review-model`, `design-review-model`, and `specialist-model-default`.

---

## When to Use

### Mode: code (default)
- `code-review` agent invokes this with `mode: code, tier: all` (pre-PR, full swarm)
- `team-dev` quality gate invokes this with `mode: code, tier: fast-pass` (per-task, blocking checks only)
- `postmortem` and `extend` invoke this with `mode: code, specialists: [framework-fit]`, and also `[security]` for an artifact that handles untrusted input, and the paths they changed, for the fit review (`framework/LEARNING_LOOP.md`)
- Direct invocation via `/review` for manual code reviews

### Mode: prd
- `prd` skill invokes this with `mode: prd` after drafting a PRD
- Direct invocation via `/review` with a PRD document path or PRD artifact link
- Reviews the product document from the reader's side: plain language, MVP cut, testable outcomes, missing moments. Specialists may read the codebase when it is available but never ask for implementation detail.

### Mode: spec
- `spec` skill invokes this with `mode: spec` after drafting a spec
- Direct invocation via `/review` with a spec document path
- Automatic for medium-to-large features and improvements

### Mode: plan
- `plan` skill invokes this with `mode: plan` after drafting a plan
- Direct invocation via `/review` with a plan document path
- Automatic for medium-to-large features and improvements

**Logic reviewer**: In `code` mode, dispatched for `tier: all` invocations, unless the caller passed `specialists`. In `plan` mode, always dispatched after the specialist swarm. Not dispatched in `prd` or `spec` mode.

---

## Pipeline

### Stage 1: DISCOVER Specialists

Collect specialists from all three discovery directories (see `framework/DISCOVERY.md`):

1. Scan `team/specialists/`, `packs/*/specialists/`, and `core/specialists/` for `*.md` files
2. Read each file and parse the YAML frontmatter
3. Extract: `name`, `description`, `model`, `tier`, `stage`, `globs`, `severity`, and `tools` if present
4. Deduplicate by `name` (team > pack > core)
5. Filter by mode:
   - `mode: code` → include specialists where `stage` is **absent** (backward compatible — existing specialists have no `stage`)
   - Otherwise include specialists whose `stage` names the mode. `stage` is a single value (`prd`, `spec`, `plan`) or a list (`[spec, plan]`). The legacy value `both` means `[spec, plan]`.
6. If the caller passes `specialists: [...]`, keep only those names, skip the tier filter, and skip Stage 2's glob filter: a named specialist reviews every changed path the caller passed. If a name matches no specialist discovered for this mode, stop and report `Specialist not found: {name}` as an error, never as a score. Without `specialists`, filter by the requested tier:
   - `tier: all` → include all specialists matching the mode
   - `tier: fast-pass` → include only `tier: fast-pass` specialists matching the mode

Check `jig.config.md` for the appropriate tier config:
- `mode: code` → `swarm-tiers`
- `mode: prd` → `prd-swarm-tiers`
- `mode: spec` → `spec-swarm-tiers`
- `mode: plan` → `plan-swarm-tiers`

### Stage 2: PREPARE the Input

**Team memory.** In code and plan modes, when Stage 5 will run and this skill runs in the stage's own agent (not as a subagent, such as the `code-review` agent), search team memory once if it is on (the `memory` skill): root causes and traps for the changed areas in code mode, decisions for the feature in plan mode. Write a short summary in your own words with note ids. It goes only to the logic reviewer; swarm specialists and fast-pass get none.

#### Mode: code

Obtain the diff based on the caller:

**From `code-review` agent (pre-PR):**
```bash
git fetch origin
git diff origin/{main-branch}...HEAD
git diff origin/{main-branch}...HEAD --name-only
```
Read `main-branch` from `jig.config.md` (default: `main`).

**From `team-dev` quality gate (per-task):**
```bash
git diff <BASE_SHA>..<HEAD_SHA>
git diff <BASE_SHA>..<HEAD_SHA> --name-only
```

**From the fit review (`postmortem`, `extend`), before each push (Fit Review in `framework/LEARNING_LOOP.md`)**, limited to the paths the caller changed. Fetch the remote the main branch tracks, if it has one, and fall back to the local `{main-branch}`, saying so, when there is none or the fetch fails:
```bash
remote=$(git config branch.{main-branch}.remote)
if [ -n "$remote" ] && git fetch "$remote" {main-branch}; then main_ref="$remote/{main-branch}"; else main_ref={main-branch}; echo "fit review: using local $main_ref (no remote, or fetch failed)" >&2; fi
base=$(git merge-base "$main_ref" HEAD) || { echo "fit review: no merge base with $main_ref" >&2; exit 1; }
{ git diff "$base" --name-only -- <paths>; git ls-files --others --exclude-standard -- <paths>; } | sort -u
git diff "$base" -- <paths>
git diff --no-index /dev/null <untracked-file>   # once per untracked file: its whole content (exits 1 when it prints a diff)
```
If `merge-base` fails, stop and report the error; never review an empty diff in its place.

Extract the list of changed file paths: the `--name-only` output, plus the untracked files for the fit review. **If the list is empty, stop and report `Nothing reviewed: no changed files` as an error**, never as a score, a pass or a `skipped` line.

For each specialist the caller did not name, intersect its `globs` array with the changed file paths. A specialist whose globs match zero changed files is **skipped** — log it as `skipped: no matching files` but do not spawn it.

For each matching specialist, extract only the diff hunks for its matched files (every changed file, for a named specialist). This is the **filtered diff** that the specialist will review. An untracked file's hunk is its whole content.

#### Mode: prd

1. Read the PRD. For a `*-prd.md` file, read it directly. For a PRD artifact link, read the artifact and use the Markdown inside its `<script type="text/markdown" id="prd-source">` block.
2. For each matching specialist, compute section hints:
   - `plain-language` → "Focus on: every section, as a reader who has never written code"
   - `mvp-cut` → "Focus on: Phases, What it does, Scope"
   - `testable-outcomes` → "Focus on: What it does (each 'you'll know it works when' line), Measures"
   - `missing-moments` → "Focus on: Moments, People, What it does"
3. Build the specialist input: full PRD + section hints

#### Mode: spec

1. Read the spec document at the provided path
2. Read the PRD (from the spec header's `> **PRD:**` line) if it exists
3. For each matching specialist, compute section hints based on the specialist's description:
   - `data-dependency` → "Focus on: Data Model, API Contract, Business Logic"
   - `ui-conflict` → "Focus on: UI States, Component Behavior, Entry Points"
   - `blast-radius` → "Focus on: All sections (cross-cutting)"
   - `state-completeness` → "Focus on: Business Logic, API Contract"
4. Build the specialist input: full spec + PRD (if exists) + section hints

#### Mode: plan

1. Read the implementation plan at the provided path
2. Read the spec (from the plan header's `> **Spec:**` line) and the PRD (`> **PRD:**`) if they exist
3. For each matching specialist, compute section hints:
   - `task-dependency` → "Focus on: Task list, Dependencies"
   - `migration-safety` → "Focus on: Tasks involving DB/schema changes"
   - `blast-radius` → "Focus on: All tasks (cross-cutting)"
   - `state-completeness` → "Focus on: Tasks involving state/status changes"
4. Build the specialist input: full plan + spec (if exists) + section hints

### Stage 3: DISPATCH (Parallel)

#### Mode: code

For each specialist with matching files, and each specialist the caller named, spawn a parallel subagent using the Agent tool:

```
Agent tool:
  description: "Review: {specialist.name}"
  model: {specialist.model}     <- from frontmatter (haiku, sonnet, or opus)
  agent type: {read-only type with specialist.tools}   <- only if it declares `tools`
  prompt: |
    {specialist body}           <- everything below the frontmatter in the specialist file

    ---

    ## Diff to Review

    {filtered diff}             <- matching files only; every changed file for a named specialist
```

A specialist that declares `tools` (e.g. `framework-fit`) is dispatched as an agent type that has those tools and no write access. This is Jig's rule for a read-only subagent: an agent type whose tools are exactly read, search and list (`framework/HARNESS.md` says which each harness has, e.g. Jig's `reader` agent in Claude Code, not `Explore`, which keeps Bash). If the session has no such agent, or the harness cannot limit a subagent's tools, say so on the report's **Tools** line; never fall back silently to an agent that can write. A specialist without `tools` works from the diff in its prompt.

#### Mode: prd or spec

For each specialist with a matching stage, spawn a parallel subagent:

```
Agent tool:
  description: "Review: {specialist.name}"
  model: {specialist.model from frontmatter, or design-review-model
          from config as fallback}
  prompt: |
    {specialist body}

    ---

    ## Document to Review

    {full PRD or spec content}

    ## Section Hints

    {computed section hints for this specialist}

    ## PRD Reference          <- spec mode only

    {PRD content if available, or "No PRD available"}
```

#### Mode: plan

For each specialist with a matching stage, spawn a parallel subagent:

```
Agent tool:
  description: "Review: {specialist.name}"
  model: {specialist.model from frontmatter, or design-review-model
          from config as fallback}
  prompt: |
    {specialist body}

    ---

    ## Document to Review

    {full plan content}

    ## Section Hints

    {computed section hints for this specialist}

    ## Spec Reference

    {spec content if available, or "No spec available"}
```

All specialists in prd/spec/plan modes receive codebase access tools: Read, Grep, Glob. In prd mode the codebase may be absent (a PM running in Claude.ai); specialists then review the document alone.

**All matching specialists are dispatched in a single message** (parallel Agent calls). Do not dispatch sequentially.

### Stage 4: COLLECT

Wait for all specialist subagents to complete. For each result:
- If the response is exactly `N/A` → record as N/A (ran but found nothing)
- If the response starts with `Out of scope:` → from a specialist the caller named (the fit review), not clean: report it as an error naming those paths, never as N/A or a score. From one the swarm picked by its globs, record it as `out of scope`, like N/A, with no effect on the score
- Otherwise → parse the findings (File, Finding, Fix/Suggestion lines)

### Stage 5: DEEP REVIEW

#### Mode: code

**Skip this stage when `tier: fast-pass`, or when the caller passed `specialists`.** The code logic reviewer only runs for pre-PR reviews (`tier: all`).

After collecting swarm findings, dispatch the code logic reviewer:

1. Read `logic-reviewer.md` from this skill's directory
2. Build the prompt:
   - The logic reviewer's body (everything below frontmatter)
   - The full diff (all changed files — NOT filtered by globs)
   - The swarm findings collected in Stage 4 (so it knows what's already caught)
   - The team notes summary from Stage 2, if any
3. Dispatch a single Agent with:
   - `model: opus` (or `deep-review-model` from `jig.config.md`)
   - Full tool access: Read, Grep, Glob, Agent (the logic reviewer explores the codebase and can spawn sub-agents)
4. Wait for the logic reviewer to complete
5. Parse findings in the same format as swarm specialists

#### Mode: prd or spec

**Skip.** No deep reviewer for PRD or spec mode.

#### Mode: plan

**Always dispatch** after the specialist swarm completes:

1. Read `plan-logic-reviewer.md` from `core/skills/plan/`
2. Build the prompt:
   - The plan logic reviewer's body (everything below frontmatter)
   - The full implementation plan
   - The spec (if exists)
   - The swarm findings from Stage 4 (so it knows what's already caught)
   - The team notes summary from Stage 2, if any
3. Dispatch a single Agent with:
   - `model: opus` (or `plan-deep-review-model` from `jig.config.md`)
   - Full tool access: Read, Grep, Glob, Agent
4. Wait for the plan logic reviewer to complete
5. Parse findings in the `[plan-logic]` format

### Stage 6: SCORE

Apply mechanical scoring based on the highest severity finding. All findings are always reported regardless of score.

| When this is the highest severity | Score cannot be higher than |
|-----------------------------------|----------------------------|
| `blocking` | 4 |
| `major` (no blocking) | 7 |
| `minor` only | 8-9 |
| No findings | 10 |

No exceptions, no bumps for positives. An error (`Nothing reviewed`, `Specialist not found`, or a specialist the caller named answering `Out of scope:`) gets no score; the report says so (Stage 7).

Deduplication (mode-aware):

**Mode: code:**
- If multiple specialists flag the same `file:line` → merge into one finding, use the higher severity, note all specialists
- If the logic reviewer flags the same `file:line` as a specialist → drop the logic reviewer's finding (specialist caught it first)
- If the logic reviewer flags a different `file:line` but same root cause as a specialist → keep both, note the connection

**Mode: prd, spec or plan:**
- If multiple specialists flag the same document section → merge into one finding, use the higher severity, note all specialists
- If the plan logic reviewer flags the same task/section as a specialist → drop the logic reviewer's finding (specialist caught it first)
- If a specialist flags something already in the document's Open Questions or Open Decisions section → skip (author already knows)

### Stage 7: REPORT

Produce the unified report. Adapt the header by mode:

- `mode: code` → `## Code Review Summary`
- `mode: prd` → `## PRD Review Summary`
- `mode: spec` → `## Spec Review Summary`
- `mode: plan` → `## Plan Review Summary`

The rest of the report format is identical across modes:

**Confidence Score**: X/10, or `none (error): not a pass; fix the cause and re-run` when any error is listed
**Risk Level**: Low/Medium/High
**Specialists**: N dispatched, M skipped, K N/A, E errors
**Logic reviewer**: {ran / skipped (fast-pass) / skipped (specialists)}
**Tools**: {enforced / not enforced: <specialists> / none declared}

### Blocking Issues
{if any — grouped by specialist}

#### [{specialist.name}] {title}
- **File**: path:line_number
- **Finding**: {description}
- **Fix**: {actionable suggestion}

### Major Issues
{if any — same format}

### Minor Suggestions
{if any — same format, using "Suggestion" instead of "Fix"}

### Logic Review Findings
{if logic reviewer ran — findings grouped by severity, using the [logic] prefix}

#### [logic] {title}
- **File**: path:line_number
- **Finding**: {description}
- **How found**: {reasoning pattern and trace}
- **Fix**:
  ```
  {code suggestion}
  ```
- **Verify**: {how to confirm}

### Specialist Summary

| Specialist | Status | Findings |
|---|---|---|
| {name} | {N blocking / N major / N minor / clean / N/A / out of scope / skipped / error: <reason>} | {one-line summary or —} |
| logic-reviewer | {N blocking / N major / N minor / clean / skipped} | {one-line summary or —} |

**Skipped vs N/A distinction:**
- **Skipped** = specialist's globs matched zero changed files (never spawned; never applies to a specialist the caller named)
- **N/A** = specialist ran but found nothing relevant in the diff
- **Clean** = specialist ran, found relevant code, but no issues
- **Out of scope** = a specialist the caller did not name ran and answered `Out of scope:` (e.g. `framework-fit` on a team's own `framework/`); counted with N/A
- **Error** = the specialist could not review what it was given (not found, or a specialist the caller named answering `Out of scope:`); never clean

**Team memory.** If it is on (the `memory` skill) and this skill runs in the stage's own agent (never as a subagent, such as `code-review`), save a `trap` or `practice` that qualifies, per its Saving section. The report text never does.

---

## Tier Reference

See `tiers.md` for tier definitions, severity levels, and the default specialist inventory.

---

## Adding a New Specialist

1. Create a new `.md` file in `team/specialists/` (for team-specific) or `core/specialists/` (for framework)
2. Add frontmatter: `name`, `description`, `model`, `tier`, `globs`, `severity`, and `tools` only if the specialist must read files outside the diff
3. **For PRD/spec/plan specialists**: add `stage: prd`, `stage: spec`, `stage: plan`, or a list such as `stage: [spec, plan]`
4. **For code review specialists**: omit `stage` (backward compatible default)
5. Write the review prompt body with: What to check, What to ignore, Report format
6. The orchestrator discovers it automatically on next run — no config updates needed

## Splitting a Specialist

When a specialist's prompt grows too large:

1. Identify which concerns to split out
2. Create a new specialist file with the extracted concerns
3. Remove those concerns from the original specialist
4. Both specialists keep the same globs (they review the same files for different things)

---

## Integration Notes

### With `code-review` agent
The agent fetches `git diff origin/{main-branch}...HEAD`, then follows this skill's pipeline with `tier: all`.

### With `team-dev`
The lead dispatches this skill as a subagent after spec compliance passes. Diff is scoped to the task's commits (BASE_SHA..HEAD_SHA). Uses `tier: fast-pass`.

### With `prd` skill
The `prd` skill invokes this with `mode: prd` after drafting a PRD. Specialists whose `stage` includes `prd` are dispatched. No deep reviewer. When the PRD is a live artifact, the `prd` skill records the review in the artifact's log and the title block's "Checked" field.

### With `spec` skill
The `spec` skill invokes this with `mode: spec` after drafting a spec. Specialists whose `stage` includes `spec` are dispatched. No deep reviewer. Automatic for medium-to-large work.

### With `plan` skill
The `plan` skill invokes this with `mode: plan` after drafting a plan. Specialists whose `stage` includes `plan` are dispatched, followed by the plan logic reviewer (Opus). Automatic for medium-to-large work.

### With `postmortem`
When a finding is missed, the postmortem uses the Specialist Summary table to diagnose which specialist should have caught it. Postmortem and `extend` also run this skill as the fit review: `specialists: [framework-fit]` on the paths they changed, with no logic reviewer, and also `specialists: [security]` for an artifact that handles untrusted input (Fit Review in `framework/LEARNING_LOOP.md`).

### With `pr-brief`
This skill reviews your own changes. To brief yourself on someone else's PR, use `pr-brief`. pr-brief (and team-dev's lead-playbook, for untrusted input) use Stage 3's rule for a read-only subagent, the `reader` agent in Claude Code; a change to that rule changes pr-brief's untrusted-input gate.
