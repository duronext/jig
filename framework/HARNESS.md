# Harness Capabilities

What each agent harness Jig supports can do, for skills that dispatch subagents, depend on a tool limit or read Jig's own files. Skills say what they need (e.g. "a read-only subagent"); this table says how each harness meets it. The Codex and Gemini rows come from their adapter templates in `adapters/`; "Unknown" means the template does not say.

| Harness | Subagents | Enforces an agent's tool list | Read-only agent |
|---------|-----------|-------------------------------|-----------------|
| Claude Code | Yes (`Task`) | Yes, from the agent's `tools` frontmatter | Jig's `reader` agent (`core/agents/reader.md`), tools `Read, Grep, Glob`. The built-in `Explore` agent keeps `Bash`, so it is not read-only |
| Codex | No: tasks run one at a time (`adapters/codex/AGENTS.md.template`) | No subagents to limit; whether a sandbox limits the main agent's tools: Unknown | None |
| Gemini CLI | No: tasks run one at a time (`adapters/gemini/GEMINI.md.template`) | No subagents to limit; whether a sandbox limits the main agent's tools: Unknown | None |

Where a harness has no subagent whose tools it limits, a rule that rests on one (a reviewer that cannot write, an actor that cannot run code) holds only as an instruction in that actor's prompt. Say so where the result is reported (e.g. `review`'s **Tools** line).

`core/specialists/security.md` (Agent Procedures) mirrors this; update both.

## Reads Jig's own files

| Harness | How a skill gets Jig's text |
|---------|-----------------------------|
| Claude Code | A plugin installs Jig outside the project (`~/.claude/plugins/cache/`). A skill's body loads through the Skill tool with no prompt. Reading any other file there (a `framework/` doc, a skill's `reference/` file) with Read or a shell command asks first, and a headless run (`claude -p`) denies it ([permissions](https://code.claude.com/docs/en/permissions.md#working-directories)) |
| Codex | Reads skill files by path (`adapters/codex/AGENTS.md.template`); whether a read outside the project asks first: Unknown |
| Gemini CLI | `activate_skill <path>` (`adapters/gemini/GEMINI.md.template`); whether a read outside the project asks first: Unknown |

So text a step needs with no prompt, such as the memory contract a memory pack loads, lives in a skill's body (the `memory` skill), or inline in the step, not in a file the step reads by path.

Claude Code can also ask before a shell command inside the project: a chained command with a part that is not read-only, and `git` after a `cd` into another directory ([permissions](https://code.claude.com/docs/en/permissions.md#read-only-commands)). `git -C <dir>` is not on that page's read-only list, and it asked even with `<dir>` set to the project (observed in Claude Code 2.1.312, 2026-10). A step that must run hands-off names the plain command, e.g. `git remote -v` in the repo.

## Adding a Harness

Add a row from the harness's own documentation, and update its adapter in `adapters/`.
