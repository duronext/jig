# Jira Tracker Pack

Integration pack for teams using Jira as their ticket system.

## Prerequisites

- Jira MCP server connected, or Jira REST API access configured
- `ticket-system: jira` in `jig.config.md`

## Creating a Ticket

Via Jira MCP tools or REST API:

```
POST /rest/api/3/issue
{
  "fields": {
    "project": { "key": "{project-key}" },
    "summary": "{title}",
    "description": "{ADF body}",
    "issuetype": { "name": "Bug" }
  }
}
```

## Issue Type Mapping

| Jig Type | Jira Issue Type |
|----------|----------------|
| Feature | Story |
| Improvement | Improvement |
| Bug | Bug |
| Task | Task |
| Refactor | Task (with "refactor" label) |

## Branch Naming

Constructed from issue key: `{username}/{key}-{kebab-title}` (e.g., `dustin/proj-567-fix-export`)

## Status

Stub — full implementation coming. Contributions welcome.
