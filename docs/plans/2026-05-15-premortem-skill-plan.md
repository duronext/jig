# Premortem Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `premortem` workflow skill to Jig that runs prospective-hindsight risk analysis on a branch before PR — producing narrative failure stories at configurable time horizons plus an Accept/Mitigate/Instrument decision matrix.

**Architecture:** A new `core/skills/premortem` workflow skill orchestrates a new `mode: premortem` on the existing `review` swarm. Eight new specialists (`*-premortem.md`) produce narratives; a synthesizer (`premortem-synthesizer.md`) consolidates them. Integrates with `pr-create` (risk-signal detection), `postmortem` (predicted-vs-actual auto-diff), and `kickoff` (optional stage).

**Tech Stack:** Markdown files, YAML frontmatter, the existing Claude Code plugin format. No new runtime dependencies. Models: Opus (specialists + synthesizer).

**Spec:** `docs/plans/2026-05-15-premortem-skill-design.md`

---

## Phase Overview

- **Phase 1 — MVP (Tasks 1-16):** `/jig:premortem` runs end-to-end and produces a persisted report.
- **Phase 2 — Integration (Tasks 17-19):** Risk-signal suggestion in `pr-create`, auto-diff in `postmortem`, light hooks in `brainstorm` / `pr-respond`.
- **Phase 3 — Validation (Tasks 20-21):** Consumer-zero run against this branch's own diff; open PR.

---

## Phase 1: MVP

### Task 1: Add premortem configuration to `jig.config.md`

**Files:**
- Modify: `jig.config.md` (append new config block before the `## Worktree` section)

- [ ] **Step 1: Add the premortem config block**

Open `jig.config.md` and add the following block after the existing `## Plan Review` section:

```yaml
## Premortem

```yaml
premortem-horizons:
  bug:         ["1 week"]
  task:        ["1 week"]
  improvement: ["1 week", "6 months"]
  feature:     ["1 week", "6 months"]
  migration:   ["1 week", "1 month", "6 months", "2 years"]

premortem-swarm-tiers:
  fast-pass: []
  full: all
premortem-specialist-model: opus
premortem-synthesizer-model: opus

premortem-critical-paths:
  - "**/{checkout,billing,payment,subscription}*"
  - "**/{auth,session,oauth}*"

premortem-detectors:
  backend: [migrations, api-routes, cross-service-deps, large-diff]
  frontend: [routing, layouts, auth-ui, money-ui, build-config, flags,
             third-party-scripts, i18n, service-workers, csp,
             public-copy, a11y-primitives]
  content: [new-fetch-origin, new-storage, bundle-size, error-boundaries]
  thresholds:
    large-diff-loc: 500
    bundle-size-kb: 50
```
```

- [ ] **Step 2: Add `premortem` to the existing Concerns Checklist**

Find the `## Concerns Checklist` block in `jig.config.md`. Add this line:

```yaml
- premortem: core/skills/premortem
```

- [ ] **Step 3: Verify**

Run: `grep -A 2 "premortem-horizons" jig.config.md`
Expected: shows the horizons block with bug, task, improvement, feature, migration entries.

Run: `grep "premortem: core/skills/premortem" jig.config.md`
Expected: one matching line in the Concerns Checklist.

- [ ] **Step 4: Commit**

```bash
git add jig.config.md
git commit -m "feat(core): add premortem configuration block to jig.config.md"
```

---

### Task 2: Create `handoff-premortem` specialist

This is the pattern-setter — the simplest specialist, used as the template the other 7 follow.

**Files:**
- Create: `core/specialists/handoff-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: handoff-premortem
description: Cognitive handoff and knowledge-decay risks — 6 months out, will the next reader (or agent) understand and safely modify this code?
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Handoff Premortem

You are running a **premortem** on a code change before it merges. This is prospective hindsight — imagine the failure has already happened and write the story of why.

Your concern is **knowledge decay**. Six months from now (or sooner, in agentic teams) the original author is gone. The code must carry its own meaning. Tests must catch the kinds of regressions a new reader would introduce.

## The Frame

The diff below is about to ship. For each horizon in the "Horizons" section, imagine a future engineer (human or agent) tried to modify or rely on this code and got it wrong because the code did not tell them what they needed to know.

## What to Imagine Failing

### Acute (1-week-ish)
- The PR shipped with a non-obvious invariant the second reviewer missed.
- A subtle assumption (call order, side effect, retry semantics) is encoded only in the author's head; the first follow-up change broke it.
- A test passed because it asserted the wrong thing — the test is now codifying the bug.

### Drift (6-month-ish)
- A new engineer (or agent without conversational context) reads this file and forms a wrong mental model. They refactor and silently break behavior nobody documented.
- The README or comment references files/patterns that no longer exist.
- Test names describe behavior the code no longer has, but the tests still pass.
- The original author can't be reached and reconstructing intent takes days.

## How to Write the Narrative

For each horizon in "Horizons", write a 3–8 sentence narrative in past tense. Be concrete. Cite actual file names, function names, or decisions visible in the diff. Show the chain: the missing context → the misread → the breakage.

Use this structure:

```
### {horizon} from now...

> It is {approximate date}. {Concrete story of misunderstanding.}
> {How it surfaced.} {Why no one caught it.} {What we wish was in the code or its tests.}
```

## What to Output

If the diff contains no substantive code changes (e.g., docs-only, formatting-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon, as above.
2. Then a short list of **risks** (1–4) the narratives surfaced. Each risk:
   - **Title:** {short risk name}
   - **Horizon:** {1 week / 6 months / both}
   - **Concrete failure mode:** {one sentence}
   - **Suggested mitigation:** {one sentence}

Do not assign severity. The synthesizer will dedupe and tag.
```

- [ ] **Step 2: Verify frontmatter**

Run: `head -10 core/specialists/handoff-premortem.md`
Expected: frontmatter shows `name: handoff-premortem`, `stage: premortem`, `model: opus`, `globs: ["**/*"]`.

- [ ] **Step 3: Commit**

```bash
git add core/specialists/handoff-premortem.md
git commit -m "feat(specialists): add handoff-premortem specialist"
```

---

### Task 3: Create `frontend-premortem` specialist

**Files:**
- Create: `core/specialists/frontend-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: frontend-premortem
description: Imaginative pre-merge failure analysis for client-side code — UX, a11y, hydration, optimistic state, error states, locale, bundle health
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Frontend Premortem

You are running a **premortem** on a client-side code change before it merges. This is prospective hindsight — imagine the failure has already happened and write the story of why.

## The Frame

The diff below is about to ship. For each horizon in the "Horizons" section, imagine the user-facing experience failed and write the postmortem. Your concern is the asymmetry between dev environment and real users: clean networks, fast devices, English locale, mouse input, and the author's data — all hide failures the diff will produce in the wild.

## What to Imagine Failing

### Acute (1-week-ish)
- A flow that worked in dev silently broke on slower devices or networks.
- Optimistic state diverged from server state and we showed users wrong information.
- Hydration mismatch between SSR and CSR caused a flash of broken UI.
- A new component rendered fine but was unreachable by keyboard or screen reader.
- Locale-specific characters or RTL broke the layout for non-English users.
- An error state shows the developer's debug message because the real error path was never exercised.

### Drift (6-month-ish)
- The component accumulated edge-case branches nobody documented.
- The optimistic-update logic became a tangle nobody dares modify.
- A11y regressed because tests caught structure but not focus management.
- The new pattern was copied by 8 other components, each with the same bug.
- Bundle size crept up because the component's deps aren't tree-shaken.

## How to Write the Narrative

For each horizon, write a 3–8 sentence past-tense narrative. Reference actual file names, component names, or hooks visible in the diff.

```
### {horizon} from now...

> It is {date}. {Concrete failure story.}
> {How it was discovered — support ticket, dashboard, complaint.}
> {Why review missed it.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no client-side changes (no `.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.html`, or `.ts`/`.js` touching UI), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. A list of 1–4 **risks**. Each risk:
   - **Title**
   - **Horizon**
   - **Concrete failure mode** (one sentence)
   - **Suggested mitigation** (one sentence)
```

- [ ] **Step 2: Verify and commit**

Run: `grep -E "^name|^stage|^model" core/specialists/frontend-premortem.md`
Expected: `name: frontend-premortem`, `stage: premortem`, `model: opus`.

```bash
git add core/specialists/frontend-premortem.md
git commit -m "feat(specialists): add frontend-premortem specialist"
```

---

### Task 4: Create `backend-premortem` specialist

**Files:**
- Create: `core/specialists/backend-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: backend-premortem
description: Imaginative pre-merge failure analysis for server-side business logic — invariants, concurrency, retries, partial failures, hot paths
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Backend Premortem

You are running a **premortem** on server-side business-logic code before it merges. Imagine the failure has happened and write the story.

## The Frame

The diff is about to ship. For each horizon, imagine a backend invariant was violated under conditions dev didn't simulate, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- A retry double-processed a request because the new code path wasn't idempotent.
- A concurrent request violated a state-machine invariant nobody encoded in a constraint.
- Partial failure leaked stale state into a downstream system.
- The hot path was fine on dev data but degraded badly with real production cardinality.
- A new error path silently swallowed an exception that the caller relied on to roll back.

### Drift (6-month-ish)
- The state machine accumulated edge-case branches that compound until a corner case is unreachable from valid initial states.
- Performance degraded as data grew, but no alert exists for the relevant metric.
- The error-handling pattern propagated copy-paste through 12 callers, each repeating the same mistake.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual function names, services, or data shapes visible in the diff.

```
### {horizon} from now...

> It is {date}. {Concrete story.}
> {How it was discovered — alert, customer report, batch failure.}
> {Why the existing review and tests didn't catch it.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no server-side business-logic changes (e.g., docs-only, frontend-only, or schema-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation**
```

- [ ] **Step 2: Verify and commit**

Run: `grep -c "^stage: premortem" core/specialists/backend-premortem.md`
Expected: `1`

```bash
git add core/specialists/backend-premortem.md
git commit -m "feat(specialists): add backend-premortem specialist"
```

---

### Task 5: Create `api-premortem` specialist

**Files:**
- Create: `core/specialists/api-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: api-premortem
description: Imaginative pre-merge failure analysis for API surface — contract drift, idempotency, error codes, breaking changes, consumer assumptions
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# API Premortem

You are running a **premortem** on changes to API surface (HTTP routes, RPC handlers, GraphQL resolvers, public SDKs, protobuf) before they merge.

## The Frame

The diff is about to ship. For each horizon, imagine a consumer integration broke or codified an unintended behavior, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- Missing idempotency caused duplicate operations after a client retry.
- An ambiguous error code (or none at all) made the consumer wait, retry, or give up incorrectly.
- A change shipped as "additive" actually broke a consumer assumption (e.g., field ordering, default value, required-vs-optional).
- A new error path returns a stack trace or PII to the consumer.

### Drift (6-month-ish)
- An undocumented behavior (timing, ordering, side effect) became a contract because a consumer built on it. We now cannot change it without coordination.
- The endpoint's semantics drifted from its name as the implementation evolved, but nobody updated the API docs.
- Versioning was deferred; v1 and v2 now share code in incompatible ways.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual route paths, handler names, or schema fields visible in the diff.

```
### {horizon} from now...

> It is {date}. {Concrete story.}
> {Which consumer broke.} {How they noticed.}
> {Why review missed it.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no API-surface changes (no `/api/`, `/routes/`, `/handlers/`, `*.proto`, `*openapi*`, `/graphql/`), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation**
```

- [ ] **Step 2: Verify and commit**

```bash
git add core/specialists/api-premortem.md
git commit -m "feat(specialists): add api-premortem specialist"
```

---

### Task 6: Create `schema-premortem` specialist

**Files:**
- Create: `core/specialists/schema-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: schema-premortem
description: Imaginative pre-merge failure analysis for database schema changes — locks at scale, backfill, replication, indexes, FK orphans
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Schema Premortem

You are running a **premortem** on a database schema change before it merges. This is *imaginative* analysis on top of `migration-safety`'s deterministic checks.

## The Frame

The diff is about to ship. For each horizon, imagine the schema change caused operational pain or correctness drift, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- The migration acquired a long-lived lock and the table was unavailable for minutes during a hot period.
- The backfill ran for three days because nobody chunked it.
- A new `NOT NULL` column added without a default broke inserts from a forgotten code path.
- Replica lag caused read-after-write inconsistency for users.
- A dual-write window dropped writes because of a typo'd column name in one of the writers.

### Drift (6-month-ish)
- The index that was added is unused by the planner because the query was rewritten or the column statistics shifted.
- A column drifted away from how the app code uses it; nullable in DB, never-null in code, but no constraint enforces it.
- Foreign-key orphans accumulated because the deletion path was added but not the cascade.
- The schema is now incompatible with a downstream system's view definitions.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual table names, columns, indexes, migration filenames.

```
### {horizon} from now...

> It is {date}. {Concrete story.}
> {How it was discovered — outage, dashboard, slow query, support ticket.}
> {Why review missed it.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no schema-relevant changes (no `*/migrations/*`, `*schema*`, `*.sql`, `*/models/*`, `*/entities/*`, `*/prisma/*`), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation**
```

- [ ] **Step 2: Verify and commit**

```bash
git add core/specialists/schema-premortem.md
git commit -m "feat(specialists): add schema-premortem specialist"
```

---

### Task 7: Create `integration-premortem` specialist

**Files:**
- Create: `core/specialists/integration-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: integration-premortem
description: Imaginative pre-merge failure analysis for cross-service and mono-repo integration risk — contract drift, transitive deps, event shape changes
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Integration Premortem

You are running a **premortem** on a change that crosses service or app boundaries — explicitly through APIs/events, or implicitly through mono-repo neighbors that import this code.

## The Frame

The diff is about to ship. For each horizon, imagine a downstream consumer or sibling service broke because of a change that "looked internal," and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- A downstream service consuming our events broke because the event shape changed in a way the producer thought was additive.
- A mono-repo neighbor imports a helper from this package; the helper's signature changed and nobody ran the neighbor's tests.
- A third-party we integrate with had its own change collide with ours, and our code wasn't defensive about the new behavior.
- A package version bump pulled in a transitive change that altered behavior our code relied on.

### Drift (6-month-ish)
- Contract slowly drifted from the documented spec as both sides evolved independently.
- A transitive dependency upgrade is required for security but we can't take it without breaking our usage of an undocumented internal.
- A consumer (internal or external) built on an incidental behavior of our API, and that behavior is now a contract we can't change.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual service names, package names, or event types visible in the diff.

```
### {horizon} from now...

> It is {date}. {Concrete story.}
> {Which downstream system or repo broke.}
> {How we discovered it — failed deploy, build red on another repo, support ticket.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no cross-boundary changes (no exports, no shared package imports, no event/proto/SDK changes), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation**
```

- [ ] **Step 2: Verify and commit**

```bash
git add core/specialists/integration-premortem.md
git commit -m "feat(specialists): add integration-premortem specialist"
```

---

### Task 8: Create `observability-premortem` specialist

**Files:**
- Create: `core/specialists/observability-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: observability-premortem
description: Imaginative pre-merge failure analysis for observability gaps — logs, metrics, traces, alerts, PII, cardinality, dashboards
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Observability Premortem

You are running a **premortem** focused on a single question: *if this code fails in production, will we see it?*

## The Frame

The diff is about to ship. For each horizon, imagine the failure mode happened and was undetected for an embarrassing amount of time because the necessary telemetry didn't exist, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- A new code path silently fell into an error branch with no structured log, no metric, no trace span. The first detection signal was a customer complaint.
- The alert threshold was copy-pasted from a different metric and never fired.
- The log line at the failure point included PII (email, token, full request body), and the leak only became visible during the postmortem.
- A new dimension added to a metric exploded cardinality and our metrics provider rate-limited the service.

### Drift (6-month-ish)
- Log volumes grew silently to the point that on-call can't grep them efficiently anymore.
- Dashboards reference metric names the code stopped emitting; they look healthy because they're empty.
- A failure mode that ran for months was only ever visible in retries-per-minute, which nobody alerted on.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual code paths in the diff and *what specifically was not instrumented* there.

```
### {horizon} from now...

> It is {date}. {Concrete story of an invisible failure.}
> {How we eventually noticed.} {How long it ran undetected.}
> {What instrumentation would have caught it earlier.}
```

## What to Output

If the diff contains no substantive code changes (e.g., docs-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation** (concrete: "emit metric X", "add log line at file:line with these fields", "alert on Y > Z")
```

- [ ] **Step 2: Verify and commit**

```bash
git add core/specialists/observability-premortem.md
git commit -m "feat(specialists): add observability-premortem specialist"
```

---

### Task 9: Create `reversibility-premortem` specialist

**Files:**
- Create: `core/specialists/reversibility-premortem.md`

- [ ] **Step 1: Create the file**

```markdown
---
name: reversibility-premortem
description: Imaginative pre-merge failure analysis for one-way doors — persisted side effects, missing feature flags, external commitments
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Reversibility Premortem

You are running a **premortem** asking a single Bezos-style question: *if this change is wrong, can we cleanly undo it?*

## The Frame

The diff is about to ship. For each horizon, imagine we tried to roll back and could not, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- The change writes new persisted state with no migration plan to undo. Rollback would corrupt or orphan data.
- A new public endpoint, event, or webhook was published; consumers integrated within hours; rollback is now a breaking change.
- A feature flag was discussed but not actually wired up, so we can't disable the new behavior without redeploying.
- The migration was wrapped in code, not isolated, so reverting the code reverts the schema and breaks reads.

### Drift (6-month-ish)
- External customers built workflows on top of the new behavior. Even though we own the code, we no longer own the behavior.
- The schema change was reversible at week 1; six months of new rows make rollback infeasible.
- The "experimental" feature was never gated; usage is now in millions of records.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual code paths or persisted artifacts in the diff.

```
### {horizon} from now...

> It is {date}. {Concrete story — incident, regret, dependency surprise.}
> {Why rollback was attempted.} {Why it was not possible.}
> {What we wish we had done at merge time.}
```

After the narratives, additionally list each change in the diff classified as **one-way** vs **two-way** with a brief reason:

```
## One-way doors in this diff
| Change | Classification | Why |
|---|---|---|
| {short description} | one-way / two-way | {reason} |
```

## What to Output

If the diff is trivially reversible (e.g., docs-only, formatting-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. The one-way doors table above.
3. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation** (e.g., "ship behind feature flag", "add reverse migration", "soak for 30d before declaring stable")
```

- [ ] **Step 2: Verify and commit**

```bash
git add core/specialists/reversibility-premortem.md
git commit -m "feat(specialists): add reversibility-premortem specialist"
```

---

### Task 10: Create the premortem synthesizer

**Files:**
- Create: `core/skills/premortem/` directory
- Create: `core/skills/premortem/premortem-synthesizer.md`

- [ ] **Step 1: Create the directory and synthesizer file**

```bash
mkdir -p core/skills/premortem
```

Then create `core/skills/premortem/premortem-synthesizer.md`:

```markdown
---
name: premortem-synthesizer
description: Consolidates specialist premortem narratives into a risk register with convergence detection and Accept/Mitigate/Instrument decisions
model: opus
---

# Premortem Synthesizer

You have received N specialist premortem narratives. Each specialist imagined the launch failed at one or more horizons and wrote the failure story for their concern area. Your job is to consolidate into an actionable report.

## Your Inputs

- N specialist narratives (some may be literal `N/A`)
- The full unfiltered diff
- The horizons that were considered
- The work-type (bug / task / improvement / feature / migration)

## Convergence Detection

Two specialist narratives describe the same risk if:
- They blame the same architectural element or code path
- They predict the same observable symptom (e.g., "the webhook handler silently dropped retries")
- The framing differs (one says "knowledge decay", another says "observability gap") but the root cause is shared

When in doubt, group conservatively — false convergence is worse than missed convergence. Note all originating specialists in `Flagged by:`.

## Your Output

A markdown report with these sections, in this order:

### 1. Convergent risks
Risks raised by 2+ specialists. Use the ⚠️ icon and place them first — convergence is a strong quality signal.

### 2. Individual risks
Risks raised by exactly one specialist. Still actionable; less converged.

### 3. One-way doors identified
Pull the table from `reversibility-premortem`'s output if present. If reversibility ran but found none, write "All changes in this diff are reasonably reversible."

### 4. Open questions for the author
3–7 concrete questions. Examples: "Is the on-call team aware of the new webhook handler?" "Has the {dependent team} confirmed they're ready for the event shape change?"

For each risk in sections 1 and 2, emit:

```
#### {⚠️ if convergent, 🟡 otherwise} {title}
- **Flagged by:** {specialist names}
- **Horizon:** {1 week / 6 months / both}
- **Narrative:** {1–3 sentence consolidation of the specialist narratives — concrete, past-tense}
- **Decision needed:** ☐ Accept  ☐ Mitigate  ☐ Instrument
- **Suggested mitigation:** {what to do — concrete, file-or-system specific when possible}
```

## Tone Rules

The author is your reader. Be direct, concrete, useful.

- ❌ "Consider adding error handling."
- ✅ "Add a `webhook_retry_failed` metric and alert on `> 1%` over 5 minutes; the handler at `services/billing/stripe.ts:147` currently has no failure path."

Every risk must point at a specific code path, file, or decision in the diff. If you cannot, drop the risk — the specialist overshot.

## What to Skip

- Speculative risks unmoored from the diff
- Concerns already in the diff's tests or comments as resolved
- "Accept" recommendations dressed up as "Mitigate" (if accept is right, say accept)
```

- [ ] **Step 2: Verify**

Run: `ls core/skills/premortem/`
Expected: `premortem-synthesizer.md`

Run: `head -5 core/skills/premortem/premortem-synthesizer.md`
Expected: frontmatter with `name: premortem-synthesizer`, `model: opus`.

- [ ] **Step 3: Commit**

```bash
git add core/skills/premortem/premortem-synthesizer.md
git commit -m "feat(premortem): add premortem-synthesizer prompt"
```

---

### Task 11: Extend `review` skill with `mode: premortem`

This is the most substantive code change in the plan. The review skill currently handles `code`, `prd`, `plan` modes. We add a fourth mode that branches at Stages 5, 6, 7. Stages 1–4 work unchanged.

**Files:**
- Modify: `core/skills/review/SKILL.md`

- [ ] **Step 1: Update the "When to Use" section**

Find the `## When to Use` section in `core/skills/review/SKILL.md`. After the `### Mode: plan` block, add:

```markdown
### Mode: premortem
- `premortem` skill invokes this with `mode: premortem` after the orchestrator builds the diff
- Direct invocation via `/review` with a target horizon set is also supported
- Specialists with `stage: premortem` are dispatched; the synthesizer replaces the logic reviewer
```

Find the "Logic reviewer:" line below the modes list. Update it to:

```markdown
**Logic reviewer**: In `code` mode, dispatched for `tier: all` invocations. In `plan` mode, always dispatched after the specialist swarm. In `premortem` mode, the **premortem-synthesizer** is dispatched instead. Not dispatched in `prd` mode.
```

- [ ] **Step 2: Update Stage 1 (DISCOVER) to handle premortem stage filtering**

In `core/skills/review/SKILL.md`, find the `### Stage 1: DISCOVER Specialists` block. Find the "Filter by mode" sub-list. Add a new bullet:

```markdown
   - `mode: premortem` → include specialists where `stage: premortem`
```

Find the "Check `jig.config.md` for the appropriate tier config" section. Add:

```markdown
- `mode: premortem` → `premortem-swarm-tiers`
```

- [ ] **Step 3: Add Stage 2 (PREPARE) section for premortem mode**

In `core/skills/review/SKILL.md`, find `#### Mode: plan` under Stage 2. After that block, add:

```markdown
#### Mode: premortem

1. Receive the diff from the `premortem` skill (already built via `git diff origin/{main-branch}...HEAD`).
2. Receive the **horizons** array (e.g., `["1 week", "6 months"]`) and the **work-type** (e.g., `feature`).
3. For each matching specialist, intersect globs with changed paths. With the default `globs: ["**/*"]`, all specialists match. Build the filtered diff per specialist.
4. Build the specialist input:

```
{specialist body}

---

## Horizons

For each of the following horizons, write a narrative:
- {horizon 1}
- {horizon 2}

## Work Type

{work-type}

## Diff to Review

{filtered diff}
```
```

- [ ] **Step 4: Add Stage 3 (DISPATCH) section for premortem mode**

In `core/skills/review/SKILL.md`, find `#### Mode: plan` under Stage 3. After that block, add:

````markdown
#### Mode: premortem

For each specialist with a matching stage, spawn a parallel subagent:

```
Agent tool:
  description: "Premortem: {specialist.name}"
  model: {specialist.model from frontmatter, or premortem-specialist-model
          from config as fallback}
  prompt: |
    {specialist body}

    ---

    ## Horizons

    For each of the following horizons, write a narrative:
    {bulleted horizons}

    ## Work Type

    {work-type}

    ## Diff to Review

    {filtered diff}
```

All premortem specialists receive codebase access tools: Read, Grep, Glob.

**All matching specialists are dispatched in a single message** (parallel Agent calls).
````

- [ ] **Step 5: Update Stage 5 (DEEP REVIEW) for premortem mode**

In `core/skills/review/SKILL.md`, find `### Stage 5: DEEP REVIEW`. After the `#### Mode: plan` block, add:

````markdown
#### Mode: premortem

**Always dispatch** the **premortem-synthesizer** after the specialist swarm completes (in place of a logic reviewer):

1. Read `premortem-synthesizer.md` from `core/skills/premortem/`
2. Build the prompt:
   - The synthesizer's body
   - All specialist narratives from Stage 4 (including N/A entries — they signal which areas were clean)
   - The **full unfiltered diff** (synthesis needs cross-cutting visibility)
   - The horizons and work-type
3. Dispatch a single Agent with:
   - `model: opus` (or `premortem-synthesizer-model` from `jig.config.md`)
   - Full tool access: Read, Grep, Glob, Agent
4. Wait for the synthesizer to complete
5. Parse the output as the synthesis report (markdown block)
````

- [ ] **Step 6: Update Stage 6 (SCORE) for premortem mode**

Find `### Stage 6: SCORE`. After the existing scoring rules, add:

```markdown
**Mode: premortem** — no severity-based numeric score. Instead emit:
- **Risk count**: total number of risks in the synthesis
- **Convergence count**: number of risks flagged by 2+ specialists
- **One-way door count**: number of one-way doors identified by `reversibility-premortem`
- **N/A specialists**: count of specialists that returned literal `N/A`

These are diagnostic counts, not gates. Premortem informs; it does not block.
```

- [ ] **Step 7: Update Stage 7 (REPORT) for premortem mode**

Find `### Stage 7: REPORT`. After the existing report format, add:

````markdown
### Mode: premortem

**Header replaces the score line:**

```
## Premortem: {branch}
**Date**: YYYY-MM-DD
**Work type**: {work-type}
**Horizons**: {comma-separated horizons}
**Specialists**: N dispatched, M N/A
**Diff**: F files, +A/-D LOC
```

**Body sections** (in order):

1. `## Synthesis` — the synthesizer's full output (convergent risks, individual risks, one-way doors, open questions)
2. `## Specialist narratives` — each specialist's full narrative inside a `<details><summary>` block for collapsibility
3. `## Specialist Summary` — table with columns: Specialist, Risks, per-horizon counts

**Persist the full report** to `docs/premortems/YYYY-MM-DD-{branch-name}-premortem.md`. Print the path at the end of the terminal output. The terminal prints only sections 1 and 3 (compressed view); the file contains everything.
````

- [ ] **Step 8: Verify the file is internally consistent**

Run: `grep -n "Mode: premortem" core/skills/review/SKILL.md`
Expected: matches in Stages 1, 2, 3, 5, 6, 7 (and the When-to-Use section). At least 7 matches.

Run: `grep -c "premortem" core/skills/review/SKILL.md`
Expected: 15+ occurrences.

- [ ] **Step 9: Commit**

```bash
git add core/skills/review/SKILL.md
git commit -m "feat(review): add mode: premortem to swarm engine

Extends Stages 1, 2, 3, 5, 6, 7 with premortem-aware branches.
Stages 1-4 dispatch unchanged; stages 5-7 swap in premortem-
synthesizer, narrative report format, and risk/convergence
counts instead of a numeric severity score."
```

---

### Task 12: Create the premortem orchestrator skill

**Files:**
- Create: `core/skills/premortem/SKILL.md`

- [ ] **Step 1: Create the orchestrator SKILL.md**

```markdown
---
name: premortem
description: >
  Use when you want to imagine how a change could fail at multiple time horizons
  before it merges. Runs prospective-hindsight risk analysis: imagine the launch
  failed at 1 week and 6 months, write the postmortem, extract risks, force
  explicit Accept/Mitigate/Instrument decisions. Invokable directly via
  /jig:premortem or suggested by pr-create on risk signals.
tier: workflow
alwaysApply: false
---

# Premortem

**PURPOSE**: Run prospective-hindsight risk analysis on a branch before PR creation. Imagine the launch failed at the configured horizons; write the postmortem narratives; extract a risk register; force explicit author decisions on each risk.

**CONFIGURATION**: Reads `jig.config.md` for `premortem-horizons`, `premortem-swarm-tiers`, `premortem-specialist-model`, `premortem-synthesizer-model`, `main-branch`.

---

## When to Use

- `/jig:premortem` invoked manually
- `pr-create` detected risk signals and the author accepted the suggestion
- `kickoff` reached the optional premortem stage for a work-type configured with non-empty `premortem-horizons`

**Do NOT use when:**
- The diff is empty (no commits ahead of main)
- The work is a non-code config change (e.g., README typo)
- A premortem already exists for this branch and the diff hasn't changed since (offer to re-run explicitly)

---

## Pipeline

### Stage 1: Determine Context

1. Identify work-type:
   - From `kickoff` metadata if invoked as a stage
   - From branch name prefix otherwise (e.g., `matthew/feat-...` → `feature`)
   - Interactive prompt if ambiguous

2. Look up horizons from `jig.config.md`:
   - `premortem-horizons[work-type]`
   - If empty or undefined: confirm with the user before continuing (premortem isn't configured for this work-type).

3. Verify the branch is ahead of `main-branch`:
   ```bash
   git fetch origin
   git rev-list --count origin/{main-branch}..HEAD
   ```
   If `0`, abort with a clear message: "No commits ahead of main. Nothing to premortem."

### Stage 2: Build the Diff

```bash
git diff origin/{main-branch}...HEAD
git diff origin/{main-branch}...HEAD --name-only
```

Capture both the full diff and the list of changed paths.

### Stage 3: Dispatch via `review`

Invoke the `review` skill with:

```
mode: premortem
diff: {full diff from Stage 2}
changed-files: {list of paths}
horizons: {array from Stage 1}
work-type: {from Stage 1}
```

The `review` skill handles discover, prepare, dispatch, collect, synthesize, score, and report (see `core/skills/review/SKILL.md` — Mode: premortem branches at Stages 1, 2, 3, 5, 6, 7).

### Stage 4: Persist the Report

`review` returns the full markdown report. Write it to:

```
docs/premortems/{YYYY-MM-DD}-{branch-name}-premortem.md
```

Where `{branch-name}` is the current branch with `/` replaced by `-` for filesystem safety.

If `docs/premortems/` does not exist, create it.

### Stage 5: Surface to Author

After writing the file:

1. Print the compressed terminal view:
   - The header
   - The `## Synthesis` section (convergent + individual risks + one-way doors + open questions)
   - The `## Specialist Summary` table
   - The path to the persisted file

2. Prompt the author:
   > Want me to walk through the decisions interactively? I'll read each risk and ask Accept / Mitigate / Instrument, then write your choices back to the file.

3. If the author says yes:
   - For each risk in the synthesis:
     - Print: title, narrative, suggested mitigation
     - Ask: Accept / Mitigate / Instrument? (with optional rationale)
     - Update the file's checkbox accordingly
   - Save the updated file
   - Recap: "{N} accepted, {M} to mitigate, {K} to instrument"

4. If the author says no:
   - Print: "Edit the file directly — `pr-create` will read your decisions when you're ready."

---

## Integration Notes

### With `pr-create`
After premortem, `pr-create` reads the matching premortem file and embeds the **decision matrix** (not the full narratives) into the PR description. Reviewers see what was raised and how the author resolved it.

### With `postmortem`
When an incident postmortem runs against a merged PR, it auto-reads `docs/premortems/*-{branch}-premortem.md` and runs predicted-vs-actual diff. See `core/skills/postmortem/SKILL.md`.

### With `kickoff`
If `premortem-horizons[work-type]` is non-empty, kickoff offers premortem between REVIEW and SHIP. Skippable.

### With `brainstorm`
If `premortem` is in the concerns checklist, brainstorm flags it as a *future consideration* during design — doesn't run it.
```

- [ ] **Step 2: Verify**

Run: `grep -E "^name|^tier|^alwaysApply" core/skills/premortem/SKILL.md`
Expected: `name: premortem`, `tier: workflow`, `alwaysApply: false`.

Run: `wc -l core/skills/premortem/SKILL.md`
Expected: between 100 and 200 lines (within Jig's 500-line cap).

- [ ] **Step 3: Commit**

```bash
git add core/skills/premortem/SKILL.md
git commit -m "feat(premortem): add premortem workflow orchestrator skill"
```

---

### Task 13: Create the premortem agent

The agent is a thin invokable wrapper analogous to `code-reviewer` and `pr-reviewer`.

**Files:**
- Create: `core/agents/premortem.md`

- [ ] **Step 1: Create the agent file**

```markdown
---
name: premortem
description: >
  Use when you want a thorough premortem on the current branch before opening
  a PR. Runs the premortem swarm: specialists imagine the launch failed at
  configured horizons, the synthesizer consolidates into a risk register.
  Produces a persisted markdown report and an interactive decision walk-through.
tools: [Bash, Read, Write, Edit, Grep, Glob, Agent]
model: opus
---

You are the premortem agent. Your job is to invoke the `premortem` skill on the current branch and present the result to the user clearly.

## Steps

1. Confirm with the user: "I'll run a premortem on the current branch. This will dispatch 8 specialist agents in parallel (Opus) and synthesize their narratives. Continue?"

2. If confirmed, invoke the `premortem` skill following `core/skills/premortem/SKILL.md`.

3. After the skill returns, surface:
   - The persisted file path
   - A 2-3 sentence summary of the highest-priority risks
   - An offer to walk through the decision matrix interactively

4. If the user wants the interactive walk-through, follow Stage 5 of the premortem SKILL.

## Do Not

- Modify code in response to risks (premortem informs the author; the author decides what to mitigate)
- Re-run the premortem without explicit user request (it's expensive)
- Skip the persisted file write — the postmortem feedback loop depends on it
```

- [ ] **Step 2: Verify**

Run: `head -5 core/agents/premortem.md`
Expected: frontmatter with `name: premortem`, `model: opus`.

- [ ] **Step 3: Commit**

```bash
git add core/agents/premortem.md
git commit -m "feat(agents): add premortem agent"
```

---

### Task 14: Create the `/jig:premortem` command file

**Files:**
- Create: `commands/premortem.md`

- [ ] **Step 1: Create the command file**

```markdown
---
description: Run prospective-hindsight risk analysis on the current branch before PR
---

Use the `premortem` skill from `core/skills/premortem/SKILL.md`.

If the user provides arguments, treat them as overrides for the horizons or work-type. Otherwise, infer both from branch name and `jig.config.md`.
```

- [ ] **Step 2: Verify**

Run: `cat commands/premortem.md`
Expected: short command file with description and skill reference.

- [ ] **Step 3: Commit**

```bash
git add commands/premortem.md
git commit -m "feat(commands): add /jig:premortem command"
```

---

### Task 15: Register premortem in `plugin.json`, `CLAUDE.md`, and `framework/PIPELINE.md`

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `CLAUDE.md`
- Modify: `framework/PIPELINE.md`

- [ ] **Step 1: Add the skill and agent to `plugin.json`**

In `.claude-plugin/plugin.json`, find the `skills` array. Add `"./core/skills/premortem"` in the appropriate alphabetical-ish slot (after `postmortem`):

```json
"./core/skills/postmortem",
"./core/skills/premortem",
"./core/skills/debug",
```

Find the `agents` array. Add `"./core/agents/premortem.md"`:

```json
"agents": [
  "./core/agents/commit.md",
  "./core/agents/code-reviewer.md",
  "./core/agents/pr-reviewer.md",
  "./core/agents/premortem.md"
]
```

- [ ] **Step 2: Add premortem to the `CLAUDE.md` Core Skills table**

In `CLAUDE.md`, find the `### Core Skills` table. Add a row for premortem in the appropriate position (after `postmortem`):

```markdown
| `premortem` | Prospective-hindsight risk analysis — imagines failure at configured horizons, produces narrative + decision matrix |
```

In the `### Core Agents` table, add:

```markdown
| `premortem` | Invokes the premortem swarm and surfaces results with an interactive decision walk-through |
```

- [ ] **Step 3: Add the optional premortem stage to `framework/PIPELINE.md`**

In `framework/PIPELINE.md`, find the stage diagram (likely `DISCOVER → BRAINSTORM → PLAN → EXECUTE → REVIEW → SHIP → LEARN`). Add a note (do not break the existing diagram) describing premortem as an optional sub-stage between REVIEW and SHIP, citing `core/skills/premortem/SKILL.md` for details.

Concrete addition: append a new subsection at the end of the document:

```markdown
## Optional: Premortem (between REVIEW and SHIP)

For work-types where `premortem-horizons` is configured (default: feature, improvement, migration), `kickoff` offers an optional premortem after `review` and before `pr-create`. Premortem is non-blocking: the author can skip it or run it deliberately via `/jig:premortem`.

See `core/skills/premortem/SKILL.md` for the orchestrator and `core/skills/review/SKILL.md` for the `mode: premortem` dispatch.
```

- [ ] **Step 4: Verify**

Run: `grep -c premortem .claude-plugin/plugin.json`
Expected: `2` (one for the skill path, one for the agent path).

Run: `grep -c premortem CLAUDE.md`
Expected: at least `2` (one for the skill row, one for the agent row).

Run: `grep -A 2 "Optional: Premortem" framework/PIPELINE.md`
Expected: the section appears with the body text.

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json CLAUDE.md framework/PIPELINE.md
git commit -m "feat(core): register premortem in plugin, CLAUDE.md, and PIPELINE"
```

---

### Task 16: MVP end-to-end smoke test

At this point, `/jig:premortem` should run. Verify against a small synthetic diff before continuing.

**Files:**
- No production files modified
- Optionally create: `docs/premortems/.gitkeep` so the directory is committed

- [ ] **Step 1: Create the persisted-report directory**

```bash
mkdir -p docs/premortems
touch docs/premortems/.gitkeep
```

- [ ] **Step 2: Reload the plugin in this session**

In Claude Code, run:

```
/plugin marketplace update duronext-jig
/reload-plugins
```

This picks up the new skill, agent, and command.

- [ ] **Step 3: Run premortem against the current branch**

Run the command:

```
/jig:premortem
```

This dispatches the premortem swarm against `git diff origin/main...HEAD`. The current branch's diff is mostly design and plan markdown — most specialists should respond `N/A`.

Expected output:
- A header showing branch, date, horizons, specialist count
- A `## Synthesis` section that likely lists few or zero risks (since the diff is docs)
- A `## Specialist Summary` table with mostly `N/A` entries
- A path printed: `docs/premortems/2026-05-15-matthew-jig-premortem-skill-premortem.md`

- [ ] **Step 4: Verify the persisted file**

Run: `ls docs/premortems/`
Expected: at least one premortem file from the smoke run.

Run: `head -20 docs/premortems/*premortem-skill*.md`
Expected: well-formed header, valid markdown.

If the run succeeded and the file is well-formed, the MVP works.

- [ ] **Step 5: Commit (the .gitkeep only — the smoke-run report is not committed)**

```bash
git add docs/premortems/.gitkeep
git commit -m "chore(premortem): create docs/premortems/ for persisted reports"
```

Do **not** commit the generated premortem report from the smoke test — it's noise.

---

## Phase 2: Integration

### Task 17: Add risk-signal detectors to `pr-create`

**Files:**
- Modify: `core/skills/pr-create/SKILL.md`

- [ ] **Step 1: Add the risk-signal detection step before the "Step 0: Run the code review swarm" block**

In `core/skills/pr-create/SKILL.md`, find `### Step 0: Run the code review swarm`. Insert a new step `### Step 0a: Check for premortem-triggering risk signals` immediately before it:

````markdown
### Step 0a: Check for premortem-triggering risk signals

Before running the code review swarm, scan the diff for signals that suggest a premortem would be valuable.

Run:
```bash
git diff origin/{main-branch}...HEAD --name-only
git diff origin/{main-branch}...HEAD --stat
```

Read `premortem-detectors` and `premortem-critical-paths` from `jig.config.md`.

For each detector class, check if any changed path matches. The detectors are:

**Backend** (path globs):
- `migrations`: `**/migrations/**`, `**/*schema*`, `**/*.sql`, `**/models/**`, `**/entities/**`, `**/prisma/**`
- `api-routes`: `**/api/**`, `**/routes/**`, `**/handlers/**`, `**/*openapi*`, `**/*.proto`, `**/graphql/**`
- `cross-service-deps`: `package.json`, `go.mod`, `Cargo.toml`, `requirements*.txt`, `pyproject.toml`
- `large-diff`: total LOC changes exceed `premortem-detectors.thresholds.large-diff-loc` (default 500)

**Frontend** (path globs):
- `routing`: `**/pages/**`, `**/app/**`, `**/routes/**`, `**/middleware.{ts,js}`
- `layouts`: `**/layout*`, `**/_app.*`, `**/providers/**`, `**/{App,Root}.{tsx,jsx}`
- `auth-ui`: `**/{auth,login,signup,session,oauth}*`
- `money-ui`: `**/{checkout,billing,subscription,payment,pricing,cart}*`
- `build-config`: `**/next.config.*`, `**/vite.config.*`, `**/webpack.config.*`, `**/turbo.json`, `**/tsconfig*.json`
- `flags`: `**/feature*flag*`, `**/{flags,experiments}/**`, `**/growthbook*`, `**/launchdarkly*`, `**/statsig*`
- `i18n`: `**/i18n/**`, `**/locales/**`, `**/messages/**`
- `service-workers`: `**/sw.{ts,js}`, `**/service-worker.*`, `**/workbox*`
- `csp`: `**/{csp,headers,next.config}*`
- `public-copy`: `**/{terms,privacy,legal}*`, `**/pricing/**`
- `a11y-primitives`: `**/components/**/{modal,dialog,menu,combobox,select,form}*`

**Content-based** (grep the diff):
- `third-party-scripts`: diff lines add `<script src=` or `from "next/script"`
- `new-fetch-origin`: diff adds `fetch(` or `axios(` with a URL not previously seen
- `new-storage`: diff adds `localStorage`, `sessionStorage`, or `IndexedDB` in a file that didn't have them
- `bundle-size`: a new dependency in `package.json` exceeds `premortem-detectors.thresholds.bundle-size-kb` (default 50)
- `error-boundaries`: any file matching `**/{error,ErrorBoundary}*` changed

**Critical paths** (team-configured): match against any glob in `premortem-critical-paths`.

If **any** detector fires, prompt the author:

```
This change touches: {comma-separated detector names that fired}.
Premortem is recommended for this kind of change. Run /jig:premortem before opening the PR?
[Y/n]
```

- If the author accepts: invoke the `premortem` skill, wait for completion, then continue to Step 0 (review).
- If the author declines: log the skipped detectors as a one-line note for the PR description, then continue to Step 0.

If a premortem file exists at `docs/premortems/*-{branch}-premortem.md`, skip the prompt entirely — premortem already happened.
````

- [ ] **Step 2: Add premortem decisions to the PR body section**

Find the step that writes the PR body (search for `Write PR body` in `core/skills/pr-create/SKILL.md`). Add this instruction:

```markdown
**If a premortem file exists for this branch** (`docs/premortems/*-{branch}-premortem.md`):

1. Parse the file for the synthesis section's risks.
2. Extract any risk with a checked Accept/Mitigate/Instrument box.
3. Append a `## Premortem decisions` section to the PR body containing:
   - One bullet per decided risk: `**{title}**: {decision} — {rationale if provided}`
   - A link to the full premortem file: `Full premortem: docs/premortems/{filename}`

Do not include the full narratives — they're in the file. The PR body shows what the author *decided*.
```

- [ ] **Step 3: Verify**

Run: `grep -n "Step 0a" core/skills/pr-create/SKILL.md`
Expected: one match, before Step 0.

Run: `grep "Premortem decisions" core/skills/pr-create/SKILL.md`
Expected: at least one match in the PR-body section.

- [ ] **Step 4: Commit**

```bash
git add core/skills/pr-create/SKILL.md
git commit -m "feat(pr-create): add premortem risk-signal detection and decision embedding

Adds Step 0a before review: scans diff against backend, frontend,
content, and team-configured risk signals; suggests /jig:premortem
if any fire. When a premortem file exists for the branch, embeds
the decision matrix (not narratives) into the PR body."
```

---

### Task 18: Add predicted-vs-actual auto-diff to `postmortem`

**Files:**
- Modify: `core/skills/postmortem/SKILL.md`

- [ ] **Step 1: Add an auto-diff step at the start of postmortem's workflow**

In `core/skills/postmortem/SKILL.md`, find the `## Workflow` section. After the `Interview (detect PR from branch or ask)` line, add a new step `## Step 0.5: Read matching premortem (if exists)`:

````markdown
## Step 0.5: Read matching premortem (if exists)

After detecting the PR from branch, check for a matching premortem file:

```bash
ls docs/premortems/*-{branch}-premortem.md 2>/dev/null
```

If a file exists, read it. Capture the synthesis section's risks (title, narrative, decision).

**At the end of the postmortem report**, after the existing patterns table, append a new section `## Predicted vs Actual`:

For each risk in the premortem:
- Compare its narrative to the incident's root cause (which postmortem already extracted from review comments and incident reports).
- Classify as:
  - **HIT** — premortem predicted this exact failure mode. Note the specialist that flagged it.
  - **PARTIAL** — premortem flagged an adjacent risk; the actual cause shares the root architectural decision.
  - **MISS** — premortem did not surface this risk.
- If the actual root cause was *not* surfaced by any premortem risk, add a **specialist evolution suggestion**:

```
The actual root cause was {description}. None of the 8 premortem specialists
flagged it. The {best-fit specialist} could have caught it if its prompt
explicitly asked about {pattern}.
```

Emit the section even if all risks were misses — the data is the point.

If no premortem file exists, **skip this section entirely** (do not emit a "no premortem found" note — it's noise).
````

- [ ] **Step 2: Verify**

Run: `grep -n "Step 0.5" core/skills/postmortem/SKILL.md`
Expected: one match in the workflow section.

Run: `grep "Predicted vs Actual" core/skills/postmortem/SKILL.md`
Expected: at least one match.

- [ ] **Step 3: Commit**

```bash
git add core/skills/postmortem/SKILL.md
git commit -m "feat(postmortem): auto-diff against matching premortem file

When a premortem file exists for the merged branch, postmortem
reads it and appends a Predicted vs Actual section classifying
each premortem risk as HIT / PARTIAL / MISS against the
incident's root cause. Surfaces specialist-prompt evolution
suggestions for misses. Closes the antifragile feedback loop."
```

---

### Task 19: Add light hooks to `brainstorm` and `pr-respond`

These are small notes; full integration can come later.

**Files:**
- Modify: `core/skills/brainstorm/SKILL.md`
- Modify: `core/skills/pr-respond/SKILL.md`

- [ ] **Step 1: Add a premortem reference to brainstorm**

In `core/skills/brainstorm/SKILL.md`, find where the concerns checklist is consulted (search for "concerns checklist" or "jig.config"). Add a note:

```markdown
**If `premortem` is in the concerns checklist** and the work-type has non-empty `premortem-horizons`:

Flag premortem as a *future consideration* in the design summary:
> "When this design is implemented, run /jig:premortem before the PR — the {work-type} work-type has horizons configured."

Do not run premortem from brainstorm. Design-stage premortem is too early; the implementation hasn't taken shape.
```

- [ ] **Step 2: Add premortem-aware context to pr-respond**

In `core/skills/pr-respond/SKILL.md`, find the section that analyzes reviewer comments. Add:

```markdown
**Premortem-aware response context:**

Before drafting responses to reviewer comments, check `docs/premortems/*-{branch}-premortem.md` (if exists). For each reviewer comment, see if it maps to a known premortem risk:

- If yes AND the risk was marked **Accept**: include the author's accept rationale in the response. Example:
  > "This concern was raised in the premortem and explicitly accepted because {rationale from premortem file}. Happy to discuss if you disagree with the trade-off."

- If yes AND the risk was marked **Mitigate** or **Instrument**: note which fix/instrumentation is already planned or done.

This avoids re-litigating decisions the author already made consciously.
```

- [ ] **Step 3: Verify**

Run: `grep -c "premortem" core/skills/brainstorm/SKILL.md core/skills/pr-respond/SKILL.md`
Expected: each file has at least 1 occurrence.

- [ ] **Step 4: Commit**

```bash
git add core/skills/brainstorm/SKILL.md core/skills/pr-respond/SKILL.md
git commit -m "feat(brainstorm,pr-respond): add lightweight premortem awareness

brainstorm flags premortem as a future consideration during design
when the work-type warrants it. pr-respond reads the premortem file
to provide context for reviewer-comment responses, avoiding re-
litigation of consciously-accepted risks."
```

---

## Phase 3: Validation

### Task 20: Consumer-zero run against this branch's own diff

By the time we get here, our branch has all the implementation commits. Running `/jig:premortem` against ourselves is the most natural integration test — and it produces the first real premortem artifact.

- [ ] **Step 1: Confirm the branch is in shape**

Run: `git status`
Expected: clean working tree.

Run: `git log --oneline origin/main..HEAD | head -20`
Expected: a sequence of commits from Tasks 1-19.

- [ ] **Step 2: Reload plugins to pick up the latest changes**

```
/plugin marketplace update duronext-jig
/reload-plugins
```

- [ ] **Step 3: Run premortem with the feature work-type**

```
/jig:premortem
```

When prompted for work-type, choose `feature`. Horizons should resolve to `["1 week", "6 months"]`.

Expected:
- 8 specialists dispatched
- Each produces a narrative or `N/A`
- Synthesizer produces a risk register
- File written to `docs/premortems/2026-05-15-matthew-jig-premortem-skill-premortem.md`

- [ ] **Step 4: Read the synthesis carefully**

Open the persisted file. Read the convergent and individual risks. For each:
- Does the narrative point at a real concrete thing in the diff?
- Is the suggested mitigation actionable?
- Is the decision needed clear?

If any specialist's output is generic, vague, or unmoored from the diff, that's a specialist-prompt evolution signal. Capture it.

- [ ] **Step 5: Walk through the decision matrix**

For each risk:
- Check Accept / Mitigate / Instrument as the author of this skill (you).
- Add a one-sentence rationale where the decision is non-obvious.

Save the file.

- [ ] **Step 6: Capture specialist-prompt evolution notes**

If any specialist produced weak output during this run, add an "Evolution Notes" section at the end of the persisted file:

```markdown
## Evolution Notes (post-run, from author)

- {specialist-name}: {what was weak} — {what would sharpen the prompt}
```

These become input to the next round of improvements.

- [ ] **Step 7: Commit the artifact**

```bash
git add docs/premortems/2026-05-15-*premortem-skill-premortem.md
git commit -m "docs(premortem): add consumer-zero premortem for this branch

Generated by running /jig:premortem against the branch that
introduces the premortem skill. Decisions filled in. Evolution
notes captured for any specialists whose output was weak."
```

---

### Task 21: Open the PR

- [ ] **Step 1: Run review one more time**

```
/review
```

Address any blocking or major findings.

- [ ] **Step 2: Run pr-create**

```
/pr-create
```

`pr-create` should:
- Detect the persisted premortem file
- Embed the decision matrix in the PR body
- Skip the premortem-suggestion prompt (premortem already happened)

- [ ] **Step 3: Verify the PR body**

The PR description should include:
- A `## Summary` section
- A `## Test plan` section
- A `## Premortem decisions` section linking to the persisted file
- The Co-Authored-By line if configured

- [ ] **Step 4: Confirm the PR is open**

Run: `gh pr view --json url,state,title`
Expected: state `OPEN`, title matches the conventional-commit format.

---

## Self-Review Notes

**Spec coverage:** Every Goals item maps to tasks:
- Goal 1 (catch failure modes review misses) → Tasks 2–10 (specialists) + Task 11 (synthesizer integration)
- Goal 2 (force explicit decisions) → Task 12 (orchestrator Stage 5 interactive walk-through) + Task 17 (pr-create decision embedding)
- Goal 3 (postmortem feedback loop) → Task 18 (auto-diff)
- Goal 4 (align with existing review swarm) → Task 11 (mode: premortem)

**Phase boundaries:** Phase 1 ships a working premortem. Phase 2 adds the integration polish. Phase 3 is validation only. The MVP at Task 16 is independently shippable if Phase 2 needs to wait.

**Known plan risks:**
1. Task 11 is the largest task — extending review's SKILL.md with 5-stage mode branches. If it grows too big in practice, split Stages 1-3 (additive) from Stages 5-7 (mode-aware overrides) into two commits within the same task.
2. The smoke test in Task 16 runs against a docs-only diff, which means most specialists return `N/A`. That's a *correct* test outcome but it doesn't exercise the synthesizer fully. Task 20 (consumer-zero against our own diff) is the real end-to-end validation.
3. The interactive decision walk-through (Task 12 Stage 5) assumes the agent can read user responses inline. If the platform variant doesn't support that cleanly, the fallback is "edit the file manually and re-run pr-create" — that path works without any code change.
