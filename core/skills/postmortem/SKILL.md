---
name: postmortem
description: >
  Use when a lesson should improve Jig or the project's skills: review feedback
  on a merged PR, a working session, a retrospective, another harness's notes
  or skills, a request that "Jig should do X", or recurring fit-review findings.
  Entry point for Jig's learning loop: classifies and routes each lesson,
  applies it, and runs a fit review. Triggered by "run a postmortem", "PR
  retro", "lessons learned", "Jig should", or /postmortem.
tier: workflow
alwaysApply: false
---

# Postmortem

**PURPOSE**: Find the gaps in skills, specialists, and review checklists that a lesson exposes -- then fix those gaps. A merged PR's review comments are the usual input; every other input in Capture in `framework/LEARNING_LOOP.md` goes through the same steps. This skill runs Jig's learning loop, so every lesson makes the system better next time.

**GIT HOST**: Commands in this skill use GitHub (`gh`) as the default. If `git-host` in `jig.config.md` is not `github`, read `framework/GIT_HOST.md` for the platform-specific command equivalents.

**CONFIGURATION**: Reads `jig.config.md` for `ticket-system` (to offer ticket creation for improvements) and `main-branch`.

---

## When to Use

- A PR has been merged after receiving review feedback
- "Run a postmortem", "PR retro", "lessons learned from this PR"
- A lesson from any other input in Capture in `framework/LEARNING_LOOP.md` (a working session, a retrospective, another harness's notes or skills, "Jig should do X", recurring fit-review findings)
- `kickoff` suggests this after the LEARN stage for features
- `/postmortem` invoked directly

**Do NOT use when:**
- The PR has not been merged yet (use `pr-respond` instead)
- The only input is a merged PR with no review comments (nothing to learn from)

---

## Workflow

```
Interview (merged PR, or another input)
  |
Gather: PR    --> fetch PR data, analyze comments
        other --> gather that input's evidence
  |
Extract patterns (what was wrong, principle violated, how fixed)
  |
Classify level (personal, harness, team, pack, core)
  |
Cross-reference existing skills (is the pattern already documented?)
  |
Route: pattern violation --> Specialist Diagnosis
       correctness bug  --> Logic Reviewer Diagnosis
  |
Apply changes, drafted against the Fit Checklist
  |
Fit review (Fit Review in framework/LEARNING_LOOP.md)
  |
Report (patterns table, changes made, items needing judgment)
```

---

## Step 1: Interview

Detect the PR from the current branch, or ask.

```bash
# Try to find a merged PR for the current branch
gh pr list --head "$(git branch --show-current)" --state merged --json number,title --jq '.[0]'
```

If found, confirm: "Found PR #XXXX -- is that the one you want to audit?"

If not found, ask:

> Which PR would you like to run a postmortem on? Provide a PR number or URL -- or describe the lesson and where it came from.

**Other inputs** (see Capture in `framework/LEARNING_LOOP.md`): skip the PR fetch in Step 2 and the filter in Step 3. Gather the evidence that input calls for, keep lessons backed by a fix, failure, or correction, and fill Step 3's fields with the input in place of the reviewer. Then go to Step 4.

---

## Step 2: Fetch PR Data

Run in parallel. Extract owner/repo from the git remote -- do not hardcode.

```bash
# PR metadata
gh pr view {number} --json title,body,state,mergedAt,headRefName,files

# All inline review comments (paginated)
gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate

# Review summaries
gh api repos/{owner}/{repo}/pulls/{number}/reviews
```

---

## Step 3: Analyze Comments

**Filter:**
- Separate human reviewers from bots (cursor[bot], sentry[bot], dependabot[bot], github-actions[bot], and any other bot identifiers)
- Bot comments that led to real fixes count -- include them
- Bot comments dismissed as false positives -- skip them
- Focus on comments where the author responded with a fix ("good catch", "fixed in", "done")

**For each actionable comment, extract:**

| Field | Example |
|-------|---------|
| What was wrong | Hardcoded color value instead of theme token |
| Principle violated | Use design system tokens for all visual properties |
| How it was fixed | Replaced hex value with `token.colorPrimary` |
| Who caught it | reviewer-username (human) |

**Categorize into pattern groups** -- discover from the data, do not force into preset buckets. Common categories from past postmortems:

- Styling discipline (tokens, spacing, theming)
- Memoization / performance
- Translation completeness (including accessibility attributes)
- Type safety / enum handling
- State management / async safety
- Dead code / speculative code
- Accessibility affordances
- Frontend-backend contract mismatches
- Error handling gaps
- Security concerns

---

## Step 4: Cross-Reference Existing Skills

First classify each pattern's level -- personal, harness, team, pack, or core -- per Classify in `framework/LEARNING_LOOP.md`. Personal lessons, and harness lessons not tied to this project, leave the repo: give them to the user for their own harness config, and stop there for them.

For the rest, scan the project's skills and specialists directories to find relevant files. For each pattern group:

1. Search `team/skills/`, `packs/*/skills/`, and `core/skills/` for related skills
2. Search `team/specialists/`, `packs/*/specialists/`, and `core/specialists/` for related specialists
3. Read the candidate skill(s) or specialist(s)
4. Check if the pattern is already documented
5. Classify:

| Classification | Meaning | Action |
|---------------|---------|--------|
| **Already covered** | Skill documents this but agent ignored it | Flag -- may need stronger wording or examples |
| **Gap** | Relevant skill exists but does not cover this pattern | Add to that skill |
| **No home** | No relevant skill covers this domain | Add to a specialist or project-level config |

---

## Step 5: Route the Finding

Before diving into diagnosis, determine which part of the review system should have caught the finding:

| Finding Type | Route to | Examples |
|---|---|---|
| **Pattern violation** | Swarm Specialist Diagnosis | Missing translations, raw throws, wrong imports, dead code, hardcoded tokens |
| **Correctness bug** | Logic Reviewer Diagnosis | Comparator mismatch, asymmetric paths, NULL handling, broken caller contract, state lifecycle |

**How to tell the difference:** Pattern findings can be caught by scanning the diff for a known anti-pattern. Correctness findings require *reasoning* -- tracing a value through function boundaries, checking if the inverse path handles the same cases, or reading files outside the diff to verify contracts.

---

## Swarm Specialist Diagnosis

When a missed finding should have been caught by the review swarm (`review`), walk through these failure modes in order to identify the root cause:

| # | Failure Mode | How to Diagnose | Fix |
|---|---|---|---|
| 1 | No specialist covers this concern | Search `specialists/*.md` in all three discovery directories -- none have this in "What to Check" | Create a new specialist file |
| 2 | Specialist exists but globs did not match | Check the specialist's `globs` against the file path that was missed | Update `globs` in frontmatter |
| 3 | Specialist ran but prompt did not cover this pattern | Read the specialist body -- the specific pattern is not mentioned | Add the pattern to the specialist's "What to Check" |
| 4 | Specialist ran, prompt covers it, model missed it | Pattern is documented but the model's capability is insufficient | Upgrade `model` in frontmatter (haiku -> sonnet -> opus) |
| 5 | Specialist ran, prompt covers it, model is capable | Prompt has too many concerns -- specialist needs splitting | Split into two specialist files |
| 6 | Specialist was skipped due to tier | Specialist is `full-only` but finding occurred during per-task review | Change `tier` to `fast-pass` in frontmatter |

**Always diagnose before adding.** If the specialist already covers the pattern (mode 4 or 5), adding more text to the prompt makes it worse, not better. Upgrade the model or split the specialist instead.

**Verification step**: After proposing a fix, check that it would have actually caught the finding:
- If adding globs, verify the missed file path matches the new pattern
- If upgrading the model, verify the concern requires reasoning the cheaper model cannot do
- If splitting, verify the new specialist's prompt is focused enough to catch it

---

## Logic Reviewer Diagnosis

When a missed finding is a correctness bug that the logic reviewer should have caught, walk through these failure modes:

| # | Failure Mode | How to Diagnose | Fix |
|---|---|---|---|
| 1 | Logic reviewer did not run | Was this a per-task review (fast-pass tier)? Logic reviewer only runs pre-PR. | If this class of bug needs to be caught per-task, consider promoting to a specialist |
| 2 | No reasoning pattern covers this | Read the reasoning patterns in the logic reviewer -- does any pattern's trigger match? | Add a new reasoning pattern (or refine an existing pattern's trigger/procedure) |
| 3 | Pattern exists but trigger did not fire | The pattern's "When" section does not describe this code shape | Broaden the trigger -- add the missed code shape to the "When" list |
| 4 | Pattern triggered but procedure missed it | The "How" steps did not lead to discovering the bug | Add a step to the procedure, or add a "What breaks" example |
| 5 | Procedure would find it, but exploration did not reach the file | The logic reviewer reads callers/types proactively, but this file was not in scope | Add the file pattern to the proactive exploration directives |
| 6 | Everything was in place but the model did not connect the dots | The pattern, trigger, procedure, and files were all correct -- model just missed it | Add a concrete "What breaks" example matching this exact scenario |

**Key insight: The logic reviewer improves through examples, not rules.** Unlike specialists (which improve by adding checklist items), the logic reviewer improves by adding concrete "What breaks" examples under each reasoning pattern. When the model sees a specific past failure, it is far more likely to catch the next similar mistake than if you just add an abstract rule.

**How to add examples from postmortem findings:**

1. Identify which reasoning pattern should have caught it
2. Open the logic reviewer file (e.g., `core/skills/review/logic-reviewer.md`)
3. Under that pattern's "What breaks" section, add a one-line example:
   - `{description of what went wrong} ({PR number or brief context})`
4. Keep examples concrete and specific -- not abstract rules

**When to promote a logic finding to a specialist instead:**

If the same correctness bug appears 3+ times across different PRs or other inputs, it has become a *pattern*, not a one-off logic issue. At that point:
- Create a new swarm specialist (or add to an existing one) that checks for this specific anti-pattern
- The specialist catches it cheaply and fast (haiku/sonnet) so the logic reviewer does not need to
- This is how the system self-optimizes: rare bugs start as logic reviewer catches, frequent bugs graduate to specialists

---

## Step 6: Prepare the Workspace

For a PR input, the PR is already merged and the user is likely still on the old branch, so stash and branch from latest main as below. For any other input, work may still be in flight: create the branch in a separate worktree (`worktree`) instead of stashing, and never stash while a `team-dev` or `sdd` run is active. For a core or pack lesson, do this in a Jig checkout; the PR goes to Jig.

```bash
# Stash any uncommitted work (PR input only)
git stash

# Get onto latest main
git checkout {main-branch} && git pull origin {main-branch}

# Create improvement branch (-{topic} instead of -pr-{number} for other inputs)
git checkout -b {username}/skill-improvements-from-pr-{number}
```

Read `main-branch` from `jig.config.md` (default: `main`).

If a ticket should be created for the improvements, offer to do so using the project's configured `ticket-system` from `jig.config.md`. Use title format: "Skill improvements -- lessons from {PR #number or topic}".

---

## Step 7: Apply Changes

Draft each change against the Fit Checklist in `core/specialists/framework-fit.md`, then edit skill and specialist files directly. Follow the existing style of each file:
- **Pitfalls** -> table rows (`| Problem | Solution |`)
- **Anti-patterns** -> code examples with clear good/bad markers
- **Checklists** -> bullet points with `-`
- **Reviewer prompts** -> question format (`- Pattern X present?`)

**Keep additions concise** -- 1-3 lines per pattern. A pitfall row is better than a paragraph.

**Files to check and update:**
- `team/skills/` -- team-specific skills that should cover the pattern
- `core/skills/` -- framework skills if no team skill covers the domain
- `team/specialists/` -- team-specific review specialists
- `core/specialists/` -- framework review specialists
- `core/skills/review/logic-reviewer.md` -- for "What breaks" examples
- `core/skills/review/tiers.md` -- should a specialist's tier or severity change?
- Project-level config (CLAUDE.md or equivalent) -- for project-wide rules

**Keeping reviewers in sync:** When adding a pattern to a skill, check whether it should also appear in any automated reviewer configurations the project uses. The skill is the authoritative source -- reviewer configs are concise summaries optimized for automated review context. Not every skill detail belongs in reviewer configs, but review-checkable rules (flag X, never do Y) should be represented.

---

## Step 8: Fit Review

Run the fit review (Fit Review in `framework/LEARNING_LOOP.md`) on the paths you changed.

---

## Step 9: Report and Hand Off

If the merged work has a live PRD (`> **PRD:**` in its plan or spec), add one `learn` entry to its log naming the one or two lessons that changed a skill or specialist, in plain words. See `framework/LIVE_PRD.md`.

Present a structured summary:

```markdown
## Postmortem: {PR #number -- "title", or the input}

### Input Analyzed
- PR: X comments from human reviewers, Y from bots (Z actionable), N led to code changes
- Other input: the evidence gathered, and N lessons kept

### Patterns Found

| Pattern | Count | Reviewer(s) | Skill | Status |
|---------|-------|-------------|-------|--------|
| Hardcoded tokens | 2 | reviewer-a | fe-styling | Gap -- added |
| Missing memoization | 1 | reviewer-b | fe-performance | Gap -- added |
| ... | ... | ... | ... | ... |

### Changes Made
- `team/skills/fe-styling/SKILL.md`: Added 2 anti-pattern examples
- `core/specialists/performance.md`: Added memoization check
- ...

### Fit Review
- framework-fit: rounds run, findings fixed, and any left standing with why

### Items Needing Human Judgment
- [Anything ambiguous or subjective]
```

Then: "Ready to commit and push? Or want to review the diffs first?" With approval, ship through `pr-create` as a learning PR (PR in `framework/LEARNING_LOOP.md`); a core or pack change then waits for Release and Propagate.

---

## Where to Put Guidance

When deciding where a pattern belongs, use the narrowest applicable scope. This table picks the home within the project; Classify in `framework/LEARNING_LOOP.md` decides first whether the lesson belongs in the project, a pack, Jig core, or the user's own harness config.

| Scope | Location | Example |
|-------|----------|---------|
| One feature | Feature-tier skill | Negation logic in a specific filter system |
| One domain | Domain-tier skill | Objects inside memoization hooks |
| Cross-cutting | Specialist file | Dead code, async safety, security patterns |
| Reviewer gate | Review tiers config | Tier assignments, severity levels |
| Project-wide | Project config (CLAUDE.md or equivalent) | Never add indexes without asking |

**Avoid duplication.** A pattern belongs in ONE primary location (the skill or specialist). Automated reviewer configs are concise summaries -- not a second source of truth.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding text to a specialist that already covers the pattern | Diagnose first. If the pattern is documented and the model missed it, upgrade the model or split -- do not add more text |
| Creating a specialist for a one-off issue | Start as a logic reviewer example. Only promote to specialist after 3+ occurrences |
| Skipping bot comments entirely | Bot comments that led to real fixes are valuable signal |
| Including dismissed false positives | Only analyze comments that resulted in actual code changes |
| Adding broad, abstract rules | Keep additions concrete. "Check comparators" is useless. "buildFilterValue produces `greaterThan` but handler only accepts `before`/`after`" is useful |
| Not verifying the fix would work | After proposing a change, check that the new globs match, the new prompt covers it, or the example is specific enough |
| Hardcoding ticket system references | Read `ticket-system` from `jig.config.md` -- offer to create tickets using the configured system |
| Forgetting to update automated reviewer configs | When adding a review-checkable rule to a skill, propagate to reviewer configs if applicable |
| Duplicating patterns across skills and specialists | One primary location per pattern. Other locations reference it, not repeat it |
| Writing one person's or one harness's preference into a shared skill | Classify the level first. Personal and harness lessons go in the user's own harness config |
| Trusting the edit because each file reads well | Most misfits sit in files the diff did not touch. Run the fit review |

---

## Integration

**Called by:**
- `kickoff` during the LEARN stage (post-merge)
- Direct invocation for a lesson from any other input

**Related skills:**
- `review` -- the review swarm whose specialists this skill improves, and whose `framework-fit` runs the fit review
- `pr-create` -- the PR whose comments this skill analyzes, and the skill that ships the learning PR
- `pr-respond` -- for addressing feedback before the postmortem
- `extend` -- if the postmortem reveals the need for an entirely new skill or specialist

---

## Quick Reference

| Element | Rule |
|---------|------|
| Input | Merged PR (auto-detect from branch), or any other input in `framework/LEARNING_LOOP.md` Capture |
| Output | Edited skill/specialist files + structured report |
| Branch | `{username}/skill-improvements-from-pr-{number}` (or `-{topic}`) |
| Fit | Draft against the Fit Checklist; run Fit Review in `framework/LEARNING_LOOP.md` |
| Ticket | Optional -- offer to create via configured ticket system |
| Scope | Only patterns that led to real code changes -- skip noise |
| Style | Match the existing style of each skill/specialist file |
| Diagnosis | Always diagnose before adding. Specialists: 6 failure modes. Logic reviewer: 6 failure modes |
| Promotion | One-off correctness bugs start as logic reviewer examples. Patterns (3+ occurrences) graduate to specialists |
