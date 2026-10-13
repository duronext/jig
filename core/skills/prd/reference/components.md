# Jig kit components

Every Jig PRD page is built from these parts. `showcase.html` draws each one
once around a mock feature; copy markup from there, and read this file for
what each part is for and its limits. Classes live in `base.css`.

## Page contract

- The page source links the kit with these exact lines, and `assemble.sh`
  replaces them with the file contents at publish time:
  ```html
  <link rel="stylesheet" href="base.css">
  <script src="live.js"></script>
  <script src="toc.js"></script>
  ```
- The first lines are `<title>` (the PRD's name, two to four words), the
  Google Fonts link for Inter and JetBrains Mono, then the base.css line.
- The `#clamp` symbol is defined once, hidden, right after the stylesheet.
  Every mark on the page is `<svg><use href="#clamp"/></svg>`.
- The body is `.layout > nav#toc + .sheet > .zones + .wrap`. After the
  layout come the contents button and drawer (`#toc-fab`, `#toc-scrim`,
  `#toc-drawer`), then `#prd-data`, `#prd-source`, `live.js` and `toc.js`.
- `#prd-data` (`application/json`) holds the definitions the live parts render:
  `title`, `kind` (`PRD`), `rev`, `milestones`, `decisions`, `approvers`,
  `outcomes`. Shapes are in `framework/LIVE_PRD.md`.
- `#prd-source` (`text/markdown`) holds the PRD's Markdown, the same text saved
  as `*-prd.md`. `/jig:spec` reads it from the page.
- Publish with `capabilities: {db: {}, user: {scopes: ["profile"]}}` so the
  live parts can save.

## Colour

| Token | Means | Never use it for |
|-------|-------|------------------|
| `--accent` (indigo) | The work: what this PRD builds, the current stage, IDs, links | Decoration |
| `--mark` (pink) | The markup pen: changed in this rev, open decisions, the cut line | Emphasis |
| `--phantom` (dashed grey) | Outside or later: other teams' systems, deferred work, unchecked | Disabled controls |
| `--ok` `--warn` `--bad` | Status only | Anything that is not a status |

Machine plates (`.thesis`, `.plate`) and the chat mock stay dark in both
themes. Nothing is coloured to look nice.

## Structure

| Part | Markup | Use it for | Limits |
|------|--------|-----------|--------|
| Hero | `header.hero > .meta + h1 + .deck + .lede` | Name, one mono deck line, a three-sentence lede | `.meta` holds the mark and 3–4 eyebrows: `PRD`, area, `Rev X · date`, `Mock data` if any |
| Thesis plate | `.thesis.clamped > .thesis-line + .legend` | The one sentence. Spans: `.p-amb` when, `.p-acc` the work, `.p-ok` the outcome, `.p-dim` who it saves | One sentence. No thesis, no page |
| Section | `section#id > .sec-head > .row(.sheetno + .eyebrow) + h2 + p.stand` | Every section | The eyebrow is a noun that works as a menu label. The h2 is a claim. The standfirst is the reason, two sentences at most |
| Sheet index | `nav.index > a` | Long PRDs only | Skip it under eight sections; the sidebar does the job |
| Clamp corners | `.clamped` | The one figure that matters most | Once or twice per page |
| Balloons | `.balloon` | Numbered callouts on a mock or figure | Numbers mean reading order |

## Content parts

| Part | Markup | Use it for | Limits |
|------|--------|-----------|--------|
| Facts | `.facts > .row(span + span)` | Owner, status, phase, target, reach, ticket, started from, code checked | 6–8 rows |
| Before / after | `.ba > .before + .arrow + .after` | How it works today and with this | Same number of steps on each side. The `.cost` line carries units |
| People | `.people > .person[.quiet]` | Who feels the problem: role, today, needs | Three cards. `.quiet` for someone who benefits by noticing nothing |
| Moment | `.moments > .moment#moment-n[data-sub]` | Each moment a person sees, numbered in order | 2–4 moments, each with one mock |
| App mock | `.app > .app-bar + .app-body(.side + .main)` | A screen in the product | One `.new-ring` on the new thing |
| Mail mock | `.mail > .mail-h + .mail-b` | An email or notification | One button |
| Phone mock | `.phone-wrap > .phone > .screen` | A mobile page | One primary action |
| Chat mock | `.chat > .chat-bar + .msg` | A message in a team chat | Always dark |
| Figure | `figure > .fig.clamped > svg + figcaption` | A flow or a map of systems | 960 wide, scrolls on a phone. Indigo boxes are ours and new, phantom boxes are outside. Caption's first sentence is bold |
| Rules | `.rules > .rule-row(.id + rule + .know)` | What it has to do, with "you'll know it works when" | One behaviour per row. IDs `MVP.n`, `NEXT.n`, `LATER.n` travel to the spec |
| Pseudo plate | `.plate > .plate-bar + pre` | A rule that needs steps | Plain words, lowercase keywords in `.p-acc`. Never real code |
| Ladder | `.ladder > .rung + .cut + .rung.later` | Phases | Up to six rungs, one cut line. Every rung above the cut is usable on its own |
| Schedule | `.tscroll > .gantt[data-start]` | Weeks across, workstreams down | Diamonds `i[data-ms=id]` turn green when their milestone is ticked. Give each bar's cell a `data-bar` id so people can drag it (see Live parts). `data-start` is the first week's date, `YYYY-MM-DD`. Any number of `.wk` columns |
| Scope | `.scope > .in + .wait + .never` | In the MVP, waits, not building | Always this order. "Waits" and "not building" say why in grey |
| Map | `.map > .region.ours + .region.outside` | What it touches | `.node.new` for new, `.node.ph` for outside or not checked |
| Impact table | `.tscroll > table` with `tr.grp` | What changes for people, effect chip, checked chip | "Not checked" is a finding |
| Measures | `table` with `.to` arrow | Today → target, read-on date | Two goals and one guardrail |
| Callout | `.callout.note / .mk / .ph / .bad` | Note, changed, outside, risk | Four kinds only. The eyebrow names the kind |
| Timeline | `.timeline > .tl[.ctx/.now]` | How we got here | One line per date |
| Revisions | `table` + `.delta` | Rev letter, date, by, what changed, where | Only the latest rev's `.delta` marks stay in the body |
| Words | `dl.terms` | Words a non-engineer may not know | Only real ones |
| Questions | `details > summary + p` | Questions people asked | Only real ones |
| Pipeline strip | `.pipeline > .stage[.done/.here]` | Where this document sits | One `.here` |
| Terminal plate | `.plate` with `$` lines | A Jig command | Output not really run is labelled `illustrative output` in the bar |
| Title block | `.titleblock` | Title, drawn, checked, approved (`#tb-approved`), sheet, rev | Always last |
| Stamp | `.stamp.draft / .review / .approved / .super` | What the page is good for now | One per page, in the title block |

## Live parts

These render from `#prd-data` and save to the artifact database. Put an empty
container where each one goes; `live.js` fills it.

| Part | Container | Notes |
|------|-----------|-------|
| Live chip | `<span class="live" data-live>Connecting</span>` | Put one in the head of every live section |
| Milestones | `<div id="milestones" data-sub="Milestones"></div>` | Progress bar plus a row per milestone; overdue turns red on its own |
| Decisions | `<div class="decisions" id="decision-cards"></div>` | Cards from `prd-data` plus any decision Jig opens later |
| Sign-off | `<tbody id="approvers"></tbody>` inside the stakeholders table | Rows for `prd-data.approvers`. "Gives input" and "kept posted" rows are plain markup in another `<tbody>` |
| Approved stamp | `<span class="stamp review" id="tb-approved">` in the title block | Reads "Approved for spec" once every approver signs the current rev |
| Schedule bars | `<div class="cell" data-bar="id" style="grid-column:a / b">` in `.gantt` | People who can save drag a bar (middle moves it, ends stretch it, or arrow keys; Shift changes the end, Alt the start). Changes stay a pink draft until Save, then save to `schedule/<id>` and log. Demo diamonds move a week at a time and move their milestone's due date. A date in a bar's text wrapped in `<time datetime="YYYY-MM-DD" data-edge="start|end">` follows that end. Bars without `data-bar` stay fixed |
| Trace | `<tbody id="trace-rows"></tbody>` | One row per `prd-data.outcomes` entry |
| Log | `form#log-form > input + button` and `<div id="log-items"></div>` | Newest first; a clamp face means Jig wrote it |
| Messages | `<div class="msg-line" data-msg="ms|dec|appr|trace|log"></div>` | Where save errors show |

## Contents

`toc.js` builds the sidebar and the phone drawer from the page: every
`.sheet section[id]` with its `.sheetno` and eyebrow, and every `[data-sub][id]`
inside a section as a sub-part. Give sub-parts an `id` and a short `data-sub`
label. Sections with a `[data-live]` chip get a green dot.

## Testing

`test/run.sh` assembles `template.html`, swaps in a fake `window.claude`
(`test/fake-claude.js`, an in-memory database), and drives the page in
headless Chrome with `test/driver.js`. Run it after any change to `live.js`,
`toc.js` or the template's live containers. Add a check to `driver.js` for
every new behaviour.
