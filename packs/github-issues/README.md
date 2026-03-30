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

## Status

Stub — full implementation coming. Contributions welcome.
