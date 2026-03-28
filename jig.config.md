# Jig Configuration

## Team
name: jig
platform: claude
ticket-system: github
# ticket-prefix: JIG

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
format: "{username}/jig-{number}-{kebab-title}"
main-branch: main

## Concerns Checklist
- skill-schema: team/specialists/skill-quality
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
types: [feat, fix, docs, chore, refactor, test]
scopes: [core, framework, packs, adapters, scaffold, docs, agents, specialists]
require-ticket-reference: false
co-author: true
