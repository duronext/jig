# Jig: AI Engineering Workflow Framework

**Date:** 2026-03-28
**Author:** Dustin (with Claude)
**Status:** Draft

---

## Overview

Jig is a full-lifecycle AI engineering workflow framework for teams. Named after the manufacturing tool that holds workpieces and guides tools to produce consistent results, Jig provides the scaffolding, conventions, and orchestration that align entire engineering teams around a shared development workflow.

**The analogy:** If superpowers is Express (routing and middleware), Jig is Ruby on Rails (the full stack). It runs your entire development pipeline from ideation through post-mortem, ships with opinionated defaults, and is designed to be extended by teams who plug in their own domain expertise.

**Origin:** Extracted from Duro's Phoenix project, where 31 battle-tested skills, 6 agents, and 10 specialist reviewers evolved into a comprehensive AI-assisted development system. Jig generalizes this into a framework any team can adopt.

## Core Philosophy

1. **Convention over configuration.** Jig has opinions about how development should work. Teams override what they need; everything else just works.
2. **The framework is the nervous system, team skills are organs.** Jig discovers, loads, and orchestrates team-created skills. They aren't separate from the framework — they're part of it.
3. **Full lifecycle, not point solutions.** Ticket to post-mortem. Every stage has a skill, every handoff has a quality gate.
4. **Teams, not individuals.** The multiplier effect comes from everyone using the same pipeline, the same review process, the same conventions.
5. **Language-agnostic core.** The pipeline and review architecture work for any stack. Stack-specific expertise comes from team skills and starter packs.

## What Ships

### Core Framework (14 skills)

The pipeline — extracted from Phoenix `wf-*` skills and absorbed superpowers concepts, stripped of all language/stack references:

| Skill | Purpose |
|-------|---------|
| `jig-kickoff` | Pipeline orchestrator. Classifies work (bug/feature/improvement/task), routes through appropriate stages. The entry point for all development work. |
| `jig-brainstorm` | Collaborative design exploration. One question at a time, 2-3 approaches, design approval gate. Concerns checklist is configurable via `jig.config.md`. |
| `jig-prd` | PRD creation with structured interview. Stack-agnostic requirements capture. |
| `jig-plan` | Spec to implementation plan. Bite-sized tasks with TDD orientation. |
| `jig-team-dev` | Parallel agent execution with staggered quality gates. Spawns implementer teammates, orchestrates spec compliance and code review as each finishes. The killer feature. |
| `jig-sdd` | Serial execution for tightly coupled tasks. Fresh subagent per task with two-stage review. |
| `jig-review` | Specialist swarm architecture. Dispatches parallel reviewers from core + pack + team directories, collects findings, scores confidence. |
| `jig-pr` | PR creation with structured descriptions and review comment response. Ticket system integration configurable (Linear/Jira/GitHub Issues). |
| `jig-postmortem` | Post-merge retrospective. Extracts lessons, identifies skill improvements, process refinements. |
| `jig-debug` | Root cause investigation iron law. Four-phase systematic debugging — no fixes without confirmed cause. |
| `jig-verify` | Evidence before assertions. Requires running verification and confirming output before claiming success. |
| `jig-tdd` | Red-green-refactor discipline for features and bug fixes. |
| `jig-finish` | Branch cleanup, merge/PR decision guide. Structured options for completing development work. |
| `jig-extend` | Framework extension assistant. Interviews the user, determines the right artifact type (skill, specialist, pack, config change), scaffolds correctly, wires into discovery. The meta-skill that teaches teams to build on Jig. |

### Core Agents (3)

| Agent | Purpose |
|-------|---------|
| `jig-commit` | Conventional commit workflow with safety checks and configurable format. |
| `jig-code-review` | Dispatches the review swarm and produces a confidence-scored report. |
| `jig-pr-review` | Posts inline PR comments with suggestions from review findings. |

### Core Specialists (5)

Language-agnostic code review specialists for the review swarm:

| Specialist | Focus |
|-----------|-------|
| `security` | OWASP universal patterns — injection, auth issues, secrets in code, insecure defaults. |
| `dead-code` | Unused exports, unreachable branches, write-only variables, disconnected wiring. |
| `error-handling` | Swallowed errors, missing context, inconsistent error patterns, unhandled edge cases. |
| `async-safety` | Race conditions, unhandled async failures, resource leaks, timeout handling. |
| `performance` | Algorithmic issues, unnecessary computation, memory patterns, N+1 access patterns. |

### Generic Engineering Pack

An installable starter pack with language-agnostic engineering skills:

| Skill | Focus |
|-------|-------|
| `eng-copywriting` | User-facing text standards — sentence case, clarity, consistency. |
| `eng-logging` | When to warn vs error, structured logging patterns, avoiding noise. |
| `eng-testing` | Test strategy patterns — unit, integration, E2E decision framework. |

Plus one additional specialist:

| Specialist | Focus |
|-----------|-------|
| `test-coverage` | Identifies gaps in test coverage relative to changed code. |

**Total v1 surface:** 14 core skills + 3 pack skills + 3 agents + 6 specialists = 26 artifacts.

## Repository Structure

```
jig/
├── README.md
├── package.json                    # npm distribution
├── plugin.json                     # Claude Marketplace manifest
│
├── framework/                      # The nervous system (meta-docs)
│   ├── PIPELINE.md                 # Pipeline stage definitions
│   ├── SKILL_SCHEMA.md             # Frontmatter schema spec
│   ├── TIER_SYSTEM.md              # How tiers work
│   ├── DISCOVERY.md                # How Jig finds & loads skills
│   └── CONCERNS_CHECKLIST.md       # How the configurable checklist works
│
├── core/                           # Ships with every install
│   ├── skills/
│   │   ├── jig-kickoff/
│   │   │   └── SKILL.md
│   │   ├── jig-brainstorm/
│   │   │   └── SKILL.md
│   │   ├── jig-prd/
│   │   │   ├── SKILL.md
│   │   │   └── reference/
│   │   ├── jig-plan/
│   │   │   └── SKILL.md
│   │   ├── jig-team-dev/
│   │   │   ├── SKILL.md
│   │   │   ├── lead-playbook.md
│   │   │   ├── implementer-prompt.md
│   │   │   └── spec-reviewer-prompt.md
│   │   ├── jig-review/
│   │   │   ├── SKILL.md
│   │   │   ├── tiers.md
│   │   │   └── DIAGRAM.md
│   │   ├── jig-sdd/
│   │   │   ├── SKILL.md
│   │   │   ├── implementer-prompt.md
│   │   │   ├── spec-reviewer-prompt.md
│   │   │   └── code-quality-reviewer-prompt.md
│   │   ├── jig-pr/
│   │   │   └── SKILL.md
│   │   ├── jig-postmortem/
│   │   │   └── SKILL.md
│   │   ├── jig-debug/
│   │   │   ├── SKILL.md
│   │   │   └── reference/
│   │   ├── jig-verify/
│   │   │   └── SKILL.md
│   │   ├── jig-tdd/
│   │   │   └── SKILL.md
│   │   ├── jig-finish/
│   │   │   └── SKILL.md
│   │   └── jig-extend/
│   │       └── SKILL.md
│   │
│   ├── agents/
│   │   ├── commit.md
│   │   ├── code-reviewer.md
│   │   └── pr-reviewer.md
│   │
│   └── specialists/
│       ├── security.md
│       ├── dead-code.md
│       ├── error-handling.md
│       ├── async-safety.md
│       └── performance.md
│
├── packs/
│   └── engineering/
│       ├── pack.json               # { name, prefix: "eng", skills, specialists }
│       ├── skills/
│       │   ├── eng-copywriting/
│       │   │   └── SKILL.md
│       │   ├── eng-logging/
│       │   │   └── SKILL.md
│       │   └── eng-testing/
│       │       └── SKILL.md
│       └── specialists/
│           └── test-coverage.md
│
├── adapters/
│   ├── claude/
│   │   ├── loader.md
│   │   └── CLAUDE.md.template
│   ├── gemini/
│   │   └── GEMINI.md.template
│   └── codex/
│       └── AGENTS.md.template
│
├── scaffold/
│   ├── jig.config.md              # Default config template
│   ├── team/
│   │   ├── README.md
│   │   ├── skills/.gitkeep
│   │   ├── specialists/.gitkeep
│   │   └── agents/.gitkeep
│   └── SKILL_TEMPLATE.md
│
└── docs/
    ├── getting-started.md
    ├── configuration.md
    ├── writing-skills.md
    ├── writing-specialists.md
    ├── creating-packs.md
    └── platform-adapters.md
```

## Configuration Model

`jig.config.md` is the bridge between framework and team. Markdown format so AI agents read it natively.

```markdown
# Jig Configuration

## Team
name: Duro
platform: claude
ticket-system: linear
ticket-prefix: ENG

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
example: "dustin/eng-1234-fix-login-flow"
main-branch: main

## Concerns Checklist
- i18n: team/skills/fe-i18n
- analytics: team/skills/ft-analytics
- error-handling: core/specialists/error-handling
- event-publishing: team/skills/be-nats-publish
- caching: team/skills/be-cache
- feature-flags: team/skills/ops-feature-flags
- migrations: team/skills/be-migrations
- test-strategy: manual
- webhooks: team/skills/be-webhooks
- auth-security: team/skills/fe-graphql-auth
- subgraph-federation: manual
- responsive-layout: team/skills/fe-responsive

## Review
swarm-tiers:
  fast-pass: [security, dead-code, error-handling, i18n]
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
```

### Design Principles

- **Markdown, not YAML/JSON.** AI agents read it directly as context. No parsing layer needed.
- **Sensible defaults.** A minimal config with just `name` and `platform` works. Override only what differs.
- **Concerns checklist is the extensibility hook.** Maps team skills into the brainstorming pipeline.
- **Stage overrides per work type.** Not every bug needs full brainstorm. Not every task needs a postmortem.
- **Review swarm is configurable.** Teams choose which specialists block vs advise, and select models per role.

### How Skills Read Config

1. `jig-kickoff` reads pipeline stages and work type overrides for routing
2. `jig-brainstorm` reads concerns checklist to surface relevant skills
3. `jig-review` reads swarm-tiers for specialist dispatch and model selection
4. `jig-team-dev` reads parallel-threshold and teammate-mode
5. `jig-pr` reads branching format and ticket-system
6. `jig-commit` reads convention and co-author settings

One config file. Every skill reads from it. Teams change behavior without touching framework internals.

## Skill Architecture

### Frontmatter Schema

Every Jig skill uses the same schema regardless of origin:

```yaml
---
name: jig-review
description: >
  Use when reviewing code before PRs or as quality gate
  during parallel execution. Dispatches specialist swarm.
tier: workflow              # standards | domain | feature | workflow
globs:                      # domain/feature tiers only
  - "**/*.resolver.ts"
alwaysApply: false          # true only for standards tier
---
```

### Naming Convention by Origin

| Origin | Prefix | Example | Maintained By |
|--------|--------|---------|---------------|
| Core | `jig-*` | `jig-kickoff`, `jig-review` | Jig framework |
| Pack | `{pack}-*` | `eng-logging`, `eng-copywriting` | Pack author |
| Team | `{team-convention}-*` | `be-database`, `fe-react` | Your team |

`jig-` prefix is reserved for core. Packs declare their prefix in `pack.json`:

```json
{
  "name": "engineering",
  "prefix": "eng",
  "description": "Language-agnostic engineering practices",
  "skills": ["eng-copywriting", "eng-logging", "eng-testing"],
  "specialists": ["test-coverage"]
}
```

Teams use whatever convention they want — Jig recommends domain prefixes (`be-`, `fe-`, `ops-`, etc.) but does not enforce them.

### Tier System

| Tier | Activation | Use For |
|------|-----------|---------|
| Standards | Always loaded (`alwaysApply: true`) | Universal rules that apply to every file. Keep minimal. |
| Domain | Glob-triggered | Stack expertise. Loaded when editing matching files. |
| Feature | Narrow globs | Feature-specific knowledge. Loaded only when touching that feature's code. |
| Workflow | Explicit invocation (`/skill-name`) | Pipeline skills. Never auto-loaded. |

### Discovery — The Nervous System

Jig discovers skills from three locations, in priority order:

```
1. team/skills/       <- Highest priority (team overrides)
2. packs/*/skills/    <- Pack defaults
3. core/skills/       <- Framework defaults
```

**Override semantics:** If a team skill has the same `name` as a core or pack skill, the team version wins. Teams customize by placing a skill with the same name in `team/`, not by editing framework files. Like CSS specificity.

**Specialist discovery follows the same pattern:**

```
1. team/specialists/    <- Team's domain-specific reviewers
2. packs/*/specialists/ <- Pack reviewers
3. core/specialists/    <- Framework's generic reviewers
```

`jig-review` collects from all three, deduplicates by name (team wins), filters by glob match against changed files, and dispatches.

### Composition Mechanisms

1. **Direct invocation** — Workflow skills invoke other skills by name in their instructions.
2. **Concerns checklist** — `jig.config.md` maps concerns to skills. `jig-brainstorm` reads config and loads relevant skills during feature exploration.
3. **Specialist dispatch** — `jig-review` discovers specialists by scanning directories, reads frontmatter, dispatches matching ones as parallel subagents.

No magic wiring. No registration step. Drop a skill file in the right directory with valid frontmatter, and the framework discovers it.

### Progressive Disclosure

```
team/skills/be-database/
├── SKILL.md              # Core rules, < 500 lines
└── reference/
    ├── queries.md
    ├── transactions.md
    └── indexing.md
```

SKILL.md includes a reference table telling the AI when to load each sub-document. Heavy content stays out of context until needed.

## Distribution

### Channel 1: Claude Marketplace Plugin (Primary)

Plugin injects core and packs into skill discovery. Auto-updates. Framework files never touch the team's repo.

```
~/.claude/plugins/cache/jig-framework/
├── core/
├── packs/
└── adapters/claude/
```

Consuming project only contains:
```
your-project/
├── jig.config.md
├── CLAUDE.md
└── .claude/skills/team/
```

### Channel 2: npm / CLI (Secondary)

```bash
npm install --save-dev @jig-framework/core
npm install --save-dev @jig-framework/pack-engineering
```

Or standalone CLI without Node:
```bash
jig sync
```

Skills sync to a managed `.jig/` directory (gitignored). Version pinned. Updated explicitly.

### Channel 3: Vendored (Escape Hatch)

```bash
jig eject
```

Full copy into repo. Team owns it. No auto-updates. For strict compliance or heavy customization.

### Platform Adapters

Skills are platform-agnostic markdown. Only loading differs:

- **Claude Code:** Native `.claude/skills/` + plugin injection
- **Gemini CLI:** `GEMINI.md` context loading + tool name mapping
- **Codex / Others:** `AGENTS.md` + tool mapping reference

Multi-platform: `jig init --platform claude,gemini` generates both entry points.

## Extension Model

Three layers of customization:

| Layer | Mechanism | Example |
|-------|-----------|---------|
| **Configure** | Edit `jig.config.md` | Swap Linear for Jira, skip brainstorm for bugs |
| **Extend** | Add skills/specialists to `team/` | `be-database`, a `typeorm.md` specialist |
| **Override** | Same-name skill in `team/` | Replace `jig-brainstorm` entirely |

Most teams live in Configure and Extend. Override is the escape hatch.

## Smart Init

`jig init` is intelligent, not just a scaffold:

1. **Reads existing CLAUDE.md** (or AGENTS.md, GEMINI.md)
2. **Identifies framework-owned sections** — workflow pipeline, skills framework, git workflow, parallel development
3. **Recommends specific removals** — "These sections are now handled by Jig and can be removed"
4. **Injects Jig declaration** — "This project uses **Jig** for development workflow management"
5. **Generates `jig.config.md`** pre-populated from detected patterns (found Linear references, conventional commits, etc.)
6. **Scaffolds `team/` directory** with README explaining the extension model
7. **Suggests skill migration** — identifies existing skills that should move to `team/`

## Phoenix Migration Path

### Step-by-step

1. Create the `jig` repo, extract core skills from Phoenix `wf-*`
2. Generalize: strip TypeScript/NestJS/Phoenix references from all core skills
3. Absorb superpowers concepts: brainstorming, debugging, TDD, verification, SDD
4. Build generic engineering pack from generalizable Phoenix skills
5. Build `jig.config.md` schema, populate Phoenix's configuration
6. Install Jig plugin in Phoenix
7. Move `wf-*` skills out of Phoenix, confirm `jig-*` equivalents work
8. Move Phoenix specialists (typeorm, i18n, graphql-contracts, guard-consistency, ui-patterns) to `team/specialists/`
9. Restructure remaining skills into `team/skills/`
10. Slim down CLAUDE.md to project-specific context only
11. Verify: run `/jig-kickoff` on a real feature, confirm full pipeline works end-to-end

### Phoenix After Migration

```
phoenix/
├── CLAUDE.md                        # Project-specific only
├── jig.config.md                    # Pipeline config
└── .claude/
    ├── skills/
    │   ├── jig/                     # Framework-managed (plugin)
    │   │   ├── core/
    │   │   └── packs/engineering/
    │   └── team/
    │       ├── skills/              # 24 domain/feature skills
    │       │   ├── be-database/
    │       │   ├── fe-react/
    │       │   ├── ft-component-filter/
    │       │   └── ...
    │       ├── specialists/         # 5 Phoenix-specific reviewers
    │       │   ├── typeorm.md
    │       │   ├── i18n.md
    │       │   └── ...
    │       └── agents/              # 3 Phoenix-specific agents
    │           ├── e2e-test-runner.md
    │           ├── issue-triage.md
    │           └── production-release-notes.md
    └── agents/                      # Jig core agents
```

## Success Criteria

1. A team can `jig init` a fresh project and run `/jig-kickoff` to ship a feature through the full pipeline within their first session.
2. Phoenix migrates to Jig with zero loss of current workflow capability.
3. A Python/Go/Java team can install Jig and get value from the pipeline + review swarm without writing any team skills first.
4. Teams can add domain skills that wire into brainstorming, review, and execution without touching framework code.
5. Core updates via plugin don't break team extensions.

## Open Questions

1. **Marketplace availability:** What's the current Claude Marketplace timeline and plugin API surface?
2. **Pack distribution:** Should packs be separate npm packages, or bundled with core?
3. **Community packs:** What's the governance model for community-contributed starter packs?
4. **Versioning:** How do we handle breaking changes to skill schema or config format?
5. **Telemetry:** Should Jig collect anonymous usage data to improve the framework?
