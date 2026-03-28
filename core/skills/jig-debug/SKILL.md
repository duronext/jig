---
name: jig-debug
description: >
  Use when encountering any bug, test failure, or unexpected behavior, before
  proposing fixes. Enforces root cause investigation through four phases:
  investigation, pattern analysis, hypothesis testing, and implementation.
  Prevents guess-and-check thrashing.
tier: workflow
alwaysApply: false
---

# Systematic Debugging

**PURPOSE**: Find and fix the root cause of bugs through disciplined investigation. Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

---

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you have not completed Phase 1, you cannot propose fixes.

---

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You have already tried multiple fixes
- Previous fix did not work
- You do not fully understand the issue

**Do not skip when:**
- Issue seems simple (simple bugs have root causes too)
- You are in a hurry (rushing guarantees rework)
- Stakeholders want it fixed NOW (systematic is faster than thrashing)

---

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Do not skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible, gather more data -- do not guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN the system has multiple components (CI -> build -> signing, API -> service -> database, frontend -> API -> cache -> database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**

   ```
   For EACH component boundary:
     - Log what data enters the component
     - Log what data exits the component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify the failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```
   # Layer 1: Entry point
   log("=== Request received ===")
   log("Input:", sanitize(input))

   # Layer 2: Processing
   log("=== Processing layer ===")
   log("Config loaded:", config.isValid)
   log("Dependencies available:", checkDeps())

   # Layer 3: External call
   log("=== External call ===")
   log("Request:", sanitize(request))
   log("Response status:", response.status)
   log("Response body:", sanitize(response.body))

   # Layer 4: Output
   log("=== Final output ===")
   log("Result:", sanitize(result))
   ```

   **This reveals:** Which layer fails (e.g., entry -> processing OK, processing -> external FAILS).

5. **Trace Data Flow**

   **WHEN the error is deep in a call stack:**

   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

   **Backward tracing technique:**
   1. Start at the error site
   2. Identify the variable/value that is wrong
   3. Find where that variable was last assigned
   4. Was it wrong at that point? If yes, go to step 2 with the new assignment
   5. If no, the bug is between this assignment and the error site
   6. Narrow down until you find the exact line where correct becomes incorrect

---

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in the same codebase
   - What works that is similar to what is broken?
   - If implementing a known pattern, find the canonical example

2. **Compare Against References**
   - If implementing a pattern, read the reference implementation COMPLETELY
   - Do not skim -- read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What is different between working and broken?
   - List every difference, however small
   - Do not assume "that cannot matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

---

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test the hypothesis
   - One variable at a time
   - Do not fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes -> Phase 4
   - Did not work? Form NEW hypothesis
   - DO NOT add more fixes on top

4. **When You Do Not Know**
   - Say "I do not understand X"
   - Do not pretend to know
   - Ask for help
   - Research more

---

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - **REQUIRED**: Use `jig-tdd` skill for writing proper failing tests

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?
   - **REQUIRED**: Use `jig-verify` skill before claiming the fix works

4. **If Fix Does Not Work**
   - STOP
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If >= 3: STOP and question the architecture (step 5 below)**
   - DO NOT attempt Fix #4 without architectural discussion

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state / coupling / problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we "sticking with it through sheer inertia"?
   - Should we refactor architecture vs. continue fixing symptoms?

   **Discuss with the user before attempting more fixes.**

   This is NOT a failed hypothesis -- this is a wrong architecture.

---

## Red Flags Table

If you catch yourself thinking any of these, STOP and return to Phase 1:

| Red Flag | What It Means |
|----------|--------------|
| "Quick fix for now, investigate later" | You are skipping root cause |
| "Just try changing X and see if it works" | You are guessing, not investigating |
| "Add multiple changes, run tests" | You cannot isolate what worked |
| "Skip the test, I'll manually verify" | Manual verification is unreliable |
| "It's probably X, let me fix that" | "Probably" means you do not know |
| "I don't fully understand but this might work" | Partial understanding = wrong fix |
| "Pattern says X but I'll adapt it differently" | Deviation without understanding = bugs |
| "Here are the main problems: [lists fixes]" | Proposing solutions before investigating |
| Proposing solutions before tracing data flow | You skipped the investigation |
| "One more fix attempt" (when already tried 2+) | 3+ failures = architectural problem |
| Each fix reveals new problem in different place | Architecture is wrong, not the code |

---

## User Signals You Are Doing It Wrong

Watch for these redirections from the user:
- "Is that not happening?" -- you assumed without verifying
- "Will it show us...?" -- you should have added evidence gathering
- "Stop guessing" -- you are proposing fixes without understanding
- "Think harder about this" -- question fundamentals, not just symptoms
- "We're stuck?" (frustrated) -- your approach is not working

**When you see these:** STOP. Return to Phase 1.

---

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes do not stick. Test first proves it. |
| "Multiple fixes at once saves time" | Cannot isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms does not equal understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question pattern, do not fix again. |

---

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare, identify differences | Differences listed and understood |
| **3. Hypothesis** | Form theory, test minimally, one variable at a time | Confirmed hypothesis or new one formed |
| **4. Implementation** | Create failing test, single fix, verify | Bug resolved, tests pass, no regressions |

---

## When Process Reveals "No Root Cause"

If systematic investigation reveals the issue is truly environmental, timing-dependent, or external:

1. You have completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

---

## Integration

**Called by:**
- Any skill or workflow when a bug is encountered
- `jig-kickoff` routes bugs through light brainstorm then here

**Related skills:**
- `jig-tdd` -- for creating the failing test case (Phase 4, Step 1)
- `jig-verify` -- for verifying the fix worked before claiming success

---

## Real-World Impact

From debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common
