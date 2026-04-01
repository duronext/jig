# Auto-Detection

Run these commands before asking any questions. Each detection is
independent — if one fails, continue with the others.

---

## Git Host

```bash
git remote get-url origin 2>/dev/null
```

Parse the URL:
- Contains `github.com` -> `github`
- Contains `gitlab.com` or `gitlab.` -> `gitlab`
- Contains `bitbucket.org` or `bitbucket.` -> `bitbucket`
- Command fails or URL unrecognized -> note "(no remote found)" in
  summary

**Edge case — no git repo:** If `git rev-parse --is-inside-work-tree`
fails, the project is not a git repository. Warn the user: "This
directory is not a git repository. Skipping git-related detection." Skip
git host, main branch, commit convention, and hooks detection.

## Main Branch

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null
```

Extract the branch name: `refs/remotes/origin/main` -> `main`.

If that fails (no remote HEAD set), check locally:

```bash
git rev-parse --verify main 2>/dev/null
```

If `main` exists, use `main`. If not, try `master`. Default: `main`.

## Platform

Check the project root for these files:
- `CLAUDE.md` exists -> `claude`
- `GEMINI.md` exists -> `gemini`
- `AGENTS.md` exists -> `codex`

If multiple exist: note all detected, ask which is primary during the
detection confirmation step.

If none exist: default to `claude` (Jig is a Claude Code plugin).

## Commit Convention

```bash
git log --oneline -20 2>/dev/null
```

Analyze the commit messages:
- Most match `type(scope): message` or `type: message` ->
  `conventional`
- No clear pattern or no commit history -> `conventional` (default),
  note "(default — no commit history)" in summary

## Existing Hooks

Check for these files/directories:
- `.husky/` directory -> note "husky"
- `.commitlintrc*`, `commitlint.config.*` -> note "commitlint"
- `.czrc`, `.cz-config*` -> note "commitizen"

### Commitlint Import

If a commitlint config file is found:

1. Read the config file
2. Look for `rules['type-enum']` — the third element (`[2]`) is the
   array of allowed types. Import as `types`.
3. Look for `rules['scope-enum']` — the third element (`[2]`) is the
   array of allowed scopes. Import as `scopes`.
4. Note in summary: "Imported types and scopes from commitlint config."
5. Do NOT modify the existing commitlint configuration.

If the config is JavaScript/TypeScript (`.commitlintrc.cjs`,
`commitlint.config.ts`), read the file and extract the arrays from the
source text. Do not attempt to execute the file.

## Existing Skills

Check for `.claude/skills/` directory containing `*/SKILL.md` files.

If found:
- Count them
- Read each SKILL.md frontmatter to get the skill name
- Note in summary: "Found {N} existing skills in .claude/skills/"
- These will be offered for migration in Phase 3
