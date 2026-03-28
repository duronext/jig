# Jig Pipeline

The guaranteed order of operations for all development work in Jig.

```
DISCOVER -> BRAINSTORM -> PLAN -> EXECUTE -> REVIEW -> SHIP -> LEARN
```

## Stages

### 1. Discover

Understand the problem. Find or create a ticket. Establish context.

- **Skill:** `jig-kickoff` (orchestrates the full pipeline)
- **Output:** Ticket reference, branch, initial context
- **Configurable:** `ticket-system` in `jig.config.md` (Linear, Jira, GitHub Issues)

### 2. Brainstorm

Explore the solution space. Ask questions. Propose approaches. Get design approval.

- **Skill:** `jig-brainstorm`
- **Output:** Approved design document
- **Configurable:** Concerns checklist in `jig.config.md` — maps team skills into the brainstorming process
- **Work type overrides:** Bugs get light brainstorm (root cause + fix). Tasks skip entirely.

### 3. Plan

Turn the approved design into an implementation plan with bite-sized tasks.

- **Skill:** `jig-plan`
- **Output:** Implementation plan with ordered tasks, file targets, and test expectations
- **Configurable:** TDD emphasis, task granularity

### 4. Execute

Build the thing. Either in parallel or serial.

- **Skills:** `jig-team-dev` (parallel, 3+ independent tasks) or `jig-sdd` (serial, coupled tasks)
- **Output:** Implemented, tested, committed code
- **Configurable:** `parallel-threshold`, `default-strategy`, `teammate-mode` in `jig.config.md`
- **Quality gates:** Each task passes spec compliance review + code quality review before completion

### 5. Review

Comprehensive code review via specialist swarm.

- **Skill:** `jig-review`
- **Output:** Confidence-scored review report with findings by severity
- **Configurable:** `swarm-tiers` (which specialists block vs advise), `deep-review-model`, `specialist-model-default`
- **Discovery:** Specialists are collected from `core/`, `packs/`, and `team/` directories

### 6. Ship

Create the PR, push, get it merged.

- **Skill:** `jig-pr`
- **Output:** PR with structured description, test plan, ticket reference
- **Configurable:** `branching` format, `ticket-system`, `require-ticket-reference`

### 7. Learn

Post-merge retrospective. What went well? What should improve?

- **Skill:** `jig-postmortem`
- **Output:** Lessons learned, skill improvement suggestions, process refinements
- **Work type overrides:** Features always learn. Bugs and improvements optionally. Tasks skip.

## Work Type Routing

`jig-kickoff` classifies work into four types, each with different pipeline depth:

| Stage | Bug | Feature | Improvement | Task |
|-------|-----|---------|-------------|------|
| Discover | Yes | Yes | Yes | Yes |
| Brainstorm | Light | Full | Medium | Skip |
| Plan | 1-3 tasks | Detailed | Standard | Minimal |
| Execute | SDD or team-dev | team-dev | Either | SDD |
| Review | Standard | Full swarm | Standard | Light |
| Ship | Yes | Yes | Yes | Yes |
| Learn | Optional | Always | Optional | Skip |

## Gate Checks

Each stage transition has a gate check — preconditions that must be met before proceeding:

- **Discover -> Brainstorm:** Ticket exists, branch created, context loaded
- **Brainstorm -> Plan:** Design document approved by user
- **Plan -> Execute:** Implementation plan reviewed, tasks ordered
- **Execute -> Review:** All tasks pass spec compliance + code quality reviews
- **Review -> Ship:** Review confidence score meets threshold, no blocking findings
- **Ship -> Learn:** PR merged (learn happens post-merge)
