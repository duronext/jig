# Jig Framework

Jig is the AI engineering workflow framework for teams. It guides AI agents through a structured pipeline — from ticket to post-mortem — with quality gates at every stage. Named after the manufacturing tool that holds workpieces and guides tools to produce consistent results.

This repo IS Jig. It also uses itself to develop itself (Consumer Zero).

## Core Philosophy

1. **Convention over configuration.** Jig has opinions. Teams override what they need; everything else just works.
2. **The framework is the nervous system, team skills are organs.** Jig discovers, loads, and orchestrates team-created skills. They're part of the system, not separate from it.
3. **Full lifecycle.** Ticket to post-mortem. Every stage has a skill, every handoff has a quality gate.
4. **Language-agnostic core.** The pipeline works for any stack. Stack-specific expertise comes from team skills and starter packs.

## Architecture

Jig has three discovery layers, in priority order:

```
1. team/           <- Highest priority (team overrides)
2. packs/          <- Pack defaults (starter kits)
3. core/           <- Framework defaults
```

If a team skill has the same name as a core skill, the team version wins. This is how teams customize without editing framework files.

### The Pipeline

Every development task flows through stages. `kickoff` orchestrates the full pipeline:

```
DISCOVER → BRAINSTORM → PLAN → EXECUTE → REVIEW → SHIP → LEARN
```

Work type (bug/feature/improvement/task) determines which stages run and at what depth. Configured in `jig.config.md`.

### How Skills Compose

- **Direct invocation** — workflow skills invoke each other by name (`kickoff` → `brainstorm` → `plan`)
- **Concerns checklist** — `jig.config.md` maps engineering concerns to skills. `brainstorm` reads the config and loads relevant skills during design.
- **Specialist dispatch** — `review` discovers specialist `.md` files from all three directories, filters by glob match, and dispatches as parallel subagents.

## Inventory

### Core Skills (17)

| Skill | Purpose |
|-------|---------|
| `kickoff` | Pipeline orchestrator — classifies work, routes through stages |
| `brainstorm` | Collaborative design exploration with configurable concerns checklist |
| `prd` | PRD creation with enforceable acceptance checklists (feeds into spec reviewer) |
| `plan` | Spec → implementation plan with bite-sized TDD tasks |
| `build` | Plan execution — analyzes task graph, auto-selects parallel or serial |
| `team-dev` | Parallel agent execution with staggered quality gates (called by `build`) |
| `sdd` | Serial execution with two-stage review per task |
| `review` | Specialist swarm — dispatches parallel reviewers, scores findings |
| `pr-create` | PR creation with voice/tone standards and test plan |
| `pr-respond` | PR comment response — analyze, fix, commit, push, reply, resolve |
| `postmortem` | Post-merge retrospective with specialist/logic reviewer diagnosis |
| `debug` | Systematic debugging — root cause before fixes, always |
| `verify` | Evidence before assertions — run it before claiming it works |
| `tdd` | Red-green-refactor discipline |
| `finish` | Branch completion — merge, PR, keep, or discard |
| `worktree` | Create/remove provisioned worktrees for parallel dev |
| `extend` | Framework extension assistant — scaffolds new skills, specialists, packs |

### Core Agents (3)

| Agent | Purpose |
|-------|---------|
| `commit` | Conventional commits with hook awareness |
| `code-review` | Dispatches review swarm, delivers scored report |
| `pr-review` | Posts inline PR comments with suggestion blocks |

### Core Specialists (5)

`security`, `dead-code`, `error-handling`, `async-safety`, `performance` — language-agnostic code review specialists dispatched by `review`.

### Engineering Pack

`eng-copywriting` (sentence case standards), `eng-logging` (level guidance), `eng-testing` (test strategy), `test-coverage` (specialist).

## Self-Hosting Model

Jig eats its own dogfood. This repo installs itself as a plugin via `.claude/settings.json` — the same way any consumer project would. Skills, agents, and commands all come from the plugin. No symlinks, no special treatment.

When developing Jig, edit the source in `core/`. After pushing to GitHub, run `/plugin marketplace update duronext-jig` and `/reload-plugins` to see changes locally.

**When adding a new core skill:**
1. Create `core/skills/{name}/SKILL.md`
2. Add to the `skills` array in `.claude-plugin/plugin.json`
3. Add a command file in `commands/{name}.md` for `/jig:` namespace browsing

## Project Structure

```
jig/
├── framework/           How Jig works (pipeline, schema, tiers, discovery, checklist, git host adapters)
├── core/
│   ├── skills/          17 pipeline skills
│   ├── agents/          3 agents (commit, code-review, pr-review)
│   └── specialists/     5 review specialists
├── packs/
│   └── engineering/     Starter pack (3 skills + 1 specialist)
├── adapters/            Platform integration (claude/, gemini/, codex/)
├── scaffold/            jig init templates (config, team dir, skill template)
├── docs/                Specs and documentation
├── team/                Jig's own extensions (for developing Jig itself)
├── .claude/             Plugin self-install (settings.json)
├── CLAUDE.md            This file
├── jig.config.md        Jig's own pipeline configuration
└── README.md            Public-facing README
```

## Commands

| Task | Command |
|------|---------|
| List all skills | `find core/skills -name "SKILL.md" \| sort` |
| List specialists | `ls core/specialists/` |
| List agents | `ls core/agents/` |
| Verify plugin | `cat .claude/settings.json` |
| Check for stale refs | `grep -rn 'superpowers:' core/` (should return nothing) |
| Count lines | `find . -not -path './.git/*' -name '*.md' \| xargs wc -l \| tail -1` |

## Code Style

- Markdown: 80 char line width where practical
- YAML frontmatter: 2 space indent
- Skill names: lowercase with hyphens (`eng-` prefix for engineering pack, no prefix for core)
- Descriptions: MUST start with "Use when..."
- SKILL.md: under 500 lines. Heavy content goes in `reference/` subdirectory.
- No language-specific references in core skills (TypeScript, Python, etc.) — core is stack-agnostic

## Commit Conventions

- Conventional commits: `type(scope): message`
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`
- Scopes: `core`, `framework`, `packs`, `adapters`, `scaffold`, `docs`, `agents`, `specialists`
- **Never commit or push without explicit user approval**
- Use the commit agent at `.claude/agents/commit.md`

## Contributing to Jig

### Modifying an existing skill
1. Edit the source at `core/skills/{name}/SKILL.md`
2. Validate: frontmatter has `name`, `description` (starts with "Use when..."), `tier`, `alwaysApply`
3. Check cross-references: `grep -rn '{skill-name}' core/` — update any references if you renamed or split
4. Verify no language-specific content leaked into core skills

### Adding a new core skill
1. Read `framework/SKILL_SCHEMA.md` for the frontmatter spec
2. Read `framework/TIER_SYSTEM.md` to choose the right tier
3. Create `core/skills/{name}/SKILL.md`
4. Create symlink: `ln -s ../../core/skills/{name} .claude/skills/{name}`
5. Add to the `skills` array in `.claude-plugin/plugin.json`
6. If the skill should surface during brainstorming, add it to the concerns checklist in `jig.config.md`

### How consumers install Jig
Teams add this to their project's `.claude/settings.json`:
```json
{
  "enabledPlugins": { "jig@duronext-jig": true },
  "extraKnownMarketplaces": {
    "duronext-jig": {
      "source": { "source": "github", "repo": "duronext/jig" }
    }
  }
}
```
This gives every teammate on the project the full Jig framework on clone — no manual marketplace add or plugin install needed.

### Adding a specialist
1. Create `core/specialists/{name}.md` with frontmatter: `name`, `description`, `model`, `tier`, `globs`, `severity`
2. The body below the frontmatter IS the specialist's prompt
3. `review` discovers it automatically — no config needed

### Key documents to read first
- `framework/GIT_HOST.md` — git host adapter (GitHub/GitLab/Bitbucket command mapping)
- `framework/PIPELINE.md` — the 7-stage development pipeline
- `framework/DISCOVERY.md` — how Jig finds and loads skills
- `framework/SKILL_SCHEMA.md` — frontmatter spec for all skills
- `docs/specs/2026-03-28-jig-framework-design.md` — the original design spec

## Git Workflow

- Main branch: `main`
- Branch naming: `{username}/jig-{number}-{kebab-title}`
- **Never commit or push without explicit user approval**
