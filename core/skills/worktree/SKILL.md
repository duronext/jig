---
name: worktree
description: >
  Use when creating or removing git worktrees for isolated parallel
  development. Handles provisioning of gitignored artifacts, env files,
  and post-create setup via jig.config.md configuration.
tier: workflow
alwaysApply: false
---

# Git Worktree Lifecycle

**PURPOSE**: Create and remove fully-provisioned git worktrees for
parallel development. Convention over configuration — opinionated
defaults with team-configurable provisioning.

**Announce at start:** "I'm using the worktree skill to set up an
isolated workspace." (create) or "I'm using the worktree skill to
clean up a worktree." (remove)

---

## When to Use

Invoke this skill when:
- Starting a feature/bug that needs an isolated workspace
- An ad-hoc hotfix or experiment needs a separate branch without
  disrupting current work
- Pipeline skills (`kickoff`, `build`) need isolated agent workspaces
- A worktree needs cleanup after work is complete (`finish`)
- The user says "create a worktree", "new worktree", or `/worktree`

**Do NOT use when:**
- The user just needs to switch branches (use `git checkout`)
- The work is small enough to do on the current branch
- The user explicitly wants a plain `git worktree add` without
  provisioning

---

## Configuration

Read the `worktree` section from `jig.config.md`. All fields optional.

```yaml
worktree:
  naming: branch           # ticket | ticket-branch | branch
  sync:                     # gitignored artifacts to rsync
    - .env*                 # always included regardless
    # - node_modules
    # - dist
  post-create:              # commands after create + sync
    # auto-detects install if omitted
    # - pnpm install
    # - pnpm build
```

If no `worktree` section exists, all defaults apply.

---

## Create Mode

Usage: `/jig:worktree <branch-name>` or `/jig:worktree` (prompts)

### Step 1: Determine branch name

- **If argument provided:** Use it as the branch name.
- **If triggered by pipeline:** Branch name comes from the calling
  skill (derived from `jig.config.md` branching format).
- **If no argument:** Ask the user for a branch name.

### Step 2: Derive worktree directory name

Read `worktree.naming` from config (default: `branch`).

| Strategy | Example branch | Directory |
|----------|---------------|-----------|
| `ticket` | `dustin/jig-42-worktree-skill` | `.worktrees/jig-42/` |
| `ticket-branch` | `dustin/jig-42-worktree-skill` | `.worktrees/jig-42-worktree-skill/` |
| `branch` | `dustin/jig-42-worktree-skill` | `.worktrees/jig-42-worktree-skill/` |

**Ticket extraction:** Parse the ticket ID from the branch name using
the ticket prefix in `jig.config.md` (e.g., `JIG`, `ENG`). If no
ticket prefix is configured, look for common patterns like
`[A-Z]+-[0-9]+`. If no ticket ID is found, fall back to `branch`
strategy silently.

**Branch slug:** Everything after the last `/` in the branch name.
If the branch has no `/`, use the full name.

### Step 3: Safety checks

**Gitignore verification (non-negotiable):**

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If `.worktrees` is NOT ignored:
1. Add `.worktrees/` to `.gitignore`
2. Stage and commit: `chore: add .worktrees to gitignore`
3. Then proceed

**Existing worktree check:**

If `.worktrees/<name>` already exists, ask the user:
- Use the existing worktree as-is
- Remove and recreate

### Step 4: Create the worktree

```bash
git fetch origin <main-branch>
git worktree add .worktrees/<name> -b <branch> origin/<main-branch>
```

Read `main-branch` from `jig.config.md` (default: `main`).

### Step 5: Sync artifacts

Sync gitignored artifacts from the main working tree into the new
worktree.

**What to sync — resolution order:**

1. If `worktree.sync` is configured: use that list as source of truth
2. If not configured: auto-detect based on project files

**Auto-detection** (when no sync config):

| Project file | Sync directory |
|-------------|---------------|
| `package.json` | `node_modules/` |
| `go.mod` or `composer.json` | `vendor/` (if it exists) |
| `pyproject.toml` or `requirements.txt` | `.venv/` or `venv/` (if either exists) |
| `Cargo.toml` | `target/` |
| `Gemfile` | `vendor/bundle/` (if it exists) |

**`.env*` files are ALWAYS synced**, regardless of config. Find all
env files in the main tree:

```bash
find . -maxdepth 4 \
  \( -name '.env' -o -name '.env.*' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.worktrees/*'
```

Copy each file preserving directory structure:

```bash
for f in <found-env-files>; do
  mkdir -p ".worktrees/<name>/$(dirname "$f")"
  cp "$f" ".worktrees/<name>/$f"
done
```

**For directories** (node_modules, vendor, etc.):

```bash
rsync -a <dir>/ .worktrees/<name>/<dir>/
```

### Step 6: Run post-create commands

**Resolution order:**

1. If `worktree.post-create` is configured: run those commands in
   order inside the worktree directory
2. If not configured: auto-detect and run install only

**Auto-detect install** (when no post-create config):

| Lockfile | Command |
|----------|---------|
| `pnpm-lock.yaml` | `pnpm install` |
| `package-lock.json` | `npm install` |
| `yarn.lock` | `yarn install` |
| `bun.lockb` | `bun install` |
| `go.mod` | `go mod download` |
| `Cargo.toml` | `cargo build` |
| `pyproject.toml` | `poetry install` |
| `requirements.txt` | `pip install -r requirements.txt` |
| `composer.lock` | `composer install` |
| `Gemfile.lock` | `bundle install` |

If nothing is detected, skip this step.

Run commands inside the worktree:

```bash
cd .worktrees/<name>
<command>
```

### Step 7: Report

```
✓ Worktree created at .worktrees/<name>
✓ Branch: <branch> (from origin/<main>)
✓ Synced: <list of what was synced>
✓ Post-create: <what ran> (completed)

cd .worktrees/<name>
```

---

## Remove Mode

Usage: `/jig:worktree remove <name>` or `/jig:worktree remove`

### Step 1: Identify worktree

- **If argument provided:** Use it as the worktree directory name.
- **If no argument:** Run `git worktree list`, present the list
  (excluding the main working tree), and ask which to remove.

### Step 2: Safety check

Check for uncommitted changes:

```bash
git -C .worktrees/<name> status --porcelain
```

If there are uncommitted changes:
- Show the list of changed files
- Warn the user
- Ask for explicit confirmation before proceeding
- **Never force-remove without confirmation**

### Step 3: Remove the worktree

If currently inside the worktree, navigate out first:

```bash
cd <main-working-tree>
git worktree remove .worktrees/<name> --force
```

### Step 4: Branch cleanup

Get the branch name from the worktree before removal, then offer:

```
Delete branch '<branch>'?
  1. Local only
  2. Local + remote
  3. Keep
```

Execute the chosen option:
- **Local only:** `git branch -D <branch>`
- **Local + remote:** `git branch -D <branch>` then
  `git push origin --delete <branch>`
- **Keep:** No action

### Step 5: Report

```
✓ Worktree .worktrees/<name> removed
✓ Branch <branch> deleted (local)

Remaining worktrees:
<output of git worktree list>
```

If no worktrees remain, report: `No active worktrees.`

---

## List Mode

Usage: `/jig:worktree list`

Run `git worktree list` and format the output. No side effects.

---

## Quick Reference

| Command | Action |
|---------|--------|
| `/jig:worktree <branch>` | Create provisioned worktree |
| `/jig:worktree remove <name>` | Safely remove worktree |
| `/jig:worktree list` | List active worktrees |

---

## Red Flags

**Never:**
- Create a worktree without verifying `.worktrees` is gitignored
- Remove a worktree with uncommitted changes without warning
- Delete a branch without asking
- Skip `.env*` file sync (even if sync config is empty)
- Hardcode language-specific commands — always detect or read config

**Always:**
- Read `jig.config.md` for naming, sync, and post-create config
- Fall back to `branch` naming when ticket ID can't be extracted
- Preserve directory structure when syncing env files
- Report what was synced and what commands ran
- List remaining worktrees after removal
