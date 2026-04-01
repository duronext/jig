---
name: init
description: >
  Use when setting up Jig in a project for the first time. Auto-detects
  the project environment, conducts a back-and-forth interview, and
  generates jig.config.md, team directory structure, and CLAUDE.md
  declaration. Triggered by "set up jig", "initialize jig", or /init.
tier: workflow
alwaysApply: false
---

# Jig Init — First-Run Setup

**PURPOSE**: Guide teams through first-run setup after installing Jig.
Auto-detect the project environment, conduct an interview one question
at a time, and generate the configuration and team extension directory.

**CONFIGURATION**: None — this skill *creates* `jig.config.md`.

---

## When to Use

- First time using Jig in a project
- "Set up Jig", "initialize Jig", "configure Jig"
- `/init` invoked directly
- After installing the Jig plugin

**Do NOT use when:**
- `jig.config.md` already exists and is correct (edit it directly)
- You only need to change one config value (edit `jig.config.md`)

---

## Reference

| Guide | Load When |
|-------|-----------|
| [Detection](./reference/detection.md) | Phase 1: running auto-detection |
| [Config Template](./reference/config-template.md) | Phase 3: generating jig.config.md |
| [Existing Project](./reference/existing-project.md) | Phase 3: handling existing files |

---

## Phase 1: Auto-Detection

**Load `reference/detection.md`** and follow its instructions to run all
detection commands.

Collect results and present a summary to the user:

```
Detected:
  git host:      {value or "(no remote found — will ask)"}
  branch:        {value or "main (default)"}
  platform:      {value or "claude (default)"}
  convention:    {value or "conventional (default)"}
  hooks:         {value or "none detected"}
```

If existing `jig.config.md` or `.claude/skills/` detected, mention them
here. See `reference/existing-project.md` for handling existing config.

Then ask: **"Does this look right? Anything to correct before we
continue?"**

Wait for confirmation or corrections. If the user corrects a value,
update the detection results before proceeding.

---

## Phase 2: Interview

Ask these questions **one at a time**. Wait for the user's response
before asking the next. Parse natural language answers and map to config
values.

### Q1: Team Name

```
What's your team name?
```

Free text. Maps to the `name` field in jig.config.md.

### Q2: Ticket System

```
Where do you track tickets?

  (a) GitHub Issues
  (b) Linear
  (c) Jira
  (d) Other
  (e) None — we don't use tickets
```

Map answers to config values:
- "GitHub Issues", "github", "a" -> `github`
- "Linear", "b" -> `linear`
- "Jira", "c" -> `jira`
- "Other", "d" -> ask what system, store as-is
- "None", "e" -> `none` (skip Q3)

### Q3: Ticket Prefix (conditional)

```
Ticket prefix? (e.g., ENG, PROJ — appears in branch names and PR
references)
```

**Skip this question if** Q2 answer was `github` or `none`. Explicitly
tell the user: "Skipping prefix — not needed for {ticket system}."

Free text. Maps to `ticket-prefix` in jig.config.md.

### Q4: Engineering Concerns

```
What engineering concerns matter to your team?
These surface during brainstorming to make sure nothing gets missed.
You can always add more later in jig.config.md.

  [ ] i18n / translations
  [ ] Analytics / event tracking
  [ ] Feature flags
  [ ] Database migrations
  [ ] Caching
  [ ] Webhooks / external notifications
  [ ] Event publishing (NATS, Kafka, etc.)
  [ ] Security / auth
  [ ] Responsive layout
```

Multi-select. The user responds naturally — "i18n, analytics, and
caching" or "the first three" or "all of them" or "none of these".

Each selected concern becomes a line in the Concerns Checklist pointing
to `manual`. Core specialists (error-handling, security) and
test-strategy are always included regardless of selection.

### Q5: Engineering Starter Pack

```
Install the engineering starter pack?
Includes: copywriting standards, logging guidance, test strategy

  (y) Yes — recommended
  (n) No — I'll add my own
```

If yes: note in the completion summary that the pack skills ship with
Jig and are available immediately.

---

## Phase 3: Generate

**Load `reference/config-template.md`** and
**`reference/existing-project.md`**.

### Build Config Context

Merge all detection results and interview answers into a single context:

| Field | Source |
|-------|--------|
| `name` | Q1 |
| `platform` | Detection (confirmed in Phase 1) |
| `git-host` | Detection (confirmed in Phase 1) |
| `ticket-system` | Q2 |
| `ticket-prefix` | Q3 (if applicable) |
| `main-branch` | Detection (confirmed in Phase 1) |
| `convention` | Detection (confirmed in Phase 1) |
| `types` | Commitlint import or default |
| `scopes` | Commitlint import or empty |
| Concerns | Q4 selections + core defaults |
| Branching format | Derived (see config-template.md) |

### Generate Files

Follow `reference/config-template.md` to generate `jig.config.md`.

Create the team directory structure:
- `team/skills/.gitkeep` (empty file)
- `team/specialists/.gitkeep` (empty file)
- `team/agents/.gitkeep` (empty file)
- `team/README.md` — locate the Jig plugin's `scaffold/team/README.md`
  by globbing for `**/jig/**/scaffold/team/README.md` in the plugin
  cache (typically `~/.claude/plugins/`), read it, and write to the
  project root. If the scaffold file can't be found, generate a
  README explaining the team extension model (skills/, specialists/,
  agents/ subdirectories, how they wire into discovery, and how to
  create them with `/jig:extend`).

Handle CLAUDE.md per `reference/existing-project.md`.

Handle existing skills migration per `reference/existing-project.md`.

### Show Summary and Get Approval

Present the full summary of everything that will be created or modified:

```
Ready to create:

  jig.config.md       — pipeline configuration
  team/skills/        — put your domain skills here
  team/specialists/   — add review specialists here
  team/agents/        — add custom agents here
  team/README.md      — extension guide
  CLAUDE.md           — {created | added Jig declaration}
```

If CLAUDE.md is being modified (not created fresh), show the diff —
what will be prepended.

If existing skills are being moved, show what moves where.

**Wait for the user's approval before writing any files.**

After approval, write all files. Then show:

```
Next steps:
  /jig:extend    — add your first team skill
  /jig:kickoff   — start working on a task
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Asking all questions at once | One question per message, always |
| Skipping detection confirmation | Always ask "does this look right?" |
| Writing files before approval | Show summary, get approval, then write |
| Silently skipping Q3 | Explicitly say why prefix is skipped |
| Overwriting existing CLAUDE.md | Prepend the declaration, preserve everything else |
| Guessing ambiguous answers | Ask to clarify, don't assume |

---

## Integration

**Called by:** Direct invocation via `/init`

**Related skills:**
- `extend` — creating team skills after init
- `kickoff` — starting the first task after init
