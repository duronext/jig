# Upgrading from Jig 1.x to 2.0

Jig 2.0 renames the technical requirements document from **PRD** to **spec**
and adds a new **PRD**: a plain-language product document with phases,
milestones and sign-off, published as a live page. A 1.x repo has config keys,
plan headers and files that use the old meaning. This guide moves them over
without losing anything.

Run it when `jig.config.md` exists and has no `spec-swarm-tiers` key, or when
the user asks to upgrade.

## 1. Survey (read only)

Report what you find before changing anything:

- **Config keys** in `jig.config.md`: `prd-swarm-tiers`, `prd-sync`, a
  `## PRD Review` section, `kind = prd | plan` in `filename-format`, the
  `stages` list, `prd-project` under `## Linear`.
- **Old technical PRDs**: files in `{plans-directory}` named `*-prd.md` whose
  body has layer-tagged checklist items (`- [ ] [API]`, `[DATA]`, `[LOGIC]`,
  `[UI]`). That fingerprint marks a 1.x PRD, which is a 2.0 spec.
- **Likely technical PRDs**: `*-prd.md` files without layer tags but with an
  acceptance checklist (`- [ ]` items under an "Acceptance" heading), API or
  data sections, or file paths. Early 1.x PRDs look like this. List them with
  a suggestion to rename; rename them if the user agrees.
- **References** to those files anywhere in the repo: `> **PRD:**` plan
  headers, plain `**PRD:**` lines in design docs, Markdown links
  (`[x](./x-prd.md)`), and paths in backticks.
- **Team specialists** in `team/specialists/` with `stage: prd` or
  `stage: both`.
- **Team skills or docs** that tell people to run `/prd` for technical
  requirements.

Show the counts and the list, then ask: "Upgrade these to 2.0?"

## 2. Config

| 1.x | 2.0 |
|-----|-----|
| `## PRD Review` → `prd-swarm-tiers: {list}` | `## Spec Review` → `spec-swarm-tiers: {same list}` |
| (none) | `## PRD Review` → `prd-swarm-tiers: fast-pass: [plain-language, mvp-cut, testable-outcomes, missing-moments]` |
| (none) | `## PRD` → `prd-publish: artifact` |
| `prd-sync: X` | `spec-sync: X`, and ask whether the new PRD should sync too (`prd-sync: X`) |
| `# prd-sync: none` (commented) | keep it, and add `# spec-sync: none` on the next line |
| `kind = prd \| plan` | `kind = prd \| spec \| plan` |
| `stages: [discover, plan, execute, review, ship, learn]` | `stages: [discover, prd, spec, plan, execute, review, prd-check, ship, learn]` |
| a customised `stages` list | keep it; insert `prd` and `spec` after `discover`, and `prd-check` before `ship` |
| bug/task overrides | add `prd` to `skip` for bug and task; add `spec` to `skip` for task |
| `prd-project:` (Linear) | `docs-project:` (the old key still works) |

Section order follows `scaffold/jig.config.md`: `## Review`, then `## PRD`,
`## PRD Review`, `## Spec Review`, then `## Plan Review`. The 1.x
`## PRD Review` block is not renamed in place: its list moves to the new
`## Spec Review`, and `## PRD Review` gets the new product specialists.

## 3. Documents

For each old technical PRD:

1. `git mv {topic}-prd.md {topic}-spec.md`
2. Search the whole repo for the old filename and update every reference:
   `> **PRD:** …-prd.md` becomes `> **Spec:** …-spec.md`, a plain
   `**PRD:**` line becomes `**Spec:**`, and links and paths follow the rename.
3. Leave prose alone. Sentences in old plans that describe the 1.x process
   ("the plan header's `> **PRD:**` line") are history, not pointers.
4. Do **not** write a new PRD for old work. The new PRD starts with the next
   feature.

Files without a date prefix (`microsite-prd.md`) still work as pointers, but
2.0 skills look for `{date}-{topic}-{kind}.md` when nothing points at a file.
Offer to add the date from `git log --diff-filter=A` when renaming.

Files named `*-prd.md` without the layer-tagged fingerprint are left alone
and listed for the user to decide.

## 4. Specialists and skills

- `stage: prd` in a team specialist becomes `stage: spec` when it reviews
  technical content (data, API, UI behaviour). Ask when unsure.
- `stage: both` keeps working (it means `[spec, plan]`); offer to write it as
  `stage: [spec, plan]`.
- Team skills that reference `/prd` for technical requirements are listed for
  the user to update; do not rewrite team skills without asking.

## 5. Finish

- Show the diff summary.
- Do not commit unless the user asks. Suggest one commit:
  `chore: upgrade jig config and documents to 2.0`.
- Tell the user what changed in one paragraph: `/spec` is what `/prd` used to
  be; `/prd` now writes the product document; old documents were renamed.
  Any doc, habit or team skill that says "run `/prd` before planning" now
  means the product document, so point those at `/spec` (list the ones found
  in the survey).
