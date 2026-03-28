---
name: jig-verify
description: >
  Use when about to claim work is complete, fixed, or passing, before committing
  or creating PRs. Requires running verification commands and confirming output
  before making any success claims. Evidence before assertions, always.
tier: workflow
alwaysApply: false
---

# Verification Before Completion

**PURPOSE**: Prevent false completion claims by enforcing fresh verification evidence before any assertion of success. Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

---

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the verification command in this message, you cannot claim it passes.

---

## When to Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction about the work
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to the next task
- Delegating to agents
- Reporting status to the user

**Rule applies to:**
- Exact phrases ("all tests pass", "build succeeds", "bug fixed")
- Paraphrases and synonyms ("everything looks good", "we're green")
- Implications of success ("ready to merge", "ready for review")
- ANY communication suggesting completion or correctness

---

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

### Step-by-Step

**IDENTIFY** -- What would prove the claim you are about to make? A test command, a build command, a lint command, a curl request. Name the exact command.

**RUN** -- Execute the full command. Not a subset. Not a cached result. Not "I ran it earlier." Fresh execution, right now, in this message.

**READ** -- Read the full output. Check the exit code. Count the failures, errors, and warnings. Do not skim. Do not assume.

**VERIFY** -- Does the output actually confirm what you are about to claim? A passing lint check does not confirm a passing build. A passing build does not confirm passing tests. Match the evidence to the specific claim.

**CLAIM** -- Now, and only now, make the claim. Include the evidence: "All 47 tests pass (output above)." Not just "tests pass."

---

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| "Tests pass" | Test command output showing 0 failures | Previous run, "should pass", partial run |
| "Linter clean" | Linter output showing 0 errors | Partial check, extrapolation from subset |
| "Build succeeds" | Build command with exit 0 | Linter passing, "logs look good" |
| "Bug fixed" | Test of original symptom passes | Code changed, assumed fixed |
| "Regression test works" | Red-green cycle verified | Test passes once (never saw it fail) |
| "Agent completed task" | VCS diff shows correct changes | Agent reports "success" |
| "Requirements met" | Line-by-line checklist against spec | Tests passing (tests may not cover all requirements) |
| "No regressions" | Full test suite passes | Only new tests run |
| "Works in production" | Production verification (health check, smoke test) | Works locally |

---

## Red Flags -- STOP

If you catch yourself doing any of these, STOP and run the gate function:

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports without checking the diff
- Relying on partial verification ("I ran the unit tests" when the claim is "all tests pass")
- Thinking "just this once"
- Tired and wanting the work to be over
- **ANY wording implying success without having run verification**

---

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not the compiler. Linter is not the test suite. |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion is not an excuse |
| "Partial check is enough" | Partial proves nothing about the whole |
| "Different words so rule doesn't apply" | Spirit over letter |
| "I ran it a few messages ago" | Stale evidence. Run it again. |
| "The change is trivial" | Trivial changes break things too |

---

## Key Patterns

### Tests

```
CORRECT:  [Run test command] -> [See: 47/47 pass] -> "All 47 tests pass"
WRONG:    "Should pass now" / "Looks correct" / "Tests were passing earlier"
```

### Regression Tests (TDD Red-Green)

```
CORRECT:  Write test -> Run (PASS) -> Revert fix -> Run (MUST FAIL) -> Restore -> Run (PASS)
WRONG:    "I've written a regression test" (without red-green verification)
```

### Build

```
CORRECT:  [Run build] -> [See: exit 0, no errors] -> "Build succeeds"
WRONG:    "Linter passed" (linter does not check compilation)
```

### Requirements

```
CORRECT:  Re-read spec -> Create checklist -> Verify each item -> Report gaps or completion
WRONG:    "Tests pass, task complete" (tests may not cover all requirements)
```

### Agent Delegation

```
CORRECT:  Agent reports success -> Check VCS diff -> Verify changes are correct -> Report actual state
WRONG:    Trust agent report at face value
```

### Multi-Step Verification

For claims that span multiple dimensions (e.g., "ready to merge"):

```
CORRECT:
  1. Tests pass (run test suite, show output)
  2. Build succeeds (run build, show exit code)
  3. Linter clean (run linter, show output)
  4. Requirements met (checklist against spec)
  -> "Ready to merge: tests pass (47/47), build clean, lint clean, all 6 requirements verified"

WRONG:
  "Everything looks good, ready to merge"
```

---

## Why This Matters

False completion claims cause:
- Trust broken between agent and user
- Undefined functions shipped -- would crash at runtime
- Missing requirements shipped -- incomplete features
- Time wasted on false completion -> redirect -> rework
- Downstream work built on incorrect assumptions

The cost of running a verification command is seconds. The cost of a false claim is hours of rework and damaged trust.

---

## Integration

**Called by:**
- `jig-debug` -- before claiming a fix works (Phase 4, Step 3)
- `jig-sdd` -- before marking a task complete
- `jig-team-dev` -- before marking a task complete
- `jig-finish` -- before presenting completion options

**Related skills:**
- `jig-tdd` -- TDD's verify-red and verify-green steps are verification instances
- `jig-debug` -- Phase 4 requires verification before claiming fix success

---

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
