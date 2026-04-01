# Implementation Plan: Core Worktree Skill

**PRD:** [worktree-prd.md](./worktree-prd.md)
**Date:** 2026-03-31
**Tasks:** 5 (serial — each builds on the previous)

---

## Task 1: Skill file with create mode

**Files:**
- Create `core/skills/worktree/SKILL.md`

**What to build:**

Write the skill file with valid frontmatter:
```yaml
name: worktree
description: "Use when creating or removing git worktrees for isolated parallel development. Handles provisioning of gitignored artifacts, env files, and post-create setup."
tier: workflow
alwaysApply: false
```

The skill body covers:

**Create mode** — the full flow:
1. Parse branch name from argument or prompt for one
2. Derive worktree directory name using naming strategy
   (read `worktree.naming` from `jig.config.md`, default `branch`)
3. Safety: verify `.worktrees/` is in `.gitignore` — if not, add and
   commit before proceeding
4. Safety: check worktree doesn't already exist — if it does, ask
   whether to use existing or recreate
5. `git fetch origin <main-branch>` (read `main-branch` from
   `jig.config.md`, default `main`)
6. `git worktree add .worktrees/<name> -b <branch> origin/<main>`
7. Sync artifacts — read `worktree.sync` from config:
   - If config has sync list: rsync those patterns
   - If no config: auto-detect (`.env*` always + dependency dirs
     based on project type detection)
   - `.env*` files always synced regardless of config
   - For env files: find up to 4 levels deep, exclude
     `node_modules/` and `.worktrees/`, preserve directory structure
   - For directories: rsync as-is
8. Run post-create commands — read `worktree.post-create` from config:
   - If config has commands: run them in order inside worktree dir
   - If no config: auto-detect package manager from lockfile and
     run install
9. Report status (worktree path, branch, what was synced, what ran)

**Naming strategy logic:**
- `ticket`: extract ticket ID from branch using `jig.config.md`
  branching format regex. Fallback to `branch` if no match.
- `ticket-branch`: extract ticket ID + slugified remainder. Fallback
  to `branch` if no ticket ID found.
- `branch`: use everything after the last `/` in the branch name.

**Auto-detection table** (for when no config provided):

| File exists | Sync dir | Install command |
|-------------|----------|-----------------|
| `pnpm-lock.yaml` | `node_modules` | `pnpm install` |
| `package-lock.json` | `node_modules` | `npm install` |
| `yarn.lock` | `node_modules` | `yarn install` |
| `bun.lockb` | `node_modules` | `bun install` |
| `go.mod` | `vendor/` (if exists) | `go mod download` |
| `Cargo.toml` | `target/` | `cargo build` |
| `pyproject.toml` | `.venv/` (if exists) | `poetry install` |
| `requirements.txt` | `.venv/` (if exists) | `pip install -r requirements.txt` |
| `composer.json` | `vendor/` | `composer install` |
| `Gemfile` | `vendor/bundle` (if exists) | `bundle install` |

**Style notes:**
- Stack-agnostic language in the skill body (no "run npm" — say
  "run the detected install command")
- The auto-detection table goes in a `reference/` subdirectory if
  the skill exceeds 400 lines
- Follow existing skill conventions: PURPOSE line, announce at start,
  When to Use / Do NOT use sections, process steps, red flags

**Verify:**
- Frontmatter passes schema validation (name, description starts with
  "Use when...", tier: workflow, alwaysApply: false)
- Skill body under 500 lines
- No language-specific content in main body (detection table can
  reference specific tools)

---

## Task 2: Remove mode

**Files:**
- Edit `core/skills/worktree/SKILL.md`

**What to build:**

Add the remove flow to the existing skill:

1. Parse worktree name from argument. If not provided or ambiguous,
   run `git worktree list` and present options.
2. Check for uncommitted changes in the worktree:
   ```bash
   git -C .worktrees/<name> status --porcelain
   ```
   If dirty, warn with the list of changed files and ask for
   confirmation. Do NOT force.
3. Navigate out of the worktree if currently inside it.
4. Remove: `git worktree remove .worktrees/<name> --force`
5. Get the branch name, then offer cleanup options:
   - Delete local branch only
   - Delete local + remote branch
   - Keep branch
6. Report: what was removed, branch status, list remaining worktrees
   via `git worktree list`.

**Also add:**
- A "List worktrees" quick command: when user says `/jig:worktree list`,
  just run `git worktree list` and format the output.
- Quick reference table at the bottom mapping usage patterns to actions.

**Verify:**
- Remove flow handles: clean worktree, dirty worktree (with warning),
  worktree that doesn't exist (error message)
- Skill still under 500 lines after adding remove mode
- No destructive action without user confirmation

---

## Task 3: Plugin registration and command file

**Files:**
- Edit `.claude-plugin/plugin.json` — add `"./core/skills/worktree"`
  to `skills` array
- Create `commands/worktree.md` — command file for `/jig:worktree`

**What to build:**

**plugin.json:** Add the skill path to the skills array, after
`./core/skills/extend` (last core skill, before packs).

**commands/worktree.md:** Follow the exact format of existing command
files:
```markdown
---
description: "Create or remove git worktrees for isolated parallel development. Handles env files, dependency syncing, and project setup."
---

Use the `jig:worktree` skill to handle this request.
```

**Verify:**
- `plugin.json` is valid JSON after edit
- Command file matches format of `commands/ticket.md`
- `/jig:worktree` is discoverable in the skill list

---

## Task 4: Update finish skill for worktree integration

**Files:**
- Edit `core/skills/finish/SKILL.md`

**What to build:**

Update Step 5 (Cleanup Worktree) to reference the worktree skill:

Current behavior: finish manually runs `git worktree list` and
`git worktree remove`. This works but doesn't benefit from the
worktree skill's safety checks (uncommitted changes warning, branch
cleanup offer).

New behavior: In Step 5, add a note that if the `worktree` skill is
available, the cleanup should use `/jig:worktree remove <name>` which
handles safety checks and branch cleanup. Keep the manual fallback
for projects not using the worktree skill.

This is a small edit — add 2-3 lines referencing the worktree skill
as the preferred cleanup path, with the existing manual commands as
fallback.

**Verify:**
- Finish skill still functions identically for projects without
  worktree config
- The reference uses the correct skill name (`worktree`)
- No change to finish's options or flow — only the cleanup mechanism

---

## Task 5: Update CLAUDE.md and jig.config.md

**Files:**
- Edit `CLAUDE.md` — update inventory table (Core Skills count
  from 16 → 17, add worktree row)
- Edit `jig.config.md` — add commented-out worktree config section
  as a self-documenting example

**What to build:**

**CLAUDE.md:**
- Add `worktree` to the Core Skills table:
  `| worktree | Create/remove provisioned worktrees for parallel dev |`
- Update the skill count from "16" to "17" wherever referenced
- Update `List all skills` command output expectation if mentioned

**jig.config.md:**
- Add a commented `worktree` section showing the available options:
```yaml
## Worktree

# worktree:
#   naming: branch           # ticket | ticket-branch | branch
#   sync:
#     - .env*                # always included regardless
#   post-create: []          # auto-detects if omitted
```

This serves as documentation for Jig's own config (consumer zero)
and as a template for teams configuring their projects.

**Verify:**
- Skill count is accurate across CLAUDE.md
- Config section is commented out (Jig itself doesn't need custom
  worktree config — defaults are fine)
- No stale references to "16 skills" remain
