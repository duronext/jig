# PR brief: inputs

How to build the input folder. Host commands live in one place,
`framework/GIT_HOST.md`. This file names the heading of each operation (use
the row for your `git-host`) and says what to write. It shows only the plain
`git` steps, which are the same on every host. Run each `git` command in the
local clone, as `git -C <clone> …`. `<n>` is the PR number.

## Rules

- **Fail closed.** `sources.md` has one line per source:
  `<key>: fetched | empty | unreachable (<error>)`. A failed call, a
  permission error, a missing tool or a page limit is `unreachable`, never
  `empty`. The keys, in this order:

  `pr, tree, base_commit, main_commits_since_base, diff, base_pr,
  required_approvals, checks, inline, reviews, conversation, alerts, ticket,
  linked_prs, codeowners, areas, docs_authors`

  Fixed `empty` forms: `base_pr: empty (base is main)`,
  `ticket: empty (no ticket reference)` and
  `linked_prs: empty (no ticket reference)`. Add a line per binary file
  (`binary: <path> (content not reviewed)`), and the lines SKILL.md adds for
  the runs, the merge and the agent type.
- **Unreachable inside a file.** A key in `pr.json`, `threads.json`,
  `ticket.json` or `owners.json` that could not be read holds
  `{"unreachable": "<error>"}`. Never write `[]`, `null` or `0` for it.
- **Stop** when the PR, its diff, its head commit or the base commit cannot
  be read. Say which one failed and the error. Every other source may be
  unreachable; the brief lists it under "Not checked".
- **Limits.** Follow every page to the end. When a list call has a limit and
  the result count equals that limit, the source is
  `unreachable (page limit)`.
- **Read only.** Run only the read commands of each row. Never post, comment,
  label, dismiss or change the PR or the ticket.
- **Never run code from the PR.** Do not install, build, test or run scripts
  in `tree/`.
- **Names.** Every `git log` here uses `%aN` and `%aE`, so `.mailmap` merges
  aliases. Bots: names ending in `[bot]`; on GitHub also no-reply logins
  ending in `[bot]`, and `Copilot`.

## Steps

### 1. The PR, in memory first — "View a PR by number"

Owner and repo come from the PR URL the user gave, else from the clone's
remotes (see "Extracting owner/repo/project identifiers" in
`framework/GIT_HOST.md`). Read the PR before any fetch and before any folder
exists. If it cannot be read, show the error in the chat and stop; write
nothing. If `state` is merged or closed, tell the user and ask whether to
continue.

### 2. Remote and main branch

- `<remote>` is the remote whose URL matches that owner and repo
  (`git remote -v`). Never assume `origin`: in a fork setup, `origin` is the
  fork. If no remote matches, stop and say so.
- `<main>` is `main-branch` from `jig.config.md`. If the config or the key is
  missing, use the host's default branch ("View the repository's default
  branch"). Never guess `main`.

### 3. The folder

```bash
root="${TMPDIR:-/tmp}"; root="${root%/}/jig-pr-brief"
folder="$root/<owner>-<repo>-<n>-<head-sha-7>"
```

If `$root` or `$folder` exists and another user owns it, stop and say so.
If `$folder` exists, ask, numbering only the options you show:

```
PR #<n> at <head-sha-7> already has a folder: <folder>

1. Show the existing brief           <- only if brief.md exists
2. Collect again and write a new brief
3. Stop

Which option?
```

"Collect again":
1. If `<folder>/tree` exists, remove it through the clone that made it:
   `git -C "$(git -C <folder>/tree rev-parse --git-common-dir)/.." worktree
   remove --force <folder>/tree`.
2. Move every other entry of the folder, except earlier `old-*` folders, to
   `<folder>/old-<YYYYmmdd-HHMMSS>/`.

Create the folder private, in a subshell so the umask does not leak:

```bash
( umask 077 && mkdir -p "$folder" ) && chmod 700 "$folder"
[ -O "$root" ] && chmod 700 "$root"
```

Then write `pr.json`:

```json
{
  "number": 0, "url": "", "title": "", "body": "", "author": "",
  "state": "", "isDraft": false, "labels": [""],
  "isCrossRepository": false, "createdAt": "", "updatedAt": "",
  "mergedAt": null, "merge_commit": null,
  "base_branch": "", "head_branch": "", "head": "<headRefOid>",
  "main_branch": "",
  "base_commit": "<sha>",
  "main_commits_since_base": 0,
  "base_commits_since_head": 0,
  "base_files_since_head": [""],
  "base_pr": null,
  "required_approvals": 0,
  "required_approvals_main": 0,
  "checks": {"required": [""], "runs": [{"name": "", "state": ""}],
             "required_not_passed": [""], "missing_reason": "",
             "required_main": [""], "required_main_not_run": [""]}
}
```

Steps 4 to 8 fill the keys after `main_branch`. `required_approvals_main`,
`checks.required_main` and `checks.required_main_not_run` exist only for a
stacked PR (`base_pr` set); leave them out otherwise.

### 4. `tree/` — "Fetch a PR's head commit locally"

`<ref>` is `refs/jig-pr-brief/<n>-<head-sha-7>`, so two briefs of one PR at
different heads never share refs. Fetch the head as the row says, with
`<ref>` as its `<local-ref>`. Fetch the base and main branches into named
refs too, so a narrow refspec or a single-branch clone still works. Record
each failure:

```bash
git -C <clone> fetch --no-tags <remote> +refs/heads/<base-branch>:<ref>-base
git -C <clone> fetch --no-tags <remote> +refs/heads/<main>:<ref>-main
git -C <clone> rev-parse <ref>   # must match the PR's head SHA (as the row says); else stop
git -C <clone> worktree add --detach <folder>/tree <ref>
```

When the base branch is `<main>`, fetch it once: in place of the second
fetch, run `git -C <clone> update-ref <ref>-main <ref>-base`.

**Merged PR.** "View a PR by number" gives the merge commit (`merge_commit`
in `pr.json`; for a squash, the squash commit). Fetch it:
`git -C <clone> fetch --no-tags <remote> +<merge-sha>:<ref>-merge`. Where
the host gives a short hash, resolve it from `<ref>-base` or `<ref>-main`
with `git rev-parse` and `update-ref` it instead. A failure here stops. A
merged PR with no merge commit (fast-forward): record
`base_commit: unreachable (fast-forward merge, no merge commit)` and stop.
A base branch deleted after the merge is not a stop: `base_commit` comes
from the merge commit, and `sources.md` gets
`base_commit: fetched (from merge commit; base branch <name> deleted)`.
When the merge commit has one parent, check after Step 6 that the first
field of `git -C <clone> diff <ref>-merge^1 <ref>-merge | git patch-id
--stable` equals that of `git patch-id --stable < diff.patch`. If it does
not (a rebase merge), record `base_commit: unreachable (rebase merge)` and
stop.

On hosts with a PR ref (GitHub, GitLab), the head of a fork PR is in the
base repository: fetch it from `<remote>`. On Bitbucket, fetch from the
fork's URL as the row says, without adding a remote.

**Shallow clone.** If `git rev-parse --is-shallow-repository` prints `true`,
run `git fetch --no-tags --unshallow <remote>`. If that fails, run
`git fetch --no-tags --shallow-since=<date> <remote>`, where `<date>` is one
year before the earlier of the PR's `createdAt` and the commit date of
`<ref>-base` (`<ref>-merge` for a merged PR). If the clone is still shallow,
record `areas` and `docs_authors` as `fetched (history since <date>)`.

### 5. Base facts (plain `git`)

`base_commit` is where the PR's history starts: for a merged PR, the merge
commit's first parent; otherwise the merge-base. `<landing>` is the code the
merge lands on: `base_commit` for a merged PR, else `<ref>-base`.

```bash
git -C <clone> rev-parse <ref>-merge^1                         # base_commit, merged PR
git -C <clone> merge-base <ref>-base <ref>                     # base_commit, otherwise
git -C <clone> rev-list --count <base_commit>..<ref>-main      # main_commits_since_base (merged: add ^<ref>-merge)
git -C <clone> rev-list --count <ref>..<landing>               # base_commits_since_head
git -C <clone> diff --name-only "$(git -C <clone> merge-base <ref> <landing>)" <landing>   # base_files_since_head
```

On a merged PR, `^<ref>-merge` keeps the PR's own merge and commits out of
`main_commits_since_base`. Write `base_commit` as a SHA, both counts as
numbers and the file list as an array. If the merge fetch, the base fetch
(unless the PR is merged), or `merge-base` fails (after the shallow step),
stop. If only the main fetch fails, `main_commits_since_base` is
unreachable.

### 6. `diff.patch` — "Fetch a PR's diff"

If the host refuses (the row names the size limits), use the row's local
`git diff` and write `diff: fetched (local git diff; host said: <error>)`.
If both fail, stop. List each binary file (`Binary files … differ`) in
`sources.md`.

### 7. `base_pr` — "Find the open PR/MR for a branch (by its head branch)"

When the base is `<main>`, write `base_pr: null` and
`base_pr: empty (base is main)`. Otherwise look up the open PR whose head is
the base branch. The match that is not a fork PR is the base PR: write
`{number, title, base_branch}`. No match: `null`, recorded as `fetched` (a
long-lived branch, not a stack).

### 8. Approvals and checks

**`required_approvals`** — "Find required approvals for a branch", for the
base branch. Write the count the row gives; when the row adds a note, put it
on the `required_approvals` line in `sources.md`. Missing rules are not zero:
where the row says the count is unknown, write
`{"unreachable": "<error>"}`, never `0` or `null`. For a stacked PR
(`base_pr` set), do the same for `<main>` into `required_approvals_main`.

**`checks`** — "List CI checks for a PR/MR":
- `required`: the base branch's required checks, from its rules or
  protection as the row says, never from what reported. Where the row says
  it is unknown, write `{"unreachable": "<error>"}`, never `[]`.
- `runs`: every check that ran on the head, with its state.
- `required_not_passed`: required checks that are missing, pending or failed.
- `missing_reason`: the runs that wait for approval (`action_required`, e.g.
  a fork PR), when the row finds any.
- Stacked PR only: `required_main`, the main branch's required checks, and
  `required_main_not_run`, those that did not run on the head.

### 9. `threads.json` — every comment source

| Key | Operation (GIT_HOST.md heading) |
|-----|---------------------------------|
| `inline` | "Fetch review threads with resolution state" |
| `reviews` | "Fetch review summaries and top-level PR/MR comments" (review bodies) |
| `conversation` | "Fetch review summaries and top-level PR/MR comments" (top-level comments) |
| `alerts` | "Code-scanning alerts on a PR/MR": only the results attached to the PR head's check runs, never the repo-wide alert list |

```json
{
  "inline": [{"path": "", "isResolved": false, "isOutdated": false,
              "comments": [{"author": "", "bot": false, "createdAt": "", "body": ""}]}],
  "reviews": [{"author": "", "bot": false, "state": "", "commit": "", "submitted_at": "", "body": ""}],
  "conversation": [{"author": "", "bot": false, "created_at": "", "body": ""}],
  "alerts": [{"tool": "", "report": "", "rule": "", "severity": "", "path": "", "message": ""}]
}
```

`bot` comes from the host's author type. No code-scanning check run on the
head: `alerts` is `{"unreachable": "no code-scanning check run"}`. The
`alerts` line in `sources.md` names the tools that ran, each required
code-scanning check (in `required` or `required_main`) that did not run,
and each code-scanning workflow in `missing_reason`, e.g.
`alerts: empty (Semgrep ran; required "Analyze" did not run)` or
`alerts: unreachable (no code-scanning check run; "Code Scanning" awaits
approval)`. A report that does not state it covers only the PR's changes
(e.g. some Bitbucket Code Insights reports): keep its results with `report`
set, and write `alerts: fetched (scope unknown: <report>)`.

### 10. `ticket.json` — the tracker pack

**The pack.** `packs/<pack>/README.md`, section "Reading a ticket":

| `ticket-system` | Pack |
|-----------------|------|
| `github` | `packs/github-issues/` |
| `linear` | `packs/linear/` |
| `jira` | `packs/jira/` |
| unset | The host's issue pack (`github` → `packs/github-issues/`) |
| `none` | No tracker: the no-ticket path below, unless the host returns an issue the PR closes; read that one with the host's issue pack |

Any other value with no pack: `ticket: unreachable (no pack for <value>)`.
A pack with no "Reading a ticket" section, or whose tool is not connected:
the ticket is unreachable.

**Ticket IDs.** Collect them from "Find issues a PR closes", and from the
title, body, head branch and commit messages in the pack's ID form
(`ticket-prefix`, when set, narrows it, e.g. `ENG-<n>`). This applies when
`ticket-system` is unset too. Match case-insensitively (`eng-12` is
`ENG-12`). An ID inside a file path, or in a URL that is not a tracker link,
does not count. Drop a `#n` that the host resolves to a PR. Write `id` in
the pack's ID form.

**Linked PRs.** Follow the pack's "Linked PRs" bullet, and always add the
results of "Find PRs that mention an issue", without duplicates. Run the
search even when the ticket is unreachable.

```json
{
  "id": "", "url": "",
  "ticket": {"title": "", "description": "", "status": "", "createdBy": "",
             "assignee": "", "relations": "<the pack's shape>", "labels": []},
  "comments": [{"author": "", "createdAt": "", "body": ""}],
  "referenced_tickets": [{"id": "", "title": "", "status": "", "createdBy": ""}],
  "other_tickets": [{"id": "", "title": "", "status": "", "createdBy": "",
                     "first_paragraph": ""}],
  "linked_prs": [{"repo": "<owner>/<repo>", "number": 0, "title": "",
                  "state": "", "isDraft": false, "mergedAt": null,
                  "base_branch": "", "head_branch": ""}],
  "closing": "<the pack's closing behavior, as text>"
}
```

- `ticket` is the main ticket: the one in the head branch, else the first
  one found. `referenced_tickets` holds the tickets the main ticket's
  relations name. `other_tickets` holds every other ticket the PR names; a
  ticket that is also a relation appears once, in `referenced_tickets`.
- `relations` keeps the shape the pack returns (for example, an object of
  lists by relation type), and includes `parentId` when the pack returns it.
- `closing` copies the pack's closing behavior: which words or links move
  the ticket on merge, which do not, which base branch counts, and what
  happens with several linked PRs. Copy "unknown" where the pack says so.
- **No ticket:** the file is only `{"ticket": null}`; `sources.md` has
  `ticket: empty (no ticket reference)` and
  `linked_prs: empty (no ticket reference)`.
- **Ticket not readable:** `"ticket": {"unreachable": "<error>"}`, with `id`,
  `linked_prs` and `closing` still set. It is unknown, not absent.

### 11. `owners.json` — code owners and committers

`<rev>` is `base_commit`, or for a stacked PR the merge-base of the head with
`<ref>-main` (Step 4).

- `codeowners`: "Find code owners for paths", with `base_commit` as the
  row's `<rev>`. For each changed path, the owners of the last matching
  pattern.
- `author_git_names`: the `%aN` of the PR's commits
  (`git log --format='%aN%x09%aE' <base_commit>..<head>`), plus the `%aN` of
  every commit at `<rev>` by one of those emails or by the author's host
  no-reply address.
- `areas`: group the changed files by area: the nearest folder with its own
  package manifest, never the repo root; else the first two path segments.
  For each area, run the `all` row of "Find code owners for paths" with
  `<rev>`, and drop bots. Write the top five other committers as
  `non_author`, and `author_share` as `"<author commits>/<all commits> commits"`.

```json
{
  "author_git_names": [""],
  "codeowners": {"<path>": ["@owner"]},
  "areas": {"<area>": {"non_author": [["<name>", 0]], "author_share": "0/0 commits"}}
}
```

### 12. `docs_authors.json` — who wrote the specs

The Markdown files under `plans-directory` (unset: skip it) and `docs/` at
the head, plus each spec the description or ticket links or names that is
in `tree/`. A missing
folder: `docs_authors: empty (<dir> absent)`. For each file, count commits
per `%aN` (the `%aE` matches the PR author, as in `author_git_names`):

```bash
git -C <folder>/tree log --format='%aN%x09%aE' -- <file>
```

```json
{"files": {"<path>": {"<author>": 0}}}
```

Over 300 files: first keep every file the description or ticket links or
names, and every file under `plans-directory` whose path contains a ticket
ID. Rank the rest by how many distinct terms of this list they contain,
break ties by path, and fill up to 300; never keep a file that matches no
term. Write `docs_authors: fetched (<k> of <N> files: <p> named or
ticket-ID, rest by term rank; zero-term files dropped)`. The terms:
- changed paths, except manifests and lockfiles;
- ticket IDs;
- code identifiers of 4 characters or more from the diff's added lines that
  are not comments: camelCase, PascalCase (two or more capitalised parts,
  e.g. `RevisionStatus`), or names with `_` or a digit.

## Edge cases

| Case | Handling |
|------|----------|
| Fork PR | Step 4. Never run its code. |
| No config | `<main>` from the host's default branch (step 2). |
| Shallow clone | Unshallow after the PR read; a failed merge-base stops (steps 4, 5). |
| No ticket | `{"ticket": null}`; the review flags a thin description. |
| Draft or superseded PR | Collect as usual; the review decides. |
| Stacked PR | `base_pr` set; history, approvals and required checks also from `<main>`. |
| Binary files | Listed in `sources.md`; never decoded. |
| Diff too large for the host | Local `git diff` (step 6), recorded. |
| Merged or closed PR | Ask before continuing (step 1); merged: base from the merge commit (steps 4, 5). |
