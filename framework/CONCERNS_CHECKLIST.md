# Jig Concerns Checklist

The concerns checklist is a configurable list of engineering considerations that `jig-brainstorm` surfaces during feature design. It ensures teams never forget critical cross-cutting concerns.

## How It Works

1. Team defines concerns in `jig.config.md`, each pointing to a skill, specialist, or `manual`
2. During brainstorming (features and improvements), `jig-brainstorm` presents each concern
3. User marks each as Y (yes, applies), N (no, not relevant), or NA (not applicable)
4. For Y concerns, the referenced skill is loaded for guidance
5. Decisions are recorded in the design document

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
| Feature | Full checklist — every concern is surfaced |
| Improvement | Full checklist |
| Bug | Skipped — bugs use light brainstorm focused on root cause |
| Task | Skipped — tasks skip brainstorm entirely |
