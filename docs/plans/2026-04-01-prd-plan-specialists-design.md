# Design: Specialist Dispatch for PRD & PLAN Stages

## Problem Statement

Jig's code review swarm catches issues at code time with focused
specialists. But PRDs and implementation plans get no structured
challenge — authors don't know what they don't know. Missed data
dependencies, UI conflicts, blast radius miscalculations, and
incomplete state machines slip through to implementation where they
cost 10x more to fix.

**PRD:** `docs/plans/2026-04-01-prd-plan-specialists-prd.md`

## Approved Approach

Extend the existing `review` skill with an explicit mode parameter
(`code`, `prd`, `plan`). One dispatch engine, three contexts. The
caller tells `review` what it's reviewing; `review` filters
specialists by the new `stage` frontmatter field and dispatches the
appropriate swarm.

### Why This Approach

- **One engine** — dispatch logic (discover, prepare, dispatch,
  collect, score, report) is not duplicated across skills
- **Proven pattern** — same swarm architecture that works for code
  review, applied upstream
- **Extensible** — teams add domain specialists by dropping markdown
  files, same as code review specialists
- **Configurable** — tier assignments controlled in `jig.config.md`,
  same as code review tiers

### Alternatives Considered

- **New shared dispatch module** — Creates a reference file that three
  skills import. Adds indirection without clear benefit over extending
  the existing review skill.
- **Inline in prd/plan skills** — Duplicates the 6-stage dispatch
  pipeline in each skill. Diverges over time.

## Architecture

```
review skill (single engine, mode parameter)
├── mode: code (existing, unchanged)
│   ├── discovers specialists with no `stage` field
│   ├── input: filtered diff
│   └── deep review: code logic reviewer (opus)
│
├── mode: prd (new)
│   ├── discovers specialists with stage: prd | both
│   ├── input: full document + section hints
│   ├── all specialists get codebase access (Read, Grep, Glob)
│   └── no deep reviewer (swarm only)
│
└── mode: plan (new)
    ├── discovers specialists with stage: plan | both
    ├── input: full document + section hints + PRD ref
    ├── all specialists get codebase access (Read, Grep, Glob)
    └── deep review: plan logic reviewer (opus)
```

### Mode Detection

Explicit mode parameter. The caller tells `review` what context:

- `prd` skill invokes review with `mode: prd`
- `plan` skill invokes review with `mode: plan`
- `code-review` agent and `team-dev` invoke with `mode: code` (or
  omit — code is the default for backward compatibility)

### Specialist Discovery

Same three-tier priority hierarchy:

```
team/specialists/    ← highest priority
packs/*/specialists/
core/specialists/    ← framework defaults
```

New filtering by `stage` field:

| Mode | Discovers specialists where... |
|------|-------------------------------|
| code | `stage` field is absent (existing behavior) |
| prd | `stage: prd` or `stage: both` |
| plan | `stage: plan` or `stage: both` |

Backward compatible: existing specialists (security, dead-code, etc.)
have no `stage` field, so they only appear in code review mode.

### Specialist Schema Addition

New `stage` field in specialist frontmatter:

```yaml
---
name: blast-radius
description: Cross-layer ripple effects, upstream/downstream coupling
model: sonnet
tier: fast-pass
stage: both          # NEW — prd, plan, or both
globs:
  - "**/*"
severity: major
---
```

- `stage: prd` — PRD swarm only
- `stage: plan` — PLAN swarm only
- `stage: both` — both PRD and PLAN swarms
- absent — code review only (backward compatible)

### Input Preparation

**Code mode** (unchanged): Filtered diff — each specialist gets only
hunks matching its globs.

**PRD mode**: Full document + section hints. Each specialist receives:
1. The complete PRD document content
2. A section focus note: "Focus your analysis on sections: {relevant
   sections based on specialist concern}"
3. Codebase tool access (Read, Grep, Glob)

**Plan mode**: Full document + PRD + section hints. Each specialist
receives:
1. The complete implementation plan
2. The PRD document (if one exists) for cross-reference
3. A section focus note
4. Codebase tool access (Read, Grep, Glob)

### Section Hint Mapping

Each specialist's description determines its section hints:

| Specialist | PRD Section Hints | Plan Section Hints |
|------------|------------------|--------------------|
| data-dependency | Data Model, API Contract, Business Logic | File Structure, task steps touching schema |
| ui-conflict | UI States, Component Behavior, Entry Points | Tasks touching UI files |
| blast-radius | All sections (cross-cutting by nature) | All tasks (cross-cutting by nature) |
| state-completeness | Business Logic, API Contract | Tasks involving state/status changes |
| task-dependency | — | Task list, Dependencies section |
| migration-safety | — | Tasks involving DB/schema changes |

### Dispatch Flow

#### PRD Review

```
prd skill drafts PRD
  → prd invokes review(mode: prd, path: docs/plans/...-prd.md)
    → review DISCOVERS specialists (stage: prd | both)
    → review PREPARES input (read doc, compute section hints)
    → review DISPATCHES specialists in parallel
    → review COLLECTS findings (or N/A)
    → review SCORES (same mechanical formula)
    → review REPORTS unified findings
  → prd presents findings to user alongside draft
  → user refines draft informed by findings
  → user approves
```

#### Plan Review

```
plan skill drafts implementation plan
  → plan invokes review(mode: plan, path: docs/plans/...-plan.md)
    → review DISCOVERS specialists (stage: plan | both)
    → review PREPARES input (read plan + PRD if exists)
    → review DISPATCHES specialists in parallel
    → review COLLECTS findings
    → review dispatches plan logic reviewer (opus)
      with: full plan + PRD + swarm findings + codebase access
    → review SCORES (all findings combined)
    → review REPORTS unified findings
  → plan presents findings to user alongside draft
  → user refines plan informed by findings
  → user approves
```

### Automatic Dispatch

Both swarms run automatically after drafting. The agent may skip
**only** for clearly trivial work (config change, single-line fix,
chore). For any medium-to-large task, the swarm is non-negotiable.

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
- PRD's own Open Questions section already covers something →
  skip (author already knows)
- Plan logic reviewer flags same issue as specialist → drop
  duplicate, keep the more detailed finding

## New Specialists

### PRD-only (stage: prd)

**data-dependency** (sonnet) — Scrutinizes data model and API
decisions for hidden dependencies: foreign keys, cascading deletes,
migration prerequisites, index implications, cross-table constraints
the author may not know about. Proactively greps the codebase for
schema definitions, existing relationships, and dependent queries.

**ui-conflict** (sonnet) — Catches UI-layer blind spots: feature flag
conflicts where two features render in the same spot, conditional
rendering paths the author didn't account for, layout collisions,
entry point conflicts. Greps for existing components, feature flags,
and route definitions.

### Both stages (stage: both)

**blast-radius** (sonnet) — Evaluates cross-layer ripple effects.
When a change in one layer (data, API, logic, UI) forces changes in
others, flags the full chain. The "that path ripples across the entire
application" detector. Traces upstream producers and downstream
consumers across the codebase.

**state-completeness** (sonnet) — Checks state machines, transitions,
and conditional paths for completeness. Missing transitions, undefined
states, asymmetric positive/negative paths, unreachable states.
Cross-references with existing state definitions in the codebase.

### Plan-only (stage: plan)

**task-dependency** (sonnet) — Verifies task ordering: does the
dependency graph hold? Are there implicit dependencies not captured?
Can parallel tasks truly run independently? Checks file-level
conflicts between tasks marked as parallel.

**migration-safety** (sonnet) — Scrutinizes tasks involving database
or schema changes: migration ordering, rollback strategy, data
preservation, destructive operations. Verifies claims against the
actual schema via codebase access.

### Plan Logic Reviewer (opus)

Standalone file at `core/skills/plan/plan-logic-reviewer.md`.
Runs after the PLAN specialist swarm. Receives: full plan + PRD +
swarm findings + codebase access.

Reasoning patterns (tuned for implementation plans, not code):

1. **Trace the dependency chain** — Task N depends on Task M. Does
   Task M actually produce what Task N needs? Follow the chain.
2. **Verify the ordering** — Can this task run before that one, or is
   there an implicit dependency the plan missed?
3. **Check against the codebase** — The plan says "add column X." Does
   the table exist? What depends on it? Are the file paths real?
4. **Test the stated goal** — Execute all tasks mentally. Does the
   result actually achieve what the PRD requires? Any acceptance
   criteria left uncovered?
5. **Question the scope** — PRD has 8 acceptance criteria. Plan covers
   6 tasks. Is anything missing? Is anything extra?
6. **Verify the parallelism** — Tasks marked parallel. Do they touch
   the same files? Would they conflict?
7. **Check the rollback** — If task 4 fails, can you undo tasks 1-3?
   Is there a point of no return?

## Modified Files

### core/skills/review/SKILL.md

- Add mode parameter documentation (code/prd/plan)
- Add stage-filtered discovery logic
- Add document input preparation (full doc + section hints)
- Add plan logic reviewer dispatch in plan mode
- Code mode remains default and unchanged

### core/skills/prd/SKILL.md

- After Step 3 (Draft), add: invoke review with mode: prd
- Present swarm findings before Step 4 (Refine)
- User refines informed by findings

### core/skills/plan/SKILL.md

- After plan draft, add: invoke review with mode: plan
- Present swarm findings (including plan logic reviewer) before
  user approval
- User refines informed by findings

### framework/SKILL_SCHEMA.md

- Add `stage` field to specialist schema section
- Values: `prd`, `plan`, `both`, or absent (code review default)

### jig.config.md

- Add `prd-swarm-tiers` configuration
- Add `plan-swarm-tiers` configuration
- Add `plan-deep-review-model` setting
- Add `design-review-model` default model setting

## Error Handling Strategy

N/A — no runtime code. Specialist dispatch errors are already handled
by the review skill's collect stage (specialist returns error →
logged, doesn't block other specialists).

## Test Strategy

Manual validation, consistent with existing code review specialists:

1. Write a known-bad PRD with planted issues (missing FK dependency,
   UI conflict, incomplete state machine, underestimated blast radius)
2. Run the PRD swarm against it
3. Verify each specialist catches its expected issue
4. Repeat for a known-bad implementation plan
5. Verify the plan logic reviewer catches ordering and coverage gaps

No automated test suite for prompt quality — same approach as the
existing 5 code review specialists.

## Concerns Checklist Results

| Concern | Decision | Notes |
|---------|----------|-------|
| skill-schema | Yes | Adding `stage` field — update SKILL_SCHEMA.md |
| error-handling | N/A | No runtime code; dispatch errors handled by existing review skill |
| security | N/A | Read-only codebase access, same as existing specialists |
| test-strategy | Yes | Manual validation with known-bad documents |
