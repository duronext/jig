# Lead Playbook — Team-Driven Development

This document contains the decision logic for the team lead when orchestrating a team-driven-development session.

## Phase 1: Plan Analysis

Before spawning any teammates, analyze the plan:

### Determine Task Independence

Read every task in the plan. For each pair of tasks, assess:
1. **File overlap** — do they modify the same files or directories?
2. **Data dependencies** — does one task produce something another needs (types, exports, schemas)?
3. **Logical ordering** — must one complete before another makes sense?

Build a dependency graph:
- Independent tasks → can run in parallel
- Dependent tasks → use `blockedBy` in TaskCreate

### Determine Implementer Count

**Bias toward 3.** Adjust based on:

| Scenario | Implementer Count |
|----------|-------------------|
| 3-4 independent tasks | 3 |
| 5-6 independent tasks | 4-5 |
| 7+ independent tasks | 5-6 (cap at 6) |
| Only 2 independent tasks | 2 |
| Heavy file overlap (most tasks share files) | 2, serialize overlapping tasks |

**Never spawn more implementers than independent tasks.**

### File Conflict Assessment

Before assigning tasks, map each task to its likely file surface area:

```
Task 1: src/models/          → Group A
Task 2: src/api/             → Group A (depends on Task 1)
Task 3: src/ui/pages/        → Group B
Task 4: tests/               → Group C
Task 5: src/api/services/    → Group A (depends on Task 2)
```

Rules:
- Tasks in the same group with dependencies → sequential (blockedBy)
- Tasks in different groups → parallel
- If unsure about overlap → err on the side of sequential

### Send Inventories to Research Subagents
If the analysis needs an inventory ("which files use X", "what does this flag control"), dispatch read-only research subagents (`framework/HARNESS.md` says which agent is read-only on each harness). They write nothing, so several can run at once, alongside implementers.

## Phase 2: Team Setup

### Create Team
```
TeamCreate: {team_name} based on plan topic
```

### Create Task List
For each task in the plan:
```
TaskCreate with:
  - subject: task name
  - description: FULL text from the plan (don't make teammates read the plan file)
  - activeForm: present continuous description
  - blockedBy: dependent task IDs
```

### Write the Shared Context Doc
Teammates start blank. Write one doc in `plans-directory`, named by `filename-format` with kind `context` (e.g. `docs/plans/2026-05-27-export-feature-context.md`), and fill the `{shared-context-doc}` slot in the implementer and spec-reviewer prompts with its path. It holds what every agent needs and nothing task-specific:

- **Constraints** the user set (what must not change, what is off limits)
- **Working-tree rules**: one shared tree, which files each teammate owns, never touch git
- **Heavy runs**: the gating rule below, worker and memory caps
- **Measurement protocol**, if the work involves timing or benchmarks (see `perf`)
- **Deliverable format**: report shape, file names, result schema

Update the doc, not individual prompts, when a rule changes, and tell running teammates to re-read it. It is a working file: never stage it, and delete it in Phase 5. Anything durable belongs in the plan or spec.

### Gate Heavy Runs
Parallel teammates share one machine; each running a full test suite or build at full worker count can exhaust its memory and crash the session (one session crashed at ~90 GB RSS with every agent running a suite at 15 workers). If tasks involve heavy runs (full suites, builds, benchmarks), decide before spawning how they share it: one at a time, or a small semaphore script that admits a fixed number with capped workers and memory. Put the rule in the shared context doc.

### Spawn Implementers
For each initial parallel task:
```
Task tool:
  subagent_type: general-purpose
  name: implementer-N (descriptive name like "backend-impl" or "frontend-impl")
  team_name: {team_name}
  run_in_background: true
  prompt: [use implementer-prompt.md template]
```

**Model selection:**
- Default: sonnet (good balance of speed and quality)
- Complex architectural tasks: opus (if user requests or task warrants it)
- Simple boilerplate tasks: haiku (if clearly mechanical)

## Phase 3: Staggered Pipeline

### When an Implementer Reports "Done"

1. **Acknowledge** — note what they claim to have built
2. **Dispatch spec reviewer** — subagent (NOT teammate), using spec-reviewer-prompt.md
3. **Wait for spec review result**

### Spec Review Result

**If spec compliant:**
- Dispatch swarm review (fast-pass) using `review` skill
- Wait for quality review result

**If issues found:**
- Send feedback to the implementer via SendMessage:
  ```
  SendMessage:
    type: message
    recipient: implementer-N
    content: "Spec review found issues: [list issues with file references]. Please fix and report back."
  ```
- Wait for implementer to fix and report back
- Re-dispatch spec reviewer
- Repeat until compliant

### Quality Review Result

The quality review does not see the shared context doc. Before accepting its result, check the task's diff against the doc's Constraints yourself; a broken constraint is an issue like any other.

**If approved:**
- Mark task as completed (TaskUpdate)
- Proceed to next task assignment (see Phase 4)

**If issues found:**
- Send feedback to implementer via SendMessage
- Wait for fix
- Re-dispatch quality reviewer
- Repeat until approved

### Parallel Reviews

Multiple spec/quality reviews CAN run simultaneously since they're read-only subagents. If implementer-1 and implementer-3 both report "done" around the same time, dispatch both spec reviews in parallel.

## Phase 4: Task Reassignment

When an implementer's task passes both reviews and more tasks remain:

### Check for Unblocked Tasks
```
TaskList → find tasks with status: pending, no owner, empty blockedBy
```

If no unblocked tasks → shut down the implementer, they'll be respawned when tasks unblock.

### Decide: Reuse or Fresh Spawn

**Reuse the implementer when:**
- Next task is in the same module or directory
- Next task builds on what the implementer just did
- Next task uses the same types/schemas the implementer created
- The implementer's context would meaningfully help

**Spawn fresh when:**
- Next task is in a completely different area
- The implementer has accumulated context from 2+ prior tasks (getting noisy)
- The next task requires a clean perspective

**To reuse:**
```
SendMessage:
  type: message
  recipient: implementer-N
  content: "Your review passed. Next task: [full task description from plan]. This is related to your previous work in [module]. Please implement and report back when done."
```

Update TaskUpdate to assign the task to this implementer.

**To spawn fresh:**
```
SendMessage:
  type: shutdown_request
  recipient: implementer-N
  content: "Your work passed review. Shutting you down — next task is in a different area."
```

Wait for shutdown confirmation, then spawn new implementer with the next task.

## Phase 5: Completion

### When All Tasks Pass Review

1. **Dispatch final integration reviewer** — a subagent that reviews the ENTIRE implementation across all tasks:
   - Do the pieces fit together?
   - Are there inconsistencies between tasks?
   - Any integration gaps?

2. **If integration issues found** — spawn a fix implementer for the specific issues

3. **Run verification** — use `verify`:
   - Build passes
   - All tests pass
   - Linting clean

4. **Clean up team:**
   ```
   SendMessage shutdown_request to each remaining teammate
   Wait for all confirmations
   TeamDelete
   ```
   Delete the shared context doc and any `RESUME-*.md` files.

5. **Hand off** — use `finish`

## Pausing and Resuming

To pause an implementer (machine contention, a blocking decision, end of session), send:

```
SendMessage:
  type: message
  recipient: implementer-N
  content: "Pause. Stop at the next safe point. Stop only the processes
    and containers you started. Write RESUME-implementer-N.md at the root
    of the working tree: what's done, what's in flight, next steps, and
    where the logs are. Then report back."
```

A resumed or replacement implementer reads its resume file and the shared context doc before anything else. Resume files are working files: never stage them, and delete each one once its task passes review.

## Decision Quick Reference

| Situation | Action |
|-----------|--------|
| Implementer reports done | Dispatch spec reviewer subagent |
| Spec compliant | Dispatch quality reviewer subagent |
| Spec issues found | Send feedback to implementer, wait for fix, re-review |
| Quality approved | Mark complete, check for next task |
| Quality issues found | Send feedback to implementer, wait for fix, re-review |
| Next task related | Reuse implementer |
| Next task unrelated | Shut down, spawn fresh |
| No unblocked tasks | Shut down implementer |
| All tasks done | Final integration review → verification → cleanup |
| Implementer stuck | Check pane, send guidance, last resort: replace |
| File conflict risk | Use blockedBy, never parallelize overlapping files |
| Heavy run needed while peers run | Follow the gating rule in the shared context doc |
| Need to pause an implementer | Send the pause message; they write RESUME-<name>.md |

## Appendix: Commit and Push Policy

**Implementers must NEVER commit or push.** The lead (or the developer) handles all git operations after reviewing the work. This prevents:
- Cross-contamination from shared working trees
- Premature commits before review approval
- Unwanted pushes without developer consent

**Lead commit workflow:**
1. Implementer reports "done" → lead dispatches reviews
2. Reviews pass → lead asks the developer if they want to commit
3. Developer approves → lead stages specific files and commits
4. Developer approves push → lead pushes

**Never push without explicit developer approval.** Committing and pushing are separate decisions.
