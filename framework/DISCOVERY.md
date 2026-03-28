# Jig Discovery System

How Jig finds, loads, and orchestrates skills, specialists, and agents.

## Skill Discovery

Jig scans three directories in priority order:

```
1. team/skills/         ← Highest priority
2. packs/*/skills/      ← Pack defaults
3. core/skills/         ← Framework defaults
```

### Process

1. **Scan** all three directories for `*/SKILL.md` files
2. **Parse** frontmatter from each (name, tier, globs, alwaysApply)
3. **Deduplicate** by `name` — highest priority origin wins
4. **Activate** based on tier rules:
   - Standards (`alwaysApply: true`): always in context
   - Domain/Feature: match globs against currently edited files
   - Workflow: only when explicitly invoked

### Override Semantics

If `team/skills/jig-brainstorm/SKILL.md` exists, it replaces `core/skills/jig-brainstorm/SKILL.md` entirely. The team version is used; the core version is ignored.

This is how teams customize without editing framework files. Like CSS specificity — the most specific origin wins.

## Specialist Discovery

Specialists for the review swarm follow the same pattern:

```
1. team/specialists/     ← Team's domain-specific reviewers
2. packs/*/specialists/  ← Pack reviewers
3. core/specialists/     ← Framework's generic reviewers
```

### Process

1. **Scan** all three directories for `*.md` files
2. **Parse** specialist frontmatter (name, model, tier, globs, severity)
3. **Deduplicate** by `name` — highest priority origin wins
4. **Filter** by glob intersection with changed files (specialists whose globs don't match any changed file are skipped)
5. **Filter** by swarm tier from `jig.config.md` (fast-pass vs full)
6. **Dispatch** matching specialists as parallel subagents

### Specialist Dispatch

`jig-review` handles dispatch:
- Reads `swarm-tiers` from `jig.config.md` to determine which tier to run
- Collects specialists from all three directories
- Deduplicates (team > pack > core)
- Filters by glob match against changed files
- Filters by tier (fast-pass for per-task review, full for pre-PR)
- Spawns matching specialists as parallel subagents with appropriate model

## Agent Discovery

Agents follow the same pattern:

```
1. team/agents/          ← Team's custom agents
2. packs/*/agents/       ← Pack agents (if any)
3. core/agents/          ← Framework agents
```

Agents are not glob-triggered — they're invoked explicitly by name or trigger phrase.

## Concerns Checklist Discovery

The concerns checklist in `jig.config.md` maps concern names to skill paths:

```markdown
## Concerns Checklist
- i18n: team/skills/fe-i18n
- security: core/specialists/security
- caching: team/skills/be-cache
- test-strategy: manual
```

During brainstorming, `jig-brainstorm` reads this list and:
1. Presents each concern as a yes/no/NA decision
2. For concerns marked yes, loads the referenced skill for guidance
3. For concerns marked `manual`, flags it for human attention
4. Records decisions in the design document

## Pack Discovery

Packs are discovered by scanning `packs/*/pack.json`:

```json
{
  "name": "engineering",
  "prefix": "eng",
  "description": "Language-agnostic engineering practices",
  "skills": ["eng-copywriting", "eng-logging", "eng-testing"],
  "specialists": ["test-coverage"]
}
```

Pack skills and specialists are included in the normal discovery scan at priority level 2 (between core and team).

## Config Discovery

`jig.config.md` is discovered by looking for it in the project root. If not found, Jig uses built-in defaults for all configuration values.
