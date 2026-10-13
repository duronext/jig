# Live PRD

A PRD published as a Jig page is a live document. People tick milestones,
record decisions and sign off on the page. Jig writes to the same place from
Claude Code as the work moves through the pipeline. The result is one page
that says what we are building and how far along it is.

This file is the contract between the page (`core/skills/prd/reference/live.js`)
and every skill that writes to it.

## Where the state lives

| Mode | When | State lives in |
|------|------|----------------|
| **Artifact** | `prd-publish: artifact` and the platform can publish artifacts (Claude Code, Claude.ai, desktop) | The artifact's shared database, written with the `ArtifactData` tool |
| **File** | `prd-publish: file`, or no artifact tools (Gemini, Codex, CI) | The `*-prd.md` file itself: `- [x]` milestones and a `## Log` section |

Every skill below checks which mode applies and writes to that one. A PRD can
start as a file and be published later; the file's log entries are copied into
the artifact on first publish.

**Never block the pipeline on a PRD write.** If a write is refused (no access,
no tools, a conflict you cannot resolve), carry on with the work and say once,
in the stage's summary, that the live PRD was not updated and why.

## Finding the PRD

Skills find the PRD in this order:

1. The `> **PRD:**` line in the plan header, then in the spec header
2. A PRD link or path the user gave in this session
3. `{plans-directory}/*-prd.md` matching the branch topic

If the pointer is a `*-prd.md`, read its header's `Page:` line. When it holds
an artifact link, write to the page (artifact mode); otherwise write to the
file (file mode).

A PRD link is the artifact URL (`https://claude.ai/artifact/...`). Its page
carries the Markdown source in `<script type="text/markdown" id="prd-source">`
and its definitions (milestones, decisions, approvers, outcomes, rev) in
`<script type="application/json" id="prd-data">`. Read both with the Artifact
tool's `read` action.

## Collections

All documents are plain JSON. Times are ISO 8601 UTC. `by` is a person's
opaque id when a person acted (`actor: "person"`, written by the page), and
`null` when Jig acted (`actor: "jig"`). Never store names: the page resolves ids to names when it
renders.

### `milestones/<id>`

```json
{ "done": true, "at": "2026-11-14T18:02:00Z", "by": null, "actor": "jig",
  "note": "Tasks 4-9 passed review · 3f2a91c" }
```

`<id>` matches a milestone in `prd-data` (`m1`, `m2`, ...).

### `decisions/<id>`

A decision defined in `prd-data` needs only the outcome:

```json
{ "choice": "A", "at": "...", "by": "u_..." }
```

A decision Jig opens later (from `spec`, `build`, or the PRD check) carries its
own definition, and the page renders it as a new card:

```json
{ "question": "Do retried invoices count once or twice in revenue reports?",
  "options": { "A": "Once, on the day it is paid", "B": "Leave reports alone" },
  "recommended": "A", "why": "Matches how finance closes the month.",
  "owner": "Maya, product", "due": "2026-10-20", "blocks": "MVP.2",
  "source": "spec", "choice": null, "at": "...", "by": null, "actor": "jig" }
```

Use the next free id (`d3`, `d4`, ...). Reopening sets `choice` back to `null`.

### `approvals/<approverId>`

```json
{ "state": "approved", "rev": "C", "at": "...", "by": "u_..." }
```

`state` is `approved` or `withdrawn`.

`<approverId>` matches an approver in `prd-data`. A sign-off counts only for
the rev it names. **Only people sign off. Jig never writes to `approvals`.**

### `trace/<outcomeId>`

```json
{ "status": "verified", "proof": "Staging INV-9001 retried Oct 14, 15, 18",
  "spec": ["S-4", "S-5"], "tasks": ["T3", "T4"],
  "at": "...", "by": null, "actor": "jig" }
```

`spec` lists the spec's acceptance item ids (`S-n`) and `tasks` the plan's
task ids (`T<n>`) that serve this outcome. `status` is one of `not-started`, `built`, `verified`, `deferred`. `built` means
the code exists; `verified` means someone watched it work and wrote down how.
`deferred` needs a `proof` field that says why and who agreed.

### `schedule/<barId>`

```json
{ "startWeek": 2, "endWeek": 6, "from": "2026-10-27", "to": "2026-11-23",
  "at": "...", "by": "u_...", "actor": "person" }
```

`<barId>` matches a `data-bar` on a bar in the week-by-week chart. Weeks
count from 0 at the first week column; `endWeek` is the week after the bar
ends. `from` and `to` are the bar's first and last day, present when the
chart has `data-start`. The page writes these when a person drags a bar and
presses Save. With no record, the bar sits where the page's markup puts it.

A demo diamond's record uses `demo-<milestoneId>` as its id and adds
`milestone` and `due`: the milestone's due date moved by the same number of
weeks. The milestone list shows that `due` in place of the one in
`prd-data`.

### `log/<auto-id>`

```json
{ "at": "...", "by": null, "actor": "jig", "kind": "build",
  "text": "Milestone m3 ticked: tasks 4-9 passed review (3f2a91c).", "ref": "m3" }
```

`kind` is one of: `rev`, `review`, `spec`, `plan`, `build`, `check`, `ship`,
`learn` (written by Jig), and `milestone`, `decision`, `approval`,
`schedule`, `note` (written by the page when a person acts). Keep `text` to one or two sentences
a non-engineer can read. Name commits and PRs; never paste diffs or code.

## Who writes what

| Stage | Skill | Writes |
|-------|-------|--------|
| PRD | `prd` | Publishes the page. `log`: `rev` entry for each published rev. `log`: `review` entry summarizing the `review:prd` findings. |
| Spec | `spec` | `log`: `spec` entry with the spec path and item count. `decisions`: any product question found in the code, with `source: "spec"`. |
| Plan | `plan` | `log`: `plan` entry naming which milestones the plan can complete. |
| Build | `build`, `team-dev`, `sdd` | `milestones`: tick each milestone when its last task in the Milestone Map passes review. `trace`: `built` for outcomes whose spec items all passed. `decisions`: product questions that block tasks. `log`: `build` entries. |
| PRD check | `prd` (check mode) | `trace`: `verified` or `deferred` per in-scope outcome. `log`: `check` entry. |
| Ship | `finish` | `milestones`: tick any milestone the merge completes. `log`: `ship` entry with the PR link. |
| Learn | `postmortem` | `log`: `learn` entry with the one or two lessons that changed a skill. |

## Rules for writers

- **Read before you write.** Pass the `version` you read as `if_version`. On a
  conflict, re-read and redo the write against the new state; never force it.
- **People win.** Do not overwrite a decision a person recorded, re-tick a
  milestone a person reopened, or touch `approvals` or `schedule`. If the evidence says a
  person's state is wrong, write a `log` entry saying so and leave the state.
- **One fact per entry.** A log line is something a reader would want to know
  happened. Batch a run of task completions into one `build` entry.
- **Merge, never replace.** Change only your own fields so fields another
  writer added survive (Jig's `note` on a milestone, a decision's
  `question`). Jig uses `ArtifactData` `update` pinned with `if_version`; the
  page uses the database's server-side `update()`, falling back to `set()`
  only for a document that does not exist yet.
- **Never overwrite a change you have not seen.** Jig pins every write with
  the `version` it read (`if_version`) and re-reads on a conflict. The page
  takes a short lease on the record (`acquire`, 5 s, held per open copy of
  the page) and checks the record's
  `at` still matches what it last showed; if someone else is changing it or
  just changed it, the page says so and writes nothing.
- **Batch writes.** When Jig ticks a milestone and logs it, send both in one
  `ArtifactData` `batch`. The page cannot batch (its database has no
  multi-document writes), so it writes the change first and the log entry
  second, and tells the person if only the log entry failed.
- **Plain words.** Log text follows the PRD voice rules in
  `core/skills/prd/reference/voice.md`.

## File mode

When the PRD is a plain `*-prd.md`:

- Milestones are a checklist under `## Milestones`. Tick with `- [x]` and add
  ` · done 2026-11-14, tasks 4-9` to the line.
- Decisions get `**Decided: A** · 2026-10-16 · Rae` under their heading.
- The trace is a table under `## Trace`; update its status column.
- Append log entries to the end of `## Log` as
  `- 2026-11-14 18:02 · jig · build · Milestone m3 ticked ...`.
- Commit these edits with the work they describe.
