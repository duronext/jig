---
name: jig-finish
description: >
  Use when implementation is complete, all tests pass, and you need to decide
  how to integrate the work. Guides completion of development work by verifying
  tests, presenting structured options (merge, PR, keep, discard), executing the
  choice, and cleaning up worktrees.
tier: workflow
alwaysApply: false
---

# Finishing a Development Branch

**PURPOSE**: Guide the completion of development work through a structured decision flow: verify tests pass, present clear integration options, execute the chosen option, and clean up.

**Core principle:** Verify tests -> Present options -> Execute choice -> Clean up.

**Announce at start:** "I'm using the jig-finish skill to complete this work."

---

## When to Use

Invoke this skill when:
- Implementation is complete and all tasks are done
- `jig-sdd` or `jig-team-dev` reaches the end of execution
- The user says "we're done", "let's wrap up", "finish this branch", or "/jig-finish"
- All planned tasks are implemented and tested

**Do NOT use when:**
- Tests are still failing (fix them first)
- Tasks remain in the implementation plan
- The review stage has not been completed

---

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass.**

Run the project's test suite:
```
<project-test-command>
```

**REQUIRED**: Use `jig-verify` -- run the actual command, read the output, confirm zero failures before proceeding.

**If tests fail:**
```
Tests failing (N failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Do not proceed to Step 2. Fix the failures first.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

Read `main-branch` from `jig.config.md` (default: `main`).

```bash
git merge-base HEAD <main-branch>
```

Or ask: "This branch split from `<main-branch>` -- is that correct?"

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. All tests pass. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Do not add explanation** -- keep options concise. Wait for the user's choice.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test-command>

# If tests pass, delete the feature branch
git branch -d <feature-branch>
```

**If merge conflicts occur:**
- Show the conflicts to the user
- Ask how to resolve (do not auto-resolve)
- After resolution, run tests again before completing

**If tests fail after merge:**
- Report the failures
- Ask whether to abort the merge or fix forward

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>
```

Then create the PR. Read `jig.config.md` for:
- `require-ticket-reference` -- whether to include ticket reference
- `ticket-system` -- which system to reference
- `branching.format` -- to extract ticket number from branch name

```bash
# Create PR with structured description
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

If the project has a `jig-pr` skill, defer to it for PR creation.

Then: Cleanup worktree (Step 5)

#### Option 3: Keep As-Is

Report:
```
Keeping branch <name>. Worktree preserved at <path>.
```

**Do not clean up the worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch: <name>
- All commits: <commit-list>
- Worktree at <path> (if applicable)

Type 'discard' to confirm.
```

Wait for exact confirmation. Do not proceed without it.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1, 2, and 4:**

Check if working in a worktree:
```bash
git worktree list
```

If the current directory is a worktree (not the main working tree):
```bash
# Navigate out of the worktree first
cd <main-working-tree-path>

# Remove the worktree
git worktree remove <worktree-path>
```

If the project uses a worktree management command (check `jig.config.md` or project scripts), use that instead.

**For Option 3:** Keep the worktree intact.

---

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | Yes | No | No | Yes (soft delete) |
| 2. Create PR | No | Yes | Yes (for PR updates) | No |
| 3. Keep as-is | No | No | Yes | No |
| 4. Discard | No | No | No | Yes (force delete) |

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Skipping test verification | Merge broken code, create failing PR | Always verify tests before offering options |
| Open-ended questions | "What should I do next?" is ambiguous | Present exactly 4 structured options |
| Automatic worktree cleanup | Remove worktree when user might need it | Only cleanup for Options 1 and 4 |
| No confirmation for discard | Accidentally delete work | Require typed "discard" confirmation |
| Merging without pulling latest | Merge conflicts discovered after merge | Always pull latest before merging |
| Not running tests after merge | Merge introduced regressions | Test the merged result before deleting branch |

---

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on the merged result
- Delete work without typed confirmation
- Force-push without explicit user request
- Auto-select an option without asking the user
- Clean up worktree for Option 3 (keep as-is)

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Run tests after merge (Option 1) before deleting the branch
- Check for worktree before cleanup

---

## Integration

**Called by:**
- `jig-sdd` (terminal state) -- after all tasks complete and final review passes
- `jig-team-dev` (terminal state) -- after all tasks complete and integration review passes

**Related skills:**
- `jig-verify` -- used in Step 1 to verify tests pass
- `jig-pr` -- can be used in Option 2 for more structured PR creation
- `jig-review` -- should have been completed before reaching this skill

---

## Post-Completion

After the chosen option is executed and cleanup is done, suggest:

> "Work complete. If this was a feature or complex improvement, consider running `/jig-postmortem` to capture lessons learned."

Do not auto-invoke the postmortem -- just suggest it.
