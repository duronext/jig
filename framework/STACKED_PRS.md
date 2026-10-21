# Stacked Pull Requests

How to build, change and merge a chain of dependent pull requests: PRs whose
base is another PR's branch instead of `main-branch`. Read it before opening
such a PR, and before retargeting, dropping or merging any PR in a chain.

Rules and git operations apply on every host. PR operations (create with a
base, change a base, list CI checks, find dependent PRs) are rows in
`framework/GIT_HOST.md`. GitHub's native stacks are optional and covered in the
last section.

---

## Rules

1. **Stack only true dependencies.** A PR belongs above another only if it
   needs that PR's code. Independent chains go in separate chains off
   `main-branch`, so one chain's trouble can't strand the other.
2. **Place a change above its prerequisites.** If a change needs a newer
   dependency or runtime, it lands above the PR that provides it, not below.
3. **A green upper PR proves nothing about the PRs below it.** CI for an upper
   PR runs against its parent branch and, with affected/changed-only test
   selection, tests only its own diff. Check CI on every PR in the chain
   (GIT_HOST: "List CI checks for a PR/MR").
4. **Once review starts, merge forward; don't rewrite.** See "When a lower PR
   changes".
5. **Keep a chain list in every PR body** (bottom to top, the current PR
   marked). Update every body when the chain changes.
6. **Ask first.** Committing (including a drop-PR revert), pushing (including
   the forward-merge pushes up the chain), force-pushing, closing a PR,
   unstacking and merging change what others see. Confirm each with the user
   before running it; `finish`'s rules apply.

---

## Finding the Chain

Walk the bases. A PR's base branch is the PR below it (GIT_HOST: "Find the
open PR/MR for a branch"); PRs whose base is this PR's head branch are above it
(GIT_HOST: "Find dependent PRs/MRs"). On GitHub, a PR in a native stack also
reports its stack directly (see below).

---

## Git Operations

### When a lower PR changes

**Forward merge (default once review has started).** Keeps the history
reviewers already read; no force-push.

```bash
git switch <next-branch> && git merge <lower-branch>   # repeat up the chain
git push origin <each-updated-branch…>
```

Resolve conflicts with the upper branch's semantics: it carries the newer
intent.

**Rebase (only before review, or when the team wants linear history).**
Rewrites every branch above; needs the user's approval to force-push.

If the lower branch was only appended to (git 2.38+):

```bash
git switch <top-branch>
git rebase --update-refs <lower-branch>
git push --force-with-lease origin <each-rebased-branch…>
```

If it was rewritten (amended, squashed, rebased), or on older git, rebase each
branch above in turn, bottom-up, cutting at the lower branch's old tip. A plain
rebase would replay the old commits, whose content changed, as duplicates or
conflicts. Record each branch's tip before you move it; it is the old tip for
the branch above.

```bash
# <old-lower-tip>: the lower branch before it was rewritten (git reflog <lower-branch>)
old=$(git rev-parse <next-branch>)
git rebase --onto <lower-branch> <old-lower-tip> <next-branch>
# repeat up the chain: <next-branch> is the new <lower-branch>, $old its <old-lower-tip>
git push --force-with-lease origin <each-rebased-branch…>
```

### Drop a PR from the middle

**Under review (forward only).** On the branch above it, reverse the dropped
PR's whole diff in one commit, then merge forward. This also undoes the
conflict resolutions from its forward merges, and no commit order is involved.

```bash
git switch <branch-above-dropped>
git diff <parent-branch>...<dropped-branch> | git apply -R --3way
git commit -m "Revert #<dropped-pr>: drop it from the chain"
# then merge forward up the chain, as above
```

`--3way` stages the result and leaves conflict markers where the branch above
changed the same lines; resolve them before committing.

**Before review (rewrite).** Move every branch above onto the dropped PR's
parent.

```bash
git switch <top-branch>
git rebase --update-refs --onto <parent-branch> <dropped-branch>
git push --force-with-lease origin <each-rebased-branch…>
```

Either way, then: close the dropped PR, change the base of the PR above it to
`<parent-branch>` (GIT_HOST: "Change a PR/MR's base"; on a GitHub native stack,
use the retarget flow below), and update every PR body's chain list.

### When one PR absorbs others

If a PR now carries other PRs' changes (for example, an upper chain merged into
its branch), put a review guide at the top of its description:

```markdown
## Review guide

- **Already reviewed:** #<pr>, #<pr> (merged into this branch)
- **This PR's own diff:** <repo-url>/compare/<parent-branch>...<pre-merge-sha>
- **Read closely:** <files this PR changes>
- **Skim:** <files carried in from the absorbed PRs>
```

---

## GitHub Native Stacks (optional)

GitHub groups a chain of PRs into a native stack. The `github/gh-stack`
extension manages them.

```bash
gh extension install github/gh-stack
export GH_STACK_NO_UPDATE_NOTIFIER=1   # in scripts, to keep output parseable
```

### GitHub owns a stacked PR's base

GitHub can register a native stack on its own from a chain of PR bases, even if
nobody ran `gh stack`. Once a PR is in a stack, `gh pr edit --base` and the
REST `PATCH` fail with:

```
Cannot change the base branch because the pull request is part of a stack.
```

Inspect before changing anything:

```bash
# Every stack: number, state, base, PRs bottom to top
gh api repos/{owner}/{repo}/stacks \
  --jq '.[] | {number, open, base: .base.ref, prs: [.pull_requests[].number]}'

# One PR's place in its stack: number, position, size, base (null if unstacked)
gh api repos/{owner}/{repo}/pulls/{pr} --jq .stack
```

### Create or grow a stack

```bash
# Link existing PRs, bottom to top
gh stack link --base <main-branch> <pr…>

# Append to the top of an existing stack (first argument is the stack number)
gh stack link <stack#> <new-pr>
```

Pass PR numbers. A branch-name argument is pushed and gets a PR created.

### Retarget a stacked PR

```bash
gh stack unstack <stack#>
gh pr edit <pr> --base <new-base>
gh stack link --base <bottom-base> <pr…>   # the full list, bottom to top
```

`unstack` leaves PRs that are queued for merge or have auto-merge enabled in
the stack. Disable those first.

### Merge a stack

`gh stack merge <stack#>` (or `gh stack merge <pr>` to stop at that PR) merges
the stack atomically into **the stack's base, which may not be
`main-branch`**.

One chain can end up as two stacks: the lower PRs in one stack based on
`main-branch`, the upper PRs in another stack based on a lower PR's branch.
Merging the upper stack lands all of it in that branch, and the lower PR then
carries the whole stack's diff.

Before merging, confirm there is exactly one open stack for the chain and it is
based on `main-branch`:

```bash
gh api repos/{owner}/{repo}/stacks \
  --jq '.[] | select(.open) | {number, base: .base.ref, prs: [.pull_requests[].number]}'
```

If not, merge bottom-up, one stack at a time.
