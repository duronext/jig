---
name: jig-pr-respond
description: >
  Use when reviewing PR comments, responding to code review feedback, or
  addressing reviewer suggestions on the current branch via GitHub CLI.
  Triggered by "respond to PR comments", "address review feedback",
  or /jig-pr-respond.
tier: workflow
alwaysApply: false
---

# PR Comment Responder

**PURPOSE**: Process reviewer feedback into fixes, replies, and resolved threads. Every unresolved PR comment thread should end this session resolved.

---

## Mission

**Analyze. Fix. Commit. Push. Reply. Resolve.** That's the job.

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

---

## Decision Rules

Most comments have obvious solutions. Act on them directly:

| Comment Type | Action |
|-------------|--------|
| Valid bug / missing guard | Fix it, reply with commit ref |
| Style / pattern suggestion | Fix it, reply confirming |
| False positive / intentional design | Reply explaining why, resolve |
| Question about approach | Reply with explanation, resolve |
| Genuinely ambiguous or risky | Ask user before acting (rare) |

**Default to action.** Only ask the user when the fix would be architecturally risky, when you genuinely do not understand the feedback, or when the commenter's suggestion conflicts with existing patterns.

---

## Prerequisites

GitHub CLI (`gh`) must be installed and authenticated. Verify with `gh auth status`.

---

## Step 1: Fetch PR Info + Unresolved Comments + Thread IDs

Run these in parallel. You need REST comment IDs (for replying) and GraphQL thread IDs (for resolving).

**Get PR info:**

```bash
gh pr view --json number,url,title,body
```

Extract owner/repo from `git remote get-url origin`. Use in all `gh api` calls below.

**Fetch PR comments (REST -- for replying):**

```bash
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

---

## Step 2: Analyze Each Comment

For each unresolved comment:

1. Read the referenced code files
2. Understand context deeply (do not skim)
3. Determine: valid fix, false positive, or needs clarification
4. If valid: plan the code change
5. If false positive: draft an explanation of why the current code is correct

### Bot Comment Validation

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

### Human Comments (Usually Actionable)

| Pattern | Example | Response |
|---------|---------|----------|
| Style suggestion | "Use design tokens here" | Implement and confirm |
| Performance tip | "Consider memoizing this" | Implement and confirm |
| Question | "Is this intentional?" | Explain the reasoning |
| Bug report | "This will fail when..." | Fix and confirm |

---

## Step 3: Implement + Verify

For each valid fix:

1. **Edit** the code
2. **Build**: verify the project builds without errors
3. **Test**: run relevant tests -- must pass

---

## Step 4: Commit + Push

**Do both. Always.** A local commit without a push means the reply will reference a commit the reviewer cannot see.

```bash
# Commit the fixes (use jig-commit agent)
# Then push immediately
git push
```

---

## Step 5: Reply + Resolve

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

## Response Style

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

## Completion Checklist

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

---

## Integration

**Called by:**
- Ad-hoc when review comments arrive
- After `jig-pr-create` when reviewers provide feedback

**Related skills:**
- `jig-pr-create` -- creates the PR that this skill responds to
- `jig-review` -- the automated review swarm (catches issues before humans do)
- `jig-postmortem` -- analyzes PR feedback patterns for skill improvement
