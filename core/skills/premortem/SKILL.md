---
name: premortem
description: >
  Use when you want to imagine how a change could fail at multiple time horizons
  before it merges. Runs prospective-hindsight risk analysis: imagine the launch
  failed at 1 week and 6 months, write the postmortem, extract risks, force
  explicit Accept/Mitigate/Instrument decisions. Invokable directly via
  /jig:premortem or suggested by pr-create on risk signals.
tier: workflow
alwaysApply: false
---

# Premortem

**PURPOSE**: Run prospective-hindsight risk analysis on a branch before PR creation. Imagine the launch failed at the configured horizons; write the postmortem narratives; extract a risk register; force explicit author decisions on each risk.

**CONFIGURATION**: Reads `jig.config.md` for `premortem-horizons`, `premortem-swarm-tiers`, `premortem-specialist-model`, `premortem-synthesizer-model`, `main-branch`.

---

## When to Use

- `/jig:premortem` invoked manually
- `pr-create` detected risk signals and the author accepted the suggestion
- `kickoff` reached the optional premortem stage for a work-type configured with non-empty `premortem-horizons` (v1: invoke `/jig:premortem` directly — kickoff auto-prompt is a planned follow-up)

**Do NOT use when:**
- The diff is empty (no commits ahead of main)
- The work is a non-code config change (e.g., README typo)
- A premortem already exists for this branch and the diff hasn't changed since (offer to re-run explicitly)

---

## Pipeline

### Stage 1: Determine Context

1. Identify work-type:
   - From `kickoff` metadata if invoked as a stage
   - From branch name prefix otherwise (e.g., `matthew/feat-...` → `feature`)
   - Interactive prompt if ambiguous

2. Look up horizons from `jig.config.md`:
   - `premortem-horizons[work-type]`
   - **If the `premortem-horizons` key itself is missing from
     `jig.config.md`**: premortem is not configured for this project.
     Abort with a clear message: "Premortem is not configured in this
     project's `jig.config.md`. To enable, uncomment the `## Premortem`
     block in your config (see `scaffold/jig.config.md` for a template)
     or set `premortem-horizons` for your work-types. Then re-run
     `/jig:premortem`."
   - **If the key is present but empty/undefined for this work-type**:
     prompt the author "Premortem isn't configured for {work-type}. Use
     default horizons [1 week, 6 months] for this run? [Y/n]". On `Y`,
     proceed; on `n`, abort.

3. Verify the branch is ahead of `main-branch`:
   ```bash
   git fetch origin
   git rev-list --count origin/{main-branch}..HEAD
   ```
   If `0`, abort with a clear message: "No commits ahead of main. Nothing to premortem."

### Stage 2: Build the Diff

```bash
git diff origin/{main-branch}...HEAD
git diff origin/{main-branch}...HEAD --name-only
```

Capture both the full diff and the list of changed paths.

### Stage 3: Dispatch via `review`

Invoke the `review` skill with:

```
mode: premortem
tier: all
diff: {full diff from Stage 2}
changed-files: {list of paths}
horizons: {array from Stage 1}
work-type: {from Stage 1}
```

**Why `tier: all`:** the 8 premortem specialists use `tier: full-only` (per the canonical taxonomy in `core/skills/review/tiers.md`). `tier: fast-pass` would dispatch zero specialists; `tier: all` is the only valid tier choice for premortem dispatch.

The `review` skill handles discover, prepare, dispatch, collect, synthesize, score, and report (see `core/skills/review/SKILL.md` — Mode: premortem branches at Stages 1, 2, 3, 5, 6, 7).

### Stage 4: Persist the Report

Before writing the file, validate the composed report (Stage 7 output,
which combines the composer's framing + synthesizer body) against the v1
contract from `framework/PREMORTEM_FILE_FORMAT.md`. The composed output
MUST contain:

1. `<!-- premortem-schema: v1 -->` as the literal first line (emitted by the composer, not the synthesizer).
2. A `# Premortem: {branch}` H1 title (level-1) within the first 10 lines, emitted by the composer.
3. All five metadata header lines present after the H1 and before `## Synthesis`: `**Date**:`, `**Work type**:`, `**Horizons**:`, `**Specialists**:`, `**Diff**:`. These come from the composer (Stage 7 step 3), not the synthesizer.
4. A `## Synthesis` heading.
5. Under `## Synthesis`, both `### Convergent risks` and `### Individual risks` subheadings (level-3) MUST be present. These may have empty bodies but the headings themselves are required per `framework/PREMORTEM_FILE_FORMAT.md`.
6. Risk-block format: **if any risks are present**, each MUST use the
   `☐ Accept`  `☐ Mitigate`  `☐ Instrument` triple with the literal ☐
   glyph (U+2610), not ASCII `[ ]`. Zero risks is acceptable — a
   docs-only or low-signal diff can legitimately produce a file with no
   decisions. In that case Convergent risks and Individual risks sections
   remain present but empty.
7. A `## One-way doors identified` heading (top-level — not nested under
   Synthesis).
8. A `## Open questions for the author` heading (top-level).
9. A `## Specialist Summary` heading followed by a table.

If any check fails:
- Do NOT write the file.
- Print the raw output to the terminal with a clear diagnostic:
  "Synthesizer output failed v1 schema validation: {which check failed}.
  Showing raw output below. Run premortem again to retry."
- Then abort.

If all checks pass, write the file to:

```
docs/premortems/{YYYY-MM-DD}-{sanitized-branch-name}-premortem.md
```

Where `{sanitized-branch-name}` follows the algorithm in
`framework/BRANCH_SANITIZATION.md`.

If `docs/premortems/` does not exist, create it. After writing, print the
path.

See `framework/PREMORTEM_FILE_FORMAT.md` for the file format contract.

### Stage 5: Surface to Author

After writing the file:

1. Print the compressed terminal view:
   - The header
   - The `## Synthesis` section (convergent + individual risks + one-way doors + open questions)
   - The `## Specialist Summary` table
   - The path to the persisted file

2. Prompt the author:
   > Want me to walk through the decisions interactively? I'll read each risk and ask Accept / Mitigate / Instrument, then write your choices back to the file.

3. If the author says yes:
   - For each risk in the synthesis:
     - Print: title, narrative, suggested mitigation
     - Ask: Accept / Mitigate / Instrument? (with optional rationale)
     - Update the file's checkbox accordingly
   - Save the updated file
   - Recap: "{N} accepted, {M} to mitigate, {K} to instrument"

4. If the author says no:
   - Print: "Edit the file directly — `pr-create` will read your decisions when you're ready."

---

## Integration Notes

### With `pr-create`
After premortem, `pr-create` reads the matching premortem file and embeds
the **decision matrix** (not the full narratives) into the PR description.
Reviewers see what was raised and how the author resolved it.

### With `postmortem`
When an incident postmortem runs against a merged PR, it auto-reads the
matching premortem file. Compute `{sanitized-branch}` using the canonical
algorithm in `framework/BRANCH_SANITIZATION.md`, then look for
`docs/premortems/*-{sanitized-branch}-premortem.md`.

**Sanitization & log-on-miss:** Compute `{sanitized-branch}` using the
canonical algorithm in `framework/BRANCH_SANITIZATION.md`. If the lookup
glob returns zero matches, emit a single visible log line:
`Premortem lookup: docs/premortems/*-{sanitized-branch}-premortem.md → NOT FOUND`.
Do not fail silently — a missing premortem file when one is expected is a
contract violation worth surfacing.

See `core/skills/postmortem/SKILL.md`.

### With `kickoff`
Planned: when `premortem-horizons[work-type]` is non-empty, kickoff will offer
premortem between REVIEW and SHIP. Not yet implemented in v1 — invoke
`/jig:premortem` directly. The kickoff hook is a planned follow-up.

### With `brainstorm`
If `premortem` is in the concerns checklist, brainstorm flags it as a *future consideration* during design — doesn't run it.
