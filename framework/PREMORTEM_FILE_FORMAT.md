# Premortem File Format

> **Schema version:** `v1`
> **Status:** Stable from this point forward. Breaking changes require a
> major-version bump and a deprecation window.

## Purpose

The persisted file at
`docs/premortems/{YYYY-MM-DD}-{sanitized-branch}-premortem.md` is the
canonical artifact produced by `/jig:premortem`. It is parsed by four
independent consumers:

| Consumer | Reads | Behavior on mismatch |
|---|---|---|
| `pr-create` Step 6 | Synthesis section's checkboxes | Embeds decisions into PR body |
| `pr-respond` Step 2 | Accept-rationale per risk | Surfaces accepted-risk context in reviewer responses |
| `postmortem` Step 1.5 | Full synthesis + decisions | Diffs predicted vs actual root cause |
| `premortem` Stage 5 | Own output for interactive walk-through | Updates decision checkboxes in place |

Without a shared schema, any synthesizer evolution silently breaks every
parser. This document is the contract.

## File Header

Every persisted premortem file MUST begin with this HTML comment as the
literal first line:

```
<!-- premortem-schema: v1 -->
```

This is a stable, parseable marker. Consumers MUST read it before any
other parsing and MUST fail loudly (not silently) on an unknown major
version.

After the schema marker, the file continues with the standard header:

```
# Premortem: {branch}

**Date**: YYYY-MM-DD
**Work type**: {work-type}
**Horizons**: {comma-separated horizons}
**Specialists**: N dispatched, M N/A
**Diff**: F files, +A/-D LOC
```

## Required Sections (v1)

| Section | Heading | Required |
|---|---|---|
| Synthesis | `## Synthesis` | Yes |
| Convergent risks | `### Convergent risks` (under Synthesis) | Yes (may be empty if none) |
| Individual risks | `### Individual risks` (under Synthesis) | Yes (may be empty if none) |
| One-way doors | `## One-way doors identified` | Yes (may say "All changes are reasonably reversible.") |
| Open questions | `## Open questions for the author` | Yes |
| Specialist Summary | `## Specialist Summary` | Yes (with the table below) |

## Risk Block Format (v1)

Each risk MUST conform to:

```
#### {⚠️ if convergent, 🟡 otherwise} {title}
- **Flagged by:** {comma-separated specialist names}
- **Horizon:** {1 week | 6 months | both | other configured horizon}
- **Narrative:** {1–3 sentence past-tense narrative}
- **Decision needed:** ☐ Accept  ☐ Mitigate  ☐ Instrument
- **Suggested mitigation:** {actionable, file-specific where possible}
```

The literal `☐` glyph (U+2610 BALLOT BOX) is required. Author decisions
replace `☐` with `☑` (U+2611 BALLOT BOX WITH CHECK) on the chosen
option. Parsers MUST accept both glyphs and MUST reject ASCII fallbacks
like `[ ]`, `- [ ]`, or `[x]` — those produce undefined behavior.

The labels `Accept`, `Mitigate`, `Instrument` are the only valid decision
states in v1. Adding `Defer` or any other state requires a `v2` schema
bump.

## Specialist Summary Table (v1)

```
| Specialist | Risks | {horizon 1} | {horizon 2} | Notes |
|---|---|---|---|---|
| {name} | {N or 0} | {risks at this horizon or —} | {...} | {one-liner or N/A reason} |
```

Columns are positional. Renaming or reordering requires a `v2` bump.

## Versioning Rules

- **Patch (v1.x not used)** — additive changes that any v1 parser can
  ignore (new optional fields, new section AFTER the required sections).
- **Major (v2)** — breaking changes: rename/remove a required section,
  add a required field to risk blocks, change checkbox vocabulary, reorder
  Specialist Summary columns.

On major bumps:
1. Update this document with the v2 contract.
2. Update the synthesizer at
   `core/skills/premortem/premortem-synthesizer.md` to emit
   `<!-- premortem-schema: v2 -->`.
3. Update each of the four consumers (see table above) to read both
   `<!-- premortem-schema: v1 -->` (deprecated) and v2 for at least one
   release.
4. Add a deprecation note here and in the synthesizer.

## Consumer Validation Rules

Each consumer MUST:
1. Read the first line of the file. If it does not match
   `<!-- premortem-schema: vN -->`, abort with a clear error. The current
   supported version is:
   ```
   <!-- premortem-schema: v1 -->
   ```
2. If `N` is outside the supported range, abort with a clear error
   pointing to this document.
3. Only parse the sections and formats this document specifies for that
   version.

## Related

- `core/skills/premortem/SKILL.md` — orchestrator (produces the file at
  Stage 4)
- `core/skills/review/SKILL.md` — Stage 7 Mode: premortem (writes the
  file)
- `core/skills/premortem/premortem-synthesizer.md` — produces the report
  content
- `core/skills/pr-create/SKILL.md` — Step 6 consumer
- `core/skills/pr-respond/SKILL.md` — Step 2 consumer
- `core/skills/postmortem/SKILL.md` — Step 1.5 consumer
