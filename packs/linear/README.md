# Linear Tracker Pack

Integration pack for teams using [Linear](https://linear.app) as their ticket system.

## Prerequisites

- Linear MCP server connected (`mcp__linear__*` tools available)
- `ticket-system: linear` in `jig.config.md`
- `## Linear` section in `jig.config.md` with team and label mapping (optional but recommended)
- `## Estimates` section in `jig.config.md` with the team's scale (optional)

> **Tool namespace:** the current Linear MCP is Linear's own server at
> `https://mcp.linear.app/mcp`, and its tools are `mcp__linear__*`. Older setups may still
> carry a claude.ai-managed Linear connector pointing at `https://mcp.linear.app/sse`, whose
> tools were `mcp__claude_ai_Linear__*`. That SSE endpoint is retired and now 404s — if you
> see both, remove the connector on claude.ai and keep the `/mcp` server.

## How It Works

When `ticket` creates an issue and `ticket-system` is `linear`, it reads this pack for:

1. **Tool mapping** — which MCP tool to call and how to structure the payload
2. **Field mapping** — how Jig issue types map to Linear labels (from `jig.config.md`)
3. **Branch naming** — uses Linear's `gitBranchName` response field directly

**Names, not UUIDs.** The Linear MCP resolves teams, labels, users, and projects by name, so
nothing in `jig.config.md` needs a UUID. Pass the human-readable value straight through.

## Creating a Ticket

Read the `## Linear` section from `jig.config.md` for `team` and `labels`. Read `## Estimates`
for the scale.

Then call:

```
mcp__linear__save_issue with:
  team:        {team from jig.config.md — key like "ENG", or the team name}
  title:       {title}
  description: {markdown body}
  estimate:    {value from the team's estimate scale}
  labels:      [{label name from jig.config.md labels mapping}]
  assignee:    {user name, email, or "me" — omit if unassigned}
```

`labels` **replaces** the issue's full label set; labels not included are removed. When
updating an existing issue, pass every label you want it to keep.

### Assignees

`assignee` accepts a user ID, name, email, or `"me"` — pass it directly. No lookup step is
needed. If a name is ambiguous, disambiguate with `mcp__linear__list_users` (filter with
`query`) and pass the returned `id`.

## Issue Type → Label Resolution

Read `labels` from the `## Linear` section in `jig.config.md`:

```yaml
## Linear
team: ENG
labels:
  feature: Feature
  improvement: Improvement
  bug: Bug
  task: Task
  refactor: Refactor
  incident: Incident
```

The `ticket` skill determines the issue type during the interview. Map it to the label name
and pass it in the `labels` array:

| Interview Answer | Config Key | Passed as |
|-----------------|-----------|-----------|
| Feature | `labels.feature` | `labels: ["Feature"]` |
| Improvement | `labels.improvement` | `labels: ["Improvement"]` |
| Bug | `labels.bug` | `labels: ["Bug"]` |
| Task | `labels.task` | `labels: ["Task"]` |
| Refactor | `labels.refactor` | `labels: ["Refactor"]` |
| Incident | `labels.incident` | `labels: ["Incident"]` |

The mapping exists because the config key is Jig's vocabulary and the value is whatever that
team named the label in Linear — they usually match, but don't have to.

**If labels aren't in config**, look them up:

```
mcp__linear__list_issue_labels with team: {team}
```

Match by name (case-insensitive). Many workspaces nest these under a parent label group such
as "Issue Type"; pass the leaf name (`"Bug"`), not the group path.

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
team: ENG
labels:
  feature: Feature
  improvement: Improvement
  bug: Bug
  task: Task
  refactor: Refactor
```

**To check the names your workspace uses:**

```
mcp__linear__list_teams                          → team names
mcp__linear__list_issue_labels with team: {team} → label names
```

## Document Sync

When `prd-sync: linear` or `spec-sync: linear` is set in `jig.config.md`, the `prd` and `spec` skills call into this pack to push the document to Linear after saving locally.

### Configuration

Add to `jig.config.md`:

```yaml
## Documents
plans-directory: docs/plans
prd-sync: linear
spec-sync: linear

## Linear
team: ENG
docs-project: Product Requirement Documents  # required for document sync; the dedicated documents project
labels:
  ...
```

`docs-project` is intentionally distinct from any ticket project: documents sync to a dedicated
documents project, which is usually separate from where issues are filed. Configs from Jig 1.x
that set `prd-project` keep working; treat it as `docs-project`.

### Sync Behavior

After `prd` or `spec` writes its document locally, it calls Linear to create a document linked to the configured project:

```
mcp__linear__save_document with:
  project:  {docs-project from jig.config.md}
  title:    {document title, see below}
  content:  {markdown body of the local file}
```

For a PRD with a live page, put the page link on the first line of `content` (`Live page: https://claude.ai/artifact/...`).
The page is where milestones, decisions and sign-off are tracked; the Linear document is a copy of the text.

If the document already exists for this topic, update it in place rather than creating a
duplicate. Search by title and confirm the match is in the configured project:

```
mcp__linear__list_documents with query: {title}, fields: ["id", "title", "project"]
  → find the entry whose project.name matches docs-project
mcp__linear__save_document with id: {that id}, content: {updated content}
```

Search by `query` rather than filtering by project — `list_documents` takes `projectId` as a
UUID, and the whole point of this pack is not to make teams hunt for UUIDs.

### Topic-to-Document Mapping

Use the filename stem (e.g., `2026-05-27-export-feature`) as the document's stable identifier. Format the document title for human readability — strip the date prefix and name the kind:

```
2026-05-27-export-feature-prd.md   →  document title: "Export Feature — PRD"
2026-05-27-export-feature-spec.md  →  document title: "Export Feature — Spec"
```

The mapping is convention-driven, not stored. To re-sync, look up by formatted title.

### Failure Modes

- **`docs-project` missing in config** → skip sync, warn user: "Document sync requested but no `docs-project` in `## Linear` config. Set it and re-run the sync."
- **Linear MCP unavailable** → skip sync, warn user: "Linear MCP not connected. Saved locally only."
- **Document creation fails** → save locally succeeded; surface the Linear error to the user and offer to retry.
