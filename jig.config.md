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
- premortem: core/skills/premortem
```

## Review

```yaml
swarm-tiers:
  fast-pass: [security, dead-code, error-handling]
  full: all
deep-review-model: opus
specialist-model-default: haiku
```

## PRD Review

```yaml
prd-swarm-tiers:
  fast-pass: [data-dependency, ui-conflict, blast-radius, state-completeness]
  full: all
```

## Plan Review

```yaml
plan-swarm-tiers:
  fast-pass: [task-dependency, migration-safety, blast-radius, state-completeness]
  full: all
plan-deep-review-model: opus
design-review-model: sonnet
```

## Premortem

```yaml
premortem-horizons:
  bug:         ["1 week"]
  task:        ["1 week"]
  improvement: ["1 week", "6 months"]
  feature:     ["1 week", "6 months"]
  migration:   ["1 week", "1 month", "6 months", "2 years"]

premortem-swarm-tiers:
  fast-pass: []
  full: all
premortem-specialist-model: opus
premortem-synthesizer-model: opus

premortem-critical-paths:
  - "**/{checkout,billing,payment,subscription}*"
  - "**/{auth,session,oauth}*"

premortem-detectors:
  backend: [migrations, api-routes, cross-service-deps]
  frontend: [routing, layouts, auth-ui, money-ui, build-config, flags,
             third-party-scripts, i18n, service-workers, csp,
             public-copy, a11y-primitives]
  content: [new-fetch-origin, new-storage, bundle-size, error-boundaries]
  thresholds:
    large-diff-loc: 500
    bundle-size-kb: 50
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
