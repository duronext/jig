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

### Core Skills

Run `find core/skills -name SKILL.md` for the current list; this table summarizes purpose.

| Skill | Purpose |
|-------|---------|
| `kickoff` | Pipeline orchestrator — classifies work, routes through stages |
| `init` | First-run setup — auto-detects environment, interviews, generates config |
| `ticket` | Ticket creation — routes to the configured ticket-system pack (Linear/Jira/GitHub) |
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

### Core Agents

| Agent | Purpose |
|-------|---------|
| `commit` | Conventional commits with hook awareness |
| `code-review` | Dispatches review swarm, delivers scored report |
| `pr-review` | Posts inline PR comments with suggestion blocks |

### Core Specialists

Core specialists live in `core/specialists/`. They fall into four groups:

- **Code review** — universal code-quality reviewers dispatched by `review` in code mode (e.g., `security`, `dead-code`, `error-handling`).
- **PRD review** — dispatched by `review` in prd mode against design docs (e.g., `data-dependency`, `ui-conflict`).
- **Plan review** — dispatched by `review` in plan mode against plan docs (e.g., `task-dependency`, `migration-safety`).
- **Cross-stage** — apply across modes (e.g., `blast-radius`, `state-completeness`).

Run `ls core/specialists/` for the current list.

### Packs

Packs live in `packs/`. Each ships a `pack.json` declaring its skills and specialists. Two current kinds:

- **Content packs** (e.g., `engineering`) — ship domain skills and specialists that a team can adopt wholesale.
- **Integration packs** (e.g., `linear`, `jira`, `github-issues`) — teach the core `ticket` skill how to talk to a specific platform, keyed by `ticket-system` in `jig.config.md`.

See each pack's `pack.json` and `README.md` for what it ships.

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
│   ├── skills/          Pipeline skills (one dir per skill)
│   ├── agents/          Core agents
│   └── specialists/     Review specialists (one file per specialist)
├── packs/               Starter and integration packs (see each pack's pack.json)
├── adapters/            Platform integration (claude/, gemini/, codex/)
├── scaffold/            jig init templates (config, team dir, skill template)
├── commands/            Slash-command files for the /jig: namespace
├── docs/                Specs and documentation
├── team/                (optional, not in this repo) Team's extensions — highest-priority discovery layer
├── .claude/             Plugin self-install (settings.json)
├── .claude-plugin/      Plugin manifest (plugin.json) and marketplace definition
├── package.json         npm metadata
├── scripts/             Maintenance and release scripts
├── assets/              Static assets (logos, images)
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
- Skill names: lowercase with hyphens. Core skills have no prefix; pack skills use the pack's declared `prefix` (see `pack.json`).
- Descriptions: MUST start with "Use when..."
- SKILL.md: under 500 lines. Heavy content goes in `reference/` subdirectory.
- No language-specific references in core skills (TypeScript, Python, etc.) — core is stack-agnostic

## Commit Conventions

Commit conventions (format, types, scopes, co-author rules) are defined in `jig.config.md` under `## Commit`. The commit agent at `core/agents/commit.md` reads that config.

- **Never commit or push without explicit user approval**

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
4. Add to the `skills` array in `.claude-plugin/plugin.json`
5. If the skill should surface during brainstorming, add it to the concerns checklist in `jig.config.md`

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

Main branch and branch naming format are defined in `jig.config.md` under `## Branching`.

- **Never commit or push without explicit user approval**
