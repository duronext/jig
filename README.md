<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/jig-mark-dark.svg">
    <img src="assets/jig-mark.svg" alt="Jig" width="88">
  </picture>
</p>

**The AI engineering workflow framework for teams.**

Jig is a full-lifecycle development framework that guides AI agents through a structured pipeline — from ticket to post-mortem. Named after the manufacturing tool that holds workpieces and guides tools to produce consistent results, Jig aligns your entire team around shared conventions, quality gates, and development workflows.

## Why Jig?

Without a framework, teams end up with scattered AI skills, inconsistent workflows, and no shared conventions. Some engineers brainstorm before coding; others don't. Code review quality varies. Nobody's sure which skills exist or when to use them.

Jig fixes this the way Rails fixed web development: with strong opinions, sensible defaults, and a clear structure that everyone follows.

## What You Get

**Full Pipeline** — Every stage of development has a skill:
```
DISCOVER → PRD → SPEC → PLAN → BUILD → REVIEW → PRD CHECK → SHIP → LEARN
```

**A PRD anyone can read** — `/jig:prd` turns a Word doc, a bullet list or a brainstorm into a plain-language product document: who it is for, the moments people see, phases with an MVP cut line, milestones, open decisions and who signs off. It runs in Claude Code, Claude.ai or the desktop app, so a PM can write one without a repo.

**A PRD that stays current** — The PRD publishes as a live Jig page. People tick milestones, record decisions and sign off on it. Jig writes to the same page from Claude Code as the spec, plan and build move along, so the PRD is also the status page.

**A spec the build is checked against** — `/jig:spec` turns the PRD into the technical contract: API, data, rules, UI states and a layer-tagged acceptance checklist traced to the PRD's outcomes. Every task in the build is checked against it, and before shipping, the PRD check asks whether a person can now do what the PRD promised.

**Parallel Execution** — `/jig:team-dev` spawns parallel agent teammates with staggered quality gates. Your implementation plan runs in parallel, with spec compliance and code review at every step.

**Review Swarm** — `/jig:review` dispatches specialist reviewers in parallel (security, dead code, error handling, async safety, performance). Teams add their own domain-specific specialists.

**Configurable, Not Rigid** — `jig.config.md` lets you tune the pipeline per work type, define your concerns checklist, choose your ticket system, and set review policies. Override only what you need.

**Extensible** — Add domain skills (`be-database`, `fe-react`), custom specialists (`typeorm.md`, `i18n.md`), and team agents. They wire into the framework's discovery system automatically.

## Quick Start

### Option A: Add to your project settings (recommended)

Add this to your project's `.claude/settings.json` — every teammate gets Jig automatically on clone:

```json
{
  "enabledPlugins": {
    "jig@duronext-jig": true
  },
  "extraKnownMarketplaces": {
    "duronext-jig": {
      "source": {
        "source": "github",
        "repo": "duronext/jig"
      }
    }
  }
}
```

Commit that file. Done. Every teammate gets the full framework on clone — pipeline skills, review specialists, agents, and an engineering starter pack.

### Option B: Install via CLI

If you prefer the interactive approach:

```bash
# Add the Jig marketplace (one-time per user)
/plugin marketplace add duronext/jig

# Install for your whole team
/plugin install jig@duronext-jig --scope project
```

### First Use

```bash
/jig:init       # Set up your project — guided interview, generates jig.config.md
/jig:kickoff    # Start working on a task — guides you through the full pipeline
/jig:extend     # Add your first team skill
```

`/jig:init` auto-detects your git host, branch, and commit conventions, then walks you through five questions to generate your `jig.config.md` and team directory structure. Type `/jig:` to see all available commands.

### Other Platforms (Gemini, Codex)

Clone the repo and reference the skills directly:

```bash
git clone https://github.com/duronext/jig.git .jig
```

See [adapters/](adapters/) for platform-specific integration guides.

## How It Works

Jig ships as a plugin with core skills, agents, and review specialists. Your team adds domain skills in `.claude/skills/` that wire into the framework automatically.

### Core Skills

| Command | Skill | What It Does |
|---------|-------|-------------|
| `kickoff` | Pipeline orchestrator | Classifies work (bug/feature/improvement/task) and routes through the appropriate pipeline stages. The entry point for all development work. |
| `init` | First-run setup | Auto-detects your project environment, conducts a back-and-forth interview, and generates `jig.config.md`, team directory structure, and CLAUDE.md declaration. |
| `brainstorm` | Design exploration | One question at a time, 2-3 approaches with trade-offs, design approval gate. |
| `prd` | Product document | Plain-language PRD with a one-sentence thesis, moments, rules with "you'll know it works when", phases with an MVP cut line, milestones, decisions and sign-off. Publishes a live Jig page; checks the build against it before shipping. |
| `spec` | Technical contract | Structured spec with enforceable acceptance checklists. Two tiers: Full (12 sections) for features, Light (5 sections) for bugs. Layer-tagged items (`[API]`, `[DATA]`, `[LOGIC]`, `[UI]`), traced to PRD outcomes, feed directly into spec reviewers. |
| `plan` | Implementation planning | Turns the spec into bite-sized TDD tasks with exact file paths, code snippets, verification steps, and a map of which tasks complete which PRD milestones. |
| `build` | Plan execution | **The builder.** Analyzes the plan's task graph and auto-selects parallel or serial execution. You hand it a plan — it builds the thing. |
| `team-dev` | Parallel execution | Spawns agent teammates in split panes. Each implementer works independently; the lead orchestrates staggered spec compliance + code quality reviews as they finish. Called by `build` when conditions are right. |
| `sdd` | Serial execution | Fresh subagent per task with two-stage review (spec compliance then code quality). Called by `build` for coupled tasks or when agent teams aren't available. |
| `review` | Code review swarm | Dispatches parallel specialist reviewers (security, dead code, error handling, async safety, performance + your team's specialists). Filters by glob match, scores mechanically, produces unified report. |
| `pr-create` | PR creation | Runs the review swarm first, then analyzes all commits, groups by theme, writes a clear description with test plan. No corporate speak. |
| `pr-respond` | PR feedback | Fetches unresolved comments, analyzes each (valid fix vs false positive), implements fixes, commits, pushes, replies, and resolves threads. The full loop. |
| `postmortem` | Retrospective | After merge, analyzes what reviewers caught to find gaps in skills and specialists. Diagnoses whether the swarm or logic reviewer should have caught it, then fixes the gap. |
| `debug` | Systematic debugging | Iron law: no fixes without root cause investigation. Four phases — investigate, analyze patterns, test hypothesis, implement. Escalates to "question the architecture" after 3 failed fixes. |
| `verify` | Verification gate | Evidence before assertions. Run the command, read the output, THEN claim it works. Prevents "should pass now" claims without proof. |
| `tdd` | Test-driven development | Red-green-refactor. No production code without a failing test first. Wrote code before the test? Delete it. Start over. |
| `ticket` | Ticket creation | Interviews you, writes the ticket, files it in your configured tracker (Linear, Jira, GitHub Issues), and sets up the branch. |
| `worktree` | Parallel workspaces | Creates or removes provisioned git worktrees, syncing env files and dependencies, for isolated parallel development. |
| `finish` | Branch completion | Verifies tests pass, then presents 4 options: merge locally, create PR, keep branch as-is, or discard. Handles worktree cleanup. |
| `extend` | Framework extension | The meta-skill. Interviews you about what you need, determines the right artifact (skill, specialist, agent, pack, or config change), scaffolds it with valid frontmatter, and wires it into discovery. |

### Core Agents

| Agent | Trigger | What It Does |
|-------|---------|-------------|
| `commit` | "commit the work" | Conventional commits with hook awareness. Reads commitlint config, respects existing hooks, stages specific files. |
| `code-review` | "review my code" | Dispatches the full review swarm (`tier: all`) and delivers the confidence-scored report. |
| `pr-review` | "post review comments" | Posts inline PR comments with suggestion blocks. Validates every path and line number against the diff before posting. |

### Core Specialists

Dispatched by `/review` as parallel subagents. Language-agnostic:

| Specialist | Severity | What It Catches |
|-----------|----------|----------------|
| `security` | blocking | Injection, hardcoded secrets, auth gaps, data exposure |
| `dead-code` | major | Unused exports, write-only variables, disconnected wiring, unreachable branches |
| `error-handling` | major | Swallowed errors, missing handling, inconsistent patterns, context loss |
| `async-safety` | major | Race conditions, premature state flags, resource leaks, error path divergence |
| `performance` | minor | N+1 patterns, unbounded operations, unnecessary computation, over-fetching |

Teams add their own specialists in `.claude/specialists/` (e.g., `typeorm.md`, `i18n.md`, `graphql-contracts.md`). The swarm discovers them automatically.

### Engineering Starter Pack

Ships with Jig. Three skills + one specialist for universal engineering practices:

| Skill/Specialist | What It Does |
|-----------------|-------------|
| `eng-copywriting` | Sentence case for all user-facing text. Always loaded. |
| `eng-logging` | When to error vs warn vs info vs debug. Structured logging. |
| `eng-testing` | Test pyramid, arrange-act-assert, mocking strategy, flaky test policy. |
| `test-coverage` (specialist) | Reviews changed code for missing test coverage during swarm review. |

### Your Team Skills

Your domain expertise lives in `.claude/skills/` in your project. These follow Jig's schema and wire into the framework:

- **Glob-triggered**: edit a database entity file → `be-database` skill auto-loads
- **Concerns checklist**: listed in `jig.config.md` → surfaces during `/jig:spec`
- **Review swarm**: team specialists in `.claude/specialists/` → dispatched by `/jig:review`
- **Created with**: `/jig:extend` scaffolds new skills with valid frontmatter

### Configuration

`jig.config.md` in your project root controls the pipeline:

```yaml
## Team
name: Acme
platform: claude
git-host: github
ticket-system: linear
ticket-prefix: ENG

## Concerns Checklist
- i18n: .claude/skills/fe-i18n
- security: core/specialists/security
- test-strategy: manual
```

The concerns checklist surfaces during spec authoring — mapping your team's engineering concerns to specific skills. See [framework/CONCERNS_CHECKLIST.md](framework/CONCERNS_CHECKLIST.md).

### Tier System

| Tier | Activation | Use For |
|------|-----------|---------|
| Standards | Always loaded | Universal rules (copywriting, commit format) |
| Domain | Glob-triggered | Stack expertise (database, frontend, testing) |
| Feature | Narrow globs | Feature-specific knowledge |
| Workflow | Explicit invocation | Pipeline skills (`kickoff`, `review`) |

## Updating

Jig is distributed as a Claude Code plugin. To get the latest version:

```bash
/plugin marketplace update duronext-jig
/plugin install jig@duronext-jig --scope project
```

### Upgrading from 1.x

Jig 2.0 renames the technical requirements document from **PRD** to **spec** and adds a new, plain-language **PRD**. Run `/jig:init` in a 1.x project and choose **Upgrade to 2.0**: it moves your config keys, renames old technical `*-prd.md` files to `*-spec.md`, and updates plan headers. `/jig:spec` is what `/jig:prd` used to be.

## Platform Support

Jig skills are platform-agnostic markdown. Adapters handle loading for:
- **Claude Code** (primary) — native plugin integration
- **Gemini CLI** — GEMINI.md context loading
- **Codex** — AGENTS.md integration

Teams using GitLab or Bitbucket are supported via the [git host adapter](framework/GIT_HOST.md).

## Framework Reference

| Document | What It Covers |
|----------|---------------|
| [PIPELINE.md](framework/PIPELINE.md) | The development pipeline |
| [LIVE_PRD.md](framework/LIVE_PRD.md) | How the live PRD page and the pipeline share state |
| [DISCOVERY.md](framework/DISCOVERY.md) | How Jig finds and loads skills |
| [SKILL_SCHEMA.md](framework/SKILL_SCHEMA.md) | Frontmatter spec for all skills |
| [TIER_SYSTEM.md](framework/TIER_SYSTEM.md) | How tiers control activation |
| [CONCERNS_CHECKLIST.md](framework/CONCERNS_CHECKLIST.md) | Configurable concerns checklist for specs |
| [GIT_HOST.md](framework/GIT_HOST.md) | GitHub/GitLab/Bitbucket command mapping |
| [Init Experience](docs/init-experience.md) | Interactive setup flow |
| [Jig 2.0](docs/releases/2.0.md) | What changed in 2.0, upgrading, and the concessions made |

## Origin

Jig was extracted from [Duro's](https://www.durolabs.co) new platform, where 31 battle-tested skills, 6 agents, and 10 specialist reviewers evolved into a comprehensive AI-assisted development system. Born from a hardware startup that knows what jigs do.

## License

MIT
