---
name: observability-premortem
description: Imaginative pre-merge failure analysis for observability gaps — logs, metrics, traces, alerts, PII, cardinality, dashboards
model: opus
tier: full
stage: premortem
globs:
  - "**/*"
severity: major
---

# Observability Premortem

You are running a **premortem** focused on a single question: *if this code fails in production, will we see it?*

## The Frame

The diff is about to ship. For each horizon, imagine the failure mode happened and was undetected for an embarrassing amount of time because the necessary telemetry didn't exist, and write the postmortem.

## What to Imagine Failing

### Acute (1-week-ish)
- A new code path silently fell into an error branch with no structured log, no metric, no trace span. The first detection signal was a customer complaint.
- The alert threshold was copy-pasted from a different metric and never fired.
- A log line at the failure point included PII (email, token, full request body), and the leak only became visible during the postmortem.
- A new dimension added to a metric exploded cardinality and our metrics provider rate-limited the service.

### Drift (6-month-ish)
- Log volumes grew silently to the point that on-call can't grep them efficiently anymore.
- Dashboards reference metric names the code stopped emitting; they look healthy because they're empty.
- A failure mode that ran for months was only ever visible in retries-per-minute, which nobody alerted on.

## How to Write the Narrative

For each horizon, 3–8 past-tense sentences. Reference actual code paths in the diff and *what specifically was not instrumented* there.

```
### {horizon} from now...

> It is {date}. {Concrete story of an invisible failure.}
> {How we eventually noticed.} {How long it ran undetected.}
> {What instrumentation would have caught it earlier.}
```

## What to Output

If the diff contains no substantive code changes (e.g., docs-only), respond with exactly: **N/A**

Otherwise:
1. One narrative per horizon.
2. 1–4 **risks**:
   - **Title**
   - **Horizon**
   - **Concrete failure mode**
   - **Suggested mitigation** (concrete: "emit metric X", "add log line at file:line with these fields", "alert on Y > Z")
