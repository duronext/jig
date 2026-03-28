---
name: jig-extend
description: >
  Use when creating new skills, specialists, agents, or packs for the Jig
  framework. Guides the user through an interview to determine what to build,
  scaffolds the artifact with valid frontmatter, checks for overlap with
  existing artifacts, and verifies it loads correctly. Triggered by "create a
  skill", "add a specialist", "extend the framework", or /jig-extend.
tier: workflow
alwaysApply: false
---

# Framework Extension Assistant

**PURPOSE**: The meta-skill. Teaches teams to build on Jig by guiding artifact creation from intent through scaffolding to verification. Every new skill, specialist, agent, pack, or config change goes through this skill to ensure it follows the schema, avoids overlap, and loads correctly.

**CONFIGURATION**: Reads `jig.config.md` for the Concerns Checklist (to wire new artifacts into) and existing artifact inventory.

---

## When to Use

- "I want to create a new skill"
- "We need a specialist for X"
- "How do I add a review check for Y?"
- "Let's capture our team's conventions"
- "I want to automate Z in the pipeline"
- `/jig-extend` invoked directly
- `jig-postmortem` identifies the need for an entirely new artifact

**Do NOT use when:**
- Modifying an existing skill (edit it directly)
- The change is just a config value in `jig.config.md` (edit the config directly)
- You need to run a pipeline step (use the appropriate pipeline skill)

---

## Step 1: Interview

Understand what the user is trying to capture before deciding what to build.

Ask these questions one at a time:

1. **What are you trying to capture?** (a rule, domain knowledge, a workflow step, a review check, an automation)
2. **What problem does it solve?** (what goes wrong without this? what mistake does it prevent?)
3. **When should it activate?** (always? when editing certain files? only when invoked?)
4. **Do you have an example?** (a recent PR comment, a bug, a pattern you keep explaining)

These questions drive the decision tree below. Do not ask all four if the first two make the answer obvious.

---

## Step 2: Determine Artifact Type

Based on the interview, route to the correct artifact type:

```
"I want to enforce a rule"
  +-- Universal rule (every file) --> Standards-tier skill
  +-- Rule for specific code areas --> Domain-tier or feature-tier skill
  +-- Rule checked during review --> Specialist

"I want to capture domain knowledge"
  +-- Patterns for a code area --> Domain-tier skill
  +-- Patterns for one feature --> Feature-tier skill

"I want to add a workflow step"
  +-- New pipeline stage or orchestration --> Workflow-tier skill
  +-- Modification to existing stage --> Edit the existing skill

"I want to review code for X"
  +-- Pattern-based check (scannable) --> Specialist
  +-- Reasoning-based check (requires tracing) --> Logic reviewer pattern

"I want to automate a task"
  +-- Triggered by user command --> Agent
  +-- Triggered by file edits --> Domain-tier skill

"I just need to change pipeline behavior"
  +-- Stage overrides, thresholds, models --> jig.config.md change (no new artifact)
  +-- New concern in brainstorming --> Add to Concerns Checklist in jig.config.md
```

### Decision Matrix

| Intent | Artifact | Location | Schema Reference |
|--------|----------|----------|-----------------|
| Universal rule | Standards-tier skill | `team/skills/{name}/SKILL.md` | `framework/SKILL_SCHEMA.md` |
| Domain patterns | Domain-tier skill | `team/skills/{name}/SKILL.md` | `framework/SKILL_SCHEMA.md` |
| Feature patterns | Feature-tier skill | `team/skills/{name}/SKILL.md` | `framework/SKILL_SCHEMA.md` |
| Pipeline step | Workflow-tier skill | `team/skills/{name}/SKILL.md` | `framework/SKILL_SCHEMA.md` |
| Review check (pattern) | Specialist | `team/specialists/{name}.md` | `framework/SKILL_SCHEMA.md` (Specialist Schema section) |
| Review check (reasoning) | Logic reviewer pattern | `core/skills/jig-review/logic-reviewer.md` | Edit existing file |
| Automation | Agent | `team/agents/{name}.md` | Agent conventions |
| Pipeline config | Config change | `jig.config.md` | Edit existing file |
| Brainstorm concern | Concerns checklist entry | `jig.config.md` | `framework/CONCERNS_CHECKLIST.md` |

---

## Step 3: Check for Overlap

**Before creating anything, search for existing artifacts that might already cover this.**

1. **Search skills**: Scan `team/skills/`, `packs/*/skills/`, and `core/skills/` for skills with related names, descriptions, or globs
2. **Search specialists**: Scan `team/specialists/`, `packs/*/specialists/`, and `core/specialists/` for specialists covering the same concern
3. **Search agents**: Scan `team/agents/`, `packs/*/agents/`, and `core/agents/`
4. **Read candidates**: For each potential overlap, read the file and check if the pattern is already documented

**If overlap is found:**

| Situation | Action |
|-----------|--------|
| Pattern already covered, well documented | No new artifact needed. Tell the user. |
| Pattern partially covered | Extend the existing artifact instead of creating a new one |
| Related but distinct concern | Proceed with new artifact, note the relationship |
| Same domain, different scope | Proceed, but ensure globs do not overlap excessively |

---

## Step 4: Scaffold the Artifact

### For Skills

Create `team/skills/{name}/SKILL.md` with valid frontmatter:

```yaml
---
name: {name}
description: >
  Use when {specific trigger condition}. {What it helps with}.
tier: {standards | domain | feature | workflow}
globs:                          # Only for domain and feature tiers
  - "{glob-pattern}"
alwaysApply: {true | false}     # true only for standards tier
---
```

**Scaffold the body:**

```markdown
# {Skill Title}

**PURPOSE**: {One sentence describing what this skill does.}

**CONFIGURATION**: {What it reads from jig.config.md, if anything.}

---

## When to Use

- {Trigger condition 1}
- {Trigger condition 2}

**Do NOT use when:** {Exclusion conditions}

---

## ALWAYS

- {Non-negotiable rule 1}
- {Non-negotiable rule 2}

## NEVER

- {Anti-pattern 1}
- {Anti-pattern 2}

## Patterns

### {Pattern Name}

{Description, examples, good/bad comparisons}

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| {Common error} | {How to avoid it} |

---

## Integration

**Called by:** {Which skills invoke this one}

**Related skills:** {Related skills to cross-reference}
```

**Tier selection guidance:**

| Tier | When | Globs | alwaysApply |
|------|------|-------|-------------|
| Standards | Rule applies to EVERY file edit. Very rare -- think twice. | Not needed | `true` |
| Domain | Patterns for a code area (database, frontend, testing) | Scoped to directories: `**/entities/**/*.ts` | `false` |
| Feature | Patterns for one specific feature's code | Narrow paths: `**/component-filter/**/*` | `false` |
| Workflow | Pipeline step invoked explicitly | None | `false` |

**Glob guidance:**
- Scope by code location, not applicability
- `**/entities/**/*.ts` (good) vs `**/*.ts` (too broad)
- Test the glob mentally: what files would this match? Are there false positives?

### For Specialists

Create `team/specialists/{name}.md` with valid frontmatter:

```yaml
---
name: {name}
description: Reviews {specific concern}
model: {haiku | sonnet | opus}
tier: {fast-pass | full-only}
globs:
  - "{glob-pattern}"
severity: {blocking | major | minor}
---
```

**Scaffold the body (this IS the specialist's prompt):**

```markdown
## What to Check

- {Check 1: specific, actionable}
- {Check 2: specific, actionable}
- {Check 3: specific, actionable}

## What to Ignore

- {Exclusion 1: things that look like issues but are not}
- {Exclusion 2: out of scope for this specialist}

## Report Format

For each finding:
- **File**: path:line_number
- **Finding**: {description}
- **Fix**: {actionable suggestion}

If nothing found, respond with exactly: `N/A`
```

**Model selection:**

| Model | When | Cost |
|-------|------|------|
| haiku | Pattern matching, checklist verification, syntax checks | Lowest |
| sonnet | Moderate reasoning, context-dependent patterns | Medium |
| opus | Deep reasoning, cross-file analysis, subtle bugs | Highest |

**Tier selection:**

| Tier | When | Runs during |
|------|------|-------------|
| fast-pass | Critical checks that should block every task | Per-task review (jig-team-dev) + pre-PR |
| full-only | Thorough checks that only need to run once | Pre-PR review only |

**Severity selection:**

| Severity | When | Impact on review score |
|----------|------|----------------------|
| blocking | Security vulnerabilities, data loss risks, broken contracts | Score capped at 4 |
| major | Bugs, performance issues, pattern violations | Score capped at 7 |
| minor | Style suggestions, minor improvements | Score 8-9 |

### For Agents

Create `team/agents/{name}.md`:

```markdown
# {Agent Name}

**Trigger**: {What phrase or command activates this agent}

**Purpose**: {What the agent does}

## Instructions

{The agent's prompt -- what it should do step by step}

## Tools Required

- {Tool 1}
- {Tool 2}
```

### For Config Changes

Edit `jig.config.md` directly. Common changes:

- **New concern**: Add to `## Concerns Checklist` with a skill/specialist reference
- **Stage override**: Add to work type overrides
- **Threshold change**: Update `parallel-threshold`, `swarm-tiers`, etc.
- **New commit scope**: Add to `scopes` list

---

## Step 5: Wire into Concerns Checklist (if appropriate)

If the new artifact represents a concern that should be surfaced during brainstorming:

1. Open `jig.config.md`
2. Add an entry to `## Concerns Checklist`:
   ```
   - {concern-name}: team/skills/{skill-name}
   ```
   or for specialists:
   ```
   - {concern-name}: team/specialists/{specialist-name}
   ```
3. Confirm with the user: "Added {concern} to the Concerns Checklist. It will be surfaced during brainstorming for features and improvements."

Not every artifact belongs in the checklist. Only add it if it represents a cross-cutting concern that should be explicitly considered during design.

---

## Step 6: Verify

After creating the artifact, verify it will be discovered and loaded correctly:

1. **Frontmatter validation:**
   - `name` is present, unique, max 64 chars
   - `description` starts with "Use when..." (for skills) or "Reviews..." (for specialists)
   - `tier` is one of the valid values
   - `globs` are present for domain/feature tiers, absent for workflow/standards
   - `alwaysApply` is `true` only for standards tier

2. **File location check:**
   - Skill: `team/skills/{name}/SKILL.md` exists
   - Specialist: `team/specialists/{name}.md` exists
   - Agent: `team/agents/{name}.md` exists

3. **Overlap recheck:**
   - No other artifact in the discovery chain has the same `name`
   - If a core artifact has the same name, the team artifact will override it (confirm this is intentional)

4. **Glob test (for domain/feature):**
   - List a few files that should match the globs
   - List a few files that should NOT match
   - Confirm the globs are not too broad

5. **Content quality:**
   - SKILL.md is under 500 lines (heavy content belongs in `reference/` subdirectory)
   - No placeholders (TBD, TODO) in the final artifact
   - Cross-references use the format: `**REQUIRED**: Use {skill-name} for {reason}`

Report the verification results to the user.

---

## Reference Documents

These framework documents define the schemas and systems this skill works with:

| Document | When to Reference |
|----------|-------------------|
| `framework/SKILL_SCHEMA.md` | Frontmatter fields, file structure, writing guidelines |
| `framework/TIER_SYSTEM.md` | Tier definitions, choosing the right tier |
| `framework/DISCOVERY.md` | How skills/specialists/agents are found and loaded |
| `framework/CONCERNS_CHECKLIST.md` | How concerns are wired into brainstorming |
| `framework/PIPELINE.md` | Pipeline stages and gate checks |
| `scaffold/SKILL_TEMPLATE.md` | Quick-start template with checklist |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too-broad globs | `**/*.ts` matches everything. Scope by directory: `**/entities/**/*.ts` |
| Missing "Use when..." in description | Descriptions MUST start with "Use when..." for searchability and consistent activation |
| Wrong tier | A skill that only applies when editing database entities is domain, not standards. A skill invoked by command is workflow, not domain. |
| Creating a skill when a config change suffices | If you just need to change a threshold, model, or stage override, edit `jig.config.md` |
| Creating a specialist for a one-off issue | One-off issues belong as logic reviewer examples. Only create a specialist for patterns (3+ occurrences). |
| Duplicating an existing artifact | Always search before creating. Team artifacts override core artifacts with the same name -- make sure that is intentional. |
| Not wiring into Concerns Checklist | If the artifact represents a cross-cutting design concern, add it to the checklist |
| SKILL.md over 500 lines | Move detailed patterns to `reference/` subdirectory. Keep SKILL.md as core rules and quick reference. |
| Specialist prompt too broad | Each specialist should own one narrow concern. If the "What to Check" list exceeds 10 items, consider splitting. |
| Standards tier for "most" files | Standards means EVERY file. If it is "most" files, it is domain tier with broad globs. |
| Forgetting progressive disclosure | Skills over 500 lines need a reference table telling the agent when to load each sub-document |
| No verification after creation | Always run the verification step. A skill with invalid frontmatter or wrong location will not be discovered. |

---

## Integration

**Called by:**
- `jig-postmortem` when a new artifact is needed (not just an edit to an existing one)
- Direct invocation via `/jig-extend`

**Related skills:**
- `jig-review` -- specialists created here are discovered by the review swarm
- `jig-brainstorm` -- concerns added to the checklist are surfaced during brainstorming
- `jig-postmortem` -- identifies gaps that lead to new artifacts

---

## Quick Reference

| Intent | Artifact | Key Decision |
|--------|----------|-------------|
| Enforce a universal rule | Standards skill | Are you sure it is EVERY file? |
| Capture domain patterns | Domain skill | Globs scoped to directories, not file types |
| Capture feature patterns | Feature skill | Narrower than domain -- one subsystem |
| Add a pipeline step | Workflow skill | Only loaded on explicit invocation |
| Add a review check (pattern) | Specialist | Model + tier + severity + narrow globs |
| Add a review check (reasoning) | Logic reviewer pattern | Add to existing logic-reviewer.md |
| Automate a task | Agent | Triggered by command or phrase |
| Change pipeline behavior | jig.config.md | No new artifact needed |
| Add brainstorm concern | Concerns checklist | Points to a skill or specialist |

---

## Pre-Commit Checklist

Before committing the new artifact:

- [ ] Name follows team convention (recommend domain prefix: `be-`, `fe-`, `ops-`, etc.)
- [ ] Description starts with "Use when..." (skills) or "Reviews..." (specialists)
- [ ] Tier matches activation pattern (see `framework/TIER_SYSTEM.md`)
- [ ] Globs scoped by code location, not broad applicability
- [ ] SKILL.md under 500 lines (heavy content in `reference/`)
- [ ] Cross-references explicit: `**REQUIRED**: Use {skill} for {reason}`
- [ ] Added to Concerns Checklist in `jig.config.md` (if applicable)
- [ ] No duplicate `name` in the discovery chain (or override is intentional)
- [ ] Verification step passed (frontmatter valid, location correct, globs tested)
