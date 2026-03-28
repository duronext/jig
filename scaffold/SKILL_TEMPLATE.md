# Jig Skill Template

Use this template when creating new skills. For guided creation, use `/jig-extend` instead.

## Minimal Skill

Create `team/skills/{name}/SKILL.md`:

```yaml
---
name: my-skill
description: >
  Use when [specific trigger condition]. [What it helps with].
tier: domain
globs:
  - "**/path/to/relevant/**/*.ts"
---
```

```markdown
# My Skill

## ALWAYS
- Rule 1
- Rule 2

## NEVER
- Anti-pattern 1
- Anti-pattern 2

## Patterns

### Pattern Name
Description and examples...
```

## Skill with Progressive Disclosure

For skills over 500 lines, split into core + reference:

```
team/skills/my-skill/
├── SKILL.md              # Core rules (< 500 lines)
└── reference/
    ├── topic-a.md        # Deep dive
    └── topic-b.md        # Deep dive
```

Add a reference table in SKILL.md:

```markdown
| Guide | Load When |
|-------|-----------|
| [Topic A](./reference/topic-a.md) | Working with topic A |
| [Topic B](./reference/topic-b.md) | Working with topic B |
```

## Review Specialist

Create `team/specialists/{name}.md`:

```yaml
---
name: my-specialist
description: Reviews [specific concern]
model: haiku
tier: fast-pass
globs:
  - "**/*.ts"
severity: major
---

## What to Check
- Check 1
- Check 2

## What to Ignore
- Ignore 1

## Report Format
File:line_number | Pattern | Evidence | Fix
```

## Checklist

Before committing a new skill:
- [ ] Name follows team convention (recommend domain prefix: `be-`, `fe-`, `ops-`, etc.)
- [ ] Description starts with "Use when..."
- [ ] Tier matches activation pattern (see framework/TIER_SYSTEM.md)
- [ ] Globs scoped by code location, not broad applicability
- [ ] SKILL.md under 500 lines (heavy content in reference/)
- [ ] Cross-references explicit: `**REQUIRED**: Use {skill} for {reason}`
- [ ] Added to Concerns Checklist in jig.config.md (if applicable)
