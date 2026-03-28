---
name: jig-plan
description: >
  Use when you have an approved design or requirements for a multi-step task,
  before touching code. Turns designs into implementation plans with bite-sized
  TDD-oriented tasks, exact file paths, and verification steps. Save to
  docs/plans/.
tier: workflow
alwaysApply: false
---

# Writing Implementation Plans

**PURPOSE**: Turn an approved design into a comprehensive implementation plan that an engineer (or AI agent) with zero codebase context can follow task by task. Every task is bite-sized, TDD-oriented, and self-contained.

**CONFIGURATION**: Reads `jig.config.md` for commit conventions, execution strategy preferences, and parallel threshold.

---

## When to Use

Invoke this skill when:
- You have an approved design from `jig-brainstorm`
- You have requirements (from a PRD, ticket, or conversation) for a multi-step task
- `jig-kickoff` routes here during the PLAN stage
- The user says "write a plan", "create an implementation plan", or "/jig-plan"

**Do NOT use when:**
- You do not have an approved design or clear requirements (use `jig-brainstorm` first)
- The task is a single atomic change (just do it)

**Announce at start:** "I'm using the jig-plan skill to create the implementation plan."

---

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it was not, suggest breaking this into separate plans -- one per subsystem. Each plan should produce working, testable software on its own.

---

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **PRD:** docs/plans/YYYY-MM-DD-<topic>-prd.md *(include if a PRD exists)*
> **Design:** docs/plans/YYYY-MM-DD-<topic>-design.md *(include if a design doc exists)*
> **For agents:** Use jig-team-dev (parallel) or jig-sdd (sequential) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries relevant to this plan]

---
```

The `> **PRD:**` and `> **Design:**` lines are how downstream spec reviewers find the acceptance checklist and design decisions. Always include them when those documents exist.

---

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

```markdown
## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `exact/path/to/file.ext` | Create | Brief description |
| `exact/path/to/existing.ext` | Modify | What changes and why |
| `tests/exact/path/to/test.ext` | Create | What it tests |
```

### File Structure Guidelines

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- AI agents reason best about code they can hold in context at once. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, do not unilaterally restructure -- but if a file you are modifying has grown unwieldy, including a split in the plan is reasonable.

---

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" -- step
- "Run it to verify it fails" -- step
- "Implement the minimal code to make the test pass" -- step
- "Run the tests to verify they pass" -- step
- "Commit" -- step

Tasks should be scoped so an engineer can complete one in a focused burst without needing to context-switch. If a task requires more than 5 minutes of active work, break it down further.

---

## Task Structure

Every task follows this template:

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ext`
- Modify: `exact/path/to/existing.ext`
- Test: `tests/exact/path/to/test.ext`

**Dependencies:** Requires Task M (if applicable)

- [ ] **Step 1: Write the failing test**

```language
// Test code here -- complete, runnable, no placeholders
```

- [ ] **Step 2: Run test to verify it fails**

Run: `<exact test command>`
Expected: FAIL with "<expected failure message>"

- [ ] **Step 3: Write minimal implementation**

```language
// Implementation code here -- complete, no placeholders
```

- [ ] **Step 4: Run test to verify it passes**

Run: `<exact test command>`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add <specific files>
git commit -m "<message following project commit convention>"
```
````

### Task Structure Requirements

- **Exact file paths** -- always. No "create a file in the appropriate directory."
- **Complete code** -- every step that changes code shows the complete code block. No summaries.
- **Exact commands** -- with expected output. The engineer should know what success looks like.
- **Dependencies declared** -- if Task N requires Task M, say so with `blockedBy` or `Dependencies`.
- **Commit messages** -- follow the project's commit convention from `jig.config.md`.

---

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** -- never write them:

| Placeholder | Why It Fails |
|-------------|-------------|
| "TBD", "TODO", "implement later" | Engineer stops dead, has to figure it out |
| "Add appropriate error handling" | What errors? What handling? Be specific. |
| "Add validation" | What validation? For what inputs? |
| "Handle edge cases" | Which edge cases? List them. |
| "Write tests for the above" | Without actual test code? Useless. |
| "Similar to Task N" | The engineer may read tasks out of order. Repeat the code. |
| Steps describing what to do without showing how | Code steps require code blocks. |
| References to types/functions not defined in any task | Undefined = broken. |

---

## TDD Orientation

Plans are TDD-oriented by default:
1. Every feature task starts with a failing test
2. The test is run and confirmed failing
3. Minimal implementation makes the test pass
4. Tests are confirmed passing
5. Then commit

**REQUIRED**: Reference `jig-tdd` skill for implementers. Subagents and teammates executing this plan should follow the TDD red-green-refactor cycle.

For tasks that are purely structural (creating directories, config files, boilerplate with no logic), TDD steps can be simplified to "create file, verify it exists, commit."

---

## Self-Review

After writing the complete plan, review it with fresh eyes. This is a checklist you run yourself -- not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the design doc. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search the plan for red flags -- any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names used in later tasks match what was defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Dependency ordering:** Can each task be executed after its dependencies complete? Are there circular dependencies? Is the ordering optimal for parallelization?

**5. Command accuracy:** Are the test commands, build commands, and file paths correct for this project's toolchain?

If you find issues, fix them inline. No need to re-review -- just fix and move on. If you find a spec requirement with no task, add the task.

---

## Plan Output

Save to: `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`

---

## Execution Handoff

After saving the plan, offer the execution choice:

> "Plan complete and saved to `docs/plans/<filename>.md`. Two execution options:
>
> **1. Team-Driven (parallel)** -- Spawns implementer teammates in split panes, staggered review pipeline. Best for 3+ independent tasks touching different files.
>
> **2. Subagent-Driven (sequential)** -- Fresh subagent per task, two-stage review after each. Best for coupled tasks or fewer than 3 tasks.
>
> Which approach?"

**If Team-Driven chosen:**
- **REQUIRED**: Use `jig-team-dev`
- Parallel implementation with spec compliance + code quality review gates

**If Subagent-Driven chosen:**
- **REQUIRED**: Use `jig-sdd`
- Serial execution with two-stage review per task

Read `jig.config.md` for `parallel-threshold` and `default-strategy` to inform the recommendation, but always let the user choose.

---

## Key Principles

- **DRY** -- do not repeat yourself across tasks (except code blocks, which must be self-contained)
- **YAGNI** -- do not add features not in the approved design
- **TDD** -- tests first, implementation second
- **Frequent commits** -- one commit per task minimum
- **Zero ambiguity** -- if an engineer has to guess, the plan failed

---

## Integration

**Called by:**
- `jig-brainstorm` (terminal state) -- after design is approved
- `jig-kickoff` during the PLAN stage

**Terminal state:**
- Invoke `jig-team-dev` (parallel) or `jig-sdd` (sequential)

**Related skills:**
- `jig-brainstorm` -- produces the design this skill consumes
- `jig-prd` -- produces PRD with acceptance checklist referenced in plan header
- `jig-tdd` -- implementers use TDD during execution
- `jig-team-dev` -- parallel execution engine
- `jig-sdd` -- sequential execution engine

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Vague steps without code | Engineer guesses, builds wrong thing | Every code step has a complete code block |
| Missing file paths | Engineer creates files in wrong locations | Exact paths always, verify against project structure |
| Placeholders in test code | Tests do not actually test anything | Write real assertions with real expected values |
| Tasks too large | Context overload, errors compound | Each step is 2-5 minutes of focused work |
| Missing dependencies | Task fails because prerequisite not built | Declare `blockedBy` for every dependent task |
| Inconsistent naming across tasks | Runtime errors, undefined references | Self-review checks type consistency |
| Skipping self-review | Spec gaps ship, plans have contradictions | Always run the 5-point self-review |
| No PRD/design reference in header | Spec reviewers cannot find acceptance criteria | Include reference lines when documents exist |
