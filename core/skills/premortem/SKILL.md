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
- `kickoff` reached the optional premortem stage for a work-type configured with non-empty `premortem-horizons`

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
   - If empty or undefined: confirm with the user before continuing (premortem isn't configured for this work-type).

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
diff: {full diff from Stage 2}
changed-files: {list of paths}
horizons: {array from Stage 1}
work-type: {from Stage 1}
```

The `review` skill handles discover, prepare, dispatch, collect, synthesize, score, and report (see `core/skills/review/SKILL.md` — Mode: premortem branches at Stages 1, 2, 3, 5, 6, 7).

### Stage 4: Persist the Report

`review` returns the full markdown report. Write it to:

```
docs/premortems/{YYYY-MM-DD}-{branch-name}-premortem.md
```

Where `{branch-name}` is the current branch with `/` replaced by `-` for filesystem safety.

If `docs/premortems/` does not exist, create it.

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
After premortem, `pr-create` reads the matching premortem file and embeds the **decision matrix** (not the full narratives) into the PR description. Reviewers see what was raised and how the author resolved it.

### With `postmortem`
When an incident postmortem runs against a merged PR, it auto-reads `docs/premortems/*-{branch}-premortem.md` and runs predicted-vs-actual diff. See `core/skills/postmortem/SKILL.md`.

### With `kickoff`
If `premortem-horizons[work-type]` is non-empty, kickoff offers premortem between REVIEW and SHIP. Skippable.

### With `brainstorm`
If `premortem` is in the concerns checklist, brainstorm flags it as a *future consideration* during design — doesn't run it.
