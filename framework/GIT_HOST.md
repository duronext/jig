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

**Paginated JSON.** `gh api --paginate` prints each page as its own JSON
value. To read the output as one value, add `--slurp` (an array of pages) and
flatten it: `jq 'add'` for pages that are arrays, `jq '[.[].<key>[]]'` for
pages that are objects. `--slurp` cannot be combined with `--jq`; pipe to
`jq` instead. A `--jq` filter runs on each page, so its line output needs no
merge. `glab api --paginate` already merges array pages into one array.

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

### Update a PR/MR description

| Host | Command |
|------|---------|
| github | `gh pr edit {number} --body-file <file>` |
| gitlab | `glab mr update {iid} --description "$(cat <file>)"` |
| bitbucket | Bitbucket REST: `PUT /2.0/repositories/{workspace}/{repo}/pullrequests/{id}` with `description` |

### List CI checks for a PR/MR

| Host | Command |
|------|---------|
| github | `gh pr checks {number}`. As data: `gh pr checks {number} -R {owner}/{repo} --json name,state,bucket,workflow`; `--required` limits it to required checks that have reported ("no required checks reported", exit 1, means none reported, not none required). The required list comes from the base branch: rulesets `gh api --paginate --slurp repos/{owner}/{repo}/rules/branches/<base> \| jq '[.[][] \| select(.type == "required_status_checks") \| .parameters.required_status_checks[].context]'` and classic protection `gh api repos/{owner}/{repo}/branches/<base> --jq .protection.required_status_checks.contexts`. A required check that never reported may be waiting for a maintainer to approve a fork's workflows: `gh api "repos/{owner}/{repo}/actions/runs?head_sha=<head-sha>&status=action_required" --jq '[.workflow_runs[].name]'` |
| gitlab | `glab ci status --branch <source-branch>`. Required: the whole pipeline, when `glab api projects/{id} --jq .only_allow_merge_if_pipeline_succeeds` is `true` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/commit/{sha}/statuses`, following each page's `next` link. Required: `GET /2.0/repositories/{workspace}/{repo}/branch-restrictions?kind=require_passing_builds_to_merge`, following each page's `next` link; the rules that match the destination branch (matched as in "Find required approvals for a branch") give the count: the largest matching `value`; unknown, not zero, when the branch type cannot be resolved or a page was not read |

### Find dependent PRs/MRs (those based on a branch)

| Host | Command |
|------|---------|
| github | `gh pr list --base <branch> --limit 1000 --json number,headRefName,isCrossRepository` (fork PRs have `isCrossRepository: true`; without `--limit` it stops at 30) |
| gitlab | `glab mr list --target-branch <branch> --per-page 100` (`--page` for more) |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests?q=destination.branch.name="<branch>"`, following each page's `next` link |

### Find the open PR/MR for a branch (by its head branch)

| Host | Command |
|------|---------|
| github | `gh pr list -R {owner}/{repo} --head <branch> --limit 1000 --json number,title,baseRefName,isCrossRepository` (also matches fork PRs from a same-named branch; they have `isCrossRepository: true`) |
| gitlab | `glab mr list --source-branch <branch> --per-page 100` (`--page` for more) |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests?q=source.branch.name="<branch>"`, following each page's `next` link |

### Find a PR's native stack

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/pulls/{number} --jq .stack` (null if not stacked), then `gh api repos/{owner}/{repo}/stacks/{stack_number}` |
| gitlab | Not natively supported — walk bases with "Find the open PR/MR for a branch" and "Find dependent PRs/MRs" |
| bitbucket | Not natively supported — walk bases with "Find the open PR/MR for a branch" and "Find dependent PRs/MRs" |

### Fetch PR/MR comments

| Host | Command |
|------|---------|
| github | `gh api --paginate --slurp repos/{owner}/{repo}/pulls/{number}/comments` (flatten with `jq 'add'`) |
| gitlab | `glab api --paginate projects/{id}/merge_requests/{iid}/notes` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/comments`, following each page's `next` link until there is none |

### Fetch review summaries and top-level PR/MR comments

| Host | Command |
|------|---------|
| github | `gh api --paginate --slurp repos/{owner}/{repo}/pulls/{number}/reviews` (review bodies) and `gh api --paginate --slurp repos/{owner}/{repo}/issues/{number}/comments` (top-level comments); flatten each with `jq 'add'` |
| gitlab | Included in the notes endpoint above (`glab api --paginate projects/{id}/merge_requests/{iid}/notes`) |
| bitbucket | Included in the comments endpoint above (top-level comments have no `inline` object) |

### Code-scanning alerts on a PR/MR

Only the alerts found on the PR's head count as the PR's alerts. A repo-wide
or per-PR alert list on its own also holds alerts the PR did not add.

| Host | Command |
|------|---------|
| github | List: GitHub's code-scanning checks on the PR's head, one per tool or category and scoped to the PR's changes: the `check_runs` with `app.slug` `github-advanced-security` from `gh api --paginate --slurp "repos/{owner}/{repo}/commits/<head-sha>/check-runs"` (flatten with `jq '[.[].check_runs[]]'`; `<head-sha>`: `gh api repos/{owner}/{repo}/pulls/{number} --jq .head.sha`). None, one not `completed`, one titled "configuration not found" (even with annotations), or one neither `success` nor annotated: not checked. Its new alerts, even when it passed: `gh api --paginate --slurp repos/{owner}/{repo}/check-runs/{id}/annotations` (flatten with `jq 'add'`); these annotations are the PR's alerts. Each annotation matches the alert in `gh api --paginate --slurp "repos/{owner}/{repo}/code-scanning/alerts?pr={number}"` (flatten with `jq 'add'`; every state but `fixed`; use this list only to match, never as the PR's alerts) with the same `most_recent_instance.location` (`path` + `start_line`) and rule (annotation `title` = alert `rule.description`, verified for CodeQL and Semgrep; where another tool differs it matches nothing and falls to "no such alert"), which gives its `{alert}` number and `state` (`open`: fix or dismiss; `dismissed`: handled; no such alert: find it by rule and file) |
| gitlab | The MR's security widget (Ultimate) shows the findings new to the MR; no documented API returns only those. GraphQL `Pipeline.securityReportFindings` on the MR's head pipeline lists all of that pipeline's findings: not checked for "new to this MR" |
| bitbucket | Code Insights reports on the head commit: `GET /2.0/repositories/{workspace}/{repo}/commit/{head-sha}/reports`, then each report's `GET .../reports/{reportId}/annotations`, following each page's `next` link. A report that does not state it covers only the PR's changes has unknown scope: the caller records it as such, never as the PR's own alerts |

### Dismiss a code-scanning alert

| Host | Command |
|------|---------|
| github | `gh api -X PATCH repos/{owner}/{repo}/code-scanning/alerts/{alert} -f state=dismissed -f dismissed_reason='false positive' -f dismissed_comment='why'` (reasons: `false positive`, `won't fix`, `used in tests`) |
| gitlab | In the MR's security widget (Ultimate) |
| bitbucket | No dismissal API |

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

### View the repository's default branch

| Host | Command |
|------|---------|
| github | `gh repo view {owner}/{repo} --json defaultBranchRef --jq .defaultBranchRef.name` |
| gitlab | `glab api projects/{id} --jq .default_branch` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}`, field `mainbranch.name` |
| all | `git ls-remote --symref <remote> HEAD` (first line: `ref: refs/heads/<branch>`) |

### View a PR by number

| Host | Command |
|------|---------|
| github | `gh pr view {number} -R {owner}/{repo} --json number,url,title,body,author,state,isDraft,labels,baseRefName,baseRefOid,headRefName,headRefOid,isCrossRepository,createdAt,updatedAt,mergedAt` (base SHA: `baseRefOid`) |
| gitlab | `glab mr view {iid} -R {group}/{project} --output json` (base SHA: `diff_refs.base_sha`; head: `diff_refs.head_sha`. A single-MR read has `diff_refs`; MR list results do not) |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}` (base SHA: `destination.commit.hash`; head: `source.commit.hash`. Both may be short: compare them as a prefix, or get the full hash from `GET /2.0/repositories/{workspace}/{repo}/commit/<hash>`, field `hash`) |

### Find a PR's merge base

The commit the host diffs the PR against: the best common ancestor of the
base SHA and the head SHA from "View a PR by number".

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/compare/<base-sha>...<head-sha> --jq .merge_base_commit.sha` (`<base-sha>`: `baseRefOid`; `<head-sha>`: `headRefOid`) |
| gitlab | No extra call: `diff_refs.base_sha` from "View a PR by number" is the merge base |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/merge-base/<base-sha>..<head-sha>` (two dots), field `hash`, possibly short: compare it as a prefix. When there are several best common ancestors it returns one, and which one is unspecified |

### Fetch a PR's diff

| Host | Command |
|------|---------|
| github | `gh pr diff {number} -R {owner}/{repo}` (GitHub refuses a diff over 20,000 lines with HTTP 406; then fetch the head and base and build it locally in the host's format, whatever the user's git config: `git -c core.hooksPath=/dev/null diff --no-ext-diff --no-textconv --no-color --ignore-submodules=none --src-prefix=a/ --dst-prefix=b/ -U3 -M <base-sha>...<head-sha>`) |
| gitlab | `glab mr diff {iid} -R {group}/{project} --raw` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/diff` (answers with a redirect; follow it, e.g. `curl -L`) |

### Fetch a PR's head commit locally

`<remote>` is the remote whose URL matches the repo (`git remote -v`), not
always `origin`. `--no-tags` keeps the remote's tags out of the clone. Check
the fetched ref with `git rev-parse <local-ref>` against the PR's head SHA
before you use it. If the row's fetch fails or gives another commit (e.g. a
merged or closed PR whose branch is gone), fetch the head SHA itself where
the host allows it: `git fetch --no-tags <remote> <head-sha>:<local-ref>`
(the full SHA). The same command fetches any other commit by SHA, such as
the base SHA from "View a PR by number".

Check out with hooks, filters, symlinks and submodules off, because the
checkout runs the post-checkout hook and any configured filter (e.g. Git LFS)
on the PR's content, and a committed link could point outside the tree. With
`core.symlinks=false` a link (mode 120000) checks out as a plain file holding
its target path:
`GIT_LFS_SKIP_SMUDGE=1 git -c core.hooksPath=/dev/null -c core.symlinks=false -c filter.lfs.process= -c filter.lfs.smudge=cat -c filter.lfs.required=false -c submodule.recurse=false worktree add --detach <dir> <local-ref>`
(the checkout command below).

| Host | Command |
|------|---------|
| github | `git fetch --no-tags <remote> +pull/{number}/head:<local-ref>`, then the checkout command (works for fork PRs; the ref lives in the base repo). Fetch by SHA: allowed |
| gitlab | `git fetch --no-tags <remote> +merge-requests/{iid}/head:<local-ref>`, then the checkout command (works for fork MRs; GitLab deletes this ref 14 days after the MR closes or merges). Fetch by SHA: allowed |
| bitbucket | No PR ref; fetch the head by SHA (allowed: tested on bitbucket.org/atlassian/atlassian-event, a full SHA fetched with protocol v0 and v2; a short hash did not). Resolve the short `source.commit.hash` with `GET /2.0/repositories/<source.repository.full_name>/commit/<hash>`, field `hash`, then `git fetch --no-tags <url> <full-sha>:<local-ref>` and the checkout command. `<url>` is `<remote>` for a PR in the same repo; for a fork PR, `<remote>`'s own URL with only its `<workspace>/<repo>` path replaced by `<source.repository.full_name>`, keeping its scheme, user, host and port (an SSH alias such as `bb-work:` or `altssh.bitbucket.org:443` keeps its key), so the same credentials work. Do not add a remote |

### Fetch review threads with resolution state

| Host | Command |
|------|---------|
| github | `gh api graphql --paginate --slurp -f query='query($owner:String!,$repo:String!,$number:Int!,$endCursor:String){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100,after:$endCursor){pageInfo{hasNextPage endCursor} nodes{isResolved isOutdated path line originalLine comments(first:100){totalCount nodes{author{__typename login} body createdAt}}}}}}}' -f owner={owner} -f repo={repo} -F number={number}` (`-f` keeps owner and repo strings; `-F` would turn a name like `123` into a number. Flatten with `jq '[.[].data.repository.pullRequest.reviewThreads.nodes[]]'`; `line` is null on an outdated thread; use `originalLine`. `author.__typename` is `Bot` or `User`. A thread whose `comments.totalCount` is over 100 is cut short: `unreachable (page limit)`) |
| gitlab | `glab api --paginate projects/{id}/merge_requests/{iid}/discussions` (each note has `resolvable` and `resolved`; inline notes have `position`) |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/comments`, following each page's `next` link; replies point to their thread with `parent.id`, and a resolved thread's comment has a `resolution` object (null when open) |

### Find issues a PR closes

| Host | Command |
|------|---------|
| github | `gh pr view {number} -R {owner}/{repo} --json closingIssuesReferences` (GitHub issues only) |
| gitlab | `glab api projects/{id}/merge_requests/{iid}/closes_issues` (GitLab issues only) |
| bitbucket | No API. Read ticket keys from the PR title, description, source branch and commits (`GET /2.0/repositories/{workspace}/{repo}/pullrequests/{id}/commits`) |

On every host, keys for a ticket in another tracker (Linear, Jira) come from
the PR title, description, branch and commits, as in the Bitbucket row. Read
each one with the tracker pack's `## Reading a ticket`.

### Find PRs that mention an issue

| Host | Command |
|------|---------|
| github | `gh pr list -R {owner}/{repo} --state all --limit 1000 --search '"<ticket-id>" in:title,body' --json number,title,state,isDraft,mergedAt,baseRefName,headRefName`; a result count equal to the limit is `unreachable (page limit)`. For an issue in the same repo, also its timeline, keeping only PRs in this repo (other repos' PRs cross-reference it too): `gh api --paginate repos/{owner}/{repo}/issues/{number}/timeline --jq '.[] \| select(.event == "cross-referenced" and .source.issue.pull_request and .source.issue.repository.full_name == "{owner}/{repo}") \| .source.issue.number'` |
| gitlab | `glab mr list -R {group}/{project} --all --search "<ticket-id>" --per-page 100 --output json`, with `--page` for more until a page has fewer than 100. For an issue in the same project, also `glab api projects/{id}/issues/{iid}/related_merge_requests` and `glab api projects/{id}/issues/{iid}/closed_by` |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/pullrequests?q=title~"<ticket-id>" OR description~"<ticket-id>" OR source.branch.name~"<ticket-id>"&state=OPEN&state=MERGED&state=DECLINED`, following each page's `next` link |

### Find code owners for paths

Read the file at `<rev>`: the commit the caller names, else `<remote>/<base>`.

| Host | Command |
|------|---------|
| github | The first of `.github/CODEOWNERS`, `CODEOWNERS`, `docs/CODEOWNERS` that `git show <rev>:<file>` prints; the last matching pattern wins. Syntax errors: `gh api repos/{owner}/{repo}/codeowners/errors` |
| gitlab | The first of `CODEOWNERS`, `docs/CODEOWNERS`, `.gitlab/CODEOWNERS` that `git show <rev>:<file>` prints; the last matching pattern wins, per `[Section]` |
| bitbucket | `git show <rev>:.bitbucket/CODEOWNERS` (with `.bitbucket/teams.yaml` for `@teams/...`); the last matching pattern wins |
| all | No file, or no pattern matches: recent committers. Write the path NUL-terminated to a file (`<pathfile>`, from git output, never typed from PR text) and run `xargs -0 -r git --literal-pathspecs log <rev> --since=1.year --format='%an <%ae>' -- < <pathfile> \| sort \| uniq -c \| sort -rn` (`git log` has no `--pathspec-from-file`; `xargs` runs git with no shell, and `--literal-pathspecs` turns off glob and magic. `-r` runs nothing on an empty list; without it GNU xargs runs `git log <rev> --` once with no path, which counts the whole repo. An empty list is `empty`. Raw `%an <%ae>`, not `%aN`: git reads `.mailmap` from the current directory's working tree, which can hold the PR's own, and `mailmap.file`/`mailmap.blob` do not turn that off. Group one person's names and emails yourself. Owners by history, not by rule) |

### Find the PR that merged a commit

Confirms who stands behind a commit: the author of the PR that merged it, as
the host records it, not the git author name, which anyone can set. No merged
PR, or more than one: unconfirmed.

| Host | Command |
|------|---------|
| github | `gh api repos/{owner}/{repo}/commits/<sha>/pulls --jq '[.[] \| select(.merged_at != null) \| {number, author: .user.login, merged_at}]'` (the endpoint also lists open PRs that contain the commit; keep only merged ones) |
| gitlab | `glab api "projects/{id}/repository/commits/<sha>/merge_requests?state=merged"`, field `author.username` (the `state` filter needs GitLab 18.2 or later; without it, keep `state == "merged"`) |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/commit/<sha>/pullrequests`, following each page's `next` link; keep `state == "MERGED"`, field `author`. Needs the Pull Request Commit Links app installed on the repo; a failure is unconfirmed |

### Find required approvals for a branch

| Host | Command |
|------|---------|
| github | Rulesets: `gh api --paginate --slurp repos/{owner}/{repo}/rules/branches/<base> \| jq '[.[][] \| select(.type == "pull_request") \| .parameters.required_approving_review_count]'`. Then `gh api repos/{owner}/{repo}/branches/<base> --jq .protected` (no admin needed): `false` means no classic protection, so the ruleset count stands (none: zero). `true` also needs the classic count, `gh api repos/{owner}/{repo}/branches/<base>/protection/required_pull_request_reviews --jq .required_approving_review_count` (admin only); the larger of the two applies. If that read fails (e.g. `Not Found` without admin), the count is unknown (unreadable), never zero or the ruleset count alone |
| gitlab | Branch-scoped (Premium or Ultimate): `glab api --paginate projects/{id}/approval_rules`; a rule applies to `<base>` when `<base>` is in its `protected_branches[].name`, when `applies_to_all_protected_branches` is true and `<base>` is protected, or when it has neither (all branches). Each matching rule needs its own `approvals_required`. For an existing MR, `glab api projects/{id}/merge_requests/{iid}/approvals`, field `approvals_required`. If the call fails (e.g. on Free), the count is unknown (unreadable) |
| bitbucket | Bitbucket REST: `GET /2.0/repositories/{workspace}/{repo}/branch-restrictions?kind=require_approvals_to_merge` and `?kind=require_default_reviewer_approvals_to_merge` (approvals that must come from default reviewers), following each page's `next` link. A rule matches the destination branch by its `branch_match_kind`: `glob` by `pattern`; `branching_model` by `branch_type`, the destination's type from `GET /2.0/repositories/{workspace}/{repo}/effective-branching-model` (`development`/`production` by `name`, the other types by `prefix`). The count is the largest matching `value` across both kinds; when a default-reviewer rule matches, add `(N from default reviewers)` to the count's note. If the branch type cannot be resolved, or a page was not read, the count is unknown, not zero |

---

## Extracting owner/repo/project identifiers

Each platform identifies repositories differently:

| Host | Identifier | How to extract |
|------|-----------|---------------|
| github | `{owner}/{repo}` | Parse from the URL of the remote that holds the PR (`git remote -v`); in a fork clone, `origin` is the fork and the PRs are usually on `upstream` |
| gitlab | `{id}`: the URL-encoded project path, or its numeric ID | Take `{group}/{project}` from the MR URL or the URL of the remote that holds the MR (`git remote -v`); encode each `/` as `%2F` (`gitlab-org%2Fcli`). Numeric ID: `glab api projects/<group>%2F<project> --jq .id` |
| bitbucket | `{workspace}/{repo}` | Parse from the URL of the remote that holds the PR (`git remote -v`); in a fork clone, `origin` is the fork |

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
