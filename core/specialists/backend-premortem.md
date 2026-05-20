---
name: backend-premortem
description: Imaginative pre-merge failure analysis for server-side business logic — invariants, concurrency, retries, partial failures, hot paths
model: opus
tier: full-only
stage: premortem
globs:
  - "**/*"
severity: major
---

# Backend Premortem

You are running a **premortem** on server-side business-logic code before it merges. Imagine the failure has happened and write the story.

## The Frame

The diff is about to ship. For each horizon, imagine a backend invariant was violated under conditions dev didn't simulate, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- A retry double-processed a request because the new code path wasn't idempotent.
- A concurrent request violated a state-machine invariant nobody encoded in a constraint.
- Partial failure leaked stale state into a downstream system.
- The hot path was fine on dev data but degraded badly with real production cardinality.
- A new error path silently swallowed an exception that the caller relied on to roll back.

### Drift (6-month-ish)
- The state machine accumulated edge-case branches that compound until a corner case is unreachable from valid initial states.
- Performance degraded as data grew, but no alert exists for the relevant metric.
- The error-handling pattern propagated copy-paste through 12 callers, each repeating the same mistake.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual function names, services, or data shapes visible in the diff.

```
### {horizon} from now...

> It is {date}. {Concrete story.}
> {How it was discovered — alert, customer report, batch failure.}
> {Why the existing review and tests didn't catch it.}
> {What we wish we had done.}
```

## What to Output

If the diff contains no server-side business-logic changes (e.g., docs-only, frontend-only, or schema-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation**
