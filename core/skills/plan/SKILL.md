---
name: plan
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

**CONFIGURATION**: Reads `jig.config.md` for `plans-directory` (save location), `filename-format`, `commit` conventions, execution strategy preferences (`parallel-threshold`, `default-strategy`), and optional `plan-sync` (remote document sync).

---

## When to Use

Invoke this skill when:
- You have an approved design from `brainstorm`
- You have requirements (from a PRD, ticket, or conversation) for a multi-step task
- `kickoff` routes here during the PLAN stage
- The user says "write a plan", "create an implementation plan", or "/plan"

**Do NOT use when:**
- The task is a single atomic change (just do it)
- You have no source material at all — not a PRD, not a ticket, not a clear conversation. In that case, invoke `/brainstorm` or `/prd` first to produce *something* to transpose from.

**Announce at start:** "I'm using the plan skill to create the implementation plan."

---

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during PRD authoring. If it was not, suggest breaking this into separate plans -- one per subsystem. Each plan should produce working, testable software on its own.

---

## Step 1: Transpose the Source

**The critical step.** Before drafting tasks, distill the source material into a structured contract you can decompose. The methodology is the same regardless of input fidelity — only Step 1a branches on source type.

### 1a. Identify the Contract

**If a PRD exists** (referenced by the user, present in `{plans-directory}/`, or named in the ticket):
- Load it. Your contract is the `[ ]` acceptance items — already layer-tagged.
- Skip to Step 1b.

**If no PRD exists**, extract an *implicit contract* from available context:
- Read the ticket body and acceptance criteria
- Scan recent conversation (brainstorm output, user statements)
- For bugs: use the reproduction + expected behavior as the contract

Write the implicit contract inline as 3-10 bullets, tagged by layer:

```
[DATA] Order entity has a `notes` field (optional text, max 2000 chars)
[API] createOrder accepts `notes` in CreateOrderInput
[LOGIC] Notes are stripped of HTML before persistence
[UI] Order detail page shows notes in a collapsed section
```

This is scratch work — not a separate doc. It anchors the rest of the transposition.

**If you cannot articulate 3 bullets from available context, stop.** You don't have enough to plan. Return to the user: "I don't have a clear contract for what to build. Want to capture a PRD with `/prd`, or talk through it with `/brainstorm` first?"

### 1b. Group by Layer

Bucket every contract item into its layer:

| Layer | Examples |
|-------|----------|
| DATA | Entities, schema changes, migrations, indexes |
| API | Endpoints, mutations, queries, RPC contracts |
| LOGIC | Business rules, validations, state machines, side effects, jobs |
| UI | Components, pages, states, interactions |

Items spanning layers (e.g., a permission check that's both API and LOGIC) go in *every* layer they touch.

### 1c. Derive File Structure

For each layer, list the files that need to be created or modified. This is where the PRD becomes a build artifact:

- DATA items → migration files + entity/schema files
- API items → controller / resolver / handler files + input/output type files
- LOGIC items → service / domain / job files
- UI items → component / page / hook / style files

Plus tests for every non-trivial file.

This list becomes the `## File Structure` table in the plan document.

### 1d. Sequence by Dependency

Within layers, default order is **bottom-up**: DATA → LOGIC → API → UI. Across the build:

- A task is **blocked by** another if it imports / depends on its output (a route handler depends on its service; a service depends on its entity)
- Two tasks are **parallel-safe** if they touch disjoint files
- Cross-cutting concerns (auth checks, validation utilities) often appear as shared dependencies — extract them to early tasks

This sequencing populates the `Dependencies:` field on each task.

### 1e. Decompose into TDD Bite-Sized Tasks

Now and only now, expand each contract item into the 5-step TDD task template (existing format in this skill). Every contract `[ ]` item should map to at least one task. The reverse check at self-review: every task ties back to at least one contract item.

**Transposition discipline:**
- Don't skip contract items because "they're obvious" — they're not obvious to the build agent
- Don't introduce work the contract doesn't justify (YAGNI applies at the transpose layer too)
- If you discover the contract has gaps during transposition, surface them — don't invent requirements

---

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **PRD:** docs/plans/YYYY-MM-DD-<topic>-prd.md *(include if a PRD exists)*
> **Design:** docs/plans/YYYY-MM-DD-<topic>-design.md *(include if a design doc exists)*
> **For agents:** Use team-dev (parallel) or sdd (sequential) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

**REQUIRED**: Reference `tdd` skill for implementers. Subagents and teammates executing this plan should follow the TDD red-green-refactor cycle.

For tasks that are purely structural (creating directories, config files, boilerplate with no logic), TDD steps can be simplified to "create file, verify it exists, commit."

---

## Self-Review

After writing the complete plan, review it with fresh eyes. This is a checklist you run yourself -- not a subagent dispatch.

**1. Transpose coverage:** For every `[ ]` item in the contract (PRD acceptance checklist or inline contract from Step 1a), point to the task(s) that implement it. If any item has no task, add one. If any task has no contract item, justify it or remove it.

**2. Placeholder scan:** Search the plan for red flags -- any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names used in later tasks match what was defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**4. Dependency ordering:** Can each task be executed after its dependencies complete? Are there circular dependencies? Is the ordering optimal for parallelization?

**5. Command accuracy:** Are the test commands, build commands, and file paths correct for this project's toolchain?

If you find issues, fix them inline. No need to re-review -- just fix and move on. If you find a spec requirement with no task, add the task.

---

## Plan Review Swarm

After self-review, invoke the review swarm to scrutinize the implementation plan before the user approves it.

**Automatic dispatch**: Run the swarm for all medium-to-large features and improvements. Skip only for clearly trivial work.

**INVOKE `jig:review` using the Skill tool with mode: plan.** Pass the plan document path. The review skill discovers PLAN specialists (stage: plan or both), dispatches them in parallel with the full plan + PRD + section hints + codebase access. After the specialist swarm, a plan logic reviewer (Opus) performs deep correctness analysis. Findings are scored and returned as a unified report.

Present the swarm findings to the user **before asking for approval**:

> "Plan written and self-reviewed. The review swarm found these concerns:"
>
> {swarm report — including plan logic reviewer findings}
>
> "Want to address any of these before approving the plan?"

If the user requests changes based on findings, update the plan and re-run the self-review checklist. Do not re-run the swarm unless the changes are substantial.

---

## Plan Output

Save to: `{plans-directory}/{filename-format}` resolved against `jig.config.md` (default: `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`).

If `plan-sync` is configured in `jig.config.md`, also push to the configured remote document target after saving locally (see the pack's README for sync method).

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
- **REQUIRED**: Use `team-dev`
- Parallel implementation with spec compliance + code quality review gates

**If Subagent-Driven chosen:**
- **REQUIRED**: Use `sdd`
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
- `kickoff` during the PLAN stage
- Direct user invocation (`/plan`) — when the user has source material ready

**Terminal state:**
- Offer execution choice (team-dev or sdd). User chooses.

**Related skills:**
- `prd` — primary input source; produces the acceptance checklist that Step 1 transposes
- `brainstorm` — optional pre-cursor when the user wants to explore approaches before locking in a plan
- `tdd` — implementers follow TDD during execution
- `team-dev` / `sdd` — execution engines

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
