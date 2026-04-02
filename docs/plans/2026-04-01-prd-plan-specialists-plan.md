# PRD & PLAN Specialist Dispatch — Implementation Plan

> **PRD:** docs/plans/2026-04-01-prd-plan-specialists-prd.md
> **Design:** docs/plans/2026-04-01-prd-plan-specialists-design.md
> **For agents:** Use team-dev (parallel) or sdd (sequential) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add specialist review swarms to the PRD and PLAN pipeline stages, extending the review skill with mode-based dispatch.

**Architecture:** Extend the existing `review` skill with an explicit `mode` parameter (code/prd/plan). Add a `stage` field to the specialist schema for discovery filtering. Create 6 new specialists and 1 plan logic reviewer. Wire the `prd` and `plan` skills to invoke the review swarm after drafting.

**Tech Stack:** Markdown, YAML frontmatter, Jig framework conventions

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `framework/SKILL_SCHEMA.md` | Modify | Add `stage` field to specialist schema |
| `jig.config.md` | Modify | Add `prd-swarm-tiers`, `plan-swarm-tiers`, `plan-deep-review-model`, `design-review-model` |
| `core/specialists/data-dependency.md` | Create | PRD specialist: schema dependencies, FK cascades, migration prereqs |
| `core/specialists/ui-conflict.md` | Create | PRD specialist: feature flag collisions, layout conflicts |
| `core/specialists/blast-radius.md` | Create | Both specialist: cross-layer ripple effects |
| `core/specialists/state-completeness.md` | Create | Both specialist: missing transitions, asymmetric paths |
| `core/specialists/task-dependency.md` | Create | PLAN specialist: task ordering, blocking prereqs |
| `core/specialists/migration-safety.md` | Create | PLAN specialist: data migration order, rollback, destructive ops |
| `core/skills/plan/plan-logic-reviewer.md` | Create | Opus deep reviewer for implementation plans |
| `core/skills/review/SKILL.md` | Modify | Add mode parameter, stage-filtered discovery, document input path |
| `core/skills/prd/SKILL.md` | Modify | Add swarm dispatch after draft, present findings before approval |
| `core/skills/plan/SKILL.md` | Modify | Add swarm dispatch after draft, present findings before approval |

---

## Task 1: Add `stage` field to specialist schema

**Files:**
- Modify: `framework/SKILL_SCHEMA.md`

**Dependencies:** None

- [ ] **Step 1: Add `stage` field to the specialist schema section**

In the `## Specialist Schema` section, add the `stage` field after `severity`:

```yaml
---
name: string              # Specialist identifier
description: string       # What this specialist reviews
model: enum               # haiku | sonnet | opus — cost/capability tradeoff
tier: enum                # fast-pass | full-only — when to dispatch
stage: enum               # Optional. prd | plan | both — pipeline stage filter.
                          # Absent = code review only (backward compatible).
globs: string[]           # File patterns this specialist cares about
severity: enum            # blocking | major | minor — how findings are weighted
---
```

- [ ] **Step 2: Add constraints documentation for `stage`**

After the existing constraints list, add:

```markdown
- **stage:** Optional. Controls which review swarm discovers this specialist.
  `prd` = PRD review only. `plan` = PLAN review only. `both` = PRD and PLAN
  reviews. Absent = code review only (existing behavior, backward compatible).
  Specialists with a `stage` field are excluded from code review swarms.
  Specialists without a `stage` field are excluded from PRD/PLAN swarms.
```

- [ ] **Step 3: Verify frontmatter structure**

Confirm the specialist schema section shows all 7 fields (name, description, model, tier, stage, globs, severity) and the constraints section documents `stage`.

- [ ] **Step 4: Commit**

```bash
git add framework/SKILL_SCHEMA.md
git commit -m "feat(framework): add stage field to specialist schema for PRD/PLAN dispatch"
```

---

## Task 2: Add PRD/PLAN swarm configuration to jig.config.md

**Files:**
- Modify: `jig.config.md`

**Dependencies:** None

- [ ] **Step 1: Read current config**

Read `jig.config.md` and locate the `## Review` section.

- [ ] **Step 2: Add PRD and PLAN swarm tier configuration**

After the existing `## Review` section, add:

```markdown
## PRD Review
prd-swarm-tiers:
  fast-pass: [data-dependency, ui-conflict, blast-radius, state-completeness]
  full: all

## Plan Review
plan-swarm-tiers:
  fast-pass: [task-dependency, migration-safety, blast-radius, state-completeness]
  full: all
plan-deep-review-model: opus
design-review-model: sonnet
```

- [ ] **Step 3: Verify config parses correctly**

Read the file and confirm the YAML blocks are well-formed: array syntax, key-value pairs, no indentation errors.

- [ ] **Step 4: Commit**

```bash
git add jig.config.md
git commit -m "feat(core): add PRD and PLAN swarm tier configuration"
```

---

## Task 3: Create `data-dependency` specialist

**Files:**
- Create: `core/specialists/data-dependency.md`

**Dependencies:** None

- [ ] **Step 1: Write the specialist**

```markdown
---
name: data-dependency
description: Schema dependencies, foreign key cascades, migration prerequisites, cross-table constraints
model: sonnet
tier: fast-pass
stage: prd
globs:
  - "**/*"
severity: major
---

# Data Dependency Review

You are reviewing a PRD or requirements document for hidden data
dependencies. Requirements authors often propose schema changes,
new entities, or data model modifications without fully understanding
the existing dependency graph. Your job is to find what they missed.

You have full codebase access via Read, Grep, and Glob tools. Use
them proactively — do not limit yourself to the document.

## Input

You receive:
1. **The full document** — PRD with requirements and data model
   sections
2. **Section hints** — which sections are most relevant to your
   concern
3. **Codebase access** — Read, Grep, Glob tools to verify claims

## What to Check

### Foreign Key Dependencies
- Does the document propose dropping, renaming, or altering a column
  or table?
- Grep the codebase for foreign key references to that table/column
- Check for cascading deletes, indexes, and constraints that depend
  on the target
- Flag any dependent tables/columns not mentioned in the document

### Migration Prerequisites
- Does the proposed change require data migration before schema
  changes?
- Would existing rows violate new constraints (NOT NULL, UNIQUE,
  CHECK)?
- Does the migration need to be reversible? Is rollback addressed?
- Are there large tables where ALTER operations would lock writes?

### Cross-Table Constraints
- Does adding a uniqueness constraint affect existing data?
- Grep for existing duplicate values that would violate new
  constraints
- Check if composite keys or unique indexes have implications the
  author did not mention

### Query Impact
- Would schema changes break existing queries, views, or stored
  procedures?
- Grep for queries referencing modified columns or tables
- Check ORM model definitions for field references

### Implicit Dependencies
- Does the data model assume an ordering (e.g., "create A, then
  reference it in B") that is not explicitly stated?
- Are there seed data, default values, or lookup tables that need
  updating?

## What to Ignore
- Documents with no data model or schema changes
- Schema proposals clearly marked as "future" or "out of scope"
- Minor column additions with no constraints or dependencies
- Test data and fixture references

## Report Format

For each finding:
- **Section**: Which document section contains the issue
- **Finding**: What dependency was missed and why it matters
- **Evidence**: What you found in the codebase (file:line references)
- **Impact**: What breaks or needs attention if the dependency is
  ignored
- **Suggestion**: What to add to the requirements

If no data dependency issues are found, respond with exactly: `N/A`
```

- [ ] **Step 2: Verify frontmatter**

Confirm all 7 fields present: name, description, model, tier, stage, globs, severity.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/data-dependency.md
git commit -m "feat(specialists): add data-dependency specialist for PRD review"
```

---

## Task 4: Create `ui-conflict` specialist

**Files:**
- Create: `core/specialists/ui-conflict.md`

**Dependencies:** None

- [ ] **Step 1: Write the specialist**

```markdown
---
name: ui-conflict
description: Feature flag collisions, layout conflicts, conditional rendering blind spots, entry point overlaps
model: sonnet
tier: fast-pass
stage: prd
globs:
  - "**/*"
severity: major
---

# UI Conflict Review

You are reviewing a PRD or requirements document for UI-layer blind
spots. Requirements authors propose new UI elements, entry points,
and interactive behaviors without full awareness of what already
exists in those locations — especially behind feature flags or
conditional rendering paths. Your job is to find the collisions.

You have full codebase access via Read, Grep, and Glob tools. Use
them proactively — do not limit yourself to the document.

## Input

You receive:
1. **The full document** — PRD with UI states, component behavior,
   and entry point sections
2. **Section hints** — which sections are most relevant to your
   concern
3. **Codebase access** — Read, Grep, Glob tools to verify claims

## What to Check

### Feature Flag Collisions
- Does the document propose adding UI elements to a specific
  location?
- Grep the codebase for feature flags that conditionally render
  elements in that same location
- Check for A/B test variants that alter the layout in that area
- Flag any overlapping feature flag states the author did not account
  for

### Layout Conflicts
- Does the proposed UI occupy space that another component uses?
- Check for responsive breakpoints where layouts shift
- Look for absolute positioning, z-index stacking, or overlay
  components in the target area
- Verify the proposed placement works across all viewport sizes
  mentioned (or assumed)

### Conditional Rendering Blind Spots
- Are there states where the target container is hidden, collapsed,
  or replaced by another component?
- Check for permission-gated UI — does the element appear when the
  user lacks certain roles?
- Check for empty states, loading states, and error states that
  replace the container
- Verify the document accounts for all rendering paths

### Entry Point Conflicts
- Does a new navigation path conflict with an existing route?
- Grep for route definitions and navigation menus
- Check for deep links, bookmarks, or URL patterns that could
  collide
- Verify the document's entry points do not duplicate existing ones

### State Interaction
- Does the proposed component's state interact with or depend on
  sibling component states?
- Check for shared state (context, stores, global state) that
  multiple components write to
- Verify form state, selection state, or modal state does not
  conflict with adjacent components

## What to Ignore
- Documents with no UI sections (N/A the entire review)
- Backend-only features with no frontend impact
- Design system token changes (colors, spacing) without layout impact
- Accessibility improvements that do not change layout or behavior

## Report Format

For each finding:
- **Section**: Which document section contains the issue
- **Finding**: What conflict exists and between which components
- **Evidence**: What you found in the codebase (file:line references)
- **Impact**: What the user would experience (broken layout, double
  buttons, hidden element)
- **Suggestion**: What to add or clarify in the requirements

If no UI conflict issues are found, respond with exactly: `N/A`
```

- [ ] **Step 2: Verify frontmatter**

Confirm all 7 fields present: name, description, model, tier, stage, globs, severity.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/ui-conflict.md
git commit -m "feat(specialists): add ui-conflict specialist for PRD review"
```

---

## Task 5: Create `blast-radius` specialist

**Files:**
- Create: `core/specialists/blast-radius.md`

**Dependencies:** None

- [ ] **Step 1: Write the specialist**

```markdown
---
name: blast-radius
description: Cross-layer ripple effects, upstream/downstream coupling, underestimated change scope
model: sonnet
tier: fast-pass
stage: both
globs:
  - "**/*"
severity: major
---

# Blast Radius Review

You are reviewing a PRD or implementation plan for underestimated
blast radius. When a change in one layer (data, API, business logic,
UI) forces changes in other layers, authors often undercount the
ripple. Your job is to trace the full chain and flag what is missing.

The classic failure: "Allow toggle ON while duplicates exist and
enforce lazily" — sounds simple, but ripples across component UI
(warning states), change orders (violation surfacing), and exports
(data integrity). One decision, four layers affected.

You have full codebase access via Read, Grep, and Glob tools. Use
them proactively — do not limit yourself to the document.

## Input

You receive:
1. **The full document** — PRD or implementation plan
2. **Section hints** — focus areas (but cross-cutting analysis is
   your specialty — read ALL sections)
3. **Codebase access** — Read, Grep, Glob tools to verify claims

## What to Check

### Upstream Impact
- Who produces the data or state that this change modifies?
- Grep for all writers/producers of the affected entity
- Would producers need to change their behavior? Are they listed?
- Check event publishers, background jobs, and import pipelines

### Downstream Impact
- Who consumes the data or state that this change modifies?
- Grep for all readers/consumers of the affected entity
- Would consumers break or need updates? Are they listed?
- Check API responses, UI renderers, export pipelines, and reports

### Cross-Layer Ripple
- Does a data model change require API changes? Are they listed?
- Does an API change require UI changes? Are they listed?
- Does a business logic change affect both backend and frontend?
- For each layer touched, verify the document accounts for the full
  chain: data → API → logic → UI

### Lazy vs Eager Enforcement
- Does the document propose lazy enforcement of a new constraint?
- Trace what "lazy" means: which operations must now check the
  constraint?
- How many call sites need the check? Are they all listed?
- What happens to existing data that violates the constraint?

### Integration Points
- Does the change affect shared services, message queues, or
  webhooks?
- Grep for integration touchpoints referencing the modified entity
- Check for third-party consumers (APIs, exports, partner
  integrations)

### Permission and Role Impact
- Does the change introduce a new operation that needs auth checks?
- Does it modify an existing operation's authorization model?
- Are admin, user, and service-account paths all accounted for?

## What to Ignore
- Changes explicitly scoped to a single layer with no cross-cutting
  impact
- Sections marked "out of scope" (but DO flag if the out-of-scope
  section omits a necessary ripple)
- Hypothetical future integrations not yet built

## Report Format

For each finding:
- **Section**: Which document section underestimates scope
- **Finding**: What ripple effect is missing or underestimated
- **Chain**: The full layer chain (e.g., "DATA → API → UI: adding
  uniqueness constraint requires API validation error + UI error
  state")
- **Evidence**: What you found in the codebase (file:line references)
- **Impact**: What breaks or is inconsistent if the ripple is ignored
- **Suggestion**: What layers/sections to add to the document

If no blast radius issues are found, respond with exactly: `N/A`
```

- [ ] **Step 2: Verify frontmatter**

Confirm all 7 fields present, `stage: both`.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/blast-radius.md
git commit -m "feat(specialists): add blast-radius specialist for PRD and PLAN review"
```

---

## Task 6: Create `state-completeness` specialist

**Files:**
- Create: `core/specialists/state-completeness.md`

**Dependencies:** None

- [ ] **Step 1: Write the specialist**

```markdown
---
name: state-completeness
description: Missing state transitions, undefined states, asymmetric positive/negative paths, unreachable states
model: sonnet
tier: fast-pass
stage: both
globs:
  - "**/*"
severity: major
---

# State Completeness Review

You are reviewing a PRD or implementation plan for incomplete state
machines and asymmetric conditional paths. When authors define state
transitions, they typically cover the happy path — but miss the
inverse, the error recovery, the edge states, and the transitions
back. Your job is to find the gaps.

You have full codebase access via Read, Grep, and Glob tools. Use
them proactively — do not limit yourself to the document.

## Input

You receive:
1. **The full document** — PRD or implementation plan with business
   logic and state transitions
2. **Section hints** — which sections are most relevant to your
   concern
3. **Codebase access** — Read, Grep, Glob tools to verify claims

## What to Check

### Missing Transitions
- For every state transition defined (A → B), is the reverse
  defined (B → A)? Is it intentionally one-way?
- For every entry state, is there an exit? Can entities get stuck?
- Is there a terminal state? What happens when it is reached?
- Check the codebase for existing state machines on the same entity
  — does the proposed change break or extend them?

### Undefined States
- Are there reachable states not explicitly named?
- What happens between transitions (e.g., "PENDING" between
  "SUBMITTED" and "APPROVED")?
- Are error states defined? What state does an entity enter on
  failure?
- What is the initial state? Is it explicitly defined or assumed?

### Asymmetric Paths
- For enable/disable pairs: does disable undo everything enable did?
- For add/remove pairs: does remove clean up everything add created?
- For show/hide pairs: does hide handle all the states show
  introduced?
- For grant/revoke pairs: does revoke cover all the permissions
  grant added?
- Grep the codebase for the positive path — how many side effects
  does it have? Does the negative path reverse all of them?

### Conditional Completeness
- For if/else branches: are all branches handled?
- For switch/case patterns: is there a default? Is it correct?
- For permission checks: what happens when denied? Is there a
  fallback UI or error?
- For feature flags: what happens in both ON and OFF states?

### Concurrent State
- Can two users/processes modify the same entity simultaneously?
- Is there a locking or versioning strategy?
- What happens if state changes during an async operation?

## What to Ignore
- Simple boolean flags with obvious on/off semantics
- States described in an "out of scope" section
- CRUD operations with no lifecycle (create → read → delete,
  no transitions)

## Report Format

For each finding:
- **Section**: Which document section has the gap
- **Finding**: What state, transition, or path is missing
- **Current**: What the document defines (the states/transitions
  listed)
- **Missing**: What is absent (the gap)
- **Impact**: What happens at runtime when the missing state or
  transition is encountered
- **Suggestion**: What to add to the state machine or conditional
  logic

If no state completeness issues are found, respond with exactly: `N/A`
```

- [ ] **Step 2: Verify frontmatter**

Confirm all 7 fields present, `stage: both`.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/state-completeness.md
git commit -m "feat(specialists): add state-completeness specialist for PRD and PLAN review"
```

---

## Task 7: Create `task-dependency` specialist

**Files:**
- Create: `core/specialists/task-dependency.md`

**Dependencies:** None

- [ ] **Step 1: Write the specialist**

```markdown
---
name: task-dependency
description: Task ordering errors, implicit dependencies, parallelism conflicts, missing prerequisites
model: sonnet
tier: fast-pass
stage: plan
globs:
  - "**/*"
severity: major
---

# Task Dependency Review

You are reviewing an implementation plan for task ordering errors
and missing dependencies. Plans decompose work into tasks with
declared dependencies, but authors miss implicit dependencies —
tasks that cannot truly run until another completes, file-level
conflicts between "parallel" tasks, and prerequisites assumed but
not listed. Your job is to verify the dependency graph holds.

You have full codebase access via Read, Grep, and Glob tools. Use
them proactively — do not limit yourself to the document.

## Input

You receive:
1. **The full implementation plan** — tasks with files, dependencies,
   and steps
2. **The PRD** (if exists) — for cross-referencing requirements
3. **Section hints** — which sections are most relevant to your
   concern
4. **Codebase access** — Read, Grep, Glob tools to verify claims

## What to Check

### Explicit Dependency Correctness
- For each task's declared dependencies: does the dependent task
  actually produce what this task needs?
- Does Task N reference a type, function, or file created in Task M
  without declaring the dependency?
- Are there circular dependencies?

### Implicit Dependencies
- Do two tasks modify the same file without declaring a dependency?
- Does a later task import from a module created in an earlier task
  without listing it as a dependency?
- Does a task assume a migration has run without depending on the
  migration task?
- Grep for shared file paths across tasks — flag any overlap not
  covered by dependency declarations

### Parallelism Safety
- Tasks without dependency declarations are implicitly parallel-safe
- Do any "independent" tasks write to the same file?
- Do any "independent" tasks modify the same database table or
  schema?
- Would merge conflicts arise if parallel tasks are committed
  independently?

### Missing Prerequisites
- Does the plan assume infrastructure that does not exist (a table,
  a service, a configuration)?
- Grep the codebase to verify that assumed prerequisites are present
- Does the plan assume a specific branch state or prior PR is
  merged?

### Ordering Optimization
- Are there tasks that could be parallelized but are listed as
  sequential?
- Are there tasks that should be sequential but lack dependency
  declarations?
- Is the critical path (longest chain of dependent tasks) reasonable?

## What to Ignore
- Plans with a single task (no dependency graph to validate)
- Dependency ordering within a task's steps (step ordering is the
  author's responsibility)
- Commit message formatting

## Report Format

For each finding:
- **Tasks**: Which tasks are involved (e.g., "Task 3 → Task 7")
- **Finding**: What dependency is wrong, missing, or unsafe
- **Evidence**: File path overlap, import reference, or codebase
  check that revealed the issue
- **Impact**: What breaks if tasks execute in the declared order
- **Fix**: Reorder, add dependency declaration, or split the task

If no task dependency issues are found, respond with exactly: `N/A`
```

- [ ] **Step 2: Verify frontmatter**

Confirm all 7 fields present, `stage: plan`.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/task-dependency.md
git commit -m "feat(specialists): add task-dependency specialist for PLAN review"
```

---

## Task 8: Create `migration-safety` specialist

**Files:**
- Create: `core/specialists/migration-safety.md`

**Dependencies:** None

- [ ] **Step 1: Write the specialist**

```markdown
---
name: migration-safety
description: Data migration ordering, rollback strategy, destructive operations, constraint violations on existing data
model: sonnet
tier: fast-pass
stage: plan
globs:
  - "**/*"
severity: blocking
---

# Migration Safety Review

You are reviewing an implementation plan for unsafe data migrations
and schema changes. Plans that involve database modifications are
high-risk — wrong ordering destroys data, missing rollback leaves
the system in a broken state, and new constraints on existing data
cause runtime failures. Your job is to find the dangers before
implementation.

You have full codebase access via Read, Grep, and Glob tools. Use
them proactively — do not limit yourself to the document.

## Input

You receive:
1. **The full implementation plan** — tasks with files, dependencies,
   and steps
2. **The PRD** (if exists) — for cross-referencing data model
   requirements
3. **Section hints** — which sections are most relevant to your
   concern
4. **Codebase access** — Read, Grep, Glob tools to verify claims

## What to Check

### Migration Ordering
- Are schema changes ordered correctly? (create table before adding
  foreign keys, add column before populating it)
- Does the plan separate schema migration from data migration?
- Are dependent migrations in the right sequence?
- Would a migration fail if run against a database with production
  data (not just empty/dev)?

### Destructive Operations
- Does the plan drop a column, table, or index?
- Grep the codebase for references to the dropped entity — are all
  consumers updated first?
- Is there a data preservation step before destruction?
- Could the drop be replaced with a soft-delete or rename-first
  approach?

### Constraint Violations
- Does the plan add NOT NULL to an existing column? What about
  existing NULL rows?
- Does the plan add UNIQUE to an existing column? Are there
  duplicates?
- Does the plan add a CHECK constraint? Do existing rows satisfy it?
- Does the plan modify a column type? Is the cast safe for all
  existing values?

### Rollback Strategy
- If the migration fails midway, what is the recovery plan?
- Are the migrations reversible (down migration defined)?
- Is there a point of no return? Is it documented?
- For multi-step migrations: can you roll back step 3 without
  undoing steps 1-2?

### Performance Impact
- Would the migration lock a large table?
- Is there an estimated row count for affected tables?
- Should the migration be batched?
- Would the migration cause downtime? Is that acceptable?

### Data Integrity
- Is data being moved or transformed? Is the transformation
  reversible?
- Are foreign key constraints maintained throughout the migration?
- Could concurrent writes during migration cause inconsistency?
- Is there a verification step after migration completes?

## What to Ignore
- Plans with no database or schema changes
- Test database setup and teardown
- Seed data for development environments
- Schema changes on new tables (no existing data risk)

## Report Format

For each finding:
- **Task**: Which task contains the unsafe operation
- **Finding**: What migration risk exists
- **Evidence**: What you found in the codebase (existing data,
  references, constraints) with file:line references
- **Severity**: blocking (data loss risk) or major (broken state
  risk)
- **Fix**: Safe ordering, rollback step, or data preservation
  approach

If no migration safety issues are found, respond with exactly: `N/A`
```

- [ ] **Step 2: Verify frontmatter**

Confirm all 7 fields present, `stage: plan`, `severity: blocking`.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/migration-safety.md
git commit -m "feat(specialists): add migration-safety specialist for PLAN review"
```

---

## Task 9: Create plan logic reviewer

**Files:**
- Create: `core/skills/plan/plan-logic-reviewer.md`

**Dependencies:** None

- [ ] **Step 1: Write the plan logic reviewer**

```markdown
---
name: plan-logic-reviewer
description: >
  Deep-reasoning correctness reviewer for implementation plans. Runs
  after the plan specialist swarm, reads the plan skeptically,
  proactively explores the codebase, and finds gaps that pattern
  specialists miss. Receives swarm findings to avoid duplication.
model: opus
---

# Plan Logic Reviewer

You are a skeptical plan reviewer. Your job is NOT to check patterns
or style — the swarm specialists already did that. Your job is to
find **correctness gaps** — places where the plan looks complete but
cannot actually achieve its stated goal.

You have full codebase access via Read, Grep, Glob, and Agent tools.
Use them proactively — do not limit yourself to the plan document.

## Input

You receive:
1. **The full implementation plan** — all tasks, dependencies, files
2. **The PRD** (if exists) — acceptance criteria the plan must cover
3. **Swarm findings** — issues already caught by specialists (DO NOT
   re-flag these)
4. **Tool access** — Read, Grep, Glob, Agent to explore the codebase

## The Skeptic's Method

For each task and for the plan as a whole, apply these 7 reasoning
patterns. Use judgment about which patterns are relevant — but do
not skip a pattern just because it is slow.

### 1. Trace the Dependency Chain

**When**: Any task declares a dependency on another task.

**How**:
- Read the depended-on task: what does it actually produce?
- Read the dependent task: what does it actually consume?
- At the boundary: does the producer's output match the consumer's
  expectation?
- Check types, file paths, function names, and interfaces across
  the task boundary

**What breaks**: Task 3 depends on Task 2 but uses a function name
that Task 2 defines differently. Task 5 imports from a file that
Task 4 creates at a different path. Type produced in one task does
not match type consumed in the next.

### 2. Verify the Ordering

**When**: Tasks have a declared sequence.

**How**:
- For each task pair: can this task truly execute after the prior?
- Check for implicit prerequisites not declared as dependencies
- Check for shared files: would a later task overwrite an earlier
  task's work?
- Verify the plan's critical path is sound

**What breaks**: Migration task runs before the table-creation task.
API tests run before the API route is registered. UI component
references a type not yet created by a planned task.

### 3. Check Against the Codebase

**When**: A task references existing files, functions, types, tables,
or schemas.

**How**:
- For each file path in the plan: does it exist? Is the path
  correct?
- For each function/type referenced: grep for it — does it exist
  and match the plan's assumptions?
- For each schema claim ("column X has type Y"): verify against
  the actual schema
- For each import: does the module export what the plan expects?

**What breaks**: Plan says "modify `src/models/user.ts`" but the
file is at `src/entities/user.ts`. Plan says "add field to User
type" but the User type is an interface, not a class. Plan says
"column has no foreign keys" but three tables reference it.

### 4. Test the Stated Goal

**When**: Always — this is the whole-plan check.

**How**:
- Read the PRD acceptance checklist (if available)
- Mentally execute all tasks in dependency order
- For each acceptance criterion: can you trace it to a task that
  implements it?
- Are there acceptance criteria with no corresponding task?
- Are there tasks that do not map to any acceptance criterion?

**What breaks**: PRD requires 8 acceptance criteria. Plan covers 6.
Two UI criteria have no task. Alternatively: Plan has a task for
"admin notification" that the PRD never mentioned (scope creep).

### 5. Question the Scope

**When**: The plan's task list seems too short or too long for the
stated goal.

**How**:
- Count the plan's tasks against the PRD's acceptance criteria
- Check for accepted requirements that have no plan coverage
- Check for plan tasks that address no stated requirement
- Read the design doc's architecture section — does the plan
  decompose the architecture as designed?

**What breaks**: The design describes 4 components but the plan only
creates 3. The PRD's "error handling" acceptance criteria are not
covered by any task. A task adds an optimization not in the design.

### 6. Verify the Parallelism

**When**: Tasks are marked as independent (no dependency between
them).

**How**:
- Extract file paths from each "independent" task
- Check for file overlaps — do two tasks modify the same file?
- Check for logical conflicts — do two tasks modify the same
  concept from different angles?
- Would merging both tasks' changes produce conflicts?

**What breaks**: Tasks 3 and 4 both modify `src/api/routes.ts` but
neither depends on the other — merge conflict guaranteed. Tasks 5
and 6 both add exports to `src/index.ts` — line-level conflict.

### 7. Check the Rollback

**When**: The plan involves database changes, infrastructure
modifications, or irreversible operations.

**How**:
- If task 4 fails, can tasks 1-3 remain in a consistent state?
- Is there a point of no return in the plan? Is it documented?
- For each destructive operation: is there a backup or undo step?
- Can a partial implementation be safely abandoned?

**What breaks**: Tasks 1-3 create the new schema. Task 4 migrates
data. Task 5 drops the old table. If Task 4 fails, the old table
is intact — but if Task 5 runs and Task 6 fails, data is lost.

## Proactive Exploration

Do NOT limit yourself to the plan document. For every claim:

**For every file path in the plan:**
- Verify it exists (or does not, if the plan creates it)
- Read it to confirm the plan's assumptions about its structure

**For every dependency claim:**
- Grep for the referenced function, type, or module
- Verify it exists and has the expected signature

**For every "no references" claim:**
- Grep broadly to confirm

**For every schema/data claim:**
- Read the actual schema/model files
- Compare with the plan's assumptions

## Sub-Agent Spawning

For deep dives that would bloat your context, spawn focused research
agents:

```
Agent tool:
  description: "Verify file paths in plan"
  model: sonnet
  prompt: |
    Check each of these file paths against the codebase.
    For each, report whether it exists and what it contains.
    [file paths from plan]
```

Use sub-agents for:
- Verifying many file paths at once
- Tracing all consumers of a modified type/function
- Cross-referencing PRD acceptance criteria against plan tasks

Do NOT use sub-agents for things you can check with a single Grep
or Read.

## What NOT to Flag

- Style or formatting issues in the plan
- Anything already in the swarm findings you received
- Task granularity preferences (that is the author's judgment)
- Alternative approaches (the design is already approved)
- Code quality in code blocks (that is for code review, not plan
  review)

## Report Format

For each finding:

**[plan-logic] {concise title}** ({severity})
- **Task(s)**: Which tasks are affected
- **Finding**: What is wrong and why it breaks. Be specific about
  the failure scenario.
- **How found**: Which reasoning pattern (#1-7), what you traced,
  where it broke.
- **Evidence**: Codebase references that support the finding
  (file:line)
- **Fix**: Concrete remediation — reorder tasks, add a task, fix a
  path, add a dependency.
- **Verify**: How to confirm the fix resolves the issue.

Severity levels:
- **blocking**: Plan cannot succeed as written — missing task, wrong
  ordering, invalid file paths
- **major**: Plan may succeed but has significant risk — implicit
  dependencies, parallelism conflicts
- **minor**: Plan would benefit from adjustment — optimization,
  clarity

If you find no correctness issues after thorough analysis, respond
with: "No plan logic issues found. The dependency graph is sound,
file paths are verified, acceptance criteria are covered, and task
ordering is correct."

Do NOT fabricate findings to appear thorough. Zero findings after
real analysis is a valid and valuable result.
```

- [ ] **Step 2: Verify structure**

Confirm: frontmatter has `name`, `description`, `model: opus`. Body follows the same structure as the code logic reviewer (reasoning patterns, proactive exploration, sub-agent spawning, report format).

- [ ] **Step 3: Commit**

```bash
git add core/skills/plan/plan-logic-reviewer.md
git commit -m "feat(core): add plan logic reviewer for deep PLAN review"
```

---

## Task 10: Update review skill with mode-based dispatch

**Files:**
- Modify: `core/skills/review/SKILL.md`

**Dependencies:** Tasks 1-9 (specialists and schema exist)

- [ ] **Step 1: Read the current review skill**

Read `core/skills/review/SKILL.md` for current content.

- [ ] **Step 2: Update the title and PURPOSE**

Change the title from "Code Review Swarm Engine" to "Review Swarm Engine" and update the PURPOSE:

```markdown
# Review Swarm Engine

**PURPOSE**: Dispatch parallel specialist review agents, each focused
on one concern. Operates in three modes: **code** (diff review),
**prd** (requirements review), and **plan** (implementation plan
review). The orchestrator coordinates discovery, dispatch, scoring,
and reporting across all modes.

**CONFIGURATION**: Reads `jig.config.md` for `swarm-tiers` (code),
`prd-swarm-tiers` (prd), `plan-swarm-tiers` (plan),
`deep-review-model`, `plan-deep-review-model`, and
`design-review-model`.
```

- [ ] **Step 3: Update "When to Use" section**

Replace the existing "When to Use" section:

```markdown
## When to Use

### Mode: code (default)
- `code-review` agent invokes this with `mode: code, tier: all`
  (pre-PR, full swarm)
- `team-dev` quality gate invokes this with `mode: code, tier:
  fast-pass` (per-task, blocking checks only)
- Direct invocation via `/review` for manual code reviews

### Mode: prd
- `prd` skill invokes this with `mode: prd` after drafting a PRD
- Direct invocation via `/review` with a `-prd.md` document path
- Automatic for medium-to-large features and improvements

### Mode: plan
- `plan` skill invokes this with `mode: plan` after drafting a plan
- Direct invocation via `/review` with a `-plan.md` document path
- Automatic for medium-to-large features and improvements

**Logic reviewer**: In `code` mode, dispatched for `tier: all`
invocations. In `plan` mode, always dispatched after the specialist
swarm. Not dispatched in `prd` mode.
```

- [ ] **Step 4: Update Stage 1 DISCOVER**

Add stage-based filtering to the discovery stage. After the existing deduplication step (step 4), add:

```markdown
5. Filter by mode:
   - `mode: code` → include specialists where `stage` is **absent**
     (backward compatible — existing specialists have no `stage`)
   - `mode: prd` → include specialists where `stage: prd` or
     `stage: both`
   - `mode: plan` → include specialists where `stage: plan` or
     `stage: both`
6. Filter by the requested tier (same as before):
   - `tier: all` → include all specialists matching the mode
   - `tier: fast-pass` → include only `tier: fast-pass` specialists
     matching the mode

Check `jig.config.md` for the appropriate tier config:
- `mode: code` → `swarm-tiers`
- `mode: prd` → `prd-swarm-tiers`
- `mode: plan` → `plan-swarm-tiers`
```

- [ ] **Step 5: Update Stage 2 PREPARE**

Add document preparation path alongside the existing diff preparation:

```markdown
### Stage 2: PREPARE the Input

#### Mode: code (existing behavior)

Obtain the diff based on the caller:

[keep existing diff preparation content unchanged]

#### Mode: prd

1. Read the PRD document at the provided path
2. For each matching specialist, compute section hints based on the
   specialist's description:
   - `data-dependency` → "Focus on: Data Model, API Contract,
     Business Logic"
   - `ui-conflict` → "Focus on: UI States, Component Behavior,
     Entry Points"
   - `blast-radius` → "Focus on: All sections (cross-cutting)"
   - `state-completeness` → "Focus on: Business Logic, API
     Contract"
3. Build the specialist input: full document + section hints

#### Mode: plan

1. Read the implementation plan at the provided path
2. Read the PRD (from the plan header's `> **PRD:**` line) if it
   exists
3. For each matching specialist, compute section hints:
   - `task-dependency` → "Focus on: Task list, Dependencies"
   - `migration-safety` → "Focus on: Tasks involving DB/schema
     changes"
   - `blast-radius` → "Focus on: All tasks (cross-cutting)"
   - `state-completeness` → "Focus on: Tasks involving
     state/status changes"
4. Build the specialist input: full plan + PRD (if exists) +
   section hints
```

- [ ] **Step 6: Update Stage 3 DISPATCH**

Update the dispatch prompt template to support both modes:

```markdown
### Stage 3: DISPATCH (Parallel)

#### Mode: code (existing)

[keep existing dispatch content unchanged]

#### Mode: prd or plan

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

    {full document content}

    ## Section Hints

    {computed section hints for this specialist}

    ## PRD (for plan mode, if available)

    {PRD content, or "No PRD available" if absent}
```

All specialists receive codebase access tools: Read, Grep, Glob.

**All matching specialists are dispatched in a single message**
(parallel Agent calls). Do not dispatch sequentially.
```

- [ ] **Step 7: Update Stage 5 DEEP REVIEW**

Add plan logic reviewer alongside the existing code logic reviewer:

```markdown
### Stage 5: DEEP REVIEW

**Mode: code** — same as before. Skip for `tier: fast-pass`.
Dispatch the code logic reviewer after swarm completes.

**Mode: prd** — skip. No deep reviewer for PRD mode.

**Mode: plan** — always dispatch after swarm completes:

1. Read `plan-logic-reviewer.md` from `core/skills/plan/`
2. Build the prompt:
   - The plan logic reviewer's body
   - The full implementation plan
   - The PRD (if exists)
   - The swarm findings from Stage 4
3. Dispatch a single Agent with:
   - `model: opus` (or `plan-deep-review-model` from
     `jig.config.md`)
   - Full tool access: Read, Grep, Glob, Agent
4. Wait for completion
5. Parse findings in the `[plan-logic]` format
```

- [ ] **Step 8: Update Stage 7 REPORT**

Update the report header to be mode-aware:

```markdown
### Stage 7: REPORT

Produce the unified report. Adapt the header by mode:

**Mode: code:**
```
## Code Review Summary
```

**Mode: prd:**
```
## PRD Review Summary
```

**Mode: plan:**
```
## Plan Review Summary
```

The rest of the report format is identical across modes: Confidence
Score, Risk Level, Specialists dispatched/skipped/N/A, blocking/
major/minor groupings, specialist summary table.

For plan mode, include a "Plan Logic Review Findings" section (same
format as "Logic Review Findings" in code mode).
```

- [ ] **Step 9: Update "Adding a New Specialist" section**

Add guidance for the `stage` field:

```markdown
## Adding a New Specialist

1. Create a new `.md` file in `team/specialists/` (for team-specific)
   or `core/specialists/` (for framework)
2. Add frontmatter: `name`, `description`, `model`, `tier`, `globs`,
   `severity`
3. **For PRD/PLAN specialists**: add `stage: prd`, `stage: plan`,
   or `stage: both`
4. **For code review specialists**: omit `stage` (backward
   compatible default)
5. Write the review prompt body with: What to check, What to ignore,
   Report format
6. The orchestrator discovers it automatically on next run — no
   config updates needed
```

- [ ] **Step 10: Verify the updated skill**

Read the modified file. Confirm:
- All three modes documented (code, prd, plan)
- Stage filtering in discovery
- Document preparation for prd/plan modes
- Plan logic reviewer dispatch in plan mode
- Mode-aware report headers
- Backward compatible (code mode unchanged)
- File stays under 500 lines

- [ ] **Step 11: Commit**

```bash
git add core/skills/review/SKILL.md
git commit -m "feat(core): extend review skill with mode-based dispatch for PRD and PLAN"
```

---

## Task 11: Wire PRD skill to invoke review swarm

**Files:**
- Modify: `core/skills/prd/SKILL.md`

**Dependencies:** Task 10 (review skill supports prd mode)

- [ ] **Step 1: Read the current prd skill**

Read `core/skills/prd/SKILL.md` for current content.

- [ ] **Step 2: Add review dispatch between Step 3 (Draft) and Step 4 (Refine)**

After the existing Step 3 (Draft) section and before Step 4 (Refine), add a new step:

```markdown
### Step 3b: PRD Review Swarm

After producing the draft, invoke the review swarm to scrutinize the
requirements before the user sees them for refinement.

**Automatic dispatch**: Run the swarm for all medium-to-large
features and improvements. Skip only for clearly trivial work (config
change, single-line fix, chore with obvious scope).

**INVOKE `jig:review` using the Skill tool with mode: prd.** Pass
the PRD document path. The review skill discovers PRD specialists
(stage: prd or both), dispatches them in parallel with the full
document + section hints + codebase access, scores findings, and
returns a unified report.

Present the swarm findings to the user **alongside the draft**:

> "Here's the PRD draft. Before we refine, the review swarm found
> these concerns:"
>
> {swarm report}
>
> "Let's address these during refinement, or flag any you want to
> defer."

The user then refines the draft (Step 4) informed by both their own
review and the specialist findings.
```

- [ ] **Step 3: Update the Process section**

In the existing process list at the top, add Step 3b between steps 3 and 4. Update the numbering if needed.

- [ ] **Step 4: Verify the updated skill**

Read the modified file. Confirm:
- Review swarm invocation is between draft and refine
- Mode is explicitly `prd`
- Document path is passed
- Findings are presented before user refinement
- Automatic dispatch with trivial-work escape hatch documented
- File stays under 500 lines

- [ ] **Step 5: Commit**

```bash
git add core/skills/prd/SKILL.md
git commit -m "feat(core): wire PRD skill to invoke review swarm after draft"
```

---

## Task 12: Wire plan skill to invoke review swarm

**Files:**
- Modify: `core/skills/plan/SKILL.md`

**Dependencies:** Task 10 (review skill supports plan mode)

- [ ] **Step 1: Read the current plan skill**

Read `core/skills/plan/SKILL.md` for current content.

- [ ] **Step 2: Add review dispatch between plan draft and user approval**

After the Self-Review section and before the Execution Handoff section, add:

```markdown
## Plan Review Swarm

After self-review, invoke the review swarm to scrutinize the
implementation plan before the user approves it.

**Automatic dispatch**: Run the swarm for all medium-to-large
features and improvements. Skip only for clearly trivial work.

**INVOKE `jig:review` using the Skill tool with mode: plan.** Pass
the plan document path. The review skill discovers PLAN specialists
(stage: plan or both), dispatches them in parallel with the full
plan + PRD + section hints + codebase access. After the specialist
swarm, a plan logic reviewer (Opus) performs deep correctness
analysis. Findings are scored and returned as a unified report.

Present the swarm findings to the user **before asking for
approval**:

> "Plan written and self-reviewed. The review swarm found these
> concerns:"
>
> {swarm report — including plan logic reviewer findings}
>
> "Want to address any of these before approving the plan?"

If the user requests changes based on findings, update the plan
and re-run the self-review checklist. Do not re-run the swarm
unless the changes are substantial.
```

- [ ] **Step 3: Update the plan flow**

Ensure the flow is: Draft → Self-Review → Plan Review Swarm → User Approval → Execution Handoff. Adjust any section references to reflect the new step.

- [ ] **Step 4: Verify the updated skill**

Read the modified file. Confirm:
- Review swarm invocation is after self-review, before user approval
- Mode is explicitly `plan`
- Document path is passed
- Plan logic reviewer is mentioned (dispatched by review skill)
- Findings presented before approval
- Re-run guidance for substantial changes
- File stays under 500 lines

- [ ] **Step 5: Commit**

```bash
git add core/skills/plan/SKILL.md
git commit -m "feat(core): wire plan skill to invoke review swarm after draft"
```

---

## Dependency Graph

```
Tasks 1-9 (all independent — can execute in parallel)
  │
  ├── Task 1: Schema update
  ├── Task 2: Config update
  ├── Task 3: data-dependency specialist
  ├── Task 4: ui-conflict specialist
  ├── Task 5: blast-radius specialist
  ├── Task 6: state-completeness specialist
  ├── Task 7: task-dependency specialist
  ├── Task 8: migration-safety specialist
  └── Task 9: plan logic reviewer
  │
  ▼
Task 10: Update review skill (depends on Tasks 1-9)
  │
  ▼
Tasks 11-12 (parallel, depend on Task 10)
  ├── Task 11: Wire prd skill
  └── Task 12: Wire plan skill
```

**Parallel threshold**: 9 independent tasks in the first group → team-dev recommended.
