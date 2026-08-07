# Jig Configuration

## Team

```yaml
name: jig
platform: claude
git-host: github
ticket-system: github
# ticket-prefix: JIG
```

## Pipeline

```yaml
stages:
  - discover
  - plan
  - execute
  - review
  - ship
  - learn
```

### Stage Overrides by Work Type

```yaml
bug:
  skip: [learn]
  review: light
task:
  skip: [learn]
  review: light
```

## Branching

```yaml
format: "{username}/jig-{number}-{kebab-title}"
main-branch: main
```

## Documents

```yaml
plans-directory: docs/plans
filename-format: "{date}-{topic}-{kind}.md"  # kind = prd | plan
# prd-sync: none            # none | linear | jira | github (pack-driven)
# plan-sync: none
```

## Concerns Checklist

```yaml
- skill-schema: team/specialists/skill-quality
- error-handling: core/specialists/error-handling
- security: core/specialists/security
- test-strategy: manual
```

## Review

```yaml
swarm-tiers:
  fast-pass: [security, dependency-scan, dead-code, error-handling]
  full: all
deep-review-model: opus
specialist-model-default: haiku
```

## PRD Review

```yaml
prd-swarm-tiers:
  fast-pass: [data-dependency, ui-conflict, blast-radius, state-completeness, security-design]
  full: all
```

## Plan Review

```yaml
plan-swarm-tiers:
  fast-pass: [task-dependency, migration-safety, blast-radius, state-completeness, security-design]
  full: all
plan-deep-review-model: opus
design-review-model: sonnet
```

## Execution

```yaml
parallel-threshold: 3
default-strategy: team-dev
teammate-mode: tmux
```

## Worktree

```yaml
# naming: branch           # ticket | ticket-branch | branch
# sync:
#   - .env*                # always included regardless
# post-create: []          # auto-detects install if omitted
```

## Commit

```yaml
convention: conventional
format: "type(scope): message"
types: [feat, fix, docs, chore, refactor, test]
scopes: [core, framework, packs, adapters, scaffold, docs, agents, specialists]
require-ticket-reference: false
co-author: true
```
