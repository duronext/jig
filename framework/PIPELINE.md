# Jig Pipeline

The guaranteed order of operations for all development work in Jig.

```
DISCOVER → (PRD?) → PLAN → BUILD → REVIEW → SHIP → LEARN
```

`BRAINSTORM` and `DEBUG` are discovery-time tools that hang off DISCOVER; they are not pipeline stages. `REVIEW` is a multi-stage gate engine that runs after PRD (mode: prd), after PLAN (mode: plan), and during / after BUILD (mode: code, fast tier per-task and full tier pre-ship).

## Stages

### 1. Discover

Understand the problem. Find or create a ticket. Establish context.

- **Skill:** `kickoff` (orchestrates the full pipeline)
- **Output:** Ticket reference, branch, initial context
- **Configurable:** `ticket-system` in `jig.config.md` (Linear, Jira, GitHub Issues)

### 2. (Optional) PRD

Capture requirements as an enforceable acceptance contract. Required for features and large improvements; skipped for bugs and tasks.

- **Skill:** `prd`
- **Output:** PRD document with `[ ]` acceptance items, layer-tagged
- **Configurable:** `plans-directory`, `prd-sync` in `jig.config.md`; concerns checklist
- **Review:** PRD draft is auto-reviewed via `review:prd` before user refinement

### 3. Plan

Transpose the source (PRD, ticket, or conversation context) into an implementation plan with bite-sized, TDD-oriented tasks.

- **Skill:** `plan` (Step 1 = TRANSPOSE)
- **Output:** Implementation plan with file structure, ordered tasks, dependencies, test commands
- **Configurable:** `plans-directory`, `filename-format`, `plan-sync` in `jig.config.md`
- **Review:** Plan draft is auto-reviewed via `review:plan` before user approval

### 4. Build

Build the thing. Either in parallel or serial.

- **Skills:** `team-dev` (parallel, 3+ independent tasks) or `sdd` (serial, coupled tasks)
- **Output:** Implemented, tested, committed code
- **Configurable:** `parallel-threshold`, `default-strategy`, `teammate-mode` in `jig.config.md`
- **Quality gates:** Each task passes per-task fast-pass review (`review:code, tier: fast`) + tests before completion
- **Pre-ship gate:** Full diff review via `review:code, tier: all` before merge

### 5. Review (multi-stage gate)

The `review` skill operates as a gate engine throughout the pipeline:

- **After PRD draft** → `mode: prd, tier: all` (catches missing acceptance items, contradictions, scope gaps)
- **After PLAN draft** → `mode: plan, tier: all` + plan-logic-reviewer (Opus) (catches missing tasks, wrong sequencing, contract misses)
- **During BUILD (per-task)** → `mode: code, tier: fast-pass` (per-task quality gate in team-dev)
- **Pre-SHIP** → `mode: code, tier: all` (full diff review including logic-reviewer)

Same skill, three modes. Specialists are tagged with `stage: prd | plan | both` or omitted (default = code).

- **Configurable:** `swarm-tiers`, `prd-swarm-tiers`, `plan-swarm-tiers`, `deep-review-model`, `plan-deep-review-model`, `specialist-model-default`
- **Discovery:** Specialists collected from `core/`, `packs/`, and `team/`

### 6. Ship

Create the PR, push, get it merged.

- **Skill:** `pr-create`
- **Output:** PR with structured description, test plan, ticket reference
- **Configurable:** `branching` format, `ticket-system`, `require-ticket-reference`

### 7. Learn

Post-merge retrospective. What went well? What should improve?

- **Skill:** `postmortem`
- **Output:** Lessons learned, skill improvement suggestions, process refinements
- **Work type overrides:** Features always learn. Bugs and improvements optionally. Tasks skip.

## Work Type Routing

`kickoff` classifies work into four types, each with different pipeline depth:

| Stage | Bug | Feature | Improvement | Task |
|-------|-----|---------|-------------|------|
| Discover | Yes | Yes | Yes | Yes |
| Brainstorm tool | Rare | Recommended | Optional | Skip |
| Debug tool | If unclear | Skip | Skip | Skip |
| PRD | Skip | Recommended | Optional | Skip |
| Plan | 1-3 tasks | Detailed | Standard | Minimal |
| Build | SDD or team-dev | team-dev | Either | SDD |
| Review | Standard | Full swarm | Standard | Light |
| Ship | Yes | Yes | Yes | Yes |
| Learn | Optional | Always | Optional | Skip |

## Gate Checks

Each stage transition has a gate check — preconditions that must be met before proceeding:

- **Discover -> PRD or Plan:** Ticket exists, branch created, context loaded
- **PRD -> Plan:** PRD passes `review:prd`, user refines, acceptance checklist tagged
- **Plan -> Build:** Plan passes `review:plan`, every contract item maps to a task
- **Build -> Pre-ship Review:** All tasks pass per-task fast-pass review, all tests green
- **Pre-ship Review -> Ship:** No blocking findings, confidence score meets threshold
- **Ship -> Learn:** PR merged (learn happens post-merge)
