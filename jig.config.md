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
  - brainstorm
  - plan
  - execute
  - review
  - ship
  - learn
```

### Stage Overrides by Work Type

```yaml
bug:
  skip: [brainstorm-full, learn]
  brainstorm: light
task:
  skip: [brainstorm, learn]
  review: light
```

## Branching

```yaml
format: "{username}/jig-{number}-{kebab-title}"
main-branch: main
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
  fast-pass: [security, dead-code, error-handling]
  full: all
deep-review-model: opus
specialist-model-default: haiku
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
