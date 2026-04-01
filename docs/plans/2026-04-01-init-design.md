# Design: jig init — First-Run Setup Experience

**PRD:** docs/plans/2026-04-01-init-prd.md
**Date:** 2026-04-01
**Status:** Approved

---

## Problem Statement

Teams install Jig via marketplace plugin but have no guided setup.
Config and team directory must be created manually. `/jig:init` turns
this into a 2-minute guided conversation.

## Approved Approach

**Approach B — SKILL.md with progressive disclosure.**

The skill has three sequential phases. Each phase loads focused context
via reference files rather than putting everything in one monolithic
file. This follows the "focused context dramatically outperforms
comprehensive context" principle from the project's research.

### Architecture

```
Phase 1: DETECT          Phase 2: INTERVIEW          Phase 3: GENERATE
─────────────────        ──────────────────          ─────────────────
Load: detection.md       Load: SKILL.md only         Load: config-template.md
                                                           existing-project.md
Run bash commands        Ask 5 questions             Generate all files
Parse results            (one at a time)             Show summary
Present summary          Map answers to values        Get approval, write
```

### File Inventory

| File | Lines | Purpose | Load When |
|------|-------|---------|-----------|
| `core/skills/init/SKILL.md` | ~180 | Flow orchestration, exact question wording, gate checks | Always |
| `core/skills/init/reference/detection.md` | ~60 | Bash commands, parsing rules, no-git edge cases | Phase 1 |
| `core/skills/init/reference/config-template.md` | ~100 | Full jig.config.md with substitution markers | Phase 3 |
| `core/skills/init/reference/existing-project.md` | ~50 | CLAUDE.md handling, skills migration, commitlint import | Phase 3 |
| `commands/init.md` | ~5 | Command file for `/jig:init` | N/A |
| `.claude-plugin/plugin.json` | edit | Register skill in skills array | N/A |

### Data Flow

```
Auto-detection results     Interview answers
─────────────────────     ─────────────────
git-host: github          name: "Duro"
main-branch: main         ticket-system: linear
platform: claude          ticket-prefix: ENG
convention: conventional  concerns: [i18n, analytics, caching]
types: [feat, fix, ...]   eng-pack: yes
scopes: [web, api]
hooks: husky+commitlint
existing-skills: 3 found
```

Both streams merge into a config context. Detection values are confirmed
during the interview — not blindly accepted. If the user corrects a
detected value, the corrected value wins.

The config template has substitution markers (`{name}`, `{git-host}`,
etc.) that get replaced with merged values.

### Error Handling

**Recoverable (handle automatically):**
- No git remote → skip git-host detection, note in summary
- No commit history → default to `conventional`, note in summary
- Platform file missing → default to `claude`

**Requires user decision:**
- `jig.config.md` already exists → warn, offer overwrite / edit / abort
- Existing `.claude/skills/` → offer to move to `team/skills/`
- Multiple platform files → ask which is primary
- Ambiguous answer → ask to clarify, don't guess

**Hard stop:**
- User cancels mid-interview → write no files
- CLAUDE.md diff rejected → skip CLAUDE.md, write everything else

No silent failures. Every skipped detection is visible in the summary.

### Interview Flow

Questions asked one at a time. Exact wording prescribed in SKILL.md.
Natural language answers mapped to config values.

1. Present detection summary with confirmation
2. Q1: Team name (free text)
3. Q2: Ticket system (multiple choice)
4. Q3: Ticket prefix (conditional — skip for github/none)
5. Q4: Engineering concerns (multi-select from checklist)
6. Q5: Engineering starter pack (yes/no)
7. Show full summary of all files to create/modify
8. Get single approval, write all files at once

### Generated Files

- `jig.config.md` — full config with all sections, defaults filled in
- `team/skills/.gitkeep`
- `team/specialists/.gitkeep`
- `team/agents/.gitkeep`
- `team/README.md` — from scaffold template
- CLAUDE.md modification — Jig declaration prepended (diff shown in
  summary, part of the single approval step)

### Testing

Skill-level: frontmatter validation, line counts, reference paths,
plugin registration.

Functional (manual): run `/jig:init` across 6 scenarios — fresh
project, existing CLAUDE.md, existing config, existing skills, no git
remote, full happy path with all answers.

### Concerns Checklist

| Concern | Applies? | Rationale |
|---------|----------|-----------|
| Skill schema | Yes | New skill — must validate against SKILL_SCHEMA.md |
| Error handling | N/A | Behavioral instructions, not executable code |
| Security | N/A | Reads git config, writes config files, no secrets |
| Test strategy | Yes (manual) | 6 manual verification scenarios |
