---
name: prd
description: >
  Use when writing a product requirements document that anyone can read: a PM,
  finance, support or an executive, not only engineers. Turns a Word doc, a
  bullet list, a brainstorm or a ticket into a plain-language PRD with phases,
  an MVP cut line, milestones, open decisions and sign-off, published as a live
  Jig page that people and Jig update as the work moves. Also checks a build
  against its PRD before shipping. Triggered by "write a PRD", "turn this into a
  PRD", "product requirements", "check the PRD", or /prd.
tier: workflow
alwaysApply: false
---

# PRD

**PURPOSE**: Help someone get from a rough idea to a product document a whole
team can read, argue with, sign and track. The PRD says what we are building,
for whom, in what order, and how we will know it worked. It never says how the
code works; that is the spec's job (`spec`).

**WHO RUNS IT**: A PM in Claude.ai or the desktop app with nothing but a Word
doc, or an engineer in Claude Code with the repo open. Both paths are
supported. With the repo open, the PRD gets a product-side blast radius (screens,
names and permissions it touches); without it, those rows say "not checked".

**OUTPUT**: Two things from one source:
1. `{plans-directory}/YYYY-MM-DD-<topic>-prd.md`, the master copy of the text.
2. A live Jig page (an artifact) built from the kit in `reference/`, carrying
   that Markdown inside it, where people tick milestones, record decisions and
   sign off, and where Jig logs progress. See `framework/LIVE_PRD.md`.

**CONFIGURATION**: Reads `jig.config.md` when present for `plans-directory`,
`filename-format`, `prd-publish` (`artifact` | `file`), `prd-sync` and
`prd-swarm-tiers`. With no config (a PM in Claude.ai), use the defaults:
save to `docs/plans/` if a repo is open, publish as an artifact, review with
the four PRD specialists.

**READ FIRST**: `reference/voice.md` before writing a single sentence.
`reference/components.md` before building the page.

---

## Modes

| Mode | Trigger | Does |
|------|---------|------|
| **Write** (default) | "write a PRD", `/prd`, `/prd <file or link>` | Intake → interview → draft → review → page |
| **Revise** | "update the PRD", "rev C", changed scope | Bumps the rev letter, marks changes, republishes to the same link |
| **Check** | "check the PRD", kickoff's PRD CHECK stage | Walks each in-scope outcome from the user's side before shipping |
| **Publish** | "publish this PRD", a `*-prd.md` with no page yet | Builds the page from an existing `*-prd.md` |

## Tiers

| Work | Tier | Sections |
|------|------|----------|
| Feature | **Full** | All sections in the Markdown skeleton below; cut any that do not apply |
| Large improvement | **One-pager** | Thesis, what it does, phases and milestones, scope, open decisions, who signs off, log |

Bugs and tasks do not get a PRD. Send them to `spec` (light tier) or `plan`.

---

## Write mode

### Step 1: Take in what they have

Accept anything: a Word doc, a PDF, a Google Doc export, a Slack thread,
bullet points, a ticket, a brainstorm summary, an old PRD. Read all of it, then
tell the user in a short list:

- **What I found**: the claims the source makes (who, problem, ideas, dates)
- **What's missing**: the gaps the PRD needs filled (usually the MVP, how we'll
  know it worked, and who signs off)

Do not restate their document back to them.

### Step 2: Look at the product (when the repo is open)

If a codebase is available, spend a few minutes on the product side of it, not
the implementation:

- Which screens, emails, settings or reports does this touch?
- What does the product already call these things? Use those names.
- Does something similar already exist? Say so before designing a second one.
- Which permissions or plans does it inherit?

Record what you find in "What it touches" with `Code checked: yes, <date>`.
Without a repo, write `Code checked: no` and mark each row `not checked`.
`/jig:spec` fills those in later and sends product questions back as decisions.

### Step 3: Find the one sentence

Write the thesis: the sentence a customer or colleague would say once this
works. It names **when** it starts, **the work**, **the outcome**, and **who it
saves**:

> When a card fails, the invoice fixes itself before anyone has to chase it.

If you cannot write it, the idea is not ready. Say so, and offer
`/jig:brainstorm`. Do not draft a PRD around a missing sentence.

### Step 4: Interview

Ask **one question at a time**, multiple choice when you can, **at most five
per round**. Cover, in roughly this order, only what the sources left open:

1. **Who** feels this today, and what do they do instead?
2. **What is the smallest version someone would actually use?** This is the MVP.
   Push here. "Everything in the doc" is not an MVP.
3. **What can wait**, and what will we never build?
4. **How will we know it worked?** One or two numbers with today's value, a
   target and a date, plus one number that must not get worse.
5. **When**: milestones a person could watch happen, with target dates.
6. **Who signs off**, who gives input, and who just needs to hear about it.

When an answer needs a decision nobody can make now, do not block. Record it as
an open decision with two options, a recommendation, an owner and a due date.
Leave **no more than three** open decisions in a draft.

### Step 5: Shape the phases

Before drafting, check the plan holds together:

- **The MVP stands on its own.** Someone gets value from it with nothing below
  the cut line. If not, move the cut.
- **Each phase has a moment you can demo.** That demo is a milestone.
- **Every rule has an ID and a phase**: `MVP.1`, `NEXT.1`, `LATER.1`. These IDs
  travel: the spec traces to them, the build ticks them, the check verifies them.
- **Every rule says how you'll know it works**, in words a person could check
  by using the product.

### Step 6: Draft the Markdown

Write `*-prd.md` using the skeleton below. Follow `reference/voice.md`. Where a
rule needs steps, write plain-language steps (`when`, `if`, `try again`), never
code. Mark anything illustrative as mock data.

### Step 7: Review

**INVOKE `jig:review` using the Skill tool with mode: prd.** Pass the
`*-prd.md` path. The PRD specialists read it as a non-engineer would:
`plain-language`, `mvp-cut`, `testable-outcomes`, `missing-moments`.

Present the findings with the draft, fix what the user agrees with, and record
the review in the Revisions table ("Checked: review swarm, N notes").

### Step 8: Build and publish the page

Skip to Step 9 if `prd-publish: file` or the platform cannot publish artifacts.

1. Copy `reference/template.html` into your scratchpad as `<topic>-prd.html`.
   It is the standard page structure filled with the kit's example; replace
   every word. Cut sections the PRD does not have. Keep the `.layout`, `#toc`,
   contents drawer, `#prd-data` and script lines.
2. Fill `#prd-data` from the PRD: `title`, `kind: "PRD"`, `rev`, `milestones`,
   `decisions`, `approvers`, `outcomes` (shapes in `framework/LIVE_PRD.md`).
3. Paste the full `*-prd.md` into `#prd-source`.
4. Fill the moments with mocks that use the product's real structure and
   illustrative people. One dashed indigo outline per mock, on the new thing.
5. Run `bash reference/assemble.sh <topic>-prd.html > <topic>-prd.out.html`.
   Take one look at the result if the session offers a preview, fix what is
   visibly broken, then publish. Do not loop.
6. Publish `<topic>-prd.out.html` with the Artifact tool: the PRD name as the
   title, `icon: "blueprint"`, a one-sentence description, and
   `capabilities: {db: {}, user: {scopes: ["profile"]}}`.
7. Write the first log entries (`actor: jig`): a `rev` entry, "Rev A published.", and a `review` entry summarizing the `review:prd` findings and what changed because of them.
8. Put the page link in the `*-prd.md` header (`Page:`).

### Step 9: Save and hand off

1. Save `*-prd.md` to `{plans-directory}` (when a repo is open). Do not commit
   unless the user asks.
2. If `prd-sync` is set, follow that pack's document sync.
3. Give the user, in three lines or fewer: the page link, what it covers, and
   what still needs a decision or a sign-off.
4. Offer the next step: "Ready for engineering? `/jig:spec <link>` turns the
   MVP into the technical contract."

---

## Revise mode

1. Read the current `*-prd.md` (or the page's `#prd-source`) and its live state.
2. Make the change with the user. Bump the rev letter (A → B → C).
3. Add a Revisions row: rev, date, who, what changed, where.
4. Mark each changed item in the page with a delta (`<span class="delta">C</span>`).
   Remove the previous rev's deltas; older changes live in the table.
5. Update `#prd-data` (`rev`, and any new milestones, decisions or outcomes).
   Keep existing ids so ticks, choices and sign-offs carry over.
6. Republish to the **same** artifact link. Sign-offs for the old rev now show
   "asks again" on their own.
7. Log a `rev` entry naming what changed and that sign-off is needed again.

---

## Check mode (before shipping)

Called by `kickoff` at PRD CHECK, or directly. The spec reviewer already asked
"did we build what the spec says". This asks "can a person now do what the PRD
promised".

1. Load the PRD and its trace. List the in-scope outcomes (the phase being shipped).
2. For each in-scope outcome, whatever its trace status (a `verified` this check
   did not write gets checked like any other), check its "you'll know it works
   when" line **from the user's side**: run the app, use staging, read the test
   that exercises the whole path, or watch the behaviour in a preview. The proof
   must show the case the line promises, exercised now: a test that covers other
   inputs is not proof, so record `built`. Write down what you saw.
3. Record each one in the trace (see `framework/LIVE_PRD.md`):
   - `verified` with the proof ("Paid 22 s after saving a card on staging")
   - `built` if the code exists but you could not watch it work, with why
   - `deferred` only if the PRD owner agreed, with who and why
4. Tick any milestone the check completes. Log one `check` entry with the counts.
5. Report back: verified, built-not-verified, deferred. Anything `built` blocks
   the gate until someone watches it work or the owner defers it.

---

## The Markdown skeleton

```markdown
# {Name}

> {The one sentence}

Rev {A} · {YYYY-MM-DD} · Owner: {name} · Status: {Draft | In review | Approved}
Page: {artifact link, once published}

## At a glance
- **Who it reaches**: ...
- **Phase**: MVP, to {who}
- **Target**: {date}
- **Ticket**: ...
- **Started from**: {source doc, thread or brainstorm}
- **Code checked**: {yes, date | no}

## Today
{How it works now, as numbered steps, and what it costs, with units.}

## With this
{The same steps after this ships.}

## People
- **{Role}**: today ... needs ...

## Moments
### 1. {A claim about what the person sees}
{Two sentences. The page shows the mock.}

## What it does
- **MVP.1** {One behaviour.} You'll know it works when {a person could check it}.
- **NEXT.1** ...

{Optional plain-language steps:}
    when ...
      if ...

## Phases
- **MVP** (ships {date} to {who}): MVP.1–MVP.n
- ---- cut line ----
- **Next**: NEXT.1 ...
- **Later**: ... ({why it waits})

## Milestones
- [ ] m1 · {title} · {due} · {what a person would see}

## Scope
- **In the MVP**: ...
- **Waits**: ... ({why})
- **Not building**: ... ({why})

## What it touches
| Area | What changes for people | Effect | Checked |

## Measures
| Measure | Today | Target | Read on | Kind (goal/guardrail) |

## Open decisions
### d1 · {Question?}
- **A (recommended)**: {option}. {why}
- **B**: {option}. {why}
- Owner: {name} · Due: {date} · Blocks: {MVP.n}

## Who signs off
- **Signs off**: {name, role, what they check}
- **Gives input**: ...
- **Kept posted**: ...

## Trace
| Outcome | Spec items | Plan tasks | Status | Proof |

## Revisions
| Rev | Date | By | What changed | Where |

## Log
- {YYYY-MM-DD HH:MM} · {who} · {kind} · {one sentence}
```

---

## Running in Claude.ai or the desktop app

The skill folder (`SKILL.md` + `reference/`) uploads as a standalone skill. In
that setting:

- There is no `jig.config.md`; use the defaults above.
- There may be no repo; skip Step 2 and mark "Code checked: no".
- Build and publish the page the same way. The `*-prd.md` lives inside the page
  (`#prd-source`); offer it as a file if the user wants one.
- People update the page directly. Jig's own log entries start once an engineer
  runs `/jig:spec <link>` in Claude Code.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing the spec | No endpoints, tables, fields or code. If a reader needs to know how, it belongs in `/jig:spec` |
| An MVP that is "phase one of everything" | Cut until someone could use it alone, then demo it |
| "Works correctly" as an outcome | Say what a person would see: "shows Paid within a minute of saving" |
| Five open questions and no owners | Each open item is a decision with two options, an owner and a date. Three at most |
| Drafting without the one sentence | Go back to brainstorm |
| Asking ten questions at once | One at a time, five per round at most |
| Restyling the page | The kit is the look. Colour means something; do not invent a fifth callout or a new hue |
| Changing ids on revise | Keep milestone, decision, approver and outcome ids so live state carries over |
| A new link for each rev | Republish to the same artifact link |
| Claude-speak | Run every sentence past `reference/voice.md` |

## Integration

**Called by:**
- `kickoff` at the PRD stage (features, large improvements) and at PRD CHECK
- Direct invocation (`/prd`), including by a PM outside any repo

**Hands off to:**
- `spec`: takes the PRD path or page link and specs the MVP phase
- `review` with `mode: prd`: the four PRD specialists

**Kept current by:** `spec`, `plan`, `build`, `team-dev`, `sdd`, `finish` and
`postmortem`, per `framework/LIVE_PRD.md`.

## Quick Reference

| Element | Rule |
|---------|------|
| Thesis | One sentence: when, the work, the outcome, who it saves |
| Outcome IDs | `MVP.n`, `NEXT.n`, `LATER.n`, each with "you'll know it works when" |
| Milestones | `m1…`, each something a person could watch happen, with a date |
| Decisions | `d1…`, two options, one recommended, owner, due date; three open at most |
| Approvers | Short slugs (`finance`, `eng`); sign-off counts per rev |
| Files | `*-prd.md` + the page (`reference/template.html` → `assemble.sh` → Artifact) |
| Publish | `capabilities: {db: {}, user: {scopes: ["profile"]}}`, same link on every rev |
| Voice | `reference/voice.md`. No code, no Claude-speak |
| Live state | `framework/LIVE_PRD.md` |
