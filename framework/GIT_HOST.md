# Git Host Adapters

Skills that interact with pull requests, code review comments, or repository APIs must use the commands for the team's configured `git-host` in `jig.config.md`.

**Read `git-host` from `jig.config.md` before using any PR or review API.** Default is `github`.

---

## How Skills Use This

When a skill needs to perform a git host operation (create PR, fetch comments, post review), it should:

1. Read `git-host` from `jig.config.md`
2. Look up the operation in the adapter table below
3. Use the platform-specific command

Skills should never hardcode `gh` commands without checking the git host first.

---

## Operations

### Identify the current PR

| Host | Command |
|------|---------|
| github | `gh pr view --json number,url,title,body,headRefOid` |
| gitlab | `glab mr view --output json` |
| bitbucket | `git log --format=%s -1` and parse PR number from branch |

### Create a pull/merge request

| Host | Command |
|------|---------|
| github | `gh pr create --title "title" --body "body"` |
| gitlab | `glab mr create --title "title" --description "body"` |
| bitbucket | `bb pr create --title "title" --body "body"` (or use Bitbucket REST API) |

### Push with upstream tracking

| Host | Command |
|------|---------|
| all | `git push -u origin HEAD` |

### Create a PR/MR against a non-default base

| Host | Command |
|------|---------|
| github | `gh pr create --base <branch> --title "title" --body "body"` |
| gitlab | `glab mr create --target-branch <branch> --title "title" --description "body"` |
| bitbucket | Bitbucket REST: `POST /2.0/repositories/{workspace}/{repo}/pullrequests` with `destination.branch.name` |

### Change a PR/MR's base

| Host | Command |
|------|---------|
| github | `gh pr edit {number} --base <branch>` (fails for a PR in a native stack; see `framework/STACKED_PRS.md`) |
| gitlab | `glab mr update {iid} --target-branch <branch>` |
| bitbucket | Bitbucket REST: `PUT /2.0/repositories/{workspace}/{repo}/pullrequests/{id}` with `destination.branch.name` |

### List CI checks for a PR/MR

| Host | Command |
|------|---------|
| github | `gh pr checks {number}` |
| gitlab | `glab ci status --branch <source-branch>` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/commit/{sha}/statuses` |

### Find dependent PRs/MRs (those based on a branch)

| Host | Command |
|------|---------|
| github | `gh pr list --base <branch> --json number,headRefName,isCrossRepository` (fork PRs have `isCrossRepository: true`) |
| gitlab | `glab mr list --target-branch <branch>` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests?q=destination.branch.name="<branch>"` |

### Find the open PR/MR for a branch (by its head branch)

| Host | Command |
|------|---------|
| github | `gh pr list --head <branch> --json number,baseRefName,isCrossRepository` (also matches fork PRs from a same-named branch; they have `isCrossRepository: true`) |
| gitlab | `glab mr list --source-branch <branch>` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests?q=source.branch.name="<branch>"` |

### Find a PR's native stack

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/pulls/{number} --jq .stack` (null if not stacked), then `gh api repos/{owner}/{repo}/stacks/{stack_number}` |
| gitlab | Not natively supported — walk bases with "Find the open PR/MR for a branch" and "Find dependent PRs/MRs" |
| bitbucket | Not natively supported — walk bases with "Find the open PR/MR for a branch" and "Find dependent PRs/MRs" |

### Fetch PR/MR comments

| Host | Command |
|------|---------|
| github | `gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments` |
| gitlab | `glab api --paginate projects/{id}/merge_requests/{iid}/notes` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/comments`, following each page's `next` link until there is none |

### Fetch review summaries and top-level PR/MR comments

| Host | Command |
|------|---------|
| github | `gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews` (review bodies) and `gh api --paginate repos/{owner}/{repo}/issues/{number}/comments` (top-level comments) |
| gitlab | Included in the notes endpoint above (`glab api --paginate projects/{id}/merge_requests/{iid}/notes`) |
| bitbucket | Included in the comments endpoint above (top-level comments have no `inline` object) |

### Code-scanning alerts on a PR/MR

| Host | Command |
|------|---------|
| github | List the PR's new alerts: the numbers from `gh api --paginate "repos/{owner}/{repo}/code-scanning/alerts?ref=refs/pull/{number}/merge&state=open"` minus those from the same call with `ref=refs/heads/<main-branch>` (a stack branch has no analysis of its own). An unanalyzed ref also lists none, so first check each ref has one: `gh api "repos/{owner}/{repo}/code-scanning/analyses?ref=<ref>&per_page=1" --jq length` (0 or an error: not checked). Dismiss: `gh api -X PATCH repos/{owner}/{repo}/code-scanning/alerts/{alert} -f state=dismissed -f dismissed_reason='false positive' -f dismissed_comment='why'` (reasons: `false positive`, `won't fix`, `used in tests`) |
| gitlab | The MR's security widget (Ultimate); dismiss findings there |
| bitbucket | Code Insights reports: `GET /2.0/repositories/{workspace}/{repo}/commit/{sha}/reports`; no dismissal API |

### Reply to a comment

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies -X POST -f body='message'` |
| gitlab | `glab api projects/{id}/merge_requests/{iid}/notes -X POST -f body='message'` (replies are top-level notes referencing the parent) |
| bitbucket | Bitbucket REST: `POST /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/comments` with `parent.id` |

### Resolve a review thread

| Host | Command |
|------|---------|
| github | `gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "ID"}) { thread { isResolved } } }'` |
| gitlab | `glab api projects/{id}/merge_requests/{iid}/discussions/{discussion_id}/resolve -X PUT -f resolved=true` |
| bitbucket | Not natively supported — mark as resolved via comment convention |

### Post inline review comments

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/pulls/{number}/reviews --method POST --input payload.json` |
| gitlab | `glab api projects/{id}/merge_requests/{iid}/notes -X POST` with `position` object for inline placement |
| bitbucket | Bitbucket REST: `POST /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/comments` with `inline.path` and `inline.to` |

### Fetch commit SHA for a PR/MR

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/pulls/{number} --jq '.head.sha'` |
| gitlab | `glab mr view --output json \| jq -r '.sha'` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}` and extract `source.commit.hash` |

### Fetch diff file list

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/pulls/{number}/files --paginate --jq '.[].filename'` |
| gitlab | `glab api projects/{id}/merge_requests/{iid}/changes --jq '.changes[].new_path'` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/diffstat` |

### Post top-level PR/MR comment

| Host | Command |
|------|---------|
| github | `gh pr comment {number} --body "message"` |
| gitlab | `glab mr note {iid} --message "message"` |
| bitbucket | Bitbucket REST: `POST /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/comments` with no `inline` object |

---

## Extracting owner/repo/project identifiers

Each platform identifies repositories differently:

| Host | Identifier | How to extract |
|------|-----------|---------------|
| github | `{owner}/{repo}` | Parse from `git remote get-url origin` |
| gitlab | `{project_id}` (numeric) | `glab api projects --jq '.[0].id'` or parse from remote URL |
| bitbucket | `{workspace}/{repo}` | Parse from `git remote get-url origin` |

---

## CLI Prerequisites

| Host | CLI tool | Install | Auth |
|------|----------|---------|------|
| github | `gh` | `brew install gh` | `gh auth login` |
| gitlab | `glab` | `brew install glab` | `glab auth login` |
| bitbucket | `bb` (or REST API) | Varies | Token-based |

---

## Adding a New Host

To add support for a new git host (e.g., Azure DevOps, Gitea):

1. Add a row to each operation table above
2. Add the CLI tool to prerequisites
3. Add identifier extraction method
4. Test the commands against a real repository
5. Update the `git-host` enum comment in `scaffold/jig.config.md`
