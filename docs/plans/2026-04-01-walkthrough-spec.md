# PRD: Interactive Pipeline Walkthrough

> **Ticket:** ded/jig-tutorial-walkthrough
> **Type:** Feature (Full PRD)
> **Author:** Dustin Diaz
> **Date:** 2026-04-01

---

## 1. Overview

An animated, interactive walkthrough that demonstrates the full Jig
pipeline — from `/jig:kickoff` to `/jig:postmortem` — presented as a
modal overlay on the Jig homepage. It simulates building a commenting
system (GraphQL API, Postgres, React, design system) and renders as a
fabricated terminal experience that plays like a video, complete with
play controls, section navigation, and replay.

The walkthrough is the primary "show, don't tell" asset for
understanding what Jig does and why it matters.

---

## 2. Background & Motivation

The homepage currently has a static terminal showing a condensed
pipeline run (kickoff → brainstorm → prd → build → review). It plays
once on scroll and shows ~15 lines of output. It's effective as a
teaser but doesn't convey:

- The depth of each pipeline stage (brainstorm's interview process,
  PRD's acceptance criteria, plan's task decomposition)
- The team-dev parallel execution experience (tmux split panes with
  a team lead orchestrating 3 specialist agents)
- The review swarm's specialist dispatch
- The full ship-and-learn cycle (PR creation, comment response,
  postmortem)

The whitepaper ("Ship Fast, Break Nothing") articulates the
principles — spec-first development, specialists over generalists,
3-5 focused agents, humans promoted upstream, framework over skill
collection. The walkthrough makes those principles *tangible* by
showing them in action.

**Core principles to showcase (from the whitepaper):**

1. **The spec is the product** — PRD with enforceable acceptance
   criteria drives everything downstream
2. **Specialists beat generalists** — focused review agents with
   narrow scope and deep expertise
3. **3-5 agents, not 50** — small, focused team (frontend, backend,
   test writer) with a team lead
4. **Framework > skill collection** — enforced handoffs and quality
   gates at every stage transition
5. **Humans promoted upstream** — the user approves designs, plans,
   and PRs; agents execute

---

## 3. API Contract

N/A — pure frontend feature. No server-side endpoints. All animation
data is hardcoded in the HTML/JS.

---

## 4. Data Model

N/A — no persistent data. Animation sequences are defined as static
data structures in JavaScript.

---

## 5. Business Logic & Rules

N/A — no business logic. Animation timing, sequencing, and state
transitions are covered in Component Behavior (Section 8).

---

## 6. Entry Points & User Flows

### Path A — Homepage "See It In Action" Section

1. User scrolls to the existing terminal on the homepage
2. The static terminal shows its current staggered animation
3. A play button overlay is visible on/over the terminal
4. User clicks the play button
5. A full-screen modal opens with the walkthrough
6. Walkthrough begins playing automatically

### Path B — Deep Link

1. User navigates to `index.html#walkthrough-play`
2. Page loads, modal opens automatically
3. Walkthrough begins playing

### Path C — Replay

1. User has already watched the walkthrough
2. Walkthrough reaches the end state
3. User clicks "Replay" (or a replay icon)
4. Animation resets and plays from the beginning

---

## 7. UI States & Layout

### Modal Container

- **Backdrop:** Semi-transparent dark overlay covering the full
  viewport, click-outside-to-close
- **Modal body:** Centered, max-width ~960px, matching site
  `--max-width`. Dark background matching `--bg` aesthetic
- **Close button:** Top-right corner, subtle `X`
- **Keyboard:** `Escape` closes modal

### Terminal Window (inside modal)

Extends the existing homepage terminal aesthetic:

- **Title bar:** Traffic light dots (red/yellow/green) + tab bar
- **Tab bar:** Dynamic — tabs change based on the current pipeline
  stage. During team-dev, shows the tmux-style panes
- **Terminal body:** Monospace output with the same color tokens
  (`t-prompt`, `t-cmd`, `t-label`, `t-value`, `t-success`, `t-muted`)

### Team-Dev Split Pane Layout

During the Execute (team-dev) section, the terminal transforms:

```
┌─────────────────────────────────────────────────────┐
│ ● ● ●  │ ✱ Team Lead ⌘1 │ → frontend ⌘2 │ ...     │
├─────────────────────┬───────────────────────────────┤
│                     │  frontend-agent               │
│   Team Lead         ├───────────────────────────────┤
│   (orchestrator)    │  backend-agent                │
│                     ├───────────────────────────────┤
│   50% width         │  test-writer                  │
│                     │                               │
│                     │  3 rows, stacked              │
└─────────────────────┴───────────────────────────────┘
```

- Left pane (50%): Team lead — shows orchestration commands, task
  dispatch, quality gate checks
- Right pane (50%, split 3 rows): Frontend agent, backend agent,
  test writer — each showing their work in parallel

### Section Navigation Bar

Below (or overlaid at the bottom of) the terminal:

- **Progress indicator:** Shows current section and overall progress
  (e.g., a segmented bar or dot indicators)
- **Section labels:** Clickable labels for each pipeline stage
  (Kickoff, Brainstorm, PRD, Plan, Execute, Review, Ship, Learn)
- **Active section** highlighted with accent color

### States

| State | What's visible |
|-------|---------------|
| **Idle** | Play button overlay on homepage terminal |
| **Playing** | Modal open, animation running, progress bar advancing |
| **Section transition** | Brief transition effect between stages |
| **Paused** | Modal open, animation paused, play/resume visible |
| **Complete** | Modal open, final state shown, replay button visible |
| **Closed** | Modal dismissed, returns to homepage |

---

## 8. Component Behavior

### Play Button (on homepage terminal)

- **Trigger:** Click/tap
- **Appearance:** Centered play triangle (▶) with subtle glow, on a
  semi-transparent circular backdrop. Visible over the static terminal
- **Hover:** Scale up slightly, glow intensifies
- **Behavior:** Opens modal, begins playback

### Modal

- **Open:** Fade in backdrop + scale-up modal body (200-300ms)
- **Close:** `Escape` key, click backdrop, or click `X`. Fade out.
  Stops animation, resets state
- **Scroll lock:** Body scroll disabled while modal is open

### Animation Engine

The walkthrough is a **sequence of timed animation frames** organized
into sections. Each section represents a pipeline stage.

**Typing effect:** Commands appear character-by-character to simulate
typing (e.g., `$ /jig:kickoff` types out letter by letter).

**Line reveal:** Output lines fade in with staggered delays (matching
the existing homepage terminal pattern).

**Section transitions:** Brief pause (~500ms) + visual separator
(e.g., a subtle horizontal rule or fade-to-black-and-back) between
pipeline stages.

**Progress bars:** During team-dev execution, progress bars animate
from 0 to 100% at different rates per agent to simulate parallel
work completing at different times.

**Pane transitions:** During team-dev, the terminal smoothly
transitions from single-pane to split-pane layout (CSS transition on
widths/heights).

### Section Navigation

- **Click a section label:** Animation jumps to the start of that
  section (skipping intermediate content)
- **Current section indicator:** Highlighted in the navigation bar
- **Deep-linkable:** Each section has a hash anchor
  (`#walkthrough-kickoff`, `#walkthrough-review`, etc.)
- **No rewind/fast-forward scrubbing** — only section-level jumps

### Replay

- **Trigger:** Replay button visible after walkthrough completes
- **Behavior:** Resets all animation state, begins from the top
- **Section replay:** Clicking a section label after completion also
  replays from that section forward

---

## 9. Settings & Configuration

N/A — no user-configurable settings. All animation timing and content
is authored at build time.

---

## 10. Open Questions

- TBD: Exact animation timing for ~2-minute total runtime. Needs
  tuning after initial implementation — some sections may need more
  or less time depending on how they feel at speed.
- TBD: Mobile experience. The tmux split-pane layout won't work on
  narrow screens. Options: (a) simplify to sequential view on mobile,
  (b) hide the walkthrough on mobile, (c) allow horizontal scroll.
- TBD: Should pausing be an explicit button, or does clicking the
  terminal pause? Need to avoid conflict with section navigation.
- TBD: Sound effects? Subtle keystroke sounds could enhance the
  "typing" illusion but may annoy users. Probably no — keep it
  silent.
- TBD: Where the "Watch the walkthrough" link appears in the
  top navigation or header, if anywhere beyond the existing section.

---

## 11. Out of Scope

- **Actual video recording or `<video>` element** — this is pure
  HTML/CSS/JS animation
- **Editable/interactive terminal** — users cannot type into the
  terminal
- **Fast-forward or rewind scrubbing** — only section-level jumps
- **Responsive split-pane on mobile** — deferred (see Open
  Questions)
- **Analytics/tracking** — can be added later
- **Localization** — English only
- **Server-side rendering** — static HTML file
- **Content CMS** — all walkthrough content is hardcoded

---

## 12. Acceptance Checklist

### UI — Modal & Entry Points

- [ ] [UI] Play button overlay visible on homepage terminal in "See
  It In Action" section
- [ ] [UI] Clicking play button opens full-screen modal overlay
- [ ] [UI] Modal has dark backdrop with click-outside-to-close
- [ ] [UI] Modal has close button (X) in top-right corner
- [ ] [UI] `Escape` key closes modal
- [ ] [UI] Body scroll locked while modal is open
- [ ] [UI] Deep link `#walkthrough-play` opens modal on page load

### UI — Terminal Aesthetic

- [ ] [UI] Terminal window matches homepage aesthetic: traffic light
  dots, tab bar, dark body, monospace font
- [ ] [UI] Color tokens match existing: `--accent` for commands,
  `--text-primary` for values, `--text-secondary` for labels,
  `#4ade80` for success states
- [ ] [UI] Blinking cursor (▌) visible during active typing sections

### UI — Animation Engine

- [ ] [UI] Commands type out character-by-character
- [ ] [UI] Output lines fade in with staggered timing
- [ ] [UI] Section transitions include a visual pause/separator
- [ ] [UI] Total walkthrough runtime is approximately 2 minutes
- [ ] [UI] Animation runs smoothly at 60fps (no jank on
  transitions)

### UI — Pipeline Sections

- [ ] [UI] Section 1 — Kickoff: shows work type classification,
  pipeline stage selection
- [ ] [UI] Section 2 — Brainstorm: shows design questions,
  approach proposals, design approval
- [ ] [UI] Section 3 — PRD: shows acceptance criteria with layer
  tags ([API], [DATA], [UI])
- [ ] [UI] Section 4 — Plan: shows task decomposition with file
  paths and dependencies
- [ ] [UI] Section 5 — Execute (team-dev): terminal splits into
  tmux layout (team lead 50% left, 3 agents stacked right)
- [ ] [UI] Section 6 — Review: shows specialist swarm dispatch
  (security, dead-code, logic, performance, error-handling) with
  pass/fail results
- [ ] [UI] Section 7 — Ship: shows PR creation and PR comment
  response/resolution
- [ ] [UI] Section 8 — Learn: shows postmortem analyzing feedback
  and updating skills

### UI — Team-Dev Split Pane

- [ ] [UI] Left pane (50%) shows team lead orchestration
- [ ] [UI] Right pane (50%) splits into 3 horizontal rows: frontend
  agent, backend agent, test writer
- [ ] [UI] Each agent shows independent progress with progress bars
- [ ] [UI] Agents complete at different times (staggered)
- [ ] [UI] Spec compliance and code quality gates shown after all
  agents complete

### UI — Navigation & Controls

- [ ] [UI] Section navigation bar shows all 8 pipeline stages
- [ ] [UI] Current section highlighted with accent color
- [ ] [UI] Clicking a section label jumps to that section's start
- [ ] [UI] Replay button visible after walkthrough completes
- [ ] [UI] Clicking replay resets and plays from the beginning

### UI — Transitions & Polish

- [ ] [UI] Modal open: fade-in backdrop + scale-up body
- [ ] [UI] Modal close: fade-out with state reset
- [ ] [UI] Terminal transitions smoothly to split-pane layout for
  team-dev section
- [ ] [UI] Terminal transitions back to single-pane after team-dev
