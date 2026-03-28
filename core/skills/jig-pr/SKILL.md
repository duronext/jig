---
name: jig-pr
description: >
  Use when creating a GitHub pull request or responding to PR review comments.
  Two modes: create (analyzes branch, writes description, pushes) and respond
  (fetches comments, implements fixes, replies, resolves threads). Triggered by
  "create a PR", "respond to PR comments", or /jig-pr.
tier: workflow
alwaysApply: false
---

# Pull Request Manager

**PURPOSE**: Ship code through pull requests. Two modes: **create** builds the PR from branch analysis; **respond** processes reviewer feedback into fixes, replies, and resolved threads.

**CONFIGURATION**: Reads `jig.config.md` for `ticket-system`, `ticket-prefix`, `branching.format`, `require-ticket-reference`, and `main-branch`.

---

## When to Use

**Create mode:**
- "Create a PR", "open a pull request", "/jig-pr create"
- `jig-kickoff` routes here during the SHIP stage
- `jig-finish` Option 2 (Push and Create PR)

**Respond mode:**
- "Respond to PR comments", "address review feedback", "/jig-pr respond"
- After receiving code review notifications

---

## Mode: CREATE

### Workflow

```
Run jig-review (code review swarm)
  |
  +-- blocking/major issues? --> Fix issues first, re-run
  |
  +-- clean/minor --> Gather context
                        |
                        Detect ticket from branch
                        |
                        Analyze ALL commits
                        |
                        Group changes by theme
                        |
                        Determine test plan items
                        |
                        Write PR body
                        |
                        Push + create PR
```

### Step 0: Run the code review swarm

**Before writing the PR, run `jig-review` to catch issues while they are cheap to fix.**

The swarm dispatches parallel specialist agents and produces a confidence score. If blocking or major issues are found, fix them first -- do not create a PR that reviewers will flag.

- **Score 8+**: Proceed to Step 1.
- **Score 5-7**: Review the major findings. Fix what is real, acknowledge what is intentional, then proceed.
- **Score 4 or below**: Blocking issues found. Fix them before creating the PR.

If the swarm was already run earlier in the session (e.g., during `jig-team-dev` quality gates), you can skip re-running it -- just confirm no new changes were made since the last review.

### Step 1: Gather context

Run these in parallel:

```bash
# Current state
git status

# All commits since divergence from base branch
git log {main-branch}..HEAD --oneline

# Full diff against base
git diff {main-branch}...HEAD --stat

# Check remote tracking
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

Read `main-branch` from `jig.config.md` (default: `main`).

### Step 2: Detect ticket reference

Check the branch name for a ticket reference. Read `jig.config.md` for:
- `ticket-system` -- which system (GitHub Issues, Linear, Jira, etc.)
- `ticket-prefix` -- the prefix pattern to look for (e.g., `ENG`, `PROJ`, `GH`)
- `branching.format` -- to understand where the ticket number appears in the branch name

**Examples of ticket detection by system:**

| System | Branch Pattern | PR Reference |
|--------|---------------|--------------|
| GitHub Issues | `user/gh-42-fix-login` | `Fixes #42` |
| Linear | `user/eng-1234-add-export` | `Fixes ENG-1234` |
| Jira | `user/proj-567-update-api` | `Fixes PROJ-567` |

If `require-ticket-reference` is `true` in `jig.config.md` and no ticket is detected, warn the user before proceeding.

### Step 3: Analyze changes

Read through ALL commits -- not just the latest. Group them by theme:
- What is the headline change?
- What supporting changes were made?
- Were there any test, translation, or config changes?

**Analyze every commit.** A PR with 12 commits needs all 12 examined. Do not summarize based on the latest commit alone.

### Step 4: Determine test plan

Select the appropriate checkboxes based on what changed:

| Change type | Test plan items |
|-------------|----------------|
| UI components, styling, layout | Manual verification, Screenshots |
| Business logic, API, data flow | Automated tests, Manual verification |
| New API endpoints/queries/mutations | Automated tests, Manual verification |
| Translation keys only | Automated tests |
| Docs, typos, comments only | No testing required |
| Database migrations | Automated tests, Manual verification |
| Config, CI, build changes | Automated tests |

Add **context-specific items** when applicable:
- `Tested in dark mode / light mode` (for theme-sensitive UI)
- `Verified responsive behavior` (for layout changes)
- `Tested with empty state / loaded state` (for data-dependent views)
- `Verified backward compatibility` (for API changes)
- `Tested error states` (for error handling changes)

### Step 5: Write the PR

**Title**: Follow the project's commit convention from `jig.config.md` (e.g., `type(scope): description`), under 70 chars.

**Body**: Use this structure:

```markdown
## Summary

{2-4 sentences. What changed and why -- in plain language. This is the part
reviewers read first, so make it count. If there is a ticket, mention what
it asked for and how this addresses it.}

## Changes

- **{Theme}**: {What changed}. {Brief why if non-obvious.}
- **{Theme}**: {What changed}.
- **{Theme}**: {What changed}.

## Test plan

- [ ] Automated tests (Unit/Integration) passed
- [ ] Manual verification (Screenshots attached if UI)
- [ ] No testing required (Docs/Typos only)

{Context-specific items from Step 4, if any}

Fixes {TICKET-REFERENCE}
```

### Step 6: Push and create

```bash
# Push with upstream tracking
git push -u origin HEAD

# Create PR with HEREDOC for body formatting
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
## Summary

...

## Changes

...

## Test plan

...

Fixes TICKET-REF
EOF
)"
```

Return the PR URL when done.

---

## Voice & Tone (for PR descriptions)

Write like you are talking to a smart colleague. Not a press release, not a commit log.

- **Short paragraphs.** Often single sentences. Let the whitespace work.
- **Lead with what changed**, not how you got there. Reviewers care about the destination.
- **Be honest about scope.** A 3-file fix is a 3-file fix. Do not inflate it.
- **Em dashes for rhythm** -- parenthetical asides for color (when earned).
- **Zero corporate speak.** Banned: "enhances", "streamlines", "leverages", "improves the overall experience". If it sounds like a changelog generator wrote it, rewrite it.

### Good summary -- feature

> Adds webhook delivery for component update events. When a component is modified, the system publishes an event that the webhook service picks up and delivers to registered endpoints with exponential backoff retry.

### Good summary -- bug fix

> Fixes a race condition where the auth token could expire mid-request during long-running mutations. The refresh now happens preemptively when the token is within 30 seconds of expiry.

### Good summary -- redesign

> Redesigns the library dashboard with a two-column fixed+scroll layout. The left column pins quick actions in place while the right column scrolls through activity cards. Stat strip replaces the hero cards, charts are gone, and everything got the monotone treatment.

### Bad summary -- do not do this

> This PR enhances the dashboard experience by streamlining the layout and improving the overall visual hierarchy to provide a more intuitive user interface.

That tells the reviewer nothing. What actually changed? Which files? Why?

---

## Mode: RESPOND

### Mission

**Analyze. Fix. Commit. Push. Reply. Resolve.** Every unresolved PR comment thread should end this session resolved.

```
FETCH unresolved comments + thread IDs
  |
ANALYZE each comment (valid fix? false positive? needs clarification?)
  |
For unclear ones --> ASK the user (this should be rare)
  |
IMPLEMENT code fixes for valid feedback
  |
BUILD + TEST to verify nothing broke
  |
COMMIT the fixes
  |
PUSH to remote
  |
REPLY to each comment on GitHub
  |
RESOLVE every addressed thread
```

**The pipeline is not optional.** Do not stop after implementing fixes. Do not stop after committing. The job is not done until replies are posted and threads are resolved on GitHub. A comment without a reply and resolution is unfinished work.

### Decision Rules

Most comments have obvious solutions. Act on them directly:

| Comment Type | Action |
|-------------|--------|
| Valid bug / missing guard | Fix it, reply with commit ref |
| Style / pattern suggestion | Fix it, reply confirming |
| False positive / intentional design | Reply explaining why, resolve |
| Question about approach | Reply with explanation, resolve |
| Genuinely ambiguous or risky | Ask user before acting (rare) |

**Default to action.** Only ask the user when the fix would be architecturally risky, when you genuinely do not understand the feedback, or when the commenter's suggestion conflicts with existing patterns.

### Prerequisites

GitHub CLI (`gh`) must be installed and authenticated. Verify with `gh auth status`.

### Step 1: Fetch PR Info + Unresolved Comments + Thread IDs

Run these in parallel. You need REST comment IDs (for replying) and GraphQL thread IDs (for resolving).

**Get PR info:**

```bash
gh pr view --json number,url,title,body
```

**Fetch PR comments (REST -- for replying):**

Read `owner` and `repo` from the current git remote (or `jig.config.md` if configured):

```bash
# Extract owner/repo from git remote
REMOTE_URL=$(git remote get-url origin)
# Parse owner and repo from the URL

gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --jq '.[] | {id: .id, path: .path, line: .line, body: .body, user: .user.login, created_at: .created_at}'
```

**Fetch unresolved thread IDs (GraphQL -- for resolving):**

The REST API gives you comment IDs (for replying), but resolving threads requires GraphQL thread IDs. Fetch both.

```bash
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: PR_NUM) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              databaseId
              body
              author { login }
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {threadId: .id, commentId: .comments.nodes[0].databaseId, author: .comments.nodes[0].author.login, body: (.comments.nodes[0].body | split("\n")[0][:100])}'
```

**Mapping threads to comments:** The `commentId` from GraphQL matches the `id` from the REST comments endpoint. Use this to build a map of `commentId -> threadId` so you can resolve each thread after replying.

**Fetch a single comment's full body:**

The GraphQL query above truncates comment bodies to 100 chars. To get the full body of a specific comment:

```bash
# IMPORTANT: The path is /pulls/comments/{id} -- NOT /pulls/{pr_number}/comments/{id}
gh api repos/{owner}/{repo}/pulls/comments/{comment_id} \
  --jq '{id: .id, path: .path, line: .line, body: .body, user: .user.login}'
```

The single-comment endpoint drops the PR number from the path. Using `/pulls/{pr_number}/comments/{id}` will return a 404.

**If there are no unresolved comments, say so and stop.**

### Step 2: Analyze Each Comment

For each unresolved comment:

1. Read the referenced code files
2. Understand context deeply (do not skim)
3. Determine: valid fix, false positive, or needs clarification
4. If valid: plan the code change
5. If false positive: draft an explanation of why the current code is correct

#### Bot Comment Validation

| Bot | Typical Comments | Validation Approach |
|-----|------------------|---------------------|
| `cursor[bot]` | Bug predictions, missing guards | ~50% false positive rate. Validate against actual code paths |
| `sentry[bot]` | Security concerns, bug predictions | Deep dive required. Often valid |
| `github-actions[bot]` | CI/CD status, test results | Check actual test failures |
| `dependabot[bot]` | Dependency updates | Review changelog and breaking changes |

**CRITICAL: Never trust a bot's factual claims. Always verify.**

Bots make assertions about code structure ("this entity doesn't have field X", "this method returns Y") that are frequently wrong. Before accepting ANY bot claim as valid:

1. **Verify every factual assertion independently.** If a bot says "Entity doesn't have a `name` column," READ the entity file and check.
2. **Read the actual source files** the bot references -- not just the diff lines.
3. **Check related files** that the bot may not have seen.
4. **Only after verification:** determine if the concern is valid or a false positive.
5. If valid: fix the issue and respond with what was fixed.
6. If false positive: respond explaining exactly what the bot got wrong and cite the evidence (file, line number).

**The cost of a false fix is higher than the cost of extra verification.** A wrong "fix" introduces a real bug where none existed.

#### Human Comments (Usually Actionable)

| Pattern | Example | Response |
|---------|---------|----------|
| Style suggestion | "Use design tokens here" | Implement and confirm |
| Performance tip | "Consider memoizing this" | Implement and confirm |
| Question | "Is this intentional?" | Explain the reasoning |
| Bug report | "This will fail when..." | Fix and confirm |

### Step 3: Implement + Verify

For each valid fix:

1. **Edit** the code
2. **Build**: verify the project builds without errors
3. **Test**: run relevant tests -- must pass

### Step 4: Commit + Push

**Do both. Always.** A local commit without a push means the reply will reference a commit the reviewer cannot see.

```bash
# Commit the fixes
# Then push immediately
git push
```

### Step 5: Reply + Resolve

For EACH addressed comment, do both. This is the finish line -- do not skip it.

**Reply to a comment:**

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies \
  -X POST \
  -f body='Your response message here'
```

**Important:**
- Use `-X POST` to specify POST method
- Use `-f body='...'` for the response body
- Use single quotes for the body to avoid escaping issues

**Resolve all addressed threads (AFTER replying):**

```bash
for thread_id in PRRT_abc123 PRRT_def456 PRRT_ghi789; do
  gh api graphql -f query="mutation { resolveReviewThread(input: {threadId: \"$thread_id\"}) { thread { isResolved } } }" --jq '.data.resolveReviewThread.thread.isResolved'
done
```

**Rules:**
- Always resolve AFTER replying (so the reply is visible before resolution)
- Only resolve threads you have actually addressed
- Do not resolve threads you deferred or where you disagreed without responding
- Threads already `isResolved: true` can be skipped

**Post top-level PR comment (optional):**

Use for summarizing multiple changes across many comments:

```bash
gh pr comment {pr_number} --body "### Summary of Changes

All feedback has been addressed:
- Updated design tokens
- Fixed the race condition
- Added error handling"
```

---

## Response Style (for replies)

- Friendly, lowercase, concise
- Reference the commit hash when you fixed something
- Use code formatting for technical references
- Match the commenter's energy

### Good response examples

**Acknowledging a fix:**
> good call! updated to use the design token instead of the hardcoded value

**Explaining a decision:**
> thanks for flagging! looked into this -- the inner join is actually intentional here. this method only returns records that have the associated data. records without it have nothing to display or match against.

**Simple acknowledgment:**
> done!

**With commit reference:**
> fixed in abc1234. added the null check as suggested.

**Multi-point fix:**
> addressed both points:
> 1. added guard for self-reference prevention
> 2. wrapped empty state in droppable for drop zone coverage
> fixed in abc1234.

---

## gh CLI Command Reference

```bash
# Get PR for current branch
gh pr view --json number,url,title,body

# Get all comments (REST -- for replying)
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --jq '.[] | {id, path, line, body, user: .user.login}'

# Get single comment full body (NOTE: no PR number in path!)
gh api repos/{owner}/{repo}/pulls/comments/{comment_id} \
  --jq '{id, path, line, body, user: .user.login}'

# Get unresolved thread IDs (GraphQL -- for resolving)
gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") {
  pullRequest(number: PR_NUM) { reviewThreads(first: 50) { nodes {
    id, isResolved, comments(first: 1) { nodes { databaseId, author { login } } }
  } } } } }' --jq '.data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | {threadId: .id, commentId: .comments.nodes[0].databaseId}'

# Reply to comment
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies \
  -X POST -f body='message'

# Resolve a thread
gh api graphql -f query='mutation {
  resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } }
}'

# Top-level comment
gh pr comment {pr_number} --body "message"

# Push
git push -u origin HEAD

# Create PR
gh pr create --title "title" --body "$(cat <<'EOF'
body content
EOF
)"
```

**Extracting owner/repo from git remote:**

Do not hardcode owner/repo values. Extract them from the git remote:

```bash
# Get the remote URL and parse owner/repo
REMOTE_URL=$(git remote get-url origin)
# HTTPS: https://github.com/owner/repo.git -> owner/repo
# SSH: git@github.com:owner/repo.git -> owner/repo
```

---

## Completion Checklist

### Create mode

- [ ] `jig-review` run -- score 8+ (or blocking/major issues addressed)
- [ ] All CI checks pass locally (build, tests)
- [ ] PR description matches actual implementation
- [ ] Appropriate test coverage for the change type
- [ ] No merge conflicts with base branch
- [ ] Ticket referenced (per `jig.config.md` settings)

### Respond mode

- [ ] All unresolved comments analyzed
- [ ] Code fixes implemented for valid feedback
- [ ] Build passes
- [ ] Tests pass
- [ ] Changes committed
- [ ] Changes pushed to remote
- [ ] Reply posted to every addressed comment
- [ ] Every addressed thread resolved via GraphQL
- [ ] No unresolved threads remaining (unless intentionally deferred)

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Listing every commit as a bullet | Group by theme -- reviewers do not need your git log |
| "Updated files" with no context | Say *what* changed and *why* |
| Empty test plan | Always include checkboxes -- even "No testing required" is a choice |
| Title longer than 70 chars | Move details to the body |
| Corporate tone in summary | Read it out loud. Would you say this to a teammate? |
| Missing ticket reference | Check branch name for ticket pattern from `jig.config.md` |
| Hardcoding owner/repo | Extract from git remote -- never assume a specific repository |
| Stopping after commit without push | The reply will reference a commit the reviewer cannot see |
| Replying without resolving threads | Every addressed thread must be resolved via GraphQL |
| Trusting bot factual claims | Always verify by reading the actual source files first |
| Implementing a fix for a false positive | The cost of a wrong fix is higher than extra verification |
| Using `/pulls/{pr}/comments/{id}` for single comment | Path is `/pulls/comments/{id}` -- no PR number for single lookups |

---

## Integration

**Called by:**
- `jig-kickoff` during the SHIP stage
- `jig-finish` Option 2 (Push and Create PR)

**Related skills:**
- `jig-review` -- run before creating the PR
- `jig-finish` -- the completion flow that may invoke PR creation
- `jig-postmortem` -- uses PR comment data for retrospectives

---

## Troubleshooting

### "Not Found" (404) Errors
- **Fetching single comment**: Use `/pulls/comments/{id}` NOT `/pulls/{pr}/comments/{id}` -- the PR number is NOT in the path for single-comment lookups
- **Replying to comment**: Use `/pulls/{pr}/comments/{id}/replies` -- the PR number IS in the path for replies
- Ensure using `-X POST` for replies
- Verify comment ID exists

### Authentication Issues
```bash
gh auth login
gh auth status
```

### Rate Limiting
- GitHub API has rate limits
- Space out requests if posting many replies
- Check rate limit: `gh api rate_limit`
