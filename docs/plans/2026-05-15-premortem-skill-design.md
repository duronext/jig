# Design: Premortem Skill

> **Date:** 2026-05-15
> **Branch:** matthew/jig-premortem-skill
> **Status:** Approved for implementation planning

## Problem Statement

Forward-looking code review catches what *is* wrong with a change. It
does not reliably catch what *will become* wrong — the slow-burn
failures that emerge a week, a month, or six months after merge:
missing observability that hides a creeping regression, one-way doors
that prevent rollback, knowledge that decays when the author moves on,
schemas that scale poorly at real traffic.

Agentic development makes this worse, not better. When the "author" is
an autonomous agent that won't be around to explain its decisions, the
window for the code to carry its own meaning shrinks from weeks to
days. Velocity outpaces the natural human filter that questions
non-obvious assumptions before merge.

Daniel Kahneman (via Gary Klein's research) describes the **premortem**:
a structured imagination exercise that flips temporal perspective.
Instead of asking *"what could go wrong?"* — which invites confirmation
bias and groupthink — the team is asked *"imagine it's six months from
now and this launch failed. Write the story of why."* This **prospective
hindsight** reliably surfaces ~30% more concrete risks than forward-looking
risk assessment.

Jig has no premortem stage. This design adds one.

## Goals

1. Catch failure modes that forward review systematically misses
   (observability gaps, reversibility traps, knowledge decay).
2. Force the author to consciously *decide* about each risk —
   accept, mitigate, or instrument — rather than leaving it implicit.
3. Generate an artifact that the `postmortem` skill can compare against
   real incidents, creating a feedback loop that sharpens the
   specialist prompts over time.
4. Stay aligned with existing Jig architecture — reuse the `review`
   swarm engine rather than duplicating dispatch infrastructure.

## Non-Goals

- Replacing forward code review. Premortem complements `review`; it
  does not subsume it.
- Auto-blocking PRs. Premortem informs the author's judgment; it does
  not gate merges.
- Quantitative risk scoring. Premortem produces narrative + decision
  matrix, not severity numbers.
- Per-commit invocation. Premortem is deliberate, not high-frequency.

## Approved Approach

A new workflow skill `premortem` at `core/skills/premortem/SKILL.md`
that orchestrates a new `mode: premortem` on the existing `review`
swarm engine. Eight new specialists at `core/specialists/*-premortem.md`
produce narrative "postmortems from the future." A new
`premortem-synthesizer` (Opus) consolidates narratives into a risk
register with an Accept/Mitigate/Instrument decision matrix.

### Why This Approach

- **One dispatch engine.** Reuses `review`'s discover/prepare/dispatch/
  collect machinery. The differences (synthesizer replaces logic
  reviewer; narrative report replaces findings report) live in
  mode-aware branches at Stages 5–7.
- **Convention alignment.** Specialists follow existing Jig patterns
  (`stage: premortem` frontmatter, `globs: ["**/*"]`, N/A response for
  irrelevant diffs).
- **Feedback loop closes through `postmortem`.** Predicted-vs-actual
  diff makes the premortem itself an evaluable artifact.

### Alternatives Considered

- **Standalone skill with own dispatch.** Maximally flexible but
  duplicates infrastructure and diverges from Jig's review pattern.
- **Mode-on-review only, no premortem skill.** Less coherent —
  premortem deserves its own pipeline-visible entry point and command.
- **Agent only (no skill).** Skills are workflows; agents are
  dispatchable units. Premortem is a workflow; the agent is added
  alongside as a thin invokable wrapper.

## Architecture

### Files Added

```
core/skills/premortem/
  SKILL.md                       # workflow orchestrator
  premortem-synthesizer.md       # Opus synthesizer prompt
core/specialists/
  frontend-premortem.md
  backend-premortem.md
  api-premortem.md
  schema-premortem.md
  integration-premortem.md
  observability-premortem.md
  reversibility-premortem.md
  handoff-premortem.md
core/agents/
  premortem.md                   # invokable agent (mirrors code-review)
commands/
  premortem.md                   # /jig:premortem entry point
docs/premortems/                 # persisted reports (created on first run)
```

### Files Modified

```
core/skills/review/SKILL.md      # mode: premortem branches in stages 5–7
core/skills/pr-create/SKILL.md   # risk-signal detectors + suggestion
core/skills/postmortem/SKILL.md  # auto-diff predicted vs actual
jig.config.md                    # premortem config block + concerns checklist
.claude-plugin/plugin.json       # register premortem skill
CLAUDE.md                        # add premortem to Core Skills table
framework/PIPELINE.md            # add optional premortem stage
```

### Discovery Layer Placement

Premortem lives in `core/` because it is framework-default. Teams may
add their own premortem specialists under `team/specialists/` (same
discovery rules as code review specialists). Team specialists win on
name collision.

## Specialist Roster

All eight specialists use:

```yaml
stage: premortem
globs: ["**/*"]
model: opus
tier: full
severity: major
```

The body prompt is temporally-shifted: *"It is {horizon} after this
code merged. The launch failed because of something in your concern
area. Write the postmortem narrative — what went wrong, how it was
discovered, what we wish we had done."*

| Specialist | Frame |
|---|---|
| `frontend-premortem` | UX landmines invisible in dev, a11y regressions, locale/RTL edges, hydration drift, optimistic-update desync, error states never rendered |
| `backend-premortem` | Invariant violations, state-machine reachability gaps, retry-induced double-processing, partial-failure leakage, hot-path assumptions under real traffic |
| `api-premortem` | Contract drift, missing idempotency, ambiguous error codes, breaking changes disguised as additive, undocumented consumer assumptions |
| `schema-premortem` | Table-lock at scale, multi-day backfill, NOT NULL without default, unused index, dual-write window dropping writes, replica lag breaking read-after-write |
| `integration-premortem` | Cross-service contract drift, transitive dep breakage, event schema change ignored downstream, mono-repo neighbor depending on this |
| `observability-premortem` | "We couldn't see it failing." No structured log at failure point, no metric, no trace span, wrong alert threshold, log cardinality blew up, PII in logs |
| `reversibility-premortem` | One-way doors masquerading as two-way: persisted side effects without backfill plan, missing feature flag, rollback would corrupt, users built workflows on the new behavior |
| `handoff-premortem` | Six months from now, the author (human or agent) is gone. Is the code obvious to a new reader? Are non-obvious decisions documented? Is the test suite a reliable safety net for the next change? |

### Severity Rationale

All specialists default to `severity: major`, not `blocking`. Premortem
is a forcing function for author judgment, not a gate. The synthesizer
may promote a risk to `blocking` when multiple specialists independently
surface the same failure mode (convergence as quality signal).

### Model Rationale

Opus across the board. Narrative-from-the-future is reasoning-dense
work that requires sustained causal chains, second-order consequences,
and counterfactual imagination — precisely where Opus pulls away from
Sonnet. Premortem is deliberate and infrequent, so per-run cost
optimization (which justifies Sonnet for `review` fast-pass) does not
apply. Eight parallel Opus calls cost no more wall-time than one.

## Dispatch Flow

```
[trigger: /jig:premortem, pr-create suggestion, or kickoff stage]
   │
   ▼
premortem SKILL
   1. Read jig.config.md → horizons, tier, models
   2. Determine work-type (kickoff metadata / branch name / prompt)
   3. Resolve horizons for this work-type
   4. Build diff: git fetch origin && git diff origin/{main}...HEAD
   5. Hand off to review with mode: premortem
   │
   ▼
review SKILL (extended)
   Stage 1: DISCOVER — scan for stage: premortem specialists
   Stage 2: PREPARE  — intersect globs with diff (all **/* match)
   Stage 3: DISPATCH — parallel, single message, 8 Opus agents
                       prompt = specialist.body + horizons + filtered diff
   Stage 4: COLLECT  — wait for all 8; literal "N/A" = ran-but-empty
   Stage 5: DEEP SYNTHESIZE  (premortem-mode override)
             dispatch premortem-synthesizer (Opus, full tools)
             prompt = synthesizer.body + all 8 narratives + full diff
   Stage 6: SCORE   (premortem-mode override)
             risk count (catastrophic / serious / annoying)
             convergence count (risks flagged by 2+ specialists)
             one-way door count
   Stage 7: REPORT  (premortem-mode override)
             narrative format with decision matrix
             persist to docs/premortems/YYYY-MM-DD-{branch}-premortem.md
   │
   ▼
AUTHOR
   Reviews narratives + synthesizer's risk register
   For each risk: Accept / Mitigate / Instrument
   Optionally re-runs after mitigations
   Proceeds to pr-create
```

### Key Dispatch Decisions

1. **All horizons in one specialist invocation.** Each specialist
   writes a single narrative with sub-sections per horizon. Preserves
   causal coherence ("the week-1 missing alert is why the 6-month
   silent drift went undetected") and avoids 16-agent fan-out.

2. **Mode-aware review, not split orchestration.** Stages 1–4 are
   unchanged across all modes. Only Stages 5–7 branch on
   `mode: premortem`. Keeps dispatch infrastructure DRY.

3. **Synthesizer gets the full unfiltered diff.** Same convention as
   `logic-reviewer`. Synthesis requires seeing cross-cutting failure
   modes that emerge at the intersection of specialist concerns.

## Risk-Signal Detectors (in `pr-create`)

When the author runs `pr-create`, these path and content patterns are
scanned against the diff. Any match prompts (non-blocking):
*"This change touches {signal}. Run /jig:premortem first? (recommended)"*

### Backend signals

| Class | Match |
|---|---|
| Schema | `**/migrations/**`, `**/*schema*`, `**/*.sql`, `**/models/**`, `**/entities/**`, `**/prisma/**` |
| API surface | `**/api/**`, `**/routes/**`, `**/handlers/**`, `**/*openapi*`, `**/*.proto`, `**/graphql/**` |
| Cross-service deps | `package.json`, `go.mod`, `Cargo.toml`, `requirements*.txt`, `pyproject.toml` |
| Large diff | LOC threshold (default 500) |

### Frontend signals

| Class | Match |
|---|---|
| Routing | `**/{pages,app,routes}/**`, `**/middleware.{ts,js}` |
| Root layouts / providers | `**/layout*`, `**/_app.*`, `**/providers/**`, `**/{App,Root}.{tsx,jsx}` |
| Auth UI | `**/{auth,login,signup,session,oauth}*` |
| Money UI | `**/{checkout,billing,subscription,payment,pricing,cart}*` |
| Feature flags | `**/feature*flag*`, `**/{flags,experiments}/**`, `**/growthbook*`, `**/launchdarkly*`, `**/statsig*` |
| Build / bundling | `**/next.config.*`, `**/vite.config.*`, `**/webpack.config.*`, `**/turbo.json`, `**/tsconfig*.json` |
| Third-party scripts | diff adds `<script src=` or `next/script` calls |
| i18n / locale | `**/i18n/**`, `**/locales/**`, `**/messages/**` |
| Service workers | `**/sw.{ts,js}`, `**/service-worker.*`, `**/workbox*` |
| Public copy | `**/{terms,privacy,legal}*`, `**/pricing/**` |
| CSP / headers | `**/{csp,headers,next.config}*`, content mentioning `Content-Security-Policy` |
| a11y primitives | `**/{modal,dialog,menu,combobox,select,form}*` within `**/components/**` |

### Content-based signals

| Detector | What |
|---|---|
| New fetch origin | grep added lines for `fetch(` / `axios(` URLs and check if origin is new |
| New storage usage | added lines reference `localStorage`, `sessionStorage`, `IndexedDB` for the first time in the file |
| Bundle size | new dependency in `package.json` exceeding threshold (default 50KB minified) |
| Error boundaries | any change in files matching `**/{error,ErrorBoundary}*` |

### Team-configured signals

`premortem-critical-paths` in `jig.config.md` lets teams add any path
glob that should auto-suggest premortem.

## Output Format

Two outputs per run:

1. **Terminal:** compressed view — synthesis section + Specialist
   Summary table + path to the persisted file.
2. **Persisted file:** `docs/premortems/YYYY-MM-DD-{branch}-premortem.md`
   — full report including all narratives.

### Report skeleton

```markdown
# Premortem: {branch}
> **Date:** YYYY-MM-DD
> **Work type:** feature
> **Horizons:** 1 week, 6 months
> **Specialists:** 8 dispatched, N N/A
> **Diff:** F files, +A/-D LOC

## Synthesis

### Convergent risks (flagged by 2+ specialists)
#### ⚠️ {risk title}
- **Flagged by:** {specialist names}
- **Horizon:** {1 week / 6 months / both}
- **Narrative:** {concrete failure story}
- **Decision needed:** ☐ Accept  ☐ Mitigate  ☐ Instrument
- **Suggested mitigation:** {actionable suggestion}

### Individual risks
{same shape, single specialist origin}

### One-way doors identified
| Change | Reversibility | Mitigation if needed |
| ... | ... | ... |

### Open questions for the author
1. ...

---

## Specialist narratives
<details>
<summary>{specialist-name} (Opus) — N risks raised</summary>
### {horizon} from now...
{full narrative per horizon}
</details>

---

## Specialist Summary
| Specialist | Risks | per-horizon counts |
| ... | ... | ... |
```

### Decision Matrix Mechanics

The `☐ Accept ☐ Mitigate ☐ Instrument` boxes are real. After the
author reviews, they check boxes in the file (or via interactive
prompt). `pr-create` reads the premortem file and embeds the
**decisions** section (not the full narratives) into the PR description.
Reviewers see "Author flagged these risks and decided X" — making the
judgment explicit and reducing re-litigation in review comments.

### Postmortem Feedback Loop

When `postmortem` runs against a merged PR, it **automatically**
reads `docs/premortems/*-{branch}-premortem.md` if present and:

1. Diffs predicted risks vs the actual incident root cause.
2. Appends a "Predicted vs Actual" section to the postmortem document.
3. If the actual cause was not predicted, surfaces a specialist-prompt
   evolution suggestion: *"Specialist {name} would have caught this if
   its prompt had asked about {pattern}."*

This is the antifragile loop. Each real incident makes the next
premortem sharper.

## Configuration

Added to `jig.config.md`:

```yaml
## Premortem

premortem-horizons:
  bug:         ["1 week"]
  task:        ["1 week"]
  improvement: ["1 week", "6 months"]
  feature:     ["1 week", "6 months"]
  migration:   ["1 week", "1 month", "6 months", "2 years"]

premortem-swarm-tiers:
  fast-pass: []
  full: all
premortem-specialist-model: opus
premortem-synthesizer-model: opus

premortem-critical-paths:
  - "**/{checkout,billing,payment,subscription}*"
  - "**/{auth,session,oauth}*"

premortem-detectors:
  backend: [migrations, api-routes, cross-service-deps, large-diff]
  frontend: [routing, layouts, auth-ui, money-ui, build-config, flags,
             third-party-scripts, i18n, service-workers, csp,
             public-copy, a11y-primitives]
  content: [new-fetch-origin, new-storage, bundle-size, error-boundaries]
  thresholds:
    large-diff-loc: 500
    bundle-size-kb: 50
```

Added to the existing **Concerns Checklist** block in `jig.config.md`:

```yaml
- premortem: core/skills/premortem
```

## Integration Points

| Touchpoint | Behavior |
|---|---|
| `kickoff` | After `review`, before `pr-create`: if `premortem-horizons` for the work-type is non-empty, prompt to run premortem. Skippable. |
| `pr-create` | Runs detectors. On match, suggests premortem (non-blocking). If premortem file exists for the branch, embeds the decision matrix in the PR description. |
| `postmortem` | Automatically diffs predicted vs actual when a matching premortem file exists. Appends Predicted-vs-Actual section. Surfaces specialist-evolution suggestions. |
| `brainstorm` | If `premortem` is in concerns checklist, flags it as a *future consideration* during design (does not run). |
| `pr-respond` | When a reviewer comment maps to a known premortem risk marked Accept, surfaces the accepted rationale to avoid re-litigation. |
| `/jig:premortem` | Direct manual invocation via the command file in `commands/premortem.md`. |

## Testing Strategy

### Unit-testable (mechanics)
- Risk-signal detector functions in `pr-create`: given a diff manifest,
  return correct signal set. Pure functions, table-driven tests.
- Horizon resolver: given work-type + config, returns correct horizon list.
- Synthesizer prompt builder: given N specialist outputs, produces
  well-formed prompt.
- File path generator: given branch name + date, returns valid
  `docs/premortems/...` path.

### Integration-testable (skill flow)
- Run `/jig:premortem` against fixture branches with known diffs.
  Assert: synthesizer file exists, structure is valid markdown, all
  expected sections present, specialist count matches dispatch count.
- Run against docs-only diff. Assert: most specialists return N/A, no
  spurious risks.
- Meta-test: run frontmatter validation against
  `core/specialists/*-premortem.md` to ensure required fields present.

### Quality-testable (narrative output)
- Build a small **eval set** of historical incidents (3–5 anonymized
  cases). For each, manufacture a pre-incident diff and run premortem.
  Score: did the synthesizer surface the actual root cause in any
  specialist narrative?
- Integrate with the `eval-harness` skill for reproducible scoring.

### Deferred to post-v1
- LLM-as-judge scoring of narrative quality (too noisy at v1).
- Diff input fuzzing (low ROI).

### Self-validation
- `team-dev` quality gates apply to premortem skill development itself.
- Existing `review` swarm catches bugs in the mode-aware extensions.
- Once shipped, premortem runs against its own follow-up PRs
  (consumer-zero discipline).

## Risks and Open Questions

1. **Opus cost at scale.** Eight Opus calls per run is meaningful spend.
   Mitigation: premortem is opt-in / risk-triggered, not auto-run.
   Re-evaluate after first 30 days of usage data.

2. **Narrative quality variance.** Opus narratives are higher-quality
   than Sonnet but still vary run-to-run. Mitigation: the synthesizer
   is the consolidating filter; convergence across specialists is the
   quality signal that matters most.

3. **Decision-matrix UX.** Checking boxes in a markdown file is awkward
   from terminal. v1 may need an interactive prompt mode. Out of scope
   for the design but flagged for implementation planning.

4. **Postmortem auto-diff requires postmortem to exist.** Jig's
   `postmortem` skill is in core, so this is fine. But the diff logic
   itself must be carefully built to avoid false positives ("the
   incident was X; the premortem mentioned X-adjacent risk Y; is that
   a hit?"). Likely needs LLM-assisted matching.

5. **Specialist roster will need evolution.** v1 ships with 8
   specialists. Real usage will surface gaps (e.g., a class of failure
   we didn't anticipate). The postmortem feedback loop is the
   mechanism for evolution — explicitly designed in, not bolted on.

## Glossary

- **Premortem** — Kahneman / Klein technique: imagine the project
  failed; write the story of why; use prospective hindsight to
  surface concrete risks.
- **Prospective hindsight** — the cognitive flip from "what could go
  wrong" to "imagine it went wrong, what was the cause."
- **One-way door** — Bezos's term for an irreversible decision.
  Distinguished from two-way doors (cheaply reversible) to allocate
  caution proportionally.
- **Convergence** — multiple specialists independently surfacing the
  same root failure mode. Strong quality signal.
- **Decision matrix** — Accept / Mitigate / Instrument tagging that
  the author applies to each risk. Forces explicit judgment.
- **Antifragile loop** — the postmortem-feeds-premortem cycle that
  uses real incidents to sharpen specialist prompts. Each failure
  makes the next premortem better.

## References

- Kahneman, *Thinking, Fast and Slow* (2011), Ch. 24
- Klein, G. (2007). "Performing a Project Premortem." *HBR.*
- Bezos, J. Annual shareholder letter (2015) — one-way / two-way doors
- `core/skills/review/SKILL.md` — swarm dispatcher being extended
- `docs/plans/2026-04-01-prd-plan-specialists-design.md` — prior
  mode-extension precedent for the `review` skill
