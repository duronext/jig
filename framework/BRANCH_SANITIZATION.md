# Branch Name Sanitization

> **Schema version:** `v1`

## Purpose

The persisted premortem file
(`docs/premortems/{YYYY-MM-DD}-{sanitized-branch}-premortem.md`) and any
future filename-encoded branch reference uses a sanitized branch name to
survive filesystem rules. Five places in the framework derive this name;
they MUST use this canonical algorithm so a file written by one consumer
can be found by another.

## The Algorithm

Given a raw branch name `B` (from `git branch --show-current`):

1. Replace every character not in `[A-Za-z0-9._-]` with `-`.
2. Collapse any run of two or more consecutive `-` into a single `-`.
3. Strip leading and trailing `-`.

In shell:
```
sanitized=$(git branch --show-current | sed -E 's/[^A-Za-z0-9._-]/-/g; s/-+/-/g; s/^-+|-+$//g')
```

Examples:

| Raw branch | Sanitized |
|---|---|
| `matthew/jig-premortem-skill` | `matthew-jig-premortem-skill` |
| `release/2026.05/cutover` | `release-2026.05-cutover` |
| `feat/foo bar` | `feat-foo-bar` |
| `users/alice/fix:thing` | `users-alice-fix-thing` |

## Collision Surface (acknowledged limit)

The sanitization is one-way: `release/2026.05/cutover` and
`release/2026.05-cutover` both sanitize to `release-2026.05-cutover`. Two
such branches cannot coexist in `docs/premortems/` without a date prefix
difference. Consumers MUST treat the filename
`{date}-{sanitized}-premortem.md` as date-disambiguated and accept that
same-day collisions on near-identical branches are a known limitation. If
this becomes a real incident, add a `commit-sha` suffix in v2.

## Lookup Discipline

Any consumer searching for a premortem file MUST:

1. Compute `sanitized` using the algorithm above.
2. Look for `docs/premortems/*-{sanitized}-premortem.md`.
3. If zero files match, emit a single visible log line:
   `Premortem lookup: docs/premortems/*-{sanitized}-premortem.md → NOT FOUND`
   (this is the v1 telemetry contract — silence on lookup miss is a bug).
4. If exactly one file matches, proceed.
5. If more than one matches (date prefix differs), prefer the most recent
   by filename sort and emit a warning that older files were skipped.

## Producers and Consumers

| Skill | Role | Section |
|---|---|---|
| `premortem` orchestrator | Producer | Stage 4 (Persist) |
| `review` Mode: premortem | Producer | Stage 7 |
| `pr-create` | Consumer | Step 0a precheck + Step 6 embedding |
| `pr-respond` | Consumer | Step 2 premortem-aware context |
| `postmortem` | Consumer | Step 1.5 auto-diff |

Each one MUST cite this document by path in its prose so future
contributors find the canonical algorithm.
