# Linear Tracker Pack

Integration pack for teams using [Linear](https://linear.app) as their ticket system.

## Prerequisites

- Linear MCP server connected (`mcp__linear-server__*` tools available)
- `ticket-system: linear` in `jig.config.md`

## How It Works

When `ticket` creates an issue and `ticket-system` is `linear`, it reads this pack for:

1. **Tool mapping** — which MCP tool to call and how to structure the payload
2. **Field mapping** — how Jig issue types map to Linear labels
3. **Branch naming** — uses Linear's `gitBranchName` response field

## Creating a Ticket

Use the Linear MCP tool:

```
mcp__linear-server__save_issue with:
  teamId:      {team ID from team config below, or use team name}
  title:       {title}
  description: {markdown body}
  estimate:    {0|1|2|4|16|32}  (points — roughly equal to hours)
  labelIds:    [{issue type label ID}]
  assigneeId:  {user ID, or omit if unassigned}
```

## Issue Type Mapping

Each team configures their own label IDs. Add your team's mapping below.

| Jig Type | Linear Label | How to find the ID |
|----------|-------------|-------------------|
| Feature | "Feature" label | `mcp__linear-server__list_issue_labels` → find by name |
| Improvement | "Improvement" label | Same |
| Bug | "Bug" label | Same |
| Task | "Task" label | Same |
| Refactor | "Refactor" label | Same |

**To get your team's label IDs**, run:
```
mcp__linear-server__list_issue_labels with teamId: {your team ID}
```

## Estimate Scale

| Points | Meaning |
|--------|---------|
| 0 | Trivial — minutes |
| 1 | ~1 hour |
| 2 | ~2 hours |
| 4 | ~half day |
| 16 | ~2 days |
| 32 | ~4 days |

## Branch Naming

Linear's `save_issue` response includes a `gitBranchName` field — the canonical branch name Linear generated (e.g., `dustin/eng-1820-productlane-changelog`). The `ticket` skill uses this directly instead of constructing its own.

## Team Configuration

Teams should add their specific IDs to their project's `jig.config.md`:

```yaml
## Linear
team-id: 86dd96e6-f7b8-44b2-b46b-d69e875b7596
labels:
  feature: f6a13428-8422-4926-9c95-aee5c53166c6
  improvement: defa5e44-7977-441b-9779-7cbaeb82a0f6
  bug: 58ee0937-2496-42cd-a6f8-6d9de51317ec
  task: 74e26191-523e-486d-aac4-ab981fdb61d0
  refactor: b6537203-7e11-4089-a6c6-15f327986776
```

If these aren't configured, the skill will look up IDs dynamically using the Linear MCP tools (slower but works).
