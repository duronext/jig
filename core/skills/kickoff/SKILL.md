---
name: kickoff
description: >
  Use when starting development work on a bug, feature, improvement, or task.
  Guides engineers through the full development pipeline: discover, brainstorm,
  plan, execute, review, ship. Invoked by "let's work on", "I need to build",
  "fix this bug", "start a new task", or /kickoff.
tier: workflow
alwaysApply: false
---

# Jig Development Pipeline

**PURPOSE**: The pipeline orchestrator. Routes work through stages and checks gates at each transition. **Kickoff does NOT execute stages itself** — it invokes the downstream skill for each stage using the Skill tool.

**ORCHESTRATOR RULE**: At every stage transition, you MUST invoke the downstream skill using the Skill tool (e.g., `Skill: jig:plan`). Do NOT attempt to execute the stage inline by following kickoff's summary of what the stage does. The downstream skill has the full process — kickoff only knows enough to route and check gates.

**CONFIGURATION**: Reads `jig.config.md` for pipeline stages, work type overrides, ticket system, branching format, and concerns checklist.

---

## When to Use

Invoke this skill when:
- Starting development work of any kind
- "I need to add/fix/build/improve..."
- "Let's work on [ticket]"
- "There's a bug in..."
- Beginning a new session with a development task
- You want the full pipeline, not just one stage

**Do NOT use when** you only need a single stage (e.g., just creating a PR → use `pr-create` directly).

---

## Terminology

| Term | Meaning |
|------|---------|
| **SDD** | Subagent-Driven Development (`sdd`) — sequential execution, one task at a time |
| **Team-dev** | `team-dev` — parallel execution with agent teams in split panes + two-stage quality gates |

## The Pipeline

```mermaid
graph LR
  classify["CLASSIFY<br/>work type"] --> discover["DISCOVER<br/>ticket + branch"]
  discover -.->|tool| brainstorm["BRAINSTORM<br/>ideation (optional)"]
  discover -.->|tool| debug["DEBUG<br/>root cause (bugs)"]
  discover --> prd["PRD<br/>requirements (optional)"]
  prd --> review_prd["REVIEW:prd<br/>tier all"]
  review_prd --> plan["PLAN<br/>transpose + tasks"]
  discover --> plan
  plan --> review_plan["REVIEW:plan<br/>tier all"]
  review_plan --> build["BUILD<br/>execute + test"]
  build -.->|fast tier<br/>while building| review_code_fast["REVIEW:code<br/>tier fast-pass"]
  build --> review_code["REVIEW:code<br/>tier all"]
  review_code --> ship["SHIP<br/>PR + merge"]
  ship --> learn["LEARN<br/>postmortem"]

  review_plan -.->|plan wrong| plan
  review_code -.->|scope changed| prd
  build -.->|blocked| plan
```

Each stage has a **gate**. You don't move forward until the gate is satisfied.

`BRAINSTORM` and `DEBUG` are **discovery-time tools**, not stages — they hang off `DISCOVER` and are invoked on demand (by the user or offered by kickoff) when the work benefits from exploration or root-cause investigation. They produce understanding, not artifacts, and return control to the workflow when done.

`REVIEW` is a **multi-stage gate engine**: it runs after PRD (`tier: all`), after PLAN (`tier: all`), and during/after BUILD (`tier: fast-pass` per-task during, `tier: all` pre-ship). The same skill, three modes. See `core/skills/review/SKILL.md`.

The pipeline stages and work type overrides are configurable in `jig.config.md`. Read the config at the start of each session to determine which stages to run.

---

## Step 1: Classify the Work

Before anything else, determine the work type. This controls pipeline depth.

```mermaid
graph TD
  start{"What kind of work?"}
  start -->|broken / incorrect| bug["BUG<br/>Discovery tool: debug<br/>Plan: 1-3 tasks<br/>Execute: sequential<br/>Learn: optional"]
  start -->|making existing thing better| improvement["IMPROVEMENT<br/>Discovery tool: brainstorm (optional)<br/>Plan: standard<br/>Execute: SDD or team-dev<br/>Learn: optional"]
  start -->|new capability| feature["FEATURE<br/>Discovery tool: brainstorm (recommended)<br/>PRD: recommended<br/>Plan: detailed<br/>Execute: team-dev<br/>Learn: yes"]
  start -->|config / chore / refactor| task["TASK / CHORE<br/>Skip discovery tools<br/>Plan: minimal<br/>Execute: direct<br/>Learn: no"]
```

Check `jig.config.md` for stage overrides per work type. The config may skip or lighten stages beyond these defaults.

Ask the user if the type isn't obvious from context.

---

## Step 2: DISCOVER

**Gate**: A ticket exists and the problem is understood.

### Actions

1. **Check for existing ticket**:
   - Branch name contains a ticket reference? Look it up.
   - User mentioned a ticket? Fetch it.
   - No ticket? Create one. Check `jig.config.md` for `ticket-system` (Linear, Jira, GitHub Issues) and use the appropriate tool.

2. **Understand the problem**:
   - Read the ticket description and acceptance criteria.
   - For bugs: check error tracking, reproduce if possible.
   - For features: confirm scope with the user if ambiguous.

3. **Set up the branch**:
   Read branching format from `jig.config.md`:
   ```bash
   git checkout -b {format from config}
   ```

### Gate Check

Before proceeding, confirm:
- [ ] Ticket exists with clear acceptance criteria
- [ ] Branch follows the team's naming convention
- [ ] Problem is understood (not just the title — the actual problem)

---

## Step 2b: REQUIREMENTS (optional)

**Gate**: PRD exists or user opted to skip.

For **features** and **large improvements**, prompt: "Want to capture requirements first with `/prd`?"

If yes: **INVOKE `jig:prd` using the Skill tool.** Do not write the PRD inline — the `prd` skill has the full process (tier selection, 12-section structure, acceptance checklist format). Wait for it to complete before proceeding.

For **bugs**, **tasks**, and **small improvements**: skip this step. Users can still invoke `/prd` manually if needed.

### Gate Check

- [ ] PRD saved to the path resolved from `jig.config.md` (`plans-directory` + `filename-format`, default `docs/plans/YYYY-MM-DD-<topic>-prd.md`) OR user opted to skip
- [ ] If PRD exists, acceptance checklist has `[ ]` items tagged by layer

---

## Discovery Tools (optional, on-demand)

During or after DISCOVER, the user may benefit from one of two discovery-time tools. Offer them when appropriate; never force them.

### Brainstorm

Offer for: features with unclear scope, improvements where approach isn't obvious, any time the user signals "I'm not sure how to approach this."

**Skip for:** tasks with obvious scope, bugs where the fix is clear from the ticket.

If user accepts, **INVOKE `jig:brainstorm` using the Skill tool.** It returns control to kickoff when done — no auto-handoff to plan.

### Debug

Offer for: bugs where the root cause isn't obvious from the ticket.

If user accepts, **INVOKE `jig:debug` using the Skill tool.** It returns control to kickoff when done.

### Gate Check

These are tools, not stages. There's no gate — the user moves on when they're ready. Kickoff proceeds to the next stage (PRD or PLAN) when the user signals readiness.

---

## Step 4: PLAN

**Gate**: A numbered plan exists with tasks, files, and verification steps.

**INVOKE `jig:plan` using the Skill tool.** The `plan` skill's Step 1 is TRANSPOSE — it distills the available source (PRD, ticket, conversation) into a layered contract, derives file structure, sequences by dependency, and decomposes into TDD bite-sized tasks. Kickoff does not transpose; it hands off.

If a PRD was created in Step 2b, mention it when invoking: "PRD is at `{plans-directory}/YYYY-MM-DD-<topic>-prd.md`." Otherwise plan will transpose from the ticket + conversation context.

### Gate Check

Before proceeding, confirm:
- [ ] Plan reviewed and approved by the user
- [ ] Tasks have clear file paths and skill references
- [ ] Dependencies identified
- [ ] Plan saved to the path resolved from `jig.config.md` (`plans-directory` + `filename-format`)
- [ ] Every contract item (PRD `[ ]` or inline) maps to at least one task

---

## Step 5: EXECUTE

**Gate**: All tasks implemented, tested, and committed.

**INVOKE `jig:build` using the Skill tool.** Pass the plan path: "Execute the plan at `{plans-directory}/<resolved-filename>-plan.md`" (resolve `plans-directory` and `filename-format` from `jig.config.md`). The `build` skill analyzes the task graph and auto-selects parallel (`team-dev`) or serial (`sdd`) execution. Do not choose the strategy yourself.

### Gate Check

Before proceeding, confirm:
- [ ] All tasks from the plan are implemented
- [ ] Tests pass (as specified in plan)
- [ ] Changes committed with proper messages
- [ ] Project builds successfully

---

## Step 6: REVIEW

**Gate**: Code passes self-audit and automated review.

**INVOKE `jig:review` using the Skill tool.** The `review` skill dispatches the specialist swarm (security, dead code, error handling, async safety, performance + team specialists), scores findings, and produces a unified report. Fix any Critical or Major issues before proceeding.

### Gate Check

Before proceeding, confirm:
- [ ] Self-audit checklist passed
- [ ] No Critical issues in review report
- [ ] All Major issues addressed or acknowledged

---

## Step 7: SHIP

**Gate**: PR created and merged.

1. **Commit**: Invoke the `jig:commit` agent (Agent tool with `subagent_type: "jig:commit"`)
2. **Create PR**: **INVOKE `jig:pr-create` using the Skill tool.** It runs the review swarm, analyzes commits, and creates the PR.
3. **Address feedback**: **INVOKE `jig:pr-respond` using the Skill tool** for any reviewer comments.
4. **Merge**: After approval

### Gate Check

- [ ] PR created with clear description
- [ ] Ticket referenced (per `jig.config.md` settings)
- [ ] CI passes
- [ ] Reviewer approval received

---

## Step 8: LEARN (features only, optional for others)

**INVOKE `jig:postmortem` using the Skill tool.** It analyzes reviewer comments for patterns, identifies gaps in skills, and updates skills or configs. This closes the feedback loop.

---

## Stage Transitions

The pipeline enforces ordering. Here's the complete transition map:

```
CLASSIFY
  └──> DISCOVER (always)
         ├╌╌╌> BRAINSTORM (optional tool, returns to DISCOVER)
         ├╌╌╌> DEBUG (optional tool, returns to DISCOVER)
         │
         ├──> PRD (features, large improvements — optional)
         │    └──> REVIEW:prd → PLAN
         │
         └──> PLAN (always — transposes whatever source is available)
                └──> REVIEW:plan → BUILD
                       └──> REVIEW:code (fast, per-task during build)
                              └──> REVIEW:code (full, pre-ship)
                                     └──> SHIP
                                            └──> LEARN (features, complex improvements)
```

### Looping Back

The pipeline isn't strictly linear. You may loop back when:

- **Plan is wrong** → Return to Plan, revise tasks
- **Scope changed during execution** → Return to Brainstorm, update design
- **Review finds design issues** → Return to Plan or Brainstorm depending on severity
- **PR feedback requires significant changes** → Return to Execute

When looping back, update the plan document to reflect changes.

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Skipping Discover | No ticket, no branch convention, no tracking | Always start with the ticket |
| Skipping Requirements for features | Vague scope, acceptance criteria discovered mid-implementation | Run `/prd` before brainstorming |
| Skipping Plan for "simple" features | Can't parallelize, ad-hoc execution | Even 2-task plans help |
| Skipping Review | AI-generated bugs ship to production | Self-audit is non-negotiable |
| Skipping Learn | Same review feedback on every PR | Run postmortem on complex features |
| Starting with code | "Add a button" without understanding the requirement | Discover first, always |
| Forcing brainstorm before plan | Workflow friction; brainstorm is an optional tool | Offer brainstorm during DISCOVER; never gate plan on it |
| Skipping the TRANSPOSE step | Plan misses contract items, tasks don't tie to acceptance criteria | Plan's Step 1 transposes — verify every contract item maps to a task |

---

## Quick Reference

| Stage | Skill Tool Invocation | Output |
|-------|----------------------|--------|
| Classify | (kickoff handles directly) | Work type determined |
| Discover | (kickoff handles directly) | Ticket + branch |
| Requirements | `Skill: jig:prd` | PRD with acceptance checklist |
| Brainstorm (tool) | `Skill: jig:brainstorm` | Understanding, no artifact |
| Debug (tool) | `Skill: jig:debug` | Root cause, no artifact |
| Plan | `Skill: jig:plan` | `{plans-directory}/*-plan.md` |
| Execute | `Skill: jig:build` | Implemented + tested code |
| Review | `Skill: jig:review` | Audited code |
| Ship | `Skill: jig:pr-create` | Merged PR |
| Learn | `Skill: jig:postmortem` | Updated skills |
