# Keel (POC proposal)

Keel is a continuous feature builder that runs above Jig's per-ticket pipeline. It takes
everything known about a feature (PRD, designs, tickets, backend work in flight, recordings),
turns it into a stack of reviewed PR branches, and keeps that stack in step as the feature
changes.

**Status:** proposal plus a reference implementation from a three-week pilot. It is not
registered in the Jig plugin, so installing Jig does not load it.

## Read in this order

1. [`2026-10-30-keel-poc-proposal.md`](2026-10-30-keel-poc-proposal.md): the problem, the idea,
   pilot results, proposed POC work, horizons, risks and open questions.
2. [`skill/SKILL.md`](skill/SKILL.md): commands, hard rules and build levels.
3. [`skill/TICK.md`](skill/TICK.md): the tick runbook (sense, diff, re-plan, re-review, follow
   main, build, evaluate, UAT, report).
4. [`skill/REVIEW.md`](skill/REVIEW.md): the six-check plan review that gates every build.

## What is here

| Path | What |
|---|---|
| `skill/SKILL.md`, `TICK.md`, `REVIEW.md` | The reference skill, generalized from the pilot |
| `skill/bin/` | Sensors and helpers: code, design (read-only Figma script), inbox, snapshot diff, review stamping |
| `skill/templates/keel.example.json` | Config shape, including the stack adapter |
| `skill/templates/linear-ticket.md` | One-ticket-per-PR template |

## What is not here

The pilot's stack-specific recipes (how its dev environment starts, which files its services
rewrite, its package build steps) and its feature data stay private. The reference skill
replaces them with the **stack adapter** in `keel.json`.

## Trying it

Copy `skill/` to `~/.claude/skills/keel/`, create a feature directory with a `keel.json` from
the example, then run `/keel start <feature-dir>` with the engineer present. Expect rough edges:
this is a POC.
