# Harness Capabilities

What each agent harness Jig supports can do, for skills that dispatch subagents or depend on a tool limit. Skills say what they need (e.g. "a read-only subagent"); this table says how each harness meets it. The Codex and Gemini rows come from their adapter templates in `adapters/`; "Unknown" means the template does not say.

| Harness | Subagents | Enforces an agent's tool list | Read-only agent |
|---------|-----------|-------------------------------|-----------------|
| Claude Code | Yes (`Task`) | Yes, from the agent's `tools` frontmatter | Jig's `reader` agent (`core/agents/reader.md`), tools `Read, Grep, Glob`. The built-in `Explore` agent keeps `Bash`, so it is not read-only |
| Codex | No: tasks run one at a time (`adapters/codex/AGENTS.md.template`) | No subagents to limit; whether a sandbox limits the main agent's tools: Unknown | None |
| Gemini CLI | No: tasks run one at a time (`adapters/gemini/GEMINI.md.template`) | No subagents to limit; whether a sandbox limits the main agent's tools: Unknown | None |

Where a harness has no subagent whose tools it limits, a rule that rests on one (a reviewer that cannot write, an actor that cannot run code) holds only as an instruction in that actor's prompt. Say so where the result is reported (e.g. `review`'s **Tools** line).

`core/specialists/security.md` (Agent Procedures) mirrors this; update both.

## Adding a Harness

Add a row from the harness's own documentation, and update its adapter in `adapters/`.
