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
  - prd
  - spec
  - plan
  - execute
  - review
  - prd-check
  - ship
  - learn
```

### Stage Overrides by Work Type

```yaml
bug:
  skip: [prd, learn]
  review: light
task:
  skip: [prd, spec, learn]
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
filename-format: "{date}-{topic}-{kind}.md"  # kind = prd | spec | plan | perf | context
# prd-sync: none            # none | linear | jira | github (pack-driven)
# spec-sync: none
# plan-sync: none
```

## Concerns Checklist

```yaml
- skill-schema: team/specialists/skill-quality
- framework-fit: core/specialists/framework-fit
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

## PR Brief

```yaml
# language: plain        # plain | ste (ASD-STE100 Simplified Technical English)
# runs: 2                # independent review runs before the merge (1 or more)
# attention: []          # repo risks every brief checks, e.g. "regulated tenants",
#                        # "public API schema", "customer data exports"
```

## PRD

```yaml
prd-publish: artifact       # artifact | file — artifact publishes the live Jig page where the platform supports it
```

## PRD Review

```yaml
prd-swarm-tiers:
  fast-pass: [plain-language, mvp-cut, testable-outcomes, missing-moments]
  full: all
```

## Spec Review

```yaml
spec-swarm-tiers:
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

## Memory

```yaml
# memory: on              # on | off. off: no team memory calls in this repo
# memory-save: auto       # auto | confirm | off. confirm: ask once per stage; off: search only
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
