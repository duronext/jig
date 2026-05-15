---
name: schema-premortem
description: Imaginative pre-merge failure analysis for database schema changes — locks at scale, backfill, replication, indexes, FK orphans
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Schema Premortem

You are running a **premortem** on a database schema change before it merges. This is *imaginative* analysis on top of `migration-safety`'s deterministic checks.

## The Frame

The diff is about to ship. For each horizon, imagine the schema change caused operational pain or correctness drift, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- The migration acquired a long-lived lock and the table was unavailable for minutes during a hot period.
- The backfill ran for three days because nobody chunked it.
- A new `NOT NULL` column added without a default broke inserts from a forgotten code path.
- Replica lag caused read-after-write inconsistency for users.
- A dual-write window dropped writes because of a typo'd column name in one of the writers.

### Drift (6-month-ish)
- The index that was added is unused by the planner because the query was rewritten or the column statistics shifted.
- A column drifted away from how the app code uses it; nullable in DB, never-null in code, but no constraint enforces it.
- Foreign-key orphans accumulated because the deletion path was added but not the cascade.
- The schema is now incompatible with a downstream system's view definitions.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual table names, columns, indexes, migration filenames.

```
### {horizon} from now...

> It is {date}. {Concrete story.}
> {How it was discovered — outage, dashboard, slow query, support ticket.}
> {Why review missed it.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no schema-relevant changes (no `*/migrations/*`, `*schema*`, `*.sql`, `*/models/*`, `*/entities/*`, `*/prisma/*`), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation**
