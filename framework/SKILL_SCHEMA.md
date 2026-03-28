# Jig Skill Schema

Every skill in the Jig ecosystem — core, pack, or team — uses this schema.

## Frontmatter

```yaml
---
name: string              # Required. Unique identifier. Max 64 chars.
                          # Core: jig-* prefix (reserved)
                          # Pack: {pack-prefix}-* (declared in pack.json)
                          # Team: any convention (recommend domain prefixes)

description: string       # Required. Max 1024 chars. MUST start with "Use when..."
                          # Describes trigger conditions, not workflow summaries.

tier: enum                # Required. One of: standards | domain | feature | workflow
                          # Determines activation mode (see TIER_SYSTEM.md)

globs: string[]           # Optional. File patterns that auto-trigger loading.
                          # Only used by domain and feature tiers.
                          # Scope by code location, not applicability.

alwaysApply: boolean      # Optional. Default false.
                          # true only for standards tier skills.
---
```

## Constraints

- **name:** Max 64 characters. Must be unique across all discovery sources.
- **description:** Max 1024 characters. Must start with "Use when..." to ensure searchability and consistent activation.
- **tier:** Must match the skill's intended activation pattern (see TIER_SYSTEM.md).
- **globs:** Scope tightly. Broad globs cause false-positive loading. Glob by code location (e.g., `**/entities/**/*.ts`), not by applicability.
- **alwaysApply:** Reserved for truly universal standards. A skill that applies to "most" files is not a standards skill.

## File Structure

### Minimal skill

```
skill-name/
└── SKILL.md              # Everything in one file. < 500 lines.
```

### Skill with progressive disclosure

```
skill-name/
├── SKILL.md              # Core rules and quick reference. < 500 lines.
└── reference/
    ├── topic-a.md        # Deep dive loaded on demand
    ├── topic-b.md
    └── topic-c.md
```

### Skill with supporting prompts

```
skill-name/
├── SKILL.md              # Main skill instructions
├── implementer-prompt.md # Prompt for spawned subagents
├── reviewer-prompt.md    # Prompt for review subagents
└── reference/
    └── ...
```

## Writing Guidelines

1. **Keep SKILL.md under 500 lines.** Move detailed patterns to `reference/` subdirectory.
2. **Progressive disclosure.** SKILL.md has a reference table that tells the AI when to load each sub-document:
   ```markdown
   | Guide | Load When |
   |-------|-----------|
   | [Queries](./reference/queries.md) | Writing database queries |
   ```
3. **One level deep.** `reference/` files do not link to other `reference/` files.
4. **Cross-reference explicitly.** When a skill requires another, use: `**REQUIRED**: Use {skill-name} skill for {reason}`.
5. **Non-negotiables first.** Lead with ALWAYS/NEVER rules, then patterns, then examples.
6. **No workflow summaries in descriptions.** The description says when to trigger, not what the skill does step by step.

## Specialist Schema

Specialists (for the review swarm) use a similar but distinct schema:

```yaml
---
name: string              # Specialist identifier
description: string       # What this specialist reviews
model: enum               # haiku | sonnet | opus — cost/capability tradeoff
tier: enum                # fast-pass | full-only — when to dispatch
globs: string[]           # File patterns this specialist cares about
severity: enum            # blocking | major | minor — how findings are weighted
---
```

The markdown body below the frontmatter IS the specialist's prompt. It defines what to check, what to ignore, and how to report findings.
