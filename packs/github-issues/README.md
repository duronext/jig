# GitHub Issues Tracker Pack

Integration pack for teams using GitHub Issues as their ticket system.

## Prerequisites

- `gh` CLI installed and authenticated
- `ticket-system: github` in `jig.config.md`

## Creating a Ticket

```bash
gh issue create --title "title" --body "description" --label "bug"
```

## Issue Type Mapping

| Jig Type | GitHub Label |
|----------|-------------|
| Feature | `enhancement` |
| Improvement | `enhancement` |
| Bug | `bug` |
| Task | `task` or `chore` |
| Refactor | `refactor` |

Teams should create these labels in their repo if they don't exist.

## Branch Naming

Constructed from issue number: `{username}/gh-{number}-{kebab-title}`

## Reading a ticket

For skills that need a ticket's context, such as `pr-brief`:

```bash
gh issue view {number} -R {owner}/{repo} --json number,url,title,body,state,stateReason,author,assignees,labels,parent,subIssues,blockedBy,blocking,comments,closedByPullRequestsReferences
```

`--comments` cannot be combined with `--json`; ask for the `comments` field.

- **ID form** — `#<n>` or `<owner>/<repo>#<n>`. A `#<n>` can also be a PR, and
  `gh issue view` reads PRs too: if `gh pr view <n>` succeeds, it is a PR.
- **Relations** — `parent`, `subIssues`, `blockedBy`, `blocking` need gh 2.94.0
  or later. On an older gh the whole call fails with an unknown-field error:
  run it again without those four fields and record the relations as
  unreadable. When a relation's `totalCount` is larger than its number of
  `nodes`, the list is cut short: record it as `unreachable (page limit)`.
- **Linked PRs** — `closedByPullRequestsReferences` lists PRs linked to close
  the issue. PRs that only mention it come from "Find PRs that mention an
  issue" in `framework/GIT_HOST.md` (the issue timeline).
- A call that fails means the ticket is unread, not empty.

### Closing behavior

From [GitHub's docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue):

- **Closing keywords** (close, closes, closed, fix, fixes, fixed, resolve,
  resolves, resolved) in the PR description, or a manual link from the PR
  sidebar, close the issue when the PR merges into the default branch. On a
  PR into any other branch, the keywords are ignored.
- A keyword in a commit message also closes the issue once that commit
  reaches the default branch, but the PR is not listed as linked.
- There is no non-closing keyword: a plain `#123` mention only links the two
  in the timeline.
- **Several linked PRs** — each closes the issue on its own; the first to
  merge into the default branch closes it.

## Status

Stub — full implementation coming. Contributions welcome.
