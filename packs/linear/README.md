# Linear Tracker Pack

Integration pack for teams using [Linear](https://linear.app) as their ticket system.

## Prerequisites

- Linear MCP server connected (`mcp__linear-server__*` tools available)
- `ticket-system: linear` in `jig.config.md`
- `## Linear` section in `jig.config.md` with team ID and label mappings (optional but recommended)
- `## Estimates` section in `jig.config.md` with the team's scale (optional)

## How It Works

When `ticket` creates an issue and `ticket-system` is `linear`, it reads this pack for:

1. **Tool mapping** — which MCP tool to call and how to structure the payload
2. **Field mapping** — how Jig issue types map to Linear label IDs (from `jig.config.md`)
3. **Branch naming** — uses Linear's `gitBranchName` response field directly

## Creating a Ticket

Read the `## Linear` section from `jig.config.md` for `team-id` and `labels`. Read `## Estimates` for the scale.

Then call:

```
mcp__linear-server__save_issue with:
  teamId:      {team-id from jig.config.md, or look up by team name}
  title:       {title}
  description: {markdown body}
  estimate:    {value from the team's estimate scale}
  labelIds:    [{label ID from jig.config.md labels mapping}]
  assigneeId:  {user ID, or omit if unassigned}
```

### Looking Up Assignees

If the user says "assign to yuri", look up the user:

```
mcp__linear-server__list_users → find by name
```

Use the returned `id` as `assigneeId`.

## Issue Type → Label Resolution

Read `labels` from the `## Linear` section in `jig.config.md`:

```yaml
## Linear
labels:
  feature: f6a13428-...
  improvement: defa5e44-...
  bug: 58ee0937-...
  task: 74e26191-...
  refactor: b6537203-...
  incident: 776064f1-...
```

The `ticket` skill determines the issue type during the interview. Map it to the label ID:

| Interview Answer | Config Key | Label ID from config |
|-----------------|-----------|---------------------|
| Feature | `labels.feature` | `f6a13428-...` |
| Improvement | `labels.improvement` | `defa5e44-...` |
| Bug | `labels.bug` | `58ee0937-...` |
| Task | `labels.task` | `74e26191-...` |
| Refactor | `labels.refactor` | `b6537203-...` |
| Incident | `labels.incident` | `776064f1-...` |

**If labels aren't in config**, look them up dynamically:

```
mcp__linear-server__list_issue_labels with teamId: {team-id}
```

Match by name (case-insensitive). This is slower but works for teams that haven't configured IDs yet.

## Estimate Scale

Read from `## Estimates` in `jig.config.md`:

```yaml
## Estimates
scale: [0, 1, 2, 4, 16, 32]
unit: hours
```

Present the scale during the interview: "Estimate? (0=trivial, 1=1hr, 2=2hrs, 4=half day, 16=2 days, 32=4 days)"

If no `## Estimates` section exists, use Linear's default Fibonacci: `[0, 1, 2, 3, 5, 8, 13, 21]`.

## Branch Naming

Linear's `save_issue` response includes a `gitBranchName` field — the canonical branch name Linear generated (e.g., `dustin/eng-1820-productlane-changelog`).

**Always use `gitBranchName` from the response.** Don't construct the branch name yourself. Linear's format matches the team's branch naming conventions configured in their Linear workspace.

After creating the ticket:

```bash
# On main — create and switch:
git checkout -b {gitBranchName}

# On a feature branch without ticket reference — rename:
git branch -m {current-branch} {gitBranchName}
```

## Team Configuration

Add to your project's `jig.config.md`:

```yaml
## Estimates
scale: [0, 1, 2, 4, 16, 32]
unit: hours

## Linear
team-id: your-team-uuid-here
labels:
  feature: your-feature-label-uuid
  improvement: your-improvement-label-uuid
  bug: your-bug-label-uuid
  task: your-task-label-uuid
  refactor: your-refactor-label-uuid
```

**To find your IDs:**

```
# Team ID
mcp__linear-server__list_teams → find your team → copy id

# Label IDs
mcp__linear-server__list_issue_labels with teamId: {team-id} → copy each id
```

## PRD Document Sync

When `prd-sync: linear` is set in `jig.config.md`, the `prd` skill calls into this pack to push the PRD content to a Linear document after saving locally.

### Configuration

Add to `jig.config.md`:

```yaml
## Documents
plans-directory: docs/plans
prd-sync: linear

## Linear
team-id: your-team-uuid
project-id: your-project-uuid  # required for prd-sync
labels:
  ...
```

### Sync Behavior

After `prd` writes the PRD locally, it calls Linear to create a document linked to the configured project:

```
mcp__claude_ai_Linear__save_document with:
  projectId:   {project-id from jig.config.md}
  title:       {PRD title — derived from filename or PRD overview}
  content:     {markdown body of the local PRD file}
```

If the document already exists for this topic (look up by title within the project), update it in place rather than creating a duplicate:

```
mcp__claude_ai_Linear__list_documents with projectId → find by title
mcp__claude_ai_Linear__save_document with id, updated content
```

### Topic-to-Document Mapping

Use the PRD's filename stem (e.g., `2026-05-27-export-feature`) as the document's stable identifier. Format the document title for human readability — strip the date prefix:

```
2026-05-27-export-feature-prd.md  →  document title: "Export Feature — PRD"
```

The mapping is convention-driven, not stored. To re-sync, look up by formatted title.

### Failure Modes

- **`project-id` missing in config** → skip sync, warn user: "PRD sync requested but no `project-id` in `## Linear` config. Set it and re-run `/prd --sync`."
- **Linear MCP unavailable** → skip sync, warn user: "Linear MCP not connected. PRD saved locally only."
- **Document creation fails** → save locally succeeded; surface the Linear error to the user and offer to retry.
