# Keel plan review runbook

Plans are reviewed before anything is built from them. A plan may be built only when
`state.json` shows `reviewedPlanHash` equal to the current `planHash`
(`shasum -a 256 <plan> | cut -c1-16`). Two depths use the same checks.

- **Full review** (`/keel review <F>`): every plan, before the first build and whenever the
  engineer asks. Ends with the engineer's read-through (plan finalization).
- **Re-review** (TICK Phase 3b): only plans whose hash changed since their last review, plus the
  plans directly above and below them in the stack (contract check). No human gate; findings
  that need the engineer go to STATUS "Needs the engineer".

Reviewers are fresh agents that did not write the plans. Their job is to find what breaks,
not to confirm. Use Jig's plan logic reviewer rules (`core/skills/plan/plan-logic-reviewer.md`)
as the lens.

## The six checks (every reviewer, every plan)
1. **PRD**: each requirement the plan claims is really in the PRD; no in-scope requirement
   assigned to this screen is missing; nothing the PRD rules out is built.
2. **Design**: every frame and annotation cited exists in the latest design snapshot; copy and
   states match the frame; new or changed frames mapped to this screen are covered or listed as
   gaps.
3. **Tracker**: the plan's acceptance matches its ticket's acceptance. Differences are findings.
4. **Backend**: every query, field, mutation, error code and permission the plan uses exists in
   the schema (`keel.json` `sources.code.schemaPath`) on main or in an open PR ref
   (`refs/keel/pr-*`); every missing one is a stub with a gap id and swap signal in `stubs.md`.
5. **Code**: every path, import, component, hook, command and commit scope exists on main or is
   created by an earlier plan in stack order. Read code only with `git show` / `git grep` on main.
6. **Contracts**: names, props and file paths this plan exports match what later plans import,
   and what it imports matches what earlier plans export.

Each finding: plan id, check number, severity (blocker / major / minor), claim, evidence (file
and line, frame id, ticket text or schema line), and a verdict:
- **fix**: wrong, missing or inconsistent, with the fix stated.
- **won't-fix**: theoretical, out of scope for this PR (name where it belongs), or style; reason
  required.
- **engineer**: needs a product or design decision; state the default the plan will use.

## Full review procedure
1. Refresh sources first (TICK Phase 1–2) so reviewers see today's designs, tickets and schema.
2. Reviewers: group plans in stack order in groups of three (neighbors review contracts
   together). Write `reviews/plan-<group>-TS.md`.
3. Fixers: one fresh agent per group applies every `fix` verdict, keeps the plan header format,
   and records each change under `## Review changes TS` at the end of the plan.
4. Consistency pass: one agent re-checks check 6 across all plans after the fixes and updates
   the plan index, `stubs.md` and `impact-map.json` if facts moved.
5. Stamp: `bin/stamp-reviewed.py <F>` writes `planHash` = `reviewedPlanHash` and `reviewedAt`.
6. Summary for the engineer: `reviews/SUMMARY-TS.md`: counts by verdict, every `engineer` item
   with its default, plans whose scope or estimate changed, and ticket acceptance edits to make.
   Keel never edits the tracker; it lists the edits.
