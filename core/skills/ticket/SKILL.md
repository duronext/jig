---
name: ticket
description: >
  Use when creating a ticket, filing an issue, or opening a task in your team's
  tracker. Triggered by "create a ticket", "file an issue", "new ticket",
  "open a ticket", or /jig:ticket. Reads ticket-system from jig.config.md
  and routes to the appropriate tracker pack.
tier: workflow
alwaysApply: false
---

# Ticket Creator

**PURPOSE**: Create well-written tickets that clearly describe a problem or need — not the solution — for an audience that includes engineering, customer success, and leadership.

**CONFIGURATION**: Reads `jig.config.md` for `ticket-system` (linear, github, jira), `ticket-prefix`, and `branching.format`.

---

## The Key Distinction: Ticket vs PR

| | Ticket | Pull Request |
|---|---|---|
| **What it is** | The problem / the need | The solution |
| **Audience** | Engineering, CS, leadership, PMs | Engineers and reviewers |
| **Frame it as** | "We need X because Y" | "Here's what changed and why" |
| **Acceptance criteria** | What done looks like | What was verified |

A ticket describes **what needs to happen**, not how it was done. Even for retroactive tickets (created after the work), frame the description around the problem that existed, not the code that was written.

---

## Workflow

### Step 1: Read Configuration

Read `jig.config.md` for:
- `ticket-system` — which tracker to use (linear, github, jira)
- `ticket-prefix` — the prefix for ticket identifiers (ENG, PROJ, etc.)
- `branching.format` — how to name the branch after ticket creation

Then load the tracker-specific pack from `packs/{ticket-system}/` for tool calls and field mapping. If no pack exists for the configured system, fall back to asking the user to create the ticket manually and provide the URL.

### Step 2: Gather Context

Check if there's relevant session context. Use it to pre-fill the interview — don't ask for things you already know.

```bash
git rev-parse --abbrev-ref HEAD   # current branch
git log main..HEAD --oneline      # commits if work is in progress
```

### Step 3: Interview the User

Ask only what you don't already know. Keep it conversational — one question at a time if needed, but batch the obvious ones.

**Always ask:**
- Title (if not obvious from context)
- Issue type (Feature / Improvement / Bug / Task / Refactor)
- Estimate (if the tracker supports it)

**Offer to fill in:**
- Description (draft from context, let them approve or edit)
- Assignee (optional — ask who to assign, or leave unassigned)
- Priority (if the tracker supports it)

**Retroactive tickets:** When work is already done in the session, use that context to write the ticket, but frame it as the *problem that existed*, not the code that was written.

### Step 4: Write the Description

Plain language. Broad audience. Problem-first.

```markdown
## Overview

{1-2 sentences. What is the need or problem? Who does it affect?}

## Background

{Why does this matter? What breaks or is missing without it? Skip if self-evident.}

## Acceptance Criteria

- {Concrete, testable statement of what "done" looks like}
- {Another criterion}
- {Another criterion}
```

**Voice & tone:**
- Short paragraphs. Plain language. No jargon.
- Write for CS and leadership, not just engineers.
- Lead with the *why*, not the *how*.
- Banned: "leverages", "streamlines", "enhances", "improves the overall experience".
- Be specific about impact. "Users can't export" beats "export functionality is broken".

### Step 5: Create the Ticket

Route to the configured ticket system. Each tracker pack provides the specific tool calls and field mapping.

**Linear** (via `packs/linear/`):
- Uses Linear MCP tools (`mcp__linear-server__save_issue`)
- Maps issue types to label IDs
- Returns `gitBranchName` for branch creation

**GitHub Issues** (via `packs/github-issues/`):
- Uses `gh issue create --title "..." --body "..." --label "..."`
- Maps issue types to GitHub labels
- Branch name derived from issue number

**Jira** (via `packs/jira/`):
- Uses Jira MCP or REST API
- Maps issue types to Jira issue types
- Branch name derived from issue key

### Step 6: Branch Setup

After creating the ticket, set up the branch:

1. Read `branching.format` from `jig.config.md`
2. If the tracker provides a branch name (Linear's `gitBranchName`), use it directly
3. Otherwise, construct from format: `{username}/{prefix}-{number}-{kebab-title}`
4. Create or rename the branch:

```bash
# On main — create and switch:
git checkout -b {branch-name}

# On a feature branch without ticket reference — rename:
git branch -m {current-branch} {branch-name}
```

Run the appropriate command automatically — don't just suggest it.

### Step 7: Return the Result

Report back:
- Ticket URL and identifier (e.g., `ENG-1234`)
- Branch name (created or renamed)
- Offer: "Want to start working on this with `/jig:kickoff`?"

---

## Quick Reference

| Field | Rule |
|-------|------|
| Title | Clear noun phrase. "Export button crash on empty list" not "Fix export" |
| Description | Problem-first. Plain language. Acceptance criteria at the bottom. |
| Issue type | Always set. Feature = new, Improvement = better, Bug = broken, Task = chore |
| Assignee | Optional. Ask who; leave unassigned if no answer. |
| Estimate | If tracker supports it. Suggest based on scope. |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Describing the solution in the ticket | Describe the problem. The PR describes the solution. |
| Engineering jargon in overview | Write it so CS could read it without explanation |
| Skipping acceptance criteria | Always include — they're how you know the work is done |
| Creating ticket without setting up branch | Always offer branch creation after ticket is filed |
| Forgetting issue type | Always required — it's the primary classification |

---

## Integration

**Called by:**
- `kickoff` during the DISCOVER stage (when no ticket exists)
- Users directly via `/jig:ticket`

**Related:**
- `kickoff` — the full pipeline that may invoke this during discovery
- `pr-create` — references the ticket in the PR body
- `commit` — references the ticket in commit messages
