# Config Template

Generate `jig.config.md` at the project root. This document defines the
complete structure and substitution rules.

---

## Substitution Rules

| Marker | Source | Default |
|--------|--------|---------|
| `{name}` | Q1 answer | (required) |
| `{platform}` | Detection | `claude` |
| `{git-host}` | Detection | `github` |
| `{ticket-system}` | Q2 answer | (required) |
| `{ticket-prefix}` | Q3 answer | omit line if N/A |
| `{main-branch}` | Detection | `main` |
| `{branching-format}` | Derived | see below |
| `{convention}` | Detection | `conventional` |
| `{types}` | Commitlint or default | `[feat, fix, docs, chore, refactor, test]` |
| `{scopes}` | Commitlint or empty | `[]` |

## Branching Format

Derive from ticket system and prefix:

| Ticket System | Format String |
|--------------|---------------|
| `github` | `"{username}/gh-{number}-{kebab-title}"` |
| `linear` | `"{username}/{prefix}-{number}-{kebab-title}"` |
| `jira` | `"{username}/{prefix}-{number}-{kebab-title}"` |
| `other` | `"{username}/{prefix}-{number}-{kebab-title}"` |
| `none` | `"{username}/{kebab-title}"` |

Lowercase the prefix in the format string (e.g., `ENG` -> `eng`).

## Concerns Checklist Lines

For each Q4 selection, generate a line:

```
- {concern-key}: manual
```

Concern key mapping:

| User Selection | Config Key |
|---------------|------------|
| i18n / translations | `i18n` |
| Analytics / event tracking | `analytics` |
| Feature flags | `feature-flags` |
| Database migrations | `migrations` |
| Caching | `caching` |
| Webhooks / external notifications | `webhooks` |
| Event publishing (NATS, Kafka, etc.) | `event-publishing` |
| Security / auth | `security-auth` |
| Responsive layout | `responsive` |

Always append these regardless of Q4 answers:

```
- error-handling: core/specialists/error-handling
- security: core/specialists/security
- test-strategy: manual
```

Note: if the user selected "Security / auth" in Q4, the `security-auth:
manual` line is for the *team's auth patterns*, separate from the core
`security` specialist which checks for vulnerabilities.

## Conditional Sections

### Ticket Prefix Line

- Q2 is `linear`, `jira`, or `other` -> `ticket-prefix: {value}`
- Q2 is `github` or `none` -> `# ticket-prefix:` (commented out)

### Require Ticket Reference

- Q2 is `none` -> `require-ticket-reference: false`
- All others -> `require-ticket-reference: true`

### Tracker Section

Based on Q2, include the appropriate commented-out tracker template:

**linear:**

```yaml
## Linear
# team-id: your-team-uuid
# labels:
#   feature: uuid
#   bug: uuid
#   task: uuid
```

**jira:**

```yaml
## Jira
# project-key: {ticket-prefix}
# board-id: 123
```

**github / none / other:** Include a generic commented template:

```yaml
## Tracker
# Add tracker-specific config here when ready.
# See packs/ for tracker integration setup.
```

## Complete Config Structure

Write `jig.config.md` with all these sections in this order. Use the
scaffold at `scaffold/jig.config.md` as the structural reference — same
section headings, same YAML-in-fenced-blocks format.

1. **Team** — name, platform, git-host, ticket-system, ticket-prefix
2. **Pipeline** — stages list (default), stage overrides (default)
3. **Branching** — format (derived), main-branch (detected)
4. **Concerns Checklist** — Q4 selections + core defaults
5. **Review** — default swarm-tiers, models
6. **Execution** — default parallel-threshold, strategy, mode
7. **Commit** — convention, format, types, scopes, ticket-ref, co-author
8. **Estimates** — commented out (defaults)
9. **Tracker** — based on Q2, commented template
