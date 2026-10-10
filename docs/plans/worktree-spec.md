# PRD: Core Worktree Skill

**Date:** 2026-03-31
**Author:** Dustin (with Claude)
**Status:** Draft
**Type:** Feature

---

## Problem Statement

Git worktrees have existed for a decade, but almost nobody uses them —
because creating the worktree is trivial and everything after it isn't.
Every project has its own nuances: env files that aren't in git, build
artifacts that take 10 minutes to recreate, dependency directories that
are 500MB, binaries that are gitignored. Teams figure this out once,
hardcode a script, and it breaks the moment anything changes.

With AI agents now capable of parallel development across multiple
branches, worktrees have shifted from "nice to have" to essential
infrastructure. Jig's `team-dev` and `build` skills dispatch parallel
agents, but there's no standardized way to provision isolated workspaces
for them. Each team reinvents this.

Jig needs a core worktree skill that handles the full lifecycle —
create and remove — with opinionated defaults and team-configurable
provisioning. Convention over configuration, same as everything else
in the framework.

## Target Audience

- **Primary:** Engineering teams using Jig who work on multiple features
  in parallel, either manually or via agent teams.
- **Secondary:** Individual engineers who need ad-hoc isolated workspaces
  for experiments, hotfixes, or spikes without disrupting their current
  branch.

## Solution

A single core workflow skill (`jig:worktree`) with two modes: create and
remove. The skill handles git operations directly and delegates project-
specific provisioning to configuration in `jig.config.md`.

### Create mode

Invoked as `/jig:worktree <branch-name>` or triggered by pipeline skills.

### Remove mode

Invoked as `/jig:worktree remove <name>`.

---

## Configuration

New `worktree` section in `jig.config.md`:

```yaml
worktree:
  naming: ticket-branch    # ticket | ticket-branch | branch
  sync:                     # gitignored artifacts to rsync from main tree
    - .env*                 # always included by default
    # - node_modules
    # - dist
    # - packages/router/router
  post-create:              # commands to run after worktree creation + sync
    # auto-detects package manager install if omitted
    # - pnpm install
    # - pnpm build
```

### Naming strategies

| Strategy | Directory name | Requires ticket |
|----------|---------------|-----------------|
| `ticket` | `.worktrees/jig-42/` | Yes (falls back to `branch`) |
| `ticket-branch` | `.worktrees/jig-42-worktree-skill/` | Yes (falls back to `branch`) |
| `branch` | `.worktrees/worktree-skill/` | No |

When naming is `ticket` or `ticket-branch` and no ticket ID is present
in the branch name, the skill silently falls back to `branch` strategy.

### Sync defaults

If `sync` is not specified in config, the skill provides these defaults:

- `.env*` files — always synced (secrets are never optional)
- Auto-detected dependency directories based on project type:
  - `node_modules/` if `package.json` exists
  - `vendor/` if `go.mod` or `composer.json` exists
  - `.venv/` or `venv/` if `pyproject.toml` or `requirements.txt` exists
  - `target/` if `Cargo.toml` exists

If `sync` IS specified, it becomes the source of truth — no auto-detect.
The `.env*` sync is always included regardless (non-negotiable).

### Post-create defaults

If `post-create` is not specified:

- Auto-detect package manager and run install:
  - `pnpm install` if `pnpm-lock.yaml` exists
  - `npm install` if `package-lock.json` exists
  - `yarn install` if `yarn.lock` exists
  - `pip install -r requirements.txt` / `poetry install` / etc.
  - `go mod download` if `go.mod` exists
  - `cargo build` if `Cargo.toml` exists
  - No-op if nothing detected

If `post-create` IS specified, only those commands run.

---

## Create Flow

### Step 1: Determine branch name

- **Pipeline-triggered:** Branch name is provided by the calling skill
  (e.g., `kickoff` or `build`). Derived from `jig.config.md` branching
  format.
- **Ad-hoc:** User provides branch name as argument. If no argument,
  prompt for one.

### Step 2: Determine worktree directory name

Apply naming strategy from config to derive directory name from branch.

### Step 3: Safety checks

1. Verify `.worktrees/` is in `.gitignore`. If not, add it and commit.
   Non-negotiable — prevents accidentally tracking worktree contents.
2. Check that the worktree doesn't already exist. If it does, report
   and ask whether to use the existing one or recreate.

### Step 4: Create worktree

```bash
git fetch origin main
git worktree add .worktrees/<name> -b <branch> origin/main
```

### Step 5: Sync artifacts

Rsync configured patterns from the main tree into the new worktree:

```bash
rsync -a --relative <patterns> .worktrees/<name>/
```

For `.env*` files: find all matching files up to 4 levels deep
(excluding `node_modules/` and `.worktrees/`), preserve directory
structure.

For directories like `node_modules/`: rsync the directory as-is.

### Step 6: Run post-create commands

Execute configured commands (or auto-detected install) inside the
worktree directory.

### Step 7: Report

```
✓ Worktree created at .worktrees/<name>
✓ Branch: <branch> (from origin/main)
✓ Synced: .env* files, node_modules
✓ Post-create: pnpm install (completed)

cd .worktrees/<name>
```

---

## Remove Flow

### Step 1: Identify worktree

User provides the worktree name (directory name, not branch name).
If ambiguous, list existing worktrees and ask.

### Step 2: Safety checks

1. Check for uncommitted changes. If found, warn and ask for
   confirmation before proceeding. Do not force.

### Step 3: Remove worktree

```bash
git worktree remove .worktrees/<name> --force
```

### Step 4: Offer branch cleanup

Prompt to delete the branch (local and remote):

```
Delete branch '<branch-name>'?
  - Local only
  - Local + remote
  - Keep
```

### Step 5: Report

```
✓ Worktree .worktrees/<name> removed
✓ Branch <branch> deleted (local)
Remaining worktrees: <list or "none">
```

---

## Opinions (Non-negotiable)

1. **`.worktrees/` directory, always.** No configuration, no asking,
   no global directories. Project-local, hidden, conventional.
2. **Gitignore safety.** If `.worktrees` isn't ignored, fix it before
   proceeding. Auto-commit the fix.
3. **`.env*` files always sync.** Secrets are never optional. Even if
   the user's sync config is empty, env files get copied.
4. **Warn on uncommitted changes during remove.** Never silently
   discard work.
5. **No port management.** Port killing is too project-specific for
   core. Teams handle this via `post-create` or team overrides.

## Configurable (Team territory)

1. Naming strategy (ticket / ticket-branch / branch)
2. Sync patterns beyond the defaults
3. Post-create commands
4. Anything else project-specific (port offsets, custom binaries,
   service startup scripts)

---

## Integration Points

### Called by

- `kickoff` — when a pipeline-triggered feature needs isolation
- `build` / `team-dev` — when parallel agents need isolated workspaces
- `finish` — already references worktree cleanup in its flow

### Pairs with

- `finish` — the natural end-of-lifecycle counterpart. Finish already
  handles branch completion; worktree remove handles workspace cleanup.

### Config dependencies

- `jig.config.md` branching format — used to parse ticket IDs from
  branch names for naming strategy
- `jig.config.md` worktree section — provisioning configuration

---

## Acceptance Criteria

- [ ] Skill file at `core/skills/worktree/SKILL.md` with valid
      frontmatter (name, description starting with "Use when...",
      tier: workflow, alwaysApply: false)
- [ ] Skill under 500 lines (reference/ for heavy content if needed)
- [ ] Create mode: produces a functional worktree with synced
      artifacts that can immediately run the project
- [ ] Remove mode: safely removes worktree with uncommitted change
      warning and branch cleanup offer
- [ ] Gitignore safety: auto-fixes `.gitignore` when `.worktrees`
      is not ignored
- [ ] Config schema documented: `worktree.naming`, `worktree.sync`,
      `worktree.post-create`
- [ ] Naming fallback: gracefully falls back to `branch` when ticket
      ID is not present in branch name
- [ ] Sync defaults: auto-detects dependency directories when no
      sync config provided
- [ ] Post-create defaults: auto-detects package manager when no
      post-create config provided
- [ ] `.env*` files always synced regardless of config
- [ ] Reports clear status after both create and remove
- [ ] No language-specific content in the skill body (stack-agnostic,
      per CLAUDE.md code style)
- [ ] Registered in `.claude-plugin/plugin.json` skills array
- [ ] Command file at `commands/worktree.md` for `/jig:` namespace
- [ ] Existing `finish` skill updated to reference `worktree` for
      cleanup
