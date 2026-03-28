# Jig Tier System

Tiers determine how and when skills are loaded into context.

## Tiers

### Standards

- **Activation:** Always loaded (`alwaysApply: true`)
- **Globs:** Not needed — applies to everything
- **Use for:** Universal rules that every file edit should follow. Sentence case for user-facing text. Commit message format. Absolute minimum set of rules.
- **Keep minimal.** Every standards skill adds to the base context for every interaction. Only truly universal rules belong here.

### Domain

- **Activation:** Glob-triggered when editing matching files
- **Globs:** Scoped to domain directories (e.g., `**/entities/**/*.ts`, `**/components/**/*.tsx`)
- **Use for:** Stack expertise. Database patterns, frontend component conventions, testing strategies. Loaded contextually when the work touches relevant files.
- **Scope tightly.** Globs should match code locations, not broad applicability. A database skill triggers on entity files, not on every `.ts` file.

### Feature

- **Activation:** Narrow globs matching specific feature code
- **Globs:** Feature-specific paths (e.g., `**/component-filter/**/*`, `**/search/**/*`)
- **Use for:** Knowledge about a particular feature's implementation, patterns, and constraints. Only loaded when touching that feature's code.
- **Narrower than domain.** If a domain skill covers React components broadly, a feature skill covers one specific component system deeply.

### Workflow

- **Activation:** Explicit invocation only (`/skill-name` or programmatic reference)
- **Globs:** None — never auto-loaded
- **Use for:** Pipeline skills (kickoff, brainstorm, review). Process orchestration. Skills that the user or another skill intentionally invokes.
- **All core pipeline skills are workflow tier.** They don't auto-load on file edits because they represent intentional process steps.

## Choosing a Tier

```
Does this skill apply to EVERY file edit?
  Yes → Standards (but think twice — very few things are truly universal)
  No ↓

Does this skill apply when editing files in a specific directory/pattern?
  Yes → Is the pattern broad (a whole domain like "database" or "frontend")?
    Yes → Domain
    No → Feature (narrow, one subsystem)
  No ↓

Is this skill invoked intentionally as a process step?
  Yes → Workflow
```

## Discovery Priority

When multiple skills match, Jig uses origin-based priority:

```
1. team/     ← Highest (team overrides everything)
2. packs/    ← Middle (pack defaults)
3. core/     ← Lowest (framework defaults)
```

Within the same origin, tier determines *when* a skill loads but not priority. A team domain skill and a team feature skill can both be active simultaneously if their globs both match.
