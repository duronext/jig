# Existing Project Handling

Instructions for handling files that may already exist in the consumer's
project during init.

---

## Existing jig.config.md

Check if `jig.config.md` exists at the project root.

If found:

1. Warn: "Found existing `jig.config.md`."
2. Present options:
   - **(a) Overwrite** — proceed with init, generate fresh config
   - **(b) Edit manually** — stop init, suggest direct edits instead
   - **(c) Abort** — stop init entirely
3. Wait for the user's choice.
4. If overwrite: proceed with normal flow
5. If edit or abort: stop gracefully, do not write any files

## Existing CLAUDE.md (or GEMINI.md / AGENTS.md)

Check for the platform instruction file matching the detected platform.

### If it exists:

1. Read the existing content
2. Prepend the Jig declaration at the very top:

```
This project uses **Jig** for development workflow management.
See `jig.config.md` for pipeline configuration.
```

3. Add a blank line between the declaration and existing content
4. Include the diff in the Phase 3 completion summary (show what will
   be prepended)
5. **Do NOT** overwrite, remove, or reorganize any existing content

### If it does not exist:

1. Create the file with only the Jig declaration (2 lines above)
2. Note in summary: "Created CLAUDE.md with Jig declaration"

## Existing .claude/skills/

Check if `.claude/skills/` contains any `*/SKILL.md` files (discovered
during Phase 1 detection).

If found:

1. List the skills by name in the Phase 3 summary
2. Offer: "Found {N} existing skills in `.claude/skills/`. Want me to
   move them to `team/skills/` so they integrate with Jig's discovery
   system?"
3. If yes:
   - Move each skill directory: `.claude/skills/{name}/` ->
     `team/skills/{name}/`
   - List each move in the completion summary
   - Check for cross-references in moved files that may need path
     updates
4. If no:
   - Leave in place
   - Note: "Existing skills left in `.claude/skills/`. They'll still
     work via Claude Code's native loading but won't be in Jig's team
     discovery path."

## Existing Commit Hooks (commitlint)

If commitlint config was detected and types/scopes were imported during
Phase 1:

1. The imported values are already in the config context (handled in
   detection)
2. Note in the completion summary: "Imported commit types and scopes
   from your commitlint config. The Jig commit agent will respect
   these."
3. **Do NOT** modify the existing commitlint or husky configuration
