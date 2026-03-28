# Jig Framework

This project uses **Jig** for development workflow management.
See `jig.config.md` for pipeline configuration.

## About This Repo

Jig is an AI engineering workflow framework for teams. This repo IS Jig — the canonical source for the framework. It also uses itself (Consumer Zero).

**Self-hosting:** Core skills and agents live in `core/`. The `.claude/` directory symlinks to `core/` so Claude Code discovers them natively. When you edit a core skill, Claude sees the change immediately.

## Tech Stack

Markdown, YAML frontmatter, shell scripts. No build step. No runtime dependencies.

## Commands

| Task | Command |
|------|---------|
| Verify structure | `find . -name "SKILL.md" -not -path "./.git/*"` |
| List skills | `ls core/skills/` |
| List specialists | `ls core/specialists/` |
| Check symlinks | `ls -la .claude/agents/ .claude/skills/` |

## Code Style

- Markdown files: 80 character line width where practical
- YAML frontmatter: 2 space indent
- Skill names: lowercase with hyphens, prefixed by origin (`jig-`, `eng-`, team convention)
- Descriptions: must start with "Use when..."

## Commit Conventions

- Conventional commits: `type(scope): message`
- Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`
- Allowed scopes: `core`, `framework`, `packs`, `adapters`, `scaffold`, `docs`, `agents`, `specialists`
- Never commit without explicit user approval
- Use the Jig commit agent (`.claude/agents/commit.md`)

## Git Workflow

- **Never commit or push without explicit user approval.**
- Main branch: `main`
- Branch naming: `{username}/jig-{number}-{kebab-title}` (once we have a ticket system)

## Project Structure

```
jig/
├── framework/        Meta-docs: pipeline, skill schema, tier system, discovery
├── core/             Core skills (14), agents (3), specialists (5)
├── packs/            Starter packs (engineering/)
├── adapters/         Platform adapters (claude/, gemini/, codex/)
├── scaffold/         jig init templates
├── docs/             Documentation and specs
├── team/             Jig's own team extensions (for developing Jig itself)
└── .claude/          Symlinks to core/ for Claude Code discovery
```

## Developing Jig

When working on Jig skills:
- Edit the source at `core/skills/{name}/SKILL.md`
- The symlink in `.claude/skills/{name}` means Claude sees changes immediately
- Follow the schema in `framework/SKILL_SCHEMA.md`
- Follow the tier rules in `framework/TIER_SYSTEM.md`
- Keep SKILL.md under 500 lines; use `reference/` for deep content

When adding new skills:
- Use `/jig-extend` (once it exists) or follow `scaffold/SKILL_TEMPLATE.md`
- Add to the appropriate directory (`core/skills/`, `packs/*/skills/`, `team/skills/`)
- Core skills require `jig-` prefix

## Key Principle

Jig eats its own dogfood. Every process we build into the framework, we use to develop the framework. If something is painful for us, it'll be painful for consumers.
