# Team Extensions

This directory contains your team's custom skills, specialists, and agents that extend Jig.

## Structure

```
team/
├── skills/          Your domain skills (be-database, fe-react, etc.)
├── specialists/     Your review specialists (typeorm.md, i18n.md, etc.)
└── agents/          Your custom agents (e2e-test-runner.md, etc.)
```

## How It Works

Everything you put here is automatically discovered by Jig:

- **Skills** are activated by their tier (standards, domain, feature, workflow)
- **Specialists** are dispatched by `jig-review` when their globs match changed files
- **Agents** are invoked by name or trigger phrase

Team extensions have the highest priority in Jig's discovery system. If you create a skill with the same name as a core or pack skill, yours wins.

## Creating Extensions

Use `/jig-extend` to create new skills, specialists, or agents. It will interview you about what you need and scaffold the right artifact in the right place.

Or create manually using the skill template in `SKILL_TEMPLATE.md`.

## Wiring Into the Pipeline

To surface a team skill during brainstorming, add it to the Concerns Checklist in `jig.config.md`:

```markdown
## Concerns Checklist
- my-concern: team/skills/my-skill
```

To add a review specialist, just drop it in `team/specialists/` with valid frontmatter. `jig-review` discovers it automatically.
