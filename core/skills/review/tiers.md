# Review Tiers & Specialist Inventory

## Tier Definitions

### fast-pass

**Runs**: Per-task in `team-dev` AND pre-PR in `code-review` agent
**Purpose**: Catch blocking and high-impact issues early while implementers still have context
**Default specialists**: security, error-handling, dead-code

### full-only

**Runs**: Pre-PR in `code-review` agent only
**Purpose**: Deep analysis requiring broader context (cross-file data flow, contract alignment)
**Default specialists**: async-safety, performance

Teams configure which specialists belong to which tier in `jig.config.md`:

```markdown
## Review
swarm-tiers:
  fast-pass: [security, dead-code, error-handling]
  full: all
```

## Scoring Rules

Scoring is **mechanical** — severity levels in specialist frontmatter drive the score directly. All findings are always reported regardless of score.

| When this is the highest severity | Score cannot be higher than | Meaning |
|-----------------------------------|----------------------------|---------|
| `blocking` | 4 | Must fix before merge |
| `major` (no blocking) | 7 | Should fix, request changes |
| `minor` only | 8-9 | Suggestions, approve with comments |
| No findings | 10 | Clean — ready for PR |

No exceptions. The score reflects merge readiness, not effort quality.

## Severity Definitions

| Severity | When to Use | Examples |
|----------|-------------|---------|
| `blocking` | Will prevent merge. Security risk, data loss, critical correctness | Hardcoded secrets, injection vulnerabilities, data corruption |
| `major` | Should be fixed. Pattern violation, correctness risk | Swallowed errors, unused code, race conditions |
| `minor` | Nice to have. Style, performance suggestion | Missing optimization, potential edge case |

## Core Specialist Inventory

These ship with Jig. Teams add their own in `team/specialists/`.

| Name | Model | Severity | Tier | Focus |
|------|-------|----------|------|-------|
| security | sonnet | blocking | fast-pass | Injection, secrets, auth, data exposure |
| dead-code | haiku | major | fast-pass | Unused code, disconnected wiring |
| error-handling | haiku | major | fast-pass | Swallowed errors, missing handling |
| cli-invocation | haiku | major | fast-pass | External CLI flag semantics, path quoting, silent failures |
| async-safety | sonnet | major | full-only | Race conditions, premature state, resource leaks |
| performance | haiku | minor | full-only | Algorithmic issues, unbounded operations |

## Logic Reviewer

The logic reviewer is NOT a specialist — it's a reasoning agent that runs after the swarm.

| Aspect | Value |
|---|---|
| File | `logic-reviewer.md` (not in `specialists/`) |
| Model | Opus (configurable via `deep-review-model` in `jig.config.md`) |
| Runs | Pre-PR only (`tier: all`). Skipped for `tier: fast-pass`. |
| Input | Full diff + swarm findings + tool access (Read, Grep, Glob) |
| Method | 7 reasoning patterns (Skeptic's Method) + proactive codebase exploration |
| Sub-agents | Can spawn sonnet/haiku agents for deep dives |

### How It Differs from Specialists

| | Specialists | Logic Reviewer |
|---|---|---|
| Input | Filtered diff (only matching files) | Full diff + codebase access |
| Approach | Pattern matching against checklist | Reasoning about correctness |
| Model | Haiku/Sonnet (cheap, fast) | Opus (expensive, deep) |
| Tools | None (prompt + diff only) | Read, Grep, Glob, Agent |
| Parallelism | All run in parallel | Single sequential agent |
| Swarm-aware | No (independent) | Yes (sees swarm findings, skips duplicates) |
