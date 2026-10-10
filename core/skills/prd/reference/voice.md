# PRD voice

A PRD is read by people who will never open the code: a PM, a finance lead,
support, a customer success manager, an executive. If one of them stops to ask
"what does this mean", the sentence failed. These rules apply to the page, the
`*-prd.md`, and every log entry Jig writes.

## Write like this

- **Write from the reader's side.** "Finance sees a retry, not a failure", not
  "The system surfaces retry state to the finance persona."
- **Name things the way people see them.** Invoice list, email, settings page.
  Not endpoints, tables, services or jobs.
- **Headlines make a claim.** "The cut line is the MVP", not "Phases".
- **Bold leads.** `<b>Subject.</b> The reason.` The bold part is what a skimmer
  reads. Never a whole sentence in bold.
- **Numbers travel with units and dates.** "~2 h a day of finance time",
  "~4,100 accounts", "ships 2026-11-17".
- **Say what is not built, planned or mock in the row itself.** A dashed chip
  in the row beats a disclaimer three sections away.
- **Name where a requirement came from.** A ticket, a customer, a person's
  notes. Requirements with a history get followed.
- **Short sentences.** One idea each. Fragments only in eyebrows, chips, tags
  and table headers.
- **Logic is plain steps.** When a rule needs steps, use the pseudo plate:
  `when`, `if`, `try again`, written as a person would say them.

## Never write

- Code. Not in a rule, not in a mock, not in a log entry. No function names,
  class names, file paths, column names or JSON. The spec holds those.
- These words: invariant, backbone, load-bearing, first-class, seamless,
  robust, leverage, utilize, synergy, north star, single source of truth,
  best-in-class, holistic, paradigm, ecosystem (unless it is literally one).
- "X is not Y, it's Z" and "not just X, but Y" framing. Say what it is.
  Use "is not" only when it separates two things a reader would confuse.
- Three-item rhythms for their own sake ("fast, simple, and reliable").
- Em-dashes in prose. Use a full stop or a colon.
- Hedges and filler: "it's worth noting", "importantly", "essentially",
  "in order to", "at the end of the day".
- Empty sections, `TBD` in the body, or lorem. Open questions are decisions
  with an owner and a date; anything else gets cut.
- Invented output. A number, a quote or a screen that did not happen is marked
  `mock data`, in the hero and the footer.

## Check a sentence

Read it aloud to someone in finance. If they would ask a follow-up question
about a word, replace the word. If they would ask "so what?", add the reason
or cut the sentence.
