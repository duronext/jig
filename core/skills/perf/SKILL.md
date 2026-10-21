---
name: perf
description: >
  Use when making something faster or cheaper by measurement: a build, test
  suite, CI pipeline, endpoint or job. Also use when comparing alternatives by
  benchmark or deciding which optimizations to ship. Triggered by "speed up",
  "why is this slow", "benchmark", "profile", or /perf.
tier: workflow
alwaysApply: false
---

# Performance Investigation

**PURPOSE**: Turn "make it faster" into measured, reproducible results. Fix
the protocol before the first run, profile before choosing what to change, and
ship only what still measures as a win in the final combination.

**CONFIGURATION**: Reads `plans-directory` and `filename-format` from
`jig.config.md`. Writes the results doc as kind `perf` (e.g.
`docs/plans/2026-05-27-test-suite-perf.md`) and a `.csv` with the same stem
beside it.

---

## When to Use

- Speeding up a build, test suite, CI pipeline, request path or batch job
- Comparing two or more approaches by measurement
- Deciding which of several optimizations to ship together
- `kickoff` offers it during DISCOVER for work with a speed or cost goal;
  `verify` sends you back here before any "faster" or "cheaper" claim

**Do NOT use when:**
- Something got slower and the cause is unknown: start with `debug`, then come
  back to measure the fix
- Reviewing a diff for slow code: the `performance` specialist in `review`
  covers that

---

## The Iron Law

```
NO LEVER WITHOUT A PROFILE. NO CLAIM WITHOUT A PAIRED MEASUREMENT.
```

## ALWAYS

- Write the protocol and resource limits down before the first run
- Use CPU time as the primary metric; label wall time as noisy
- Interleave A/B runs and compare within pairs
- Prove each knob took effect before trusting its numbers
- Ablate a combination before shipping it

## NEVER

- Benchmark on a busy machine, or while other agents run heavy work
- Pick an optimization because it is fashionable rather than because the
  profile points at it
- Trust a cache hit, a config flag or an env var without checking the run used
  it
- Ship a stack of fixes measured only one at a time

---

## The Process

### Step 1: Collect the constraints first

Ask what is off limits before measuring anything: "as close to real use as
possible", "no assertion changes", "no removing checks from the pipeline",
"no new runtime dependencies". Constraints rule out options; learning them
after the probes ran wastes the probes.

### Step 2: Fix the protocol and limits before the first run

- **Metric:** CPU time (user + sys), e.g. `/usr/bin/time -l` on macOS,
  `/usr/bin/time -v` on Linux. For work that runs in containers (databases,
  services), add the containers' CPU from their cgroup or `docker stats`.
  Report wall time too, labelled "noisy" on a shared machine.
- **Pairs:** run arms back to back, interleaved (A B A B), at least 2 pairs and
  preferably 3–4. Compare only within a pair.
- **Idle gate:** start a run only when no other heavy run is going and the
  machine is at least 75% idle. Record machine load next to every timing.

Example: before runs were gated on an idle machine, one arm's CPU ranged
400–610 s across rounds; gated rounds stayed within 6%.

### Step 3: Profile before choosing levers

Take one CPU profile of the slow path and rank where time goes. Choose levers
from the top of that list.

Example: a faster compiler/transform looked attractive but was 1–3% of test
time; a UI library's runtime style generation was 22%. One profile redirected
the whole effort.

### Step 4: Verify every knob took effect

Log what the run actually used: real concurrency, resolved versions, cache
hits and misses. Settings fail silently. Traps seen in practice:

- A test runner's env var that silently overrides the CLI flag you changed
- A transform cache keyed on config file text, so variants switched by env var
  reuse stale output
- A build cache hit replaying a stale result (see `verify`)
- A task runner that hashes passthrough arguments into every task's key,
  dependencies included, so one flag invalidates the whole graph

### Step 5: Measure combinations; ablate before shipping

Fixes that attack the same cost overlap; their gains don't add. Measure the
combination you intend to ship, then remove each fix in turn. Drop any fix
whose removal costs nothing.

Example: a change that won on its own measured neutral once later changes
landed, and had to be dropped mid-stack.

### Step 6: Re-derive the critical path after every fix

From per-task timings (task-runner run summaries, CI step timings), find what
finishes last. After each fix, recompute it: the bottleneck moves, and with it
what is worth doing next.

### Step 7: Record every experiment in one fixed format

- **Results CSV**, one schema for every experiment, e.g.
  `date,experiment,arm,round,cpu_user_s,cpu_sys_s,wall_s,max_rss_mb,notes`.
  Record machine load in `notes`. `/usr/bin/time -l` (macOS) reports max RSS
  in bytes and GNU `/usr/bin/time -v` in KB; convert to MB before recording
  `max_rss_mb`.
- **Results doc** (`*-perf.md`): what changed, methodology, results,
  learnings.
- Link both from the ticket. `pr-create` links the results doc from the PR
  description once the levers ship.
- Keep the harness and scripts in the repo, not in a temp directory, so the
  next person can rerun them.

### Step 8: Return control

Summarize in conversation which levers measured as wins in the combination,
with their numbers and the `*-perf.md` path, then return control to `kickoff`
or the invoking skill (or the user, if invoked directly).

**Do NOT go on to implement the levers.** They go through the rest of the
pipeline as `kickoff` routes the work, with the results doc as evidence.

---

## Running Probes in Parallel

When several agents probe in parallel, put this protocol and the CSV schema
in the shared context doc, gate heavy runs as `team-dev`'s `lead-playbook.md`
describes, and run timing-sensitive benchmarks one at a time.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Comparing runs taken at different times of day | Interleave A/B pairs; compare within a pair |
| Wall time as the headline number | CPU time first; wall time labelled noisy |
| "The flag made no difference" | Check the run used the flag: log concurrency, versions, cache hits |
| Optimizing what is easy instead of what is slow | Profile first; pick levers from the top of the profile |
| Shipping five fixes each measured alone | Measure the combination, then ablate each fix |
| Chasing the old bottleneck | Recompute the critical path after every fix |
| Results scattered across chat and scratch files | One CSV schema plus a `*-perf.md` in `plans-directory` |

---

## Integration

**Called by:**
- `kickoff` during DISCOVER, for work with a speed or cost goal
- Direct invocation via `/perf`

**Referenced by:**
- `verify` -- its "faster" or "cheaper" claims follow this protocol (Steps 5 and 7)
- `pr-create` -- links the results doc from the PR description

**Terminal state:**
- Return control to `kickoff`, the invoking skill or the user. No auto-invoked implementation.

**Related skills:**
- `debug` -- root cause first when something regressed
- `team-dev` / `sdd` -- shared context doc and heavy-run gating for parallel probes
- `review` -- the `performance` specialist reviews diffs for slow code
