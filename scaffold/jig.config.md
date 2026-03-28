# Jig Configuration

## Team
name: my-team
platform: claude
ticket-system: github
# ticket-prefix: ENG

## Pipeline
stages:
  - discover
  - brainstorm
  - plan
  - execute
  - review
  - ship
  - learn

### Stage Overrides by Work Type
bug:
  skip: [brainstorm-full, learn]
  brainstorm: light
task:
  skip: [brainstorm, learn]
  review: light

## Branching
format: "{username}/{ticket-prefix}-{number}-{kebab-title}"
main-branch: main

## Concerns Checklist
# Map your engineering concerns to skills or specialists.
# These surface during brainstorming for features and improvements.
# Uncomment and point to your team skills as you create them.
#
# - i18n: team/skills/fe-i18n
# - analytics: team/skills/ft-analytics
- error-handling: core/specialists/error-handling
- security: core/specialists/security
- test-strategy: manual

## Review
swarm-tiers:
  fast-pass: [security, dead-code, error-handling]
  full: all
deep-review-model: opus
specialist-model-default: haiku

## Execution
parallel-threshold: 3
default-strategy: team-dev
teammate-mode: tmux

## Commit
convention: conventional
format: "type(scope): message"
require-ticket-reference: true
co-author: true
