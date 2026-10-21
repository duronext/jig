# Jig Pipeline

The guaranteed order of operations for all development work in Jig.

```
DISCOVER → PRD → SPEC → PLAN → BUILD → REVIEW → PRD CHECK → SHIP → LEARN
```

`BRAINSTORM`, `DEBUG` and `PERF` are discovery-time tools that hang off DISCOVER; they are not pipeline stages. `PERF`'s ship-time checks (ablating the combination, any "faster" or "cheaper" claim) run through `verify`. `REVIEW` is a multi-stage gate engine that runs after PRD (mode: prd), after SPEC (mode: spec), after PLAN (mode: plan), and during / after BUILD (mode: code, fast tier per-task and full tier pre-ship).

Three documents, three readers:

| Document | Written for | Answers | Skill |
|----------|-------------|---------|-------|
| **PRD** | Anyone, including people who have never written code | What are we building, for whom, in what phases, and how will we know it worked? | `prd` |
| **Spec** | Engineers and the spec reviewer | What exactly must the system do? (API, data, rules, UI states, acceptance checklist) | `spec` |
| **Plan** | Implementers (human or agent) | In what order, in which files, with which tests? | `plan` |

## Stages

### 1. Discover

Understand the problem. Find or create a ticket. Establish context.

- **Skill:** `kickoff` (orchestrates the full pipeline)
- **Output:** Ticket reference, branch, initial context
- **Configurable:** `ticket-system` in `jig.config.md` (Linear, Jira, GitHub Issues)

### 2. PRD

Write the product document: the one-sentence thesis, who it is for, the moments people see, plain-language rules with "you'll know it works when…" lines, phases with an MVP cut line, milestones, open decisions and who signs off. Recommended for features; a one-pager for large improvements; skipped for bugs and tasks.

- **Skill:** `prd` (also runs standalone in Claude.ai or the desktop app, so a PM can write it without a repo)
- **Output:** `*-prd.md` plus, where artifacts are available, a live Jig page that people and Jig keep current (see `LIVE_PRD.md`)
- **Configurable:** `prd-publish`, `prd-sync` in `jig.config.md`
- **Review:** auto-reviewed via `review:prd` (plain language, MVP cut, testable outcomes, missing moments)

### 3. Spec

Turn the PRD (or ticket) into the enforceable technical contract: API contract, data model, business rules, UI states, and a layer-tagged acceptance checklist traced to PRD outcomes. Spec the phase being built now.

- **Skill:** `spec`
- **Output:** `*-spec.md` with `[ ]` acceptance items, layer-tagged, each ending with the PRD outcome it serves
- **Configurable:** `plans-directory`, `spec-sync` in `jig.config.md`; concerns checklist
- **Review:** auto-reviewed via `review:spec` before user refinement
- **Feeds back:** product questions found in the code go back to the PRD as open decisions

### 4. Plan

Transpose the spec (or ticket, or conversation context) into an implementation plan with bite-sized, TDD-oriented tasks and, when a PRD exists, a Milestone Map.

- **Skill:** `plan` (Step 1 = TRANSPOSE)
- **Output:** Implementation plan with file structure, ordered tasks, dependencies, test commands
- **Configurable:** `plans-directory`, `filename-format`, `plan-sync` in `jig.config.md`
- **Review:** Plan draft is auto-reviewed via `review:plan` before user approval

### 5. Build

Stage key in `jig.config.md`: `execute` (kept from 1.x). Build the thing. Either in parallel or serial.

- **Skills:** `team-dev` (parallel, 3+ independent tasks) or `sdd` (serial, coupled tasks)
- **Output:** Implemented, tested, committed code
- **Configurable:** `parallel-threshold`, `default-strategy`, `teammate-mode` in `jig.config.md`
- **Quality gates:** Each task passes the spec reviewer (against the spec's checklist) and per-task fast-pass review (`review:code, tier: fast`) before completion
- **Live PRD:** ticks milestones from the plan's Milestone Map and writes to the PRD's log
- **Pre-ship gate:** Full diff review via `review:code, tier: all` before merge

### 6. Review (multi-stage gate)

The `review` skill operates as a gate engine throughout the pipeline:

- **After PRD draft** → `mode: prd, tier: all` (reads as a non-engineer: jargon, an MVP that cannot stand alone, outcomes nobody could check, missing moments)
- **After SPEC draft** → `mode: spec, tier: all` (catches missing acceptance items, hidden data dependencies, UI collisions, incomplete states)
- **After PLAN draft** → `mode: plan, tier: all` + plan-logic-reviewer (Opus) (catches missing tasks, wrong sequencing, contract misses)
- **During BUILD (per-task)** → `mode: code, tier: fast-pass` (per-task quality gate in team-dev)
- **Pre-SHIP** → `mode: code, tier: all` (full diff review including logic-reviewer)

Same skill, four modes. Specialists are tagged with `stage: prd | spec | plan` (or a list such as `[spec, plan]`), or omitted (default = code).

- **Configurable:** `swarm-tiers`, `prd-swarm-tiers`, `spec-swarm-tiers`, `plan-swarm-tiers`, `deep-review-model`, `plan-deep-review-model`, `specialist-model-default`
- **Discovery:** Specialists collected from `core/`, `packs/`, and `team/`

### 7. PRD Check

Stage key in `jig.config.md`: `prd-check`. Before shipping, walk every in-scope PRD outcome from the user's side. The spec reviewer asked "did we build what the spec says"; the PRD check asks "can a person now do what the PRD promised".

- **Skill:** `prd` (check mode)
- **Output:** Each outcome `verified` with proof, or deferred with a reason; the PRD's trace filled in

### 8. Ship

Create the PR, push, get it merged.

- **Skill:** `pr-create`, then `finish`
- **Output:** PR with structured description, test plan, ticket reference; ship milestone ticked on a live PRD
- **Configurable:** `branching` format, `ticket-system`, `require-ticket-reference`

### 9. Learn

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
| Perf tool | Skip | If speed/cost goal | If speed/cost goal | Skip |
| PRD | Skip | Recommended | One-pager if large | Skip |
| Spec | Light, optional | Full | Light or full | Skip |
| Plan | 1-3 tasks | Detailed | Standard | Minimal |
| Build | SDD or team-dev | team-dev | Either | SDD |
| Review | Standard | Full swarm | Standard | Light |
| PRD check | Skip | When a PRD exists | When a PRD exists | Skip |
| Ship | Yes | Yes | Yes | Yes |
| Learn | Optional | Always | Optional | Skip |

## Gate Checks

Each stage transition has a gate check — preconditions that must be met before proceeding:

- **Discover -> PRD, Spec or Plan:** Ticket exists, branch created, context loaded
- **PRD -> Spec:** PRD passes `review:prd`; it has a thesis, phases with an MVP cut, outcome IDs; sign-offs for the current rev are recorded or knowingly pending
- **Spec -> Plan:** Spec passes `review:spec`, user refines, acceptance checklist tagged and traced to PRD outcomes
- **Plan -> Build:** Plan passes `review:plan`, every contract item maps to a task, Milestone Map present when a PRD exists
- **Build -> Pre-ship Review:** All tasks pass the spec reviewer and per-task fast-pass review, all tests green
- **Pre-ship Review -> PRD Check:** No blocking findings, confidence score meets threshold
- **PRD Check -> Ship:** Every in-scope outcome verified or deferred with a reason
- **Ship -> Learn:** PR merged (learn happens post-merge)
