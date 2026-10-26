# Jig Configuration

## Team

```yaml
name: my-team
platform: claude
git-host: github          # github | gitlab | bitbucket
ticket-system: github
# ticket-prefix: ENG
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
format: "{username}/{ticket-prefix}-{number}-{kebab-title}"
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

Map your engineering concerns to skills or specialists.
These surface during spec authoring for features and improvements.
Uncomment and point to your team skills as you create them.

```yaml
# - i18n: team/skills/fe-i18n
# - analytics: team/skills/ft-analytics
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

## Execution

```yaml
parallel-threshold: 3
default-strategy: team-dev
teammate-mode: tmux
```

## Memory

Team memory turns on when a memory pack (a `team-memory` skill) is
installed. See `framework/MEMORY.md`.

```yaml
# memory: on              # on | off. off: no team memory calls in this repo
# memory-save: on         # on | off. off: search team memory, never save to it
```

## Commit

```yaml
convention: conventional
format: "type(scope): message"
require-ticket-reference: true
co-author: true
# co-author-domain: yourcompany.com    # "commit with alex" → alex@yourcompany.com
```

## Estimates

```yaml
# scale: [0, 1, 2, 4, 16, 32]    # your team's estimate values
# unit: hours                      # hours | points | t-shirt
```

## Tracker

Add a section matching your `ticket-system` value above.
Tracker packs read IDs from here. See packs/ for setup instructions.

```yaml
# ## Linear
# team: ENG
# labels:
#   feature: Feature
#   bug: Bug
#   task: Task

# ## Jira
# project-key: PROJ
# board-id: 123
```
