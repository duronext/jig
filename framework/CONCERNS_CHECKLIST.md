# Jig Concerns Checklist

The concerns checklist is a configurable list of engineering considerations that the `prd` skill surfaces during requirements capture. It ensures teams never forget critical cross-cutting concerns when defining *what* to build.

## How It Works

1. Team defines concerns in `jig.config.md`, each pointing to a skill, specialist, or `manual`
2. During PRD authoring (features and improvements), `prd` walks through each concern in Step 3c
3. User marks each as Y (yes, applies), N (no, not relevant), or NA (not applicable)
4. For Y concerns, the referenced skill is loaded for guidance and its implications are added as acceptance items
5. Decisions are recorded in the PRD (in the Acceptance Checklist or Out of Scope sections)

## Configuration

In `jig.config.md`:

```markdown
## Concerns Checklist
- i18n: team/skills/fe-i18n
- analytics: team/skills/ft-analytics
- error-handling: core/specialists/error-handling
- caching: team/skills/be-cache
- feature-flags: team/skills/ops-feature-flags
- migrations: team/skills/be-migrations
- test-strategy: manual
- security: core/specialists/security
```

### Concern Targets

| Target | Meaning |
|--------|---------|
| `team/skills/{name}` | Load a team skill for guidance on this concern |
| `core/specialists/{name}` | Reference a core specialist's expertise |
| `packs/{pack}/skills/{name}` | Load a pack skill |
| `manual` | Flag for human attention — no automated guidance |

## Default Checklist

If no concerns are configured, Jig uses a minimal default:

```markdown
- error-handling: core/specialists/error-handling
- security: core/specialists/security
- test-strategy: manual
```

Teams are expected to expand this with their domain-specific concerns.

## Work Type Behavior

| Work Type | Checklist Behavior |
|-----------|-------------------|
| Feature | Full checklist — every concern is surfaced during PRD authoring |
| Large improvement | Full checklist |
| Small improvement | Only concerns flagged by swarm or user |
| Bug | Skipped — bug PRDs (light tier) focus on root cause and fix |
| Task | Skipped — tasks don't go through PRD |
