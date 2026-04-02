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

**PURPOSE**: Dispatch parallel specialist review agents, each focused on one concern. Operates in three modes: **code** (diff review), **prd** (requirements review), and **plan** (implementation plan review). The orchestrator coordinates discovery, dispatch, scoring, and reporting across all modes.

**CONFIGURATION**: Reads `jig.config.md` for `swarm-tiers` (code), `prd-swarm-tiers` (prd), `plan-swarm-tiers` (plan), `deep-review-model`, `plan-deep-review-model`, `design-review-model`, and `specialist-model-default`.

---

## When to Use

### Mode: code (default)
- `code-review` agent invokes this with `mode: code, tier: all` (pre-PR, full swarm)
- `team-dev` quality gate invokes this with `mode: code, tier: fast-pass` (per-task, blocking checks only)
- Direct invocation via `/review` for manual code reviews

### Mode: prd
- `prd` skill invokes this with `mode: prd` after drafting a PRD
- Direct invocation via `/review` with a PRD document path
- Automatic for medium-to-large features and improvements

### Mode: plan
- `plan` skill invokes this with `mode: plan` after drafting a plan
- Direct invocation via `/review` with a plan document path
- Automatic for medium-to-large features and improvements

**Logic reviewer**: In `code` mode, dispatched for `tier: all` invocations. In `plan` mode, always dispatched after the specialist swarm. Not dispatched in `prd` mode.

---

## Pipeline

### Stage 1: DISCOVER Specialists

Collect specialists from all three discovery directories (see `framework/DISCOVERY.md`):

1. Scan `team/specialists/`, `packs/*/specialists/`, and `core/specialists/` for `*.md` files
2. Read each file and parse the YAML frontmatter
3. Extract: `name`, `description`, `model`, `tier`, `stage`, `globs`, `severity`
4. Deduplicate by `name` (team > pack > core)
5. Filter by mode:
   - `mode: code` → include specialists where `stage` is **absent** (backward compatible — existing specialists have no `stage`)
   - `mode: prd` → include specialists where `stage: prd` or `stage: both`
   - `mode: plan` → include specialists where `stage: plan` or `stage: both`
6. Filter by the requested tier:
   - `tier: all` → include all specialists matching the mode
   - `tier: fast-pass` → include only `tier: fast-pass` specialists matching the mode

Check `jig.config.md` for the appropriate tier config:
- `mode: code` → `swarm-tiers`
- `mode: prd` → `prd-swarm-tiers`
- `mode: plan` → `plan-swarm-tiers`

### Stage 2: PREPARE the Input

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

Extract the list of changed file paths. For each specialist, intersect its `globs` array with the changed file paths. A specialist whose globs match zero changed files is **skipped** — log it as `skipped: no matching files` but do not spawn it.

For each matching specialist, extract only the diff hunks for its matched files. This is the **filtered diff** that the specialist will review.

#### Mode: prd

1. Read the PRD document at the provided path
2. For each matching specialist, compute section hints based on the specialist's description:
   - `data-dependency` → "Focus on: Data Model, API Contract, Business Logic"
   - `ui-conflict` → "Focus on: UI States, Component Behavior, Entry Points"
   - `blast-radius` → "Focus on: All sections (cross-cutting)"
   - `state-completeness` → "Focus on: Business Logic, API Contract"
3. Build the specialist input: full document + section hints

#### Mode: plan

1. Read the implementation plan at the provided path
2. Read the PRD (from the plan header's `> **PRD:**` line) if it exists
3. For each matching specialist, compute section hints:
   - `task-dependency` → "Focus on: Task list, Dependencies"
   - `migration-safety` → "Focus on: Tasks involving DB/schema changes"
   - `blast-radius` → "Focus on: All tasks (cross-cutting)"
   - `state-completeness` → "Focus on: Tasks involving state/status changes"
4. Build the specialist input: full plan + PRD (if exists) + section hints

### Stage 3: DISPATCH (Parallel)

#### Mode: code

For each specialist with matching files, spawn a parallel subagent using the Agent tool:

```
Agent tool:
  description: "Review: {specialist.name}"
  model: {specialist.model}     <- from frontmatter (haiku, sonnet, or opus)
  prompt: |
    {specialist body}           <- everything below the frontmatter in the specialist file

    ---

    ## Diff to Review

    {filtered diff}             <- only the files matching this specialist's globs
```

#### Mode: prd

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

    {full PRD content}

    ## Section Hints

    {computed section hints for this specialist}
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

    ## PRD Reference

    {PRD content if available, or "No PRD available"}
```

All specialists in prd/plan modes receive codebase access tools: Read, Grep, Glob.

**All matching specialists are dispatched in a single message** (parallel Agent calls). Do not dispatch sequentially.

### Stage 4: COLLECT

Wait for all specialist subagents to complete. For each result:
- If the response is exactly `N/A` → record as N/A (ran but found nothing)
- Otherwise → parse the findings (File, Finding, Fix/Suggestion lines)

### Stage 5: DEEP REVIEW

#### Mode: code

**Skip this stage when `tier: fast-pass`.** The code logic reviewer only runs for pre-PR reviews (`tier: all`).

After collecting swarm findings, dispatch the code logic reviewer:

1. Read `logic-reviewer.md` from this skill's directory
2. Build the prompt:
   - The logic reviewer's body (everything below frontmatter)
   - The full diff (all changed files — NOT filtered by globs)
   - The swarm findings collected in Stage 4 (so it knows what's already caught)
3. Dispatch a single Agent with:
   - `model: opus` (or `deep-review-model` from `jig.config.md`)
   - Full tool access: Read, Grep, Glob, Agent (the logic reviewer explores the codebase and can spawn sub-agents)
4. Wait for the logic reviewer to complete
5. Parse findings in the same format as swarm specialists

#### Mode: prd

**Skip.** No deep reviewer for PRD mode.

#### Mode: plan

**Always dispatch** after the specialist swarm completes:

1. Read `plan-logic-reviewer.md` from `core/skills/plan/`
2. Build the prompt:
   - The plan logic reviewer's body (everything below frontmatter)
   - The full implementation plan
   - The PRD (if exists)
   - The swarm findings from Stage 4 (so it knows what's already caught)
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

No exceptions, no bumps for positives.

Deduplication (mode-aware):

**Mode: code:**
- If multiple specialists flag the same `file:line` → merge into one finding, use the higher severity, note all specialists
- If the logic reviewer flags the same `file:line` as a specialist → drop the logic reviewer's finding (specialist caught it first)
- If the logic reviewer flags a different `file:line` but same root cause as a specialist → keep both, note the connection

**Mode: prd or plan:**
- If multiple specialists flag the same document section → merge into one finding, use the higher severity, note all specialists
- If the plan logic reviewer flags the same task/section as a specialist → drop the logic reviewer's finding (specialist caught it first)
- If a specialist flags something already in the document's Open Questions section → skip (author already knows)

### Stage 7: REPORT

Produce the unified report. Adapt the header by mode:

- `mode: code` → `## Code Review Summary`
- `mode: prd` → `## PRD Review Summary`
- `mode: plan` → `## Plan Review Summary`

The rest of the report format is identical across modes:

**Confidence Score**: X/10
**Risk Level**: Low/Medium/High
**Specialists**: N dispatched, M skipped, K N/A
**Logic reviewer**: {ran / skipped (fast-pass)}

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
| {name} | {N blocking / N major / N minor / clean / N/A / skipped} | {one-line summary or —} |
| logic-reviewer | {N blocking / N major / N minor / clean / skipped} | {one-line summary or —} |

**Skipped vs N/A distinction:**
- **Skipped** = specialist's globs matched zero changed files (never spawned)
- **N/A** = specialist ran but found nothing relevant in the diff
- **Clean** = specialist ran, found relevant code, but no issues

---

## Tier Reference

See `tiers.md` for tier definitions, severity levels, and the default specialist inventory.

---

## Adding a New Specialist

1. Create a new `.md` file in `team/specialists/` (for team-specific) or `core/specialists/` (for framework)
2. Add frontmatter: `name`, `description`, `model`, `tier`, `globs`, `severity`
3. **For PRD/PLAN specialists**: add `stage: prd`, `stage: plan`, or `stage: both`
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
The `prd` skill invokes this with `mode: prd` after drafting a PRD. Specialists with `stage: prd` or `stage: both` are dispatched. No deep reviewer. Automatic for medium-to-large work.

### With `plan` skill
The `plan` skill invokes this with `mode: plan` after drafting a plan. Specialists with `stage: plan` or `stage: both` are dispatched, followed by the plan logic reviewer (Opus). Automatic for medium-to-large work.

### With `postmortem`
When a finding is missed, the postmortem uses the Specialist Summary table to diagnose which specialist should have caught it.
