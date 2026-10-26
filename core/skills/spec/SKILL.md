---
name: spec
description: >
  Use when turning requirements into an enforceable technical spec before
  planning: API contract, data model, rules, UI states and a layer-tagged
  acceptance checklist. Reads a PRD (file or artifact link) when one exists.
  Triggered by "write a spec", "spec this out", "technical spec", or /spec.
tier: workflow
alwaysApply: false
---

# Spec Author

**PURPOSE**: Collaboratively author the technical spec: the enforceable contract that human reviewers and downstream AI agents (spec reviewers, team-dev quality gates) verify the build against. The PRD says *what* and *why* in plain language; the spec says *what exactly* in the system's terms.

**INPUT**: A PRD when one exists (from `prd`: a `*-prd.md` file, or a PRD artifact link whose page carries its Markdown source). Without a PRD, the spec starts from a ticket, a brainstorm summary, or the conversation.

**PRINCIPLE**: API-first. The platform contract (data model, API surface, business rules) comes before UI. Sections are ordered by platform priority, not visual priority.

**CONFIGURATION**: Reads `jig.config.md` for `ticket-system` (sync target), `plans-directory` (local save location), `spec-sync` (optional remote document sync), and the `## Concerns Checklist` (concerns to walk through).

---

## When to Use

- A PRD has been approved and engineering needs the contract before planning
- Starting a new feature or large improvement without a PRD -- capture the contract before planning
- Documenting a bug fix that touches multiple layers
- Any time you want a structured spec that downstream agents can verify against
- Invoked manually via `/spec` (optionally with a PRD path or artifact link) or by `kickoff` after the PRD stage

**Do NOT use when:** The work is a trivial config change, chore, or single-line fix with obvious scope.

---

## Tiers

Two tiers, selected by work type:

```
What type of work?
  |
  +-- feature / large improvement --> Full spec (12 sections)
  |
  +-- bug / small improvement / task --> Light spec (5 sections)
```

- **Full**: Features and large improvements. 12 sections covering API, data, logic, UI, scope, and acceptance.
- **Light**: Bugs and small improvements. 5 sections: problem, behavior, surface area, scope, acceptance.

Auto-suggest the tier from context. Ask the user to confirm.

---

## Process

### Step 1: Gather Context

Before asking the user anything, do your homework:

1. **Read the PRD** (if one exists) -- a `*-prd.md` in `{plans-directory}`, or a PRD artifact link. For a link, read the artifact and take the Markdown inside its `<script type="text/markdown" id="prd-source">` block; that is the PRD's source of truth. Note its outcome IDs (`MVP.1`, `NEXT.2`, ...), phases, open decisions, and current rev. **Spec only the phase the user is building now** (usually MVP); later phases get their own spec when their turn comes.
2. **Read the ticket** (if one exists) -- extract the problem statement, any existing requirements. Check `jig.config.md` for `ticket-system` to determine where to look.
3. **Explore the codebase** -- look at relevant entities, services, components, APIs. What exists already?
4. **Check recent plans/specs** -- scan `docs/plans/` for related prior work
5. **Search team memory** (only when it is on; see `framework/MEMORY.md`) -- decisions, root causes and traps for this feature and repo. A note may suggest an acceptance item; treat it as added scope the user must approve.

**Product implications go back to the PRD, not into the spec.** If exploring the code turns up something a product person must decide (a report that would double-count, a screen the PRD did not mention, a permission the PRD assumed), record it as an open decision on the PRD. Write it to the PRD's `decisions` and `log` as `framework/LIVE_PRD.md` describes (the artifact on a page, the file's Open decisions and Log otherwise) and tell the user.

Then ask **2-3 targeted questions** (not a form):
- What tier does this feel like? (suggest one based on context)
- Which layers are affected -- API, data model, business logic, UI? (suggest based on exploration)
- Any existing infrastructure to build on? (reference what you found)

### Step 2: Determine Tier & Load Sections

Based on the user's answers and your context gathering:
- Select Full or Light tier
- Identify which sections are relevant vs N/A for this specific work
- Use the section references below (Full Spec Sections or Light Spec Sections)

### Step 3: Draft

Produce a **complete spec draft** in one pass:

- **Known sections**: fill from context, codebase exploration, and conversation
- **Unknown sections**: flag with `TBD -- [what needs to be decided]`
- **Traceability**: when a PRD exists, end every acceptance item with the PRD outcome it serves, e.g. `(MVP.2)`. Every in-scope PRD outcome must be served by at least one item.
- **N/A sections**: mark explicitly with a one-line reason -- never silently omit
- **Acceptance checklist**: always present, with `[ ]` items tagged by layer

**Draft quality bar**: The draft should be good enough that the user is refining and correcting, not writing from scratch. Leverage what you learned in Step 1.

### Step 3b: Spec Review Swarm

After producing the draft, invoke the review swarm to scrutinize the requirements before the user refines them.

**Automatic dispatch**: Run the swarm for all medium-to-large features and improvements. Skip only for clearly trivial work (config change, single-line fix, chore with obvious scope).

**INVOKE `jig:review` using the Skill tool with mode: spec.** Pass the spec document path (and the PRD path, if one exists). The review skill discovers spec specialists (`stage: spec` or `both`), dispatches them in parallel with the full document + section hints + codebase access, scores findings, and returns a unified report.

Present the swarm findings to the user **alongside the draft**:

> "Here's the spec draft. Before we refine, the review swarm found these concerns:"
>
> {swarm report}
>
> "Let's address these during refinement, or flag any you want to defer."

The user then refines the draft (Step 4) informed by both their own review and the specialist findings.

### Step 3c: Concerns Walk-Through

After the swarm findings are presented but before refinement, walk through the `## Concerns Checklist` from `jig.config.md`.

For each concern listed:
- If marked **Yes** and mapped to a skill -> load that skill for guidance, then capture its implications as new acceptance items
- If marked **Yes** and mapped to a specialist -> note the specialist's domain; the specialist will validate during `review:spec`
- If marked **Yes** and mapped to `manual` -> add an acceptance item flagging human review
- If marked **No** or **N/A** -> record the decision with brief rationale in an "Open Questions" or "Out of Scope" section

Each `Yes` concern adds scope to the spec acceptance checklist. The user must explicitly approve added scope.

**Work type behavior:**
- Features and large improvements: full walk-through
- Bugs and small improvements: only walk through concerns flagged relevant by the swarm or user
- Tasks: skip

**If no concerns checklist is configured in `jig.config.md`**, use minimal defaults: error-handling, security, test-strategy.

See `framework/CONCERNS_CHECKLIST.md` for full configuration documentation.

### Step 4: Refine

Walk through the draft with the user:
- Resolve TBD items collaboratively
- Add details the user provides
- Remove sections the user confirms are N/A
- Iterate until the user approves

**Do NOT rush this step.** The spec is only as good as the refinement. If the user spots gaps, dig into them.

### Step 5: Save

1. **Determine the local save path** — read `plans-directory` and `filename-format` from `jig.config.md` (defaults: `docs/plans/` and `{date}-{topic}-{kind}.md`). Resolve to e.g. `docs/plans/2026-05-27-export-feature-spec.md`.
2. **Write the spec** to the resolved path. When a PRD exists, put its pointer in the header: `> **PRD:** docs/plans/YYYY-MM-DD-<topic>-prd.md` (or the artifact link) and `> **PRD rev:** C`.
3. **Check `spec-sync` in `jig.config.md`** — if set (e.g., `spec-sync: linear`), invoke the configured pack's doc-sync instructions. See the pack's README for the sync method (e.g., `packs/linear/README.md` → "Document sync").
4. **Always offer ticket sync** — "Want to also sync the acceptance checklist to the ticket description?" If yes, push it to the ticket system configured in `jig.config.md` (separate from doc sync — ticket is the issue, doc is the standalone artifact).
5. **Propose memory notes** (team memory on only; `framework/MEMORY.md`) — up to three `decision` notes, each with its own key: the contract's choices (`<repo>-<spec stem>-contract`), each concern marked No or N/A and why (`-concerns`), and Out of Scope and why (`-scope`). Save the ones the user accepts.
6. **Update the PRD** (if one exists) — append a `spec` entry to its log naming the spec path, the item count, and any decisions opened. On a page this goes to the artifact; on a plain `*-prd.md` it goes into the file. See `framework/LIVE_PRD.md`.
7. **Confirm all save locations** to the user.

---

## Full Spec Sections (12 sections)

Use for **features** and **large improvements**. Not every section applies to every spec -- mark irrelevant sections as N/A with a brief reason. Sections are ordered by platform priority: API-first, UI last.

### 1. Overview

Orient any reader in 30 seconds.

- 1-3 sentences: what is being built and why
- Links to context: PRD, ticket, walkthrough, designs (when available)
- Audience test: someone outside engineering should understand this paragraph

**Good:** "A component export feature that lets users build custom export packages, select revisions, configure output settings, and receive the export via email or direct download."

**Bad:** "We need to implement the mutation with a workflow and a new entity." (That is implementation, not requirements.)

### 2. Background & Motivation

Establish why this work matters.

- What problem exists today? Who is affected?
- What is the business or user impact of solving it?
- Any prior art, customer requests, or competitive pressure?

When a PRD exists, link to it and skip this section -- the PRD owns the why. Otherwise keep to 2-4 sentences.

### 3. API Contract

Define the interface -- this is the platform contract.

For each query, mutation, endpoint, or operation:
- **Name** and **description** of the operation
- **Input types** with field names, types, nullability, defaults
- **Return types** with field names and types
- **Auth/permission requirements** (which roles can call this?)
- **Error cases** with expected error codes and conditions

Format as a checklist for downstream verification:

> - [ ] [API] `createOrder` endpoint: accepts `CreateOrderInput`, returns `Order`
> - [ ] [API] Input field `items: [OrderItemInput!]!` -- required, non-empty array
> - [ ] [API] Error `ORDER_EMPTY_ITEMS` thrown when items is empty
> - [ ] [API] Requires `ORDER_CREATE` permission or admin role

**What good looks like:** A backend engineer can implement the endpoint from this section alone without asking clarifying questions about the contract.

### 4. Data Model

Define new or modified entities, relationships, and schema changes.

For each entity:
- **Entity name** and purpose
- **Fields** with name, type, nullability, defaults, constraints
- **Relationships** (one-to-many, many-to-many, foreign keys)
- **Indexes** worth calling out (unique constraints, frequently queried fields)
- **Migration notes** (new table vs ALTER on existing)

Format as a checklist:

> - [ ] [DATA] `Order` entity: `id`, `status` (enum), `userId` (FK), `settings` (JSON), `total` (decimal)
> - [ ] [DATA] `OrderItem` join entity: `orderId` (FK), `productId` (FK), `quantity` (int)
> - [ ] [DATA] Migration handles existing databases with data

### 5. Business Logic & Rules

Define validations, state transitions, conditional behavior, and side effects.

Cover:
- **Validations** -- what inputs are rejected and why?
- **State transitions** -- if entities have a status/lifecycle, document the state machine
- **Conditional behavior** -- "if X then Y" rules
- **Permissions** -- who can do what?
- **Side effects** -- events published, background jobs initiated, emails sent, webhooks triggered

Format as a checklist:

> - [ ] [LOGIC] Order transitions: `DRAFT` -> `SUBMITTED` -> `APPROVED` | `REJECTED`
> - [ ] [LOGIC] Only items the user has read access to can be added
> - [ ] [LOGIC] Event `order.submitted` published on submission
> - [ ] [LOGIC] Email sent to approver on submission

### 6. Entry Points & User Flows

Document how users reach this feature and what context they carry in.

Each entry path gets its own subsection:

> ### Path A -- Dashboard "New Order" Button
> - User clicks "New Order" on dashboard
> - Navigates to order creation page in **empty state**
>
> ### Path B -- Product List (Multi-select)
> - User selects products via checkboxes
> - Opens Actions menu -> "Create Order"
> - Navigates to order creation page with selected products **pre-populated**

**What good looks like:** A frontend engineer knows every route into the feature and what state/data each path carries.

### 7. UI States & Layout

Define page structure and every visual state.

Cover:
- **Page layout** -- regions, panels, sidebars, their relationship
- **States** -- empty, populated, loading, error, disabled
- Each state: what is visible, what is hidden, what is disabled, what is actionable

### 8. Component Behavior

Specify interactive behavior for each non-trivial UI component.

For each component cover:
- **Trigger** -- what initiates interaction
- **Behavior** -- what happens on interaction
- **States** -- enabled, disabled, selected, already-added
- **Defaults** -- what is selected/shown by default

Components to document: modals, forms, dropdowns, pickers, sidebars, drawers, lists with selection, drag-and-drop, toggles.

### 9. Settings & Configuration

Document every user-configurable option.

For each setting:
- **Label** -- what the user sees
- **Control type** -- dropdown, checkbox, radio, text input
- **Options** -- all available values
- **Default** -- what is selected when the user has not touched it
- **Behavior** -- what changes when the setting is toggled

### 10. Open Questions

Make unresolved decisions visible, not hidden.

Each open question should include:
- The question itself
- Enough context that someone could answer it without asking for more info
- Who might need to weigh in (if known)

Prefix each with `TBD` for scannability:

> - TBD: How are download links handled for unauthenticated users? Needs input from security team.
> - TBD: Exact polling UX for progress -- requires backend timing data to inform.

### 11. Out of Scope

Explicitly define what is NOT included in this work.

- Features deferred to future tickets (with brief reasoning)
- Adjacent features that might seem related but are not part of this effort
- "Do not build" markers for things that appear in designs but are deferred

### 12. Acceptance Checklist

The enforceable contract. Downstream agents verify every item. See the Acceptance Checklist Format section below for rules.

---

## Light Spec Sections (5 sections)

Use for **bugs**, **small improvements**, or **tasks**. Keep it concise -- a light spec should take minutes, not an hour.

### 1. Problem Statement

What is broken or suboptimal, and who is affected?

- 2-3 sentences max
- Link to: ticket, error tracker, screenshot, reproduction URL
- Be specific: "Clicking export with 0 items returns a 500" not "export is broken"

### 2. Current vs Expected Behavior

Make the gap between now and done crystal clear.

> #### Current Behavior
> What happens now. For bugs: reproduction steps. For improvements: current limitation.
>
> #### Expected Behavior
> What should happen instead. Concrete and testable.

Keep it concrete -- "clicking X shows Y" not "the experience is degraded."

### 3. Affected Surface Area

Scope the change so implementers know where to look and agents know where to verify.

- Which layers: API, database, business logic, UI
- Existing files, entities, services, components involved
- Note if the fix is isolated or has cross-cutting impact

### 4. Scope Boundaries

Prevent scope creep on what should be a focused change.

- Out of scope / do not fix in this PR
- Open questions (TBD) if any
- Keep brief -- a few bullets max

### 5. Acceptance Checklist

The enforceable contract -- same rules as the full spec. See the Acceptance Checklist Format section below.

---

## Acceptance Checklist Format

The acceptance checklist is the **enforceable contract**. Every item must be:

| Property | Rule |
|----------|------|
| **Atomic** | One verifiable behavior per checkbox |
| **Testable** | An agent can determine pass/fail by reading code or running a test |
| **Layer-tagged** | Prefixed with `[API]`, `[DATA]`, `[LOGIC]`, or `[UI]` |
| **Concrete** | "Export button disabled when list empty" not "UI works correctly" |
| **Numbered** | Starts with a sequential id, `S-1`, `S-2`, … unique across the spec, so the PRD's trace can name it |
| **Traced** | When a PRD exists, ends with the outcome it serves: `(MVP.2)` |

**Example:**

> ### API
> - [ ] S-1 [API] `createOrder` mutation accepts `items` and `settings` input (MVP.1)
> - [ ] S-2 [API] Returns `Order` with `id`, `status`, `total`
> - [ ] S-3 [API] Throws `ORDER_EMPTY_ITEMS` error when `items` is empty
>
> ### Data
> - [ ] S-4 [DATA] `Order` entity created with status, userId, settings columns
> - [ ] S-5 [DATA] Migration runs cleanly on empty and populated databases
>
> ### Logic
> - [ ] S-6 [LOGIC] Background job initiated on submission
> - [ ] S-7 [LOGIC] Only active items included when `activeOnly: true`
>
> ### UI
> - [ ] S-8 [UI] Submit button disabled when item list is empty
> - [ ] S-9 [UI] Toast shown after submission (MVP.1)

---

## Downstream Agent Consumption

Implementation plans reference the spec (and, through it, the PRD):

> **Spec:** docs/plans/YYYY-MM-DD-<topic>-spec.md
> **PRD:** docs/plans/YYYY-MM-DD-<topic>-prd.md

The `Spec` pointer tells downstream agents (spec reviewers, team-dev quality gates) where to find the acceptance checklist. They load the spec, extract the `[ ]` items, and verify each one against the implementation with file:line references. The `PRD` pointer is used by the pre-ship PRD check and by the live-PRD updates (`framework/LIVE_PRD.md`).

---

## Integration with kickoff

This skill is the **SPEC** stage in the kickoff pipeline:

```
CLASSIFY -> DISCOVER -> (PRD) -> SPEC -> PLAN -> BUILD -> REVIEW -> SHIP -> LEARN
```

- **Features**: kickoff runs `/spec` after the PRD is approved (or directly, if the user skipped the PRD)
- **Large improvements**: prompted
- **Bugs/tasks**: light spec, or skipped (invoke manually if needed)

The spec becomes the **input** to `plan`'s TRANSPOSE step. `plan` reads the spec's acceptance checklist and distills it into a build sequence. The PRD says *what* and *why*; the spec says *what exactly*; `plan` decides *how*.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Starting with UI sections | Lead with API contract and data model -- platform first |
| Vague acceptance items | Every `[ ]` must be testable. "Works correctly" is never acceptable |
| Skipping N/A sections silently | Mark them explicitly -- the absence of a section is a decision worth documenting |
| Writing implementation details | The spec captures the contract, not the task sequence. Save the *how* for planning |
| Forgetting open questions | Flag unknowns with TBD -- unresolved questions are better visible than hidden |
| Overly long specs for small work | Use the Light tier. Five focused sections beat twelve half-empty ones |
| Deciding product questions in the spec | Send them back to the PRD as open decisions with an owner |
| Speccing every PRD phase at once | Spec the phase being built now; later phases get their own spec |
| Not exploring the codebase first | The draft quality depends on context. Read the code before writing the spec |
| Hardcoding ticket system references | Read `ticket-system` from `jig.config.md` -- do not assume any particular tool |
| Acceptance items without layer tags | Every `[ ]` must be prefixed with `[API]`, `[DATA]`, `[LOGIC]`, or `[UI]` |
| "The bug is fixed" as acceptance item | Be specific: what behavior changed? What inputs produce what outputs? |

---

## Integration

**Called by:**
- `kickoff` during the SPEC stage (after PRD, before PLAN)

**Terminal state:**
- Return to `kickoff`, which proceeds to PLAN

**Related skills:**
- `prd` -- the product document this spec serves
- `plan` -- references the spec (and PRD) in the plan header for spec reviewers
- `kickoff` -- orchestrates the full pipeline including this skill

---

## Quick Reference

| Element | Rule |
|---------|------|
| Full tier | 12 sections, features and large improvements |
| Light tier | 5 sections, bugs and small improvements |
| Save location | `{plans-directory}/{filename-format}` (default: `docs/plans/YYYY-MM-DD-<topic>-spec.md`) |
| Remote sync | Optional via `spec-sync` in `jig.config.md` (pack-driven) |
| PRD trace | Each acceptance item ends with the PRD outcome it serves, e.g. `(MVP.2)` |
| Acceptance items | Atomic, testable, layer-tagged, concrete |
| Layer tags | `[API]`, `[DATA]`, `[LOGIC]`, `[UI]` |
| API-first | Platform contract before UI in section order |
| Ticket sync | Read `ticket-system` from `jig.config.md` |
