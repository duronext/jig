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
format: "{username}/{ticket-prefix}-{number}-{kebab-title}"
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

Map your engineering concerns to skills or specialists.
These surface during PRD authoring for features and improvements.
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

## Execution

```yaml
parallel-threshold: 3
default-strategy: team-dev
teammate-mode: tmux
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
# team-id: your-team-uuid
# labels:
#   feature: uuid
#   bug: uuid
#   task: uuid

# ## Jira
# project-key: PROJ
# board-id: 123
```
