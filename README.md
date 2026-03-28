# Jig

**The AI engineering workflow framework for teams.**

Jig is a full-lifecycle development framework that guides AI agents through a structured pipeline — from ticket to post-mortem. Named after the manufacturing tool that holds workpieces and guides tools to produce consistent results, Jig aligns your entire team around shared conventions, quality gates, and development workflows.

## Why Jig?

Without a framework, teams end up with scattered AI skills, inconsistent workflows, and no shared conventions. Some engineers brainstorm before coding; others don't. Code review quality varies. Nobody's sure which skills exist or when to use them.

Jig fixes this the way Rails fixed web development: with strong opinions, sensible defaults, and a clear structure that everyone follows.

## What You Get

**Full Pipeline** — Every stage of development has a skill:
```
DISCOVER -> BRAINSTORM -> PLAN -> EXECUTE -> REVIEW -> SHIP -> LEARN
```

**Parallel Execution** — `jig-team-dev` spawns parallel agent teammates with staggered quality gates. Your implementation plan runs in parallel, with spec compliance and code review at every step.

**Review Swarm** — `jig-review` dispatches specialist reviewers in parallel (security, dead code, error handling, async safety, performance). Teams add their own domain-specific specialists.

**Configurable, Not Rigid** — `jig.config.md` lets you tune the pipeline per work type, define your concerns checklist, choose your ticket system, and set review policies. Override only what you need.

**Extensible** — Add domain skills (`be-database`, `fe-react`), custom specialists (`typeorm.md`, `i18n.md`), and team agents. They wire into the framework's discovery system automatically.

## Quick Start

```bash
# Install via Claude Marketplace (recommended)
# Or: npm install --save-dev @jig-framework/core

# Initialize in your project
jig init

# Start working
/jig-kickoff
```

## How It Works

Jig has three layers:

```
core/           Framework pipeline, agents, and generic specialists
packs/          Starter packs (engineering, typescript, python, etc.)
team/           YOUR domain skills, specialists, and agents
```

Skills are discovered automatically. Drop a skill in `team/skills/` with valid frontmatter, and the framework finds it, triggers it by glob, surfaces it in brainstorming, and dispatches it during review.

### Configuration

`jig.config.md` in your project root:

```markdown
## Team
name: Acme
platform: claude
ticket-system: github

## Concerns Checklist
- i18n: team/skills/fe-i18n
- security: core/specialists/security
- test-strategy: manual
```

### Tier System

| Tier | Activation | Use For |
|------|-----------|---------|
| Standards | Always loaded | Universal rules (copywriting, commit format) |
| Domain | Glob-triggered | Stack expertise (database, frontend, testing) |
| Feature | Narrow globs | Feature-specific knowledge |
| Workflow | Explicit invocation | Pipeline skills (`/jig-kickoff`, `/jig-review`) |

## Platform Support

Jig skills are platform-agnostic markdown. Adapters handle loading for:
- **Claude Code** (primary) — native plugin integration
- **Gemini CLI** — GEMINI.md context loading
- **Codex** — AGENTS.md integration

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Writing Skills](docs/writing-skills.md)
- [Writing Specialists](docs/writing-specialists.md)
- [Creating Packs](docs/creating-packs.md)
- [Platform Adapters](docs/platform-adapters.md)

## Origin

Jig was extracted from [Duro's](https://www.durolabs.co) Phoenix project, where 31 battle-tested skills, 6 agents, and 10 specialist reviewers evolved into a comprehensive AI-assisted development system. Born from a hardware startup that knows what jigs do.

## License

MIT
