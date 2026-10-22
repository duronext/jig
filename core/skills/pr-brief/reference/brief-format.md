# PR brief: format

These rules define how the brief looks to the reviewer. They change no review
logic. You do not review the PR again: you re-present a review that is done.

## Inputs

- `merged.md`: its `# Final` is the source of every fact, and its
  `# Agreement` gives the agreement line.
- `pr.json` and `ticket.json`: for the "What it does" and "Why" lines, and to
  expand internal labels into plain words. You may read files in `tree/` to
  explain a label.

## Keep every fact

- Keep the verdict exactly as the Final gives it. Only rephrase it.
- Keep every decision with its recommendation, every defect, every odd item,
  every deferred item and the whole "Not checked" line. Do not add a finding,
  and do not drop one. You may move detail and evidence to the appendix.
- A fact in `merged.md` that an input file plainly contradicts (e.g. it says
  "no comments" where `ticket.json` has two comments) may be corrected only
  with a note in the appendix: what it said, what the file shows.

## Language

Write every sentence above the appendix in the language the skill gives
you: `plain` by default (rules below), or `ste`. In every language:
- Code identifiers, file names, ticket IDs, product names and people's names
  are technical names. Keep them in backticks or as written.
- The Agreement line, quoted text and code names are exempt from the
  language rules: copy them as they are.
- Do not use internal shorthand from tickets or specs (labels such as "d2",
  "AC", "PR2 entries", "§ files table"). Write what the label means in plain
  words. Add the label in brackets after the plain words if a reader needs it
  to find the source.

### Plain (default)

- Plain words a reviewer outside the team would follow. Short sentences, one
  idea each.
- Say what happens and to whom; lead with the effect, then the reason.
- No hedges or filler: "it's worth noting", "importantly", "essentially",
  "in order to".
- None of these words: invariant, backbone, load-bearing, first-class,
  seamless, robust, leverage, utilize, synergy, north star, single source of
  truth, best-in-class, holistic, paradigm, ecosystem (unless it is
  literally one). Quoted text may keep them.
- Markdown bold for leads, as the layout shows. Names of files, symbols,
  tables, services and jobs are fine, in backticks.
- The template's separators (`—`, `→`, `·`) stay as the layout shows them.

## Layout, in this order

```
> This brief comes from a model. It is not always correct. It can miss defects and it can be wrong. Check the evidence in the appendix before you act on an item.

# PR #<n>: <title>
**Recommended action:** <the verdict, one line>
**What it does:** <1–2 sentences. What changes, in plain words, for the system or the user.>
**Why:** <1 sentence. The reason the author or the ticket gives. Say whose reason it is.>
**Review effort:** <Skim | Focused | Deep> — <short reason> · **Defects:** <none | N blocking, N should-fix> · **Decisions:** <none | N> · **Agreement:** <from merged.md's Agreement>

## Decisions you accept by approving
1. [product|system|convention|risk] **<headline, 20 words or fewer>**
   <1–2 sentences of detail. Silent effects first for a risk decision.>
   → **Recommend:** <accept | send back: … | escalate: <role>> — <reason>

## Defects
- **<Blocking|Should-fix>:** <what goes wrong, for whom, in which case>

## What's odd
- <item>

## Deferred
1. <choice> — goes live at <event> → recommend <…>

**Not checked:** <one line, including every unreachable source>

---
## Appendix
- **Evidence:** every item above, with its `[traced]`/`[inferred]` tag and the file and symbol.
- **For the author:** the nits, in short form.
```

## Rules

- **Disclaimer.** Always keep the disclaimer as the first line, word for
  word.
- **Order.** Put Defects before Decisions when the verdict is Request
  changes, or Follow up with a blocking item.
- **Merged PR.** Head the decisions "Decisions already accepted", with
  `→ Recommend: keep | follow up: <action> | escalate: <role>`.
- **Closed, not merged.** Always the full layout, never the short brief.
  Head them "Decisions in this closed PR", with
  `→ Recommend: keep | drop | escalate: <role>`.
- **Collapse empty sections.** If there are no decisions and no defects, use
  one line in place of both sections:
  `**Decisions and defects:** none — <reason>`. If one of the two is empty,
  leave that section out; the summary line already says "none". Leave out
  "What's odd" and "Deferred" when they are empty. Never leave out "Not
  checked".
- **Tags go to the appendix.** In the main part, show uncertainty in plain
  words: write "(not verified)" after a claim that the evidence marks
  `[inferred]`. Leave out `[traced]`.
- **Metadata.** Leave out thread counts unless a thread is open and needs the
  reviewer.
- **Agreement line.** Copy it from `merged.md`, with every split it names:
  the verdicts, the main items already raised in threads, and the
  recommendations that differ. Never shorten it to the counts alone.
- **Short brief (Not ready).** Use the disclaimer and the same first three
  lines (action, what it does, why). The fourth line holds only
  `**Agreement:**`. Then use "What this PR has that main lacks", "Cleanup"
  or "When it returns", "Ticket" and "Not checked".
- **Length.** Aim above the `---` for about 300 words plus about 60 per
  defect, decision and odd item, or about 120 for a short brief. For `ste`,
  aim for about twice that, and a decision's detail may take up to 4
  sentences in place of 1–2. These targets are soft: never drop a fact to
  meet them.
