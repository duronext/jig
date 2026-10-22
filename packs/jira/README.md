# Jira Tracker Pack

Integration pack for teams using [Jira](https://www.atlassian.com/software/jira) as their ticket system.

## Prerequisites

- A Jira MCP server connected (see Setup below)
- `ticket-system: jira` in `jig.config.md`
- `## Jira` section in `jig.config.md` with project key

## Setup

Several Jira MCP servers work with Claude Code. Pick one:

### Option A: Atlassian Official (Cloud)

```bash
claude mcp add atlassian -- npx -y mcp-remote https://mcp.atlassian.com/v1/sse
```

Authenticates via OAuth in browser. Best for Atlassian Cloud instances.

### Option B: Community Server (Cloud + Data Center)

```bash
claude mcp add jira -e JIRA_URL=https://yourcompany.atlassian.net -e JIRA_TOKEN=your-api-token -e JIRA_EMAIL=you@company.com -- npx -y @sooperset/mcp-atlassian
```

Supports both Cloud and Data Center. API token auth.

### Option C: Standalone Jira Server

```bash
claude mcp add jira -e ATLASSIAN_BASE_URL=https://jira.yourcompany.com -e ATLASSIAN_TOKEN=your-pat -- npx -y @aashari/mcp-server-atlassian-jira
```

Best for self-hosted Jira instances with PAT auth.

After adding, restart Claude Code and verify: `claude mcp list`

## How It Works

When `ticket` creates an issue and `ticket-system` is `jira`, it reads this pack for:

1. **Tool mapping** — which MCP tool to call and how to structure the payload
2. **Field mapping** — how Jig issue types map to Jira issue types
3. **Branch naming** — constructed from issue key

## Creating a Ticket

The exact tool name depends on which MCP server is installed. Common patterns:

**Atlassian Official / sooperset:**
```
mcp__atlassian__create_issue or mcp__jira__create_issue with:
  project:     {project-key from jig.config.md}
  summary:     {title}
  description: {markdown or ADF body}
  issuetype:   {mapped issue type name}
  priority:    {priority name, if configured}
  assignee:    {email or account ID, optional}
```

**aashari server:**
```
mcp__jira__create_issue with:
  projectKey:  {project-key}
  summary:     {title}
  description: {description}
  issueType:   {Bug, Story, Task, etc.}
```

**If the exact tool name is unclear**, list available tools:
```
Search for MCP tools matching "jira" or "atlassian" — look for create_issue,
create-issue, or similar.
```

## Issue Type Mapping

Jira has built-in issue types. Map Jig types to Jira:

| Jig Type | Jira Issue Type | Notes |
|----------|----------------|-------|
| Feature | `Story` | Some teams use `New Feature` |
| Improvement | `Improvement` | Falls back to `Story` if not available |
| Bug | `Bug` | Universal |
| Task | `Task` | Universal |
| Refactor | `Task` | With "refactor" label if team uses labels |
| Incident | `Bug` | With "incident" priority or label |

Teams can override these mappings in `jig.config.md`:

```yaml
## Jira
issue-types:
  feature: Story
  improvement: Story
  bug: Bug
  task: Task
  refactor: Task
```

## Estimate Mapping

Jira supports several estimation fields depending on team configuration:

| Jira Field | When to Use |
|-----------|-------------|
| `story_points` | Scrum teams using story points |
| `timetracking.originalEstimate` | Teams estimating in time (e.g., "4h", "2d") |
| Custom field | Teams with custom estimation fields |

Read `## Estimates` from `jig.config.md` for the team's scale and unit:

```yaml
## Estimates
scale: [1, 2, 3, 5, 8, 13]
unit: points
```

If `unit: hours`, convert to Jira time format: `4` → `"4h"`, `16` → `"2d"`.
If `unit: points`, use the `story_points` field.

## Branch Naming

Jira doesn't provide a branch name in the response. Construct from the issue key:

```
{username}/{key}-{kebab-title}
```

Example: `dustin/PROJ-567-fix-export-crash`

Read `branching.format` from `jig.config.md` if the team has a custom format.

## Team Configuration

Add to your project's `jig.config.md`:

```yaml
## Jira
project-key: PROJ
# board-id: 123                    # optional, for sprint assignment
# issue-types:                     # optional, override defaults
#   feature: Story
#   bug: Bug
#   task: Task

## Estimates
scale: [1, 2, 3, 5, 8, 13]
unit: points
```

**Multiple projects:** If your repo spans multiple Jira projects, set the default and override per-ticket:

```yaml
## Jira
project-key: PROJ              # default project
# The ticket skill will ask which project if ambiguous
```

## Searching Existing Issues

Before creating a ticket, the `ticket` skill may search for duplicates:

```
mcp__jira__search_issues with:
  jql: "project = PROJ AND summary ~ 'export crash' ORDER BY created DESC"
```

Or:
```
mcp__atlassian__search_issues with:
  query: "export crash"
  project: "PROJ"
```

## Reading a ticket

For skills that need a ticket's context, such as `pr-brief`. Use the server's
get-issue tool (e.g. `getJiraIssue` on Atlassian's server, `jira_get_issue` on
sooperset), or the REST API (`/rest/api/2` on Data Center):

```
GET /rest/api/3/issue/{key}?fields=summary,description,status,creator,reporter,assignee,parent,issuelinks
GET /rest/api/3/issue/{key}/comment?startAt={n}   # page until startAt + maxResults >= total
GET /rest/api/3/issue/{key}/remotelink            # web links, sometimes PRs
```

- **Relations** — `issuelinks` (each with its link type) and `parent`.
- **Linked PRs** — Jira's development panel has no public API. Run "Find PRs
  that mention an issue" in `framework/GIT_HOST.md` with the issue key, and
  add any PR in `remotelink`.
- A call that fails means the ticket is unread, not empty.

### Closing behavior

Unknown by default. Transitions on PR merge come from the site's automation
rules and its Git integration (for example smart commits such as
`PROJ-123 #done`), which this pack cannot see. Say the result is unknown
unless the team has told you how its rules work. The same applies when
several PRs link to one issue.

## Status

Core functionality documented. Tested against Atlassian Cloud. Data Center support depends on which MCP server is used. Contributions welcome for edge cases.

Sources:
- [Atlassian Official MCP Server](https://github.com/atlassian/atlassian-mcp-server)
- [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian)
- [aashari/mcp-server-atlassian-jira](https://github.com/aashari/mcp-server-atlassian-jira)
