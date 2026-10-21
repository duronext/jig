---
name: pr-respond
description: >
  Use when reviewing PR comments, responding to code review feedback, or
  addressing reviewer suggestions on the current branch or the PRs stacked
  with it. Triggered by "respond to PR comments", "address review feedback",
  or /pr-respond.
tier: workflow
alwaysApply: false
---

# PR Comment Responder

**PURPOSE**: Process reviewer feedback into fixes, replies, and resolved threads. Every unresolved PR comment thread should end this session resolved.

**GIT HOST**: Commands in this skill use GitHub (`gh`) as the default. If `git-host` in `jig.config.md` is not `github`, read `framework/GIT_HOST.md` for the platform-specific command equivalents.

---

## Mission

**Analyze. Fix. Commit. Push. Reply. Resolve.** That's the job.

```
FETCH every comment source + thread IDs (on every PR in the stack)
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

**Re-run once reviewers and bots have responded to a push.** On a stack, sweep every PR in it, not just the one you pushed (see `framework/STACKED_PRS.md`).

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

Extract owner/repo from `git remote get-url origin`. Use in all `gh api` calls below. Read `main-branch` from `jig.config.md` (default: `main`).

**Fetch PR comments (REST -- for replying):**

```bash
gh api --paginate repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --jq '.[] | {id: .id, path: .path, line: .line, body: .body, user: .user.login, created_at: .created_at}'
```

**Fetch unresolved thread IDs (GraphQL -- for resolving):**

The REST API gives you comment IDs (for replying), but resolving threads requires GraphQL thread IDs. Fetch both. `--paginate` follows `endCursor` until `hasNextPage` is false, so threads past the first 100 are included. Owner and repo go in with `-f` (always a string); `-F` would turn a name like `2023` into a number. Only the PR number takes `-F`.

```bash
gh api graphql --paginate -f owner={owner} -f repo={repo} -F pr={pr_number} -f query='
query($owner: String!, $repo: String!, $pr: Int!, $endCursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
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

### Sweep every comment source

Inline review threads are only one place feedback lands. Human reviewers often leave their main points in a review summary, which the thread query above does not return. Check all four sources: inline threads (the query above), plus:

```bash
# Review summaries (the body of an approve / comment / request-changes review)
gh api --paginate repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --jq '.[] | select(.body != "") | {id, user: .user.login, state, submitted_at, url: .html_url, body}'

# Top-level PR comments (humans and bots)
gh api --paginate repos/{owner}/{repo}/issues/{pr_number}/comments \
  --jq '.[] | {id, user: .user.login, created_at, url: .html_url, body}'

# Code scanning: GitHub's own check on the PR's head, one per tool or category,
# scoped to the code the PR changed
h=$(gh api repos/{owner}/{repo}/pulls/{pr_number} --jq .head.sha) &&
  runs=$(gh api --paginate "repos/{owner}/{repo}/commits/$h/check-runs" --jq '.check_runs[]
    | select(.app.slug == "github-advanced-security")
    | "\(.id) \(.status) \(.conclusion) \(.output.annotations_count // 0) \(.name): \(.output.title)"') ||
  runs=error
case $runs in
  error) echo "code scanning: checks not readable: not checked" >&2 ;;
  "") echo "code scanning: no check on this PR's head: not checked" >&2 ;;
  *) echo "$runs" | while read -r id status conclusion count check; do
       echo "$check"
       if [ "$status" != completed ]; then echo "  pending: not checked" >&2
       elif [ "$count" -gt 0 ]; then
         gh api --paginate repos/{owner}/{repo}/check-runs/$id/annotations \
           --jq '.[] | {path, line: .start_line, message}' || echo "  alerts not readable: not checked" >&2
       elif [ "$conclusion" != success ]; then echo "  $conclusion: not checked" >&2
       fi
     done ;;
esac
```

- The check runs on the PR's head, so it is current with the last push, and it reports only alerts in code the PR changed. Its annotations are those new alerts; a check can pass with some ("2 new alerts", conclusion `success`). One that ends otherwise without annotations (`neutral`, "configuration not found") is not checked.
- `not checked` (no check on the head yet, one still running, code scanning not enabled, or the token lacks the scope) is not "no alerts". Say so, and re-run once the checks finish.
- Review summaries and top-level comments have no thread to resolve. One counts as answered only when one of the user's replies quotes or links it (its `url`); who posted last proves nothing. Answer the unanswered ones (not the user's own) with one `gh pr comment` that quotes or links each point.
- Bot status or report posts (deploy previews, coverage, changesets, license or preview-environment notices) need no answer. Comments from humans, and bot comments that carry review findings, do.
- Code-scanning alerts are not replied to. Fix the ones the PR introduces, or dismiss them with a reason (`framework/GIT_HOST.md`, "Code-scanning alerts").
- Track by reviewer: every human reviewer who left feedback gets a reply.

**On a stack**, list its PRs and run the sweep for each. On GitHub, a PR in a native stack reports it; otherwise walk the bases (`framework/STACKED_PRS.md`, "Finding the Chain"):

```bash
fail() { echo "could not list PRs $1; stack sweep incomplete" >&2; }
if ! stack=$(gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '.stack.number // empty'); then
  fail "for #{pr_number}"
elif [ -n "$stack" ]; then
  gh api repos/{owner}/{repo}/stacks/$stack --jq '.pull_requests[].number' || fail "in stack $stack"
else
  echo {pr_number}; seen=" {pr_number} "
  # Below: the open same-repo PR whose head is this PR's base, down to {main-branch}
  base=$(gh pr view {pr_number} --json baseRefName --jq .baseRefName) || fail "below #{pr_number}"
  while [ -n "$base" ] && [ "$base" != "{main-branch}" ]; do
    pr=$(gh pr list --head "$base" --json number,baseRefName,isCrossRepository \
      --jq '[.[] | select(.isCrossRepository | not)][:1][] | "\(.number) \(.baseRefName)"') || { fail "below $base"; break; }
    n=${pr% *}; base=${pr#* }
    [ -n "$pr" ] && case $seen in *" $n "*) false;; esac || break
    echo "$n"; seen="$seen$n "
  done
  # Above: open same-repo PRs whose base is this PR's head, until none is new
  heads=$(gh pr view {pr_number} --json headRefName --jq .headRefName) || fail "above #{pr_number}"
  while [ -n "$heads" ]; do
    found=$(for h in $heads; do gh pr list --base "$h" --json number,headRefName,isCrossRepository \
      --jq '.[] | select(.isCrossRepository | not) | "\(.number) \(.headRefName)"' || fail "above $h"; done)
    heads=
    while read -r n h; do
      [ -n "$n" ] && case $seen in *" $n "*) false;; esac || continue
      echo "$n"; seen="$seen$n "; heads="$heads $h"
    done <<< "$found"
  done
fi
```

A failed `gh` call prints `stack sweep incomplete` rather than ending the walk quietly. If you see it, the sweep is not done: say which PRs could not be listed.

**Stop when, on every PR, each inline thread is resolved, each review summary and top-level comment that needs an answer is answered, and each alert the PR introduces is fixed or dismissed. Say so.**

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

### Two failure modes that look like verification but aren't

These patterns have burned maintainers. Recognize them so you don't skip the actual verification step.

**1. Elaborate reasoning is NOT evidence.**

Some reviewers (especially LLM-based ones) provide step-by-step proofs, "Extended reasoning" blocks, or multi-paragraph justifications. A confident, detailed argument for a factual claim still needs primary-source verification. Reasoning quality and correctness are not correlated — a wrong claim dressed in careful logic is *more* dangerous than a wrong claim stated flatly, because the elaboration lowers your skepticism instead of raising it.

- For CLI flag claims: run `<tool> --help` and read the flag description yourself. Don't trust the reviewer's summary of what the flag does.
- For library API claims: read the library source, official docs, or type definitions. Don't trust the reviewer's description of the signature.
- For database/schema claims: read the actual entity/migration/schema file.
- In your reply, cite the primary source you checked — `"ran 'gh api --help': -F = typed, -f = raw-field"` is worth more than any amount of reasoning.

**2. Conflicting reviewers → verify, don't average.**

When two reviewers give opposing factual claims (e.g., Bot A says "the correct flag is `-F`", Bot B says "the correct flag is `-f`"), the resolution is **primary-source verification**, not "pick the one with better reasoning" or "go with the majority." Treat a disagreement as a strong signal that verification is mandatory, not optional.

- Do not accept either reviewer's claim until you've checked the authoritative source.
- If verification confirms one reviewer and contradicts the other, reply with the cited evidence on both threads. The wrong reviewer's thread gets a polite correction with the cite; the right reviewer's thread gets a confirmation.
- Never "compromise" between two factual claims — facts don't average.

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
# Commit the fixes (use commit agent)
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

## Feedback on Another PR in the Stack

Fix it where it belongs, not on your current branch: switch to that PR's branch, run Steps 3-5 there, then carry the change up the chain by merging forward (`framework/STACKED_PRS.md`, "When a lower PR changes"). The commit and push on that branch, and the forward merges and pushes above it, change other PRs, so confirm them with the user first (rule 6 there).

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
- [ ] On every PR in the stack: every review summary and top-level comment from a human, or from a bot with review findings, answered by a reply that quotes or links it; code-scanning alerts the PR introduces fixed or dismissed with a reason

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
- After `pr-create` when reviewers provide feedback

**Related skills:**
- `pr-create` -- creates the PR that this skill responds to
- `review` -- the automated review swarm (catches issues before humans do)
- `postmortem` -- analyzes PR feedback patterns for skill improvement
