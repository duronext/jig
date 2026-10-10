# PRD: Specialist Dispatch for PRD & PLAN Stages

## 1. Overview

Add specialist review swarms to the PRD and PLAN stages of the Jig
pipeline. After a PRD or implementation plan is authored, a swarm of
focused specialists scrutinizes the document for blind spots — data
dependencies the author missed, UI conflicts they didn't know about,
blast radius they underestimated, incomplete state transitions. Same
proven pattern as the code review swarm, applied upstream where catching
issues is 10x cheaper.

**Context:** [Jig pipeline](../../framework/PIPELINE.md) |
[Review swarm](../../core/skills/review/SKILL.md) |
[Logic reviewer](../../core/skills/review/logic-reviewer.md)

## 2. Background & Motivation

Jig's code review swarm dispatches narrow specialists (security,
dead-code, error-handling, async-safety, performance) plus a deep logic
reviewer. The white paper finding: **focused context dramatically
outperforms comprehensive context.** A specialist with 5 patterns to
check achieves 95% accuracy vs a generalist at 60%.

But this scrutiny only happens at code time. PRDs and plans go through
human review (if at all) with no structured challenge. Real-world
consequences:

- **Missed data dependencies**: "Drop a column" — but 12 foreign keys
  depend on it, and data needs migration first.
- **UI conflicts**: "Add a button here" — but another button renders in
  that exact spot when a feature flag is enabled.
- **Ripple effects**: "Allow toggle ON while duplicates exist and
  enforce lazily" — that path ripples across the entire application
  (backend and frontend), touching component UI, change orders, and
  exports.
- **Incomplete state machines**: "Add a DRAFT state" — but no
  transition back from SUBMITTED is defined.

These are the same class of issues the logic reviewer catches in code —
but by then the implementation is done. Catching them at requirements
and planning time saves entire implementation cycles.

## 3. Specialist Schema

Reuse the existing specialist frontmatter schema from
[SKILL_SCHEMA.md](../../framework/SKILL_SCHEMA.md) with one addition:
a `stage` field that scopes specialists to pipeline stages.

For each PRD/PLAN specialist:

- **name**: Unique identifier (e.g., `data-dependency`, `ui-conflict`)
- **description**: One-line summary of what it scrutinizes
- **model**: `haiku` for pattern-matching, `sonnet` for reasoning-heavy
- **tier**: `fast-pass` or `full-only` (same meaning as code review)
- **stage**: `prd`, `plan`, or `both` — NEW field, determines which
  swarm dispatches this specialist
- **globs**: File patterns — defaults to `docs/plans/**-prd.md` or
  `docs/plans/**-plan.md` depending on stage
- **severity**: `blocking`, `major`, or `minor`

The markdown body below frontmatter IS the specialist's prompt — same
convention as code review specialists.

### Acceptance Criteria

- [ ] [DATA] Specialist schema documented in `framework/SKILL_SCHEMA.md`
  with `stage` field definition
- [ ] [LOGIC] `stage` field accepts `prd`, `plan`, or `both`
- [ ] [LOGIC] Specialists without `stage` field are excluded from
  PRD/PLAN swarms (backward compatible — code review specialists
  don't accidentally run)

## 4. Discovery & File Structure

Specialists live in the same three-tier discovery hierarchy:

```
team/specialists/    ← Team-specific (highest priority)
packs/*/specialists/ ← Pack defaults
core/specialists/    ← Framework defaults
```

New core specialists for this feature go in `core/specialists/` alongside
existing code review specialists. Discovery filters by `stage` field:

- PRD swarm discovers specialists where `stage: prd` or `stage: both`
- PLAN swarm discovers specialists where `stage: plan` or `stage: both`
- Code review swarm discovers specialists where `stage` is absent
  (existing behavior, unchanged)

### Acceptance Criteria

- [ ] [DATA] New specialists created in `core/specialists/`
- [ ] [LOGIC] Discovery filters by `stage` field — PRD swarm only gets
  `prd`/`both`, PLAN swarm only gets `plan`/`both`
- [ ] [LOGIC] Existing code review specialists (no `stage` field)
  are unaffected — backward compatible

## 5. Dispatch Logic & Rules

### Automatic Dispatch

Both swarms run automatically. The agent may skip the swarm only for
clearly trivial work (config change, single-line fix, chore). For any
medium-to-large task, the swarm is non-negotiable.

### PRD Review Swarm

**When**: After PRD is drafted and before user approval (Step 3→4
transition in the `prd` skill).

**Input to each specialist**: The full PRD document content.

**Process** (mirrors code review swarm):

1. **DISCOVER**: Scan all three specialist directories, filter by
   `stage: prd` or `stage: both`
2. **PREPARE**: Read the PRD document
3. **DISPATCH**: Spawn parallel Agent subagents, one per matching
   specialist. Each receives the PRD content + its specialist prompt
4. **COLLECT**: Wait for all subagents. Parse findings or `N/A`
5. **SCORE**: Same mechanical scoring as code review (blocking→4,
   major→7, minor→8-9, clean→10)
6. **REPORT**: Unified report with findings grouped by specialist and
   severity

### PLAN Review Swarm

**When**: After implementation plan is drafted and before user approval
(Step 3→4 equivalent in the `plan` skill).

**Input to each specialist**: The full plan document + the PRD (if one
exists) for cross-reference.

**Codebase access**: PLAN specialists receive Read, Grep, and Glob
tool access. This lets them verify claims against the actual codebase —
e.g., checking that a column really has no foreign keys, that a file
path exists, that an import is valid. This is where the real value is.

**Process**: Same 6-stage pipeline as PRD review, plus a 7th stage:

7. **DEEP REVIEW**: After the specialist swarm completes, dispatch an
   Opus-model plan logic reviewer. Receives the full plan, PRD (if
   any), swarm findings, and codebase access. Applies the same
   skeptical reasoning as the code logic reviewer — traces task
   dependencies, verifies ordering assumptions, checks that the plan
   actually achieves the stated goal. Prevents duplication with swarm
   findings.

### Scoring

Same mechanical scoring as code review:

| Highest Severity | Score | Meaning |
|------------------|-------|---------|
| blocking | ≤4 | Must address before approving |
| major | ≤7 | Should address, significant risk |
| minor only | 8-9 | Suggestions, approve with notes |
| clean | 10 | No issues found |

### Deduplication

- Same section flagged by multiple specialists → merge, keep higher
  severity, note all specialists
- If a specialist flags something already covered in the PRD's own
  Open Questions section → skip (author already knows)

### Acceptance Criteria

- [ ] [LOGIC] PRD swarm triggers after draft, before user approval
- [ ] [LOGIC] PLAN swarm triggers after plan draft, before user approval
- [ ] [LOGIC] Each specialist receives document content as input
- [ ] [LOGIC] PLAN specialists also receive PRD content when available
- [ ] [LOGIC] Specialists dispatch in parallel (not sequential)
- [ ] [LOGIC] Scoring uses same mechanical formula as code review
- [ ] [LOGIC] Deduplication merges same-section findings across
  specialists
- [ ] [LOGIC] `N/A` response from specialist = ran but found nothing

## 6. Entry Points & Integration

### Path A — Via `prd` Skill

After the PRD draft is produced (Step 3), before refinement (Step 4):

1. `prd` skill drafts the PRD
2. `prd` skill invokes PRD review swarm
3. Swarm findings presented to user alongside the draft
4. User refines the draft informed by specialist findings
5. User approves → proceed to brainstorm

### Path B — Via `plan` Skill

After the implementation plan is drafted, before user approval:

1. `plan` skill drafts the plan
2. `plan` skill invokes PLAN review swarm
3. Swarm findings presented to user alongside the plan
4. User refines the plan informed by specialist findings
5. User approves → proceed to execute

### Path C — Manual Invocation

Users can invoke the review swarm directly on existing docs:

- `/jig:review --prd docs/plans/2026-04-01-foo-prd.md`
- `/jig:review --plan docs/plans/2026-04-01-foo-plan.md`

Or the review skill detects the file type from the path suffix
(`-prd.md` vs `-plan.md`) and dispatches the appropriate swarm.

### Acceptance Criteria

- [ ] [LOGIC] `prd` skill invokes PRD swarm after drafting
- [ ] [LOGIC] `plan` skill invokes PLAN swarm after drafting
- [ ] [LOGIC] Swarm findings displayed before user approval step
- [ ] [LOGIC] User can refine based on findings before approving
- [ ] [LOGIC] Manual invocation supported via `review` skill

## 7. UI States & Layout

N/A — CLI-based. Specialist findings render as markdown in the terminal,
same format as code review findings.

## 8. Component Behavior

N/A — No interactive UI components. Swarm dispatch and reporting follow
the same patterns as the existing code review swarm.

## 9. Configuration

### jig.config.md Additions

```yaml
## PRD Review
prd-swarm-tiers:
  fast-pass: [data-dependency, ui-conflict, blast-radius, state-completeness]
  full: all

## Plan Review
plan-swarm-tiers:
  fast-pass: [task-dependency, migration-safety, blast-radius, state-completeness]
  full: all
plan-deep-review-model: opus       # plan logic reviewer model

## Shared
design-review-model: sonnet        # default model for PRD/PLAN specialists
```

Teams can:
- Override which specialists run at each tier
- Add team-specific specialists for domain concerns
- Change the default model for design review specialists

### Acceptance Criteria

- [ ] [DATA] `jig.config.md` schema extended with `prd-swarm-tiers`
  and `plan-swarm-tiers`
- [ ] [LOGIC] Tier configuration controls which specialists run
- [ ] [LOGIC] `design-review-model` provides fallback model for
  specialists that don't specify one

## 10. Open Questions

- TBD: How should specialists handle PRDs that reference external
  systems they can't inspect? (e.g., "this integrates with Stripe" —
  the specialist can't read Stripe's API). Probably flag as
  open question rather than false-positive.

## 11. Out of Scope

- **Brainstorm-stage review**: The brainstorm skill already has the
  concerns checklist. Adding a swarm there would be redundant.
- **Automated PRD/plan rewriting**: Specialists flag issues; they don't
  rewrite the document. The author decides how to address findings.
- **Custom specialist authoring UI**: Teams create specialists by
  writing markdown files, same as code review specialists. No GUI.
- **Cross-PR design review**: This reviews individual PRDs/plans, not
  architectural coherence across multiple PRDs.

## 12. Acceptance Checklist

### Schema & Discovery
- [ ] [DATA] `stage` field added to specialist schema in
  `framework/SKILL_SCHEMA.md`
- [ ] [LOGIC] Discovery filters specialists by `stage` field
- [ ] [LOGIC] Backward compatible — existing specialists unaffected

### PRD-only Specialists (core)
- [ ] [DATA] `data-dependency` specialist created (`stage: prd`)
- [ ] [DATA] `ui-conflict` specialist created (`stage: prd`)

### Both-stage Specialists (core)
- [ ] [DATA] `blast-radius` specialist created (`stage: both`)
- [ ] [DATA] `state-completeness` specialist created (`stage: both`)

### PLAN-only Specialists (core)
- [ ] [DATA] `task-dependency` specialist created (`stage: plan`)
- [ ] [DATA] `migration-safety` specialist created (`stage: plan`)

### Plan Logic Reviewer
- [ ] [DATA] `plan-logic-reviewer` created in
  `core/skills/plan/` (Opus model, like code logic reviewer)
- [ ] [LOGIC] Runs after PLAN specialist swarm completes
- [ ] [LOGIC] Receives plan + PRD + swarm findings + codebase access
- [ ] [LOGIC] Applies skeptical reasoning patterns to task ordering,
  dependency correctness, and goal achievement

### Dispatch Integration
- [ ] [LOGIC] `prd` skill dispatches PRD swarm after draft (automatic)
- [ ] [LOGIC] `plan` skill dispatches PLAN swarm after draft (automatic)
- [ ] [LOGIC] Swarm skippable only for clearly trivial work
- [ ] [LOGIC] Parallel dispatch — all specialists spawn concurrently
- [ ] [LOGIC] PLAN specialists have codebase access (Read, Grep, Glob)
- [ ] [LOGIC] Plan logic reviewer (Opus) runs after PLAN swarm
- [ ] [LOGIC] Scoring matches code review formula
- [ ] [LOGIC] Report format consistent with code review report

### Configuration
- [ ] [DATA] `jig.config.md` schema supports `prd-swarm-tiers` and
  `plan-swarm-tiers`
- [ ] [LOGIC] Tier configuration respected during dispatch

### Quality
- [ ] [LOGIC] Specialists produce actionable findings (not vague
  warnings)
- [ ] [LOGIC] `N/A` response when no issues found (not false
  positives)
- [ ] [LOGIC] Findings reference specific PRD/plan sections
