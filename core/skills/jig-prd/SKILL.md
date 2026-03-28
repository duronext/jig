---
name: jig-prd
description: >
  Use when capturing product requirements for features, improvements, or bugs
  before brainstorming or implementation. Triggered by "create a PRD", "capture
  requirements", "document requirements", "write a PRD", or /jig-prd.
tier: workflow
alwaysApply: false
---

# PRD Author

**PURPOSE**: Collaboratively author structured Product Requirements Documents that serve as enforceable specs for both human reviewers and downstream AI agents (spec reviewers, jig-team-dev quality gates).

**PRINCIPLE**: API-first. The platform contract (data model, API surface, business rules) comes before UI. Sections are ordered by platform priority, not visual priority.

**CONFIGURATION**: Reads `jig.config.md` for `ticket-system` (to determine where to sync the PRD) and pipeline stage overrides by work type.

---

## When to Use

- Starting a new feature or large improvement -- capture requirements before brainstorming approaches
- Documenting a bug fix that touches multiple layers
- Any time you want a structured spec that downstream agents can verify against
- Invoked manually via `/jig-prd` or prompted by `jig-kickoff` for features

**Do NOT use when:** The work is a trivial config change, chore, or single-line fix with obvious scope.

---

## Tiers

Two tiers, selected by work type:

```
What type of work?
  |
  +-- feature / large improvement --> Full PRD (12 sections)
  |
  +-- bug / small improvement / task --> Light PRD (5 sections)
```

- **Full**: Features and large improvements. 12 sections covering API, data, logic, UI, scope, and acceptance.
- **Light**: Bugs and small improvements. 5 sections: problem, behavior, surface area, scope, acceptance.

Auto-suggest the tier from context. Ask the user to confirm.

---

## Process

### Step 1: Gather Context

Before asking the user anything, do your homework:

1. **Read the ticket** (if one exists) -- extract the problem statement, any existing requirements. Check `jig.config.md` for `ticket-system` to determine where to look.
2. **Explore the codebase** -- look at relevant entities, services, components, APIs. What exists already?
3. **Check recent plans/PRDs** -- scan `docs/plans/` for related prior work

Then ask **2-3 targeted questions** (not a form):
- What tier does this feel like? (suggest one based on context)
- Which layers are affected -- API, data model, business logic, UI? (suggest based on exploration)
- Any existing infrastructure to build on? (reference what you found)

### Step 2: Determine Tier & Load Sections

Based on the user's answers and your context gathering:
- Select Full or Light tier
- Identify which sections are relevant vs N/A for this specific work
- Use the section references below (Full PRD Sections or Light PRD Sections)

### Step 3: Draft

Produce a **complete PRD draft** in one pass:

- **Known sections**: fill from context, codebase exploration, and conversation
- **Unknown sections**: flag with `TBD -- [what needs to be decided]`
- **N/A sections**: mark explicitly with a one-line reason -- never silently omit
- **Acceptance checklist**: always present, with `[ ]` items tagged by layer

**Draft quality bar**: The draft should be good enough that the user is refining and correcting, not writing from scratch. Leverage what you learned in Step 1.

### Step 4: Refine

Walk through the draft with the user:
- Resolve TBD items collaboratively
- Add details the user provides
- Remove sections the user confirms are N/A
- Iterate until the user approves

**Do NOT rush this step.** The PRD is only as good as the refinement. If the user spots gaps, dig into them.

### Step 5: Save

1. **Write the PRD** to `docs/plans/YYYY-MM-DD-<topic>-prd.md`
2. **Ask**: "Want to sync these requirements to the ticket too?"
3. If yes -- push the PRD content to the ticket system configured in `jig.config.md`
4. Confirm save locations to the user

---

## Full PRD Sections (12 sections)

Use for **features** and **large improvements**. Not every section applies to every PRD -- mark irrelevant sections as N/A with a brief reason. Sections are ordered by platform priority: API-first, UI last.

### 1. Overview

Orient any reader in 30 seconds.

- 1-3 sentences: what is being built and why
- Links to context: ticket, walkthrough, designs (when available)
- Audience test: someone outside engineering should understand this paragraph

**Good:** "A component export feature that lets users build custom export packages, select revisions, configure output settings, and receive the export via email or direct download."

**Bad:** "We need to implement the mutation with a workflow and a new entity." (That is implementation, not requirements.)

### 2. Background & Motivation

Establish why this work matters.

- What problem exists today? Who is affected?
- What is the business or user impact of solving it?
- Any prior art, customer requests, or competitive pressure?

Skip if self-evident from the Overview. Keep to 2-4 sentences.

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

## Light PRD Sections (5 sections)

Use for **bugs**, **small improvements**, or **tasks**. Keep it concise -- a light PRD should take minutes, not an hour.

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

The enforceable contract -- same rules as the full PRD. See the Acceptance Checklist Format section below.

---

## Acceptance Checklist Format

The acceptance checklist is the **enforceable contract**. Every item must be:

| Property | Rule |
|----------|------|
| **Atomic** | One verifiable behavior per checkbox |
| **Testable** | An agent can determine pass/fail by reading code or running a test |
| **Layer-tagged** | Prefixed with `[API]`, `[DATA]`, `[LOGIC]`, or `[UI]` |
| **Concrete** | "Export button disabled when list empty" not "UI works correctly" |

**Example:**

> ### API
> - [ ] [API] `createOrder` mutation accepts `items` and `settings` input
> - [ ] [API] Returns `Order` with `id`, `status`, `total`
> - [ ] [API] Throws `ORDER_EMPTY_ITEMS` error when `items` is empty
>
> ### Data
> - [ ] [DATA] `Order` entity created with status, userId, settings columns
> - [ ] [DATA] Migration runs cleanly on empty and populated databases
>
> ### Logic
> - [ ] [LOGIC] Background job initiated on submission
> - [ ] [LOGIC] Only active items included when `activeOnly: true`
>
> ### UI
> - [ ] [UI] Submit button disabled when item list is empty
> - [ ] [UI] Toast shown after submission

---

## Downstream Agent Consumption

When a PRD exists, implementation plans should reference it:

> **PRD:** docs/plans/YYYY-MM-DD-<topic>-prd.md

This pointer tells downstream agents (spec reviewers, jig-team-dev quality gates) where to find the acceptance checklist. They load the PRD, extract the `[ ]` items, and verify each one against the implementation with file:line references.

---

## Integration with jig-kickoff

This skill sits between **DISCOVER** and **BRAINSTORM** in the kickoff pipeline:

```
CLASSIFY -> DISCOVER -> REQUIREMENTS (this skill) -> BRAINSTORM -> PLAN -> ...
```

- **Features**: jig-kickoff prompts "Capture requirements with `/jig-prd`?"
- **Large improvements**: prompted
- **Bugs/tasks**: skipped (invoke manually if needed)

The PRD becomes the **input** to brainstorming. Brainstorming decides *how* to satisfy the requirements; the PRD defines *what* the requirements are.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Starting with UI sections | Lead with API contract and data model -- platform first |
| Vague acceptance items | Every `[ ]` must be testable. "Works correctly" is never acceptable |
| Skipping N/A sections silently | Mark them explicitly -- the absence of a section is a decision worth documenting |
| Writing implementation details | The PRD captures *what*, not *how*. Save the *how* for brainstorming and planning |
| Forgetting open questions | Flag unknowns with TBD -- unresolved questions are better visible than hidden |
| Overly long PRDs for small work | Use the Light tier. Five focused sections beat twelve half-empty ones |
| Not exploring the codebase first | The draft quality depends on context. Read the code before writing the spec |
| Hardcoding ticket system references | Read `ticket-system` from `jig.config.md` -- do not assume any particular tool |
| Acceptance items without layer tags | Every `[ ]` must be prefixed with `[API]`, `[DATA]`, `[LOGIC]`, or `[UI]` |
| "The bug is fixed" as acceptance item | Be specific: what behavior changed? What inputs produce what outputs? |

---

## Integration

**Called by:**
- `jig-kickoff` during the REQUIREMENTS stage (between DISCOVER and BRAINSTORM)

**Terminal state:**
- Return to `jig-kickoff`, which proceeds to BRAINSTORM

**Related skills:**
- `jig-brainstorm` -- consumes the PRD as input to design exploration
- `jig-plan` -- references the PRD in the plan header for spec reviewers
- `jig-kickoff` -- orchestrates the full pipeline including this skill

---

## Quick Reference

| Element | Rule |
|---------|------|
| Full tier | 12 sections, features and large improvements |
| Light tier | 5 sections, bugs and small improvements |
| Save location | `docs/plans/YYYY-MM-DD-<topic>-prd.md` |
| Acceptance items | Atomic, testable, layer-tagged, concrete |
| Layer tags | `[API]`, `[DATA]`, `[LOGIC]`, `[UI]` |
| API-first | Platform contract before UI in section order |
| Ticket sync | Read `ticket-system` from `jig.config.md` |
