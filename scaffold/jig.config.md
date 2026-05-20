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
format: "{username}/{ticket-prefix}-{number}-{kebab-title}"
main-branch: main
```

## Concerns Checklist

Map your engineering concerns to skills or specialists.
These surface during brainstorming for features and improvements.
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

## Premortem

Prospective-hindsight risk analysis before PR. Opt in by uncommenting.
See `core/skills/premortem/SKILL.md` and `/jig:premortem`.

```yaml
# premortem-horizons:
#   bug:         ["1 week"]
#   task:        ["1 week"]
#   improvement: ["1 week", "6 months"]
#   feature:     ["1 week", "6 months"]
#   migration:   ["1 week", "1 month", "6 months", "2 years"]
#
# premortem-swarm-tiers:
#   fast-pass: []
#   full: all
# premortem-specialist-model: opus
# premortem-synthesizer-model: opus
#
# premortem-critical-paths:
#   - "**/{checkout,billing,payment,subscription}*"
#   - "**/{auth,session,oauth}*"
#
# premortem-detectors:
#   backend: [migrations, api-routes, cross-service-deps]
#   frontend: [routing, layouts, auth-ui, money-ui, build-config, flags,
#              third-party-scripts, i18n, service-workers, csp,
#              public-copy, a11y-primitives]
#   content: [new-fetch-origin, new-storage, bundle-size, error-boundaries]
#   thresholds:
#     large-diff-loc: 500
#     bundle-size-kb: 50
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
