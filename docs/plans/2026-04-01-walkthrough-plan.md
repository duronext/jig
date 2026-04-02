# Interactive Pipeline Walkthrough — Implementation Plan

> **PRD:** docs/plans/2026-04-01-walkthrough-prd.md
> **For agents:** Use sdd (sequential) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an animated, interactive modal walkthrough that demonstrates the full Jig pipeline through 8 sections (~2 min total), triggered from the homepage terminal's play button.

**Architecture:** Single `docs/walkthrough.js` file (IIFE, zero deps) drives a state machine + rAF animation engine. All CSS lives in `docs/index.html`'s existing `<style>` block. Modal DOM is created by JS. All walkthrough classes prefixed `wt-` to avoid collisions with existing `.terminal` styles. Content data is hardcoded as a `SECTIONS` array of frame objects with timestamps.

**Tech Stack:** Vanilla HTML/CSS/JS, no build tools, no frameworks. Static GitHub Pages site.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `docs/index.html` | Modify | Add walkthrough CSS (~180 lines), play button HTML, `<script>` tag, terminalObs fix |
| `docs/walkthrough.js` | Create | State machine, animation engine, renderers, content data, navigation (~700 lines) |

---

## State Machine

| State | Description |
|---|---|
| `IDLE` | Modal closed. Initial + post-close state. |
| `PLAYING` | Animation running in current section. |
| `PAUSED` | User paused. Clock frozen. |
| `SECTION_TRANSITION` | ~400ms fade-out/in between sections. |
| `COMPLETE` | All 8 sections finished. Shows replay. |

**Transitions:**
- `IDLE` + play → `PLAYING` (open modal, lock scroll, hide ToC FAB, start S0)
- `PLAYING` + pause → `PAUSED` (freeze clock)
- `PLAYING` + section_end → `SECTION_TRANSITION` (fade out → clear → advance → fade in)
- `PLAYING` + nav_to(i) → `SECTION_TRANSITION` (jump to section i)
- `PLAYING` + close → `IDLE` (close modal, reset)
- `PAUSED` + play → `PLAYING` (resume clock)
- `PAUSED` + nav_to(i) → `SECTION_TRANSITION` (jump, remain paused after)
- `PAUSED` + close → `IDLE`
- `SECTION_TRANSITION` + done → `PLAYING` (or `PAUSED` if was paused)
- `SECTION_TRANSITION` + close → `IDLE`
- `COMPLETE` + replay → `PLAYING` (reset to S0)
- `COMPLETE` + nav_to(i) → `SECTION_TRANSITION`
- `COMPLETE` + close → `IDLE`

**Key**: `resumeAfterTransition` flag preserves pause state across section jumps.

---

## Content Data Structure

```js
const SECTIONS = [{
  id: 'kickoff', label: 'Kickoff', command: '/jig:kickoff',
  duration: 10000, layout: 'single',
  tabs: ['✱ Claude Code: Jig ⌘1'],
  frames: [
    { t: 0,    type: 'line', html: '...', typing: true },
    { t: 800,  type: 'line', html: '...' },
    { t: 1000, type: 'break' },
    { t: 9500, type: 'cursor' },
  ]
}, /* ... 7 more */ ];
```

Frame types: `line` (with optional `typing: true`), `break`, `progress` (with `duration`), `split-line` (with `pane` index), `cursor`, `clear-pane`.

---

## Task 1: CSS foundation + play button + modal shell

**Files:**
- Modify: `docs/index.html`
- Create: `docs/walkthrough.js`

**Dependencies:** None

- [ ] **Step 1:** Add walkthrough CSS to `docs/index.html` before `</style>` — modal backdrop (z-index 1000, fixed fullscreen), modal container (z-index 1001, centered, max-width 960px), play button overlay, terminal chrome (`.wt-terminal`, `.wt-titlebar`, `.wt-dots`, `.wt-tabs`, `.wt-body`), text tokens (`.wt-prompt`, `.wt-cmd`, `.wt-label`, `.wt-value`, `.wt-success`, `.wt-muted`, `.wt-break`), nav bar, controls bar, fade transitions, responsive overrides.

- [ ] **Step 2:** Add play button HTML after the existing terminal's closing `</div>` (after line 1468), inside the `#walkthrough` section:
```html
<button class="wt-play-btn" aria-label="Play full pipeline walkthrough">
  <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  <span>Watch the full pipeline</span>
</button>
```

- [ ] **Step 3:** Add `<script src="walkthrough.js"></script>` before the existing `<script>` tag (before line 1673).

- [ ] **Step 4:** Create `docs/walkthrough.js` with IIFE scaffold containing: state machine constants, `transition()` function, `createModal()` (builds full DOM tree: backdrop → modal → nav bar → terminal → controls), `openModal()` (shows modal, locks scroll via `body.style.overflow = 'hidden'` + saved scrollY, hides `.toc-toggle` and `.toc-mobile`), `closeModal()` (reverses all), keyboard listener (Escape to close), play button click handler.

- [ ] **Step 5:** Verify — open `docs/index.html` in browser. Play button visible below the existing terminal. Clicking it opens a modal with empty terminal shell. Escape closes. Body scroll locked when open. ToC FAB hidden.

---

## Task 2: Animation engine + Kickoff section content

**Files:**
- Modify: `docs/walkthrough.js`

**Dependencies:** Task 1

- [ ] **Step 1:** Add the animation engine object to `walkthrough.js`: `clock` (virtual ms), `lastFrame` (real timestamp), `rafId`, `sectionIndex`, `frameIndex`, `paused`, `resumeAfterTransition`. Methods: `start()` (sets lastFrame, starts rAF loop), `stop()` (cancels rAF), `pause()`, `resume()`, `reset()` (resets clock/indices to 0), `tick(now)` (advances clock by delta, fires frames whose `t <= clock`, checks section end).

- [ ] **Step 2:** Add frame renderers: `renderFrame(frame)` dispatcher, `renderLine(frame)` (creates `<div class="wt-line">` with innerHTML, appends to `.wt-body pre`), `renderBreak()` (appends spacer div), `renderCursor()` (appends `<span class="wt-cursor">▌</span>` with blink animation).

- [ ] **Step 3:** Add Kickoff section content data:
```js
{ id: 'kickoff', label: 'Kickoff', command: '/jig:kickoff',
  duration: 10000, layout: 'single',
  tabs: ['✱ Claude Code: Jig ⌘1'],
  frames: [
    { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:kickoff</span>', typing: true },
    { t: 800, type: 'line', html: '<span class="wt-label">  ▸ Work type:</span> <span class="wt-value">feature</span>' },
    { t: 1100, type: 'line', html: '<span class="wt-label">  ▸ Summary:</span>  <span class="wt-value">Add commenting system to articles</span>' },
    { t: 1400, type: 'line', html: '<span class="wt-label">  ▸ Stack:</span>    <span class="wt-muted">GraphQL API · Postgres · React · Design System</span>' },
    { t: 1800, type: 'line', html: '<span class="wt-label">  ▸ Pipeline:</span> <span class="wt-muted">discover → brainstorm → prd → plan → build → review → ship → learn</span>' },
    { t: 2400, type: 'line', html: '<span class="wt-label">  ▸ Branch:</span>   <span class="wt-value">eng/comments-42-article-commenting</span>' },
    { t: 2800, type: 'line', html: '<span class="wt-label">  ▸ Ticket:</span>   <span class="wt-success">COMMENTS-42 created ✓</span>' },
    { t: 3200, type: 'cursor' },
  ]
}
```

- [ ] **Step 4:** Wire `transition('play')` to call `engine.start()`. Wire `transition('close')` to call `engine.stop()` + `engine.reset()` + `closeModal()`.

- [ ] **Step 5:** Verify — click play. Kickoff section lines appear sequentially over ~3s. Lines use correct colors (indigo commands, gray labels, light values, green success). Cursor blinks at end.

---

## Task 3: Typing effect + section transitions

**Files:**
- Modify: `docs/walkthrough.js`
- Modify: `docs/index.html` (CSS for typing)

**Dependencies:** Task 2

- [ ] **Step 1:** Add typing animation CSS to index.html:
```css
.wt-char { opacity: 0; transition: opacity 0.02s; }
.wt-char.visible { opacity: 1; }
.wt-typing-cursor { animation: wt-blink 1s step-end infinite; }
@keyframes wt-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
```

- [ ] **Step 2:** Implement typing in `renderLine()`: when `frame.typing === true`, extract the command text from the HTML, wrap each character in `<span class="wt-char">`, store the element reference and metadata (`typingStart`, `charCount`, `typingDuration: 600`). In `tick()`, after advancing the clock, process active typing elements: `revealedChars = Math.floor((clock - typingStart) / typingDuration * charCount)`, set `opacity: 1` on chars up to that index.

- [ ] **Step 3:** Implement section transitions: when the engine detects section end (`frameIndex >= frames.length && clock >= duration`), fire `transition('section_end')`. In the transition handler: add CSS class `.wt-fade-out` to `.wt-body` (opacity 0, 200ms transition), after 200ms timeout: clear body, increment `sectionIndex`, reset `clock` and `frameIndex` to 0, update nav + tabs, remove `.wt-fade-out`, add `.wt-fade-in` class (opacity 1, 200ms), after 200ms fire `transition('transition_done')`. On `transition_done`: if `resumeAfterTransition`, call `engine.start()`; else remain in `PAUSED`.

- [ ] **Step 4:** Add fade transition CSS:
```css
.wt-body { transition: opacity 0.2s ease; }
.wt-body.wt-fade-out { opacity: 0; }
```

- [ ] **Step 5:** Verify — Kickoff `$ /jig:kickoff` types character by character over ~600ms with a blinking cursor during typing. After the Kickoff section duration, the body fades out, clears, and fades back in (ready for next section content, which doesn't exist yet — just verify the transition fires).

---

## Task 4: Full content data (sections 2-8)

**Files:**
- Modify: `docs/walkthrough.js`

**Dependencies:** Task 3

- [ ] **Step 1:** Add Brainstorm section (S2, ~15s): `/jig:brainstorm` → design questions, 3 approaches (threaded comments, linear comments, inline annotations), concerns checklist (security, error-handling, test-strategy), design approval.

- [ ] **Step 2:** Add PRD section (S3, ~12s): `/jig:prd` → tier selection, acceptance criteria with layer tags `[API]`, `[DATA]`, `[LOGIC]`, `[UI]`, approval.

- [ ] **Step 3:** Add Plan section (S4, ~12s): `/jig:plan` → strategy (parallel, 5 tasks, 3 agents), task list with file paths and dependencies, approval.

- [ ] **Step 4:** Add Execute section (S5, ~25s, `layout: 'split'`): `/jig:build` → strategy, agent dispatch. Uses `split-line` frame types targeting panes 0-3. Team lead orchestrates in pane 0. Frontend agent (pane 1), backend agent (pane 2), test writer (pane 3) work in parallel with TDD cycles and progress bars. Spec compliance + code quality gates at end.

- [ ] **Step 5:** Add Review section (S6, ~15s): `/jig:review` → dispatch 7 specialists (security, dead-code, error-handling, async-safety, performance, test-coverage), logic reviewer tracing data flow, confidence score 92%.

- [ ] **Step 6:** Add Ship section (S7, ~15s): `/jig:pr-create` → PR creation with commit summary. Review feedback from `@sarah`. `/jig:pr-respond` → analyze, implement skeleton, commit, push, reply, resolve. PR approved + merged.

- [ ] **Step 7:** Add Learn section (S8, ~10s): `/jig:postmortem` → patterns found (loading states gap, defense-in-depth gap), skill updates, loop closed.

- [ ] **Step 8:** Add `renderProgress(frame)` function: creates `<div class="wt-progress"><div class="wt-progress-fill"></div></div>`, triggers CSS width animation over `frame.duration` ms.

- [ ] **Step 9:** Add progress bar CSS to index.html:
```css
.wt-progress { display: inline-block; width: 72px; height: 8px; background: rgba(99,102,241,.12); border-radius: 2px; overflow: hidden; vertical-align: middle; margin: 0 0.4rem; }
.wt-progress-fill { display: block; height: 100%; width: 0; background: var(--accent); opacity: .6; border-radius: 2px; transition: width var(--wt-progress-dur, 2s) cubic-bezier(.25,.1,.25,1); }
.wt-progress-fill.active { width: 100%; }
```

- [ ] **Step 10:** Verify — full walkthrough plays through all 8 sections (~2 minutes). Each section shows correct content. Transitions fade between sections. Progress bars animate. Nav bar updates current section. Execute section still renders single-pane (split-pane in Task 6).

---

## Task 5: Play/pause, progress indicator, keyboard controls

**Files:**
- Modify: `docs/walkthrough.js`
- Modify: `docs/index.html` (CSS for controls)

**Dependencies:** Task 4

- [ ] **Step 1:** Add controls bar to modal DOM (built in `createModal()`): play/pause toggle button (SVG icons), overall progress bar, section label text ("3 / 8 — PRD").

- [ ] **Step 2:** Implement `engine.pause()` (sets `paused = true`) and `engine.resume()` (sets `paused = false`, resets `lastFrame = performance.now()`). In `tick()`, when paused, re-request rAF but don't advance clock.

- [ ] **Step 3:** Wire Space key to `transition(state === 'PLAYING' ? 'pause' : 'play')`. Wire ArrowRight to `transition('nav_to', sectionIndex + 1)` (clamped). Wire ArrowLeft to `transition('nav_to', sectionIndex - 1)` (clamped).

- [ ] **Step 4:** Add `updateControls()` function called in `tick()`: updates progress bar width as `(totalElapsed / totalDuration) * 100%`, updates section label text, toggles play/pause icon.

- [ ] **Step 5:** Add replay button: shown in controls bar when state is `COMPLETE`. Click fires `transition('replay')` which calls `engine.reset()` + `engine.start()`.

- [ ] **Step 6:** Add controls CSS:
```css
.wt-controls { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; border-top: 1px solid rgba(99,102,241,.1); }
.wt-ctrl-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.25rem; border-radius: 4px; }
.wt-ctrl-btn:hover { color: var(--text-primary); background: rgba(255,255,255,.06); }
.wt-overall-progress { flex: 1; height: 3px; background: rgba(99,102,241,.12); border-radius: 2px; overflow: hidden; }
.wt-overall-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.1s linear; }
.wt-section-label { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-tertiary); white-space: nowrap; }
```

- [ ] **Step 7:** Verify — Space pauses/resumes. Arrow keys jump sections. Progress bar advances smoothly. Section label updates. Replay works after completion.

---

## Task 6: Execute section split-pane layout

**Files:**
- Modify: `docs/walkthrough.js`
- Modify: `docs/index.html` (CSS for split-pane)

**Dependencies:** Task 5

- [ ] **Step 1:** Implement `switchLayout(layout)`: when `layout === 'split'`, replace `.wt-body` inner HTML with grid structure: left `.wt-pane.wt-pane-lead` (50%) and right `.wt-pane-right` (50%, containing 3 stacked `.wt-pane.wt-pane-agent`). Each pane has a header label and its own `<pre>` for content. When `layout === 'single'`, revert to standard single `<pre>`.

- [ ] **Step 2:** Implement `renderSplitLine(frame)`: look up pane by `frame.pane` index (0=lead, 1=frontend, 2=backend, 3=test-writer), append line to that pane's `<pre>`, auto-scroll pane to bottom.

- [ ] **Step 3:** Update terminal tabs during Execute section to show split-pane indicators: `['✱ Team Lead ⌘1', '→ frontend ⌘2', '→ backend ⌘3', '→ tests ⌘4']`.

- [ ] **Step 4:** Wire section transitions: entering Execute section (sectionIndex 4) calls `switchLayout('split')`. Leaving Execute calls `switchLayout('single')`. Nav jumps out of Execute also call `switchLayout('single')`.

- [ ] **Step 5:** Add split-pane CSS:
```css
.wt-body.wt-split { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(99,102,241,.08); padding: 0; }
.wt-pane { background: rgba(0,0,0,.5); padding: 0.75rem; overflow-y: auto; max-height: 400px; }
.wt-pane pre { font-family: var(--font-mono); font-size: 0.7rem; line-height: 1.7; color: var(--text-tertiary); margin: 0; white-space: pre-wrap; }
.wt-pane-right { display: grid; grid-template-rows: 1fr 1fr 1fr; gap: 1px; }
.wt-pane-header { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-tertiary); padding-bottom: 0.5rem; border-bottom: 1px solid rgba(99,102,241,.08); margin-bottom: 0.5rem; }
@media (max-width: 768px) {
  .wt-body.wt-split { grid-template-columns: 1fr; }
  .wt-pane-right { grid-template-rows: auto; }
}
```

- [ ] **Step 6:** Verify — Execute section shows 4-pane tmux layout. Team lead commands appear left. Three agents show parallel work right. Progress bars animate independently per agent. Leaving Execute reverts to single pane. Mobile view stacks panes vertically.

---

## Task 7: Nav bar interactivity + deep links + integration

**Files:**
- Modify: `docs/walkthrough.js`
- Modify: `docs/index.html`

**Dependencies:** Task 6

- [ ] **Step 1:** Wire nav bar click handlers: each `.wt-nav-item` calls `handleNavClick(i)`. Function checks `if (i === engine.sectionIndex) return`, sets `resumeAfterTransition = (state === 'PLAYING')`, fires `transition('nav_to', i)`.

- [ ] **Step 2:** Add `engine.jumpTo(sectionIdx)`: sets `sectionIndex = sectionIdx`, resets `clock = 0`, `frameIndex = 0`, clears terminal body, calls `switchLayout(SECTIONS[sectionIdx].layout)`, calls `updateTabs()` and `updateNav()`.

- [ ] **Step 3:** Style nav items: completed sections show checkmark + dimmed text. Active section has accent underline. Future sections are clickable but dimmed.
```css
.wt-nav { display: flex; gap: 2px; padding: 0.5rem 0.75rem; overflow-x: auto; }
.wt-nav-item { font-family: var(--font-mono); font-size: 0.6rem; padding: 0.35rem 0.65rem; border-radius: 4px; color: var(--text-tertiary); cursor: pointer; white-space: nowrap; border: none; background: none; transition: color 0.2s, background 0.2s; }
.wt-nav-item:hover { color: var(--text-secondary); background: rgba(255,255,255,.04); }
.wt-nav-item.active { color: var(--accent); background: rgba(99,102,241,.1); }
.wt-nav-item.completed { color: var(--text-tertiary); }
.wt-nav-item.completed::before { content: '✓ '; color: #4ade80; }
```

- [ ] **Step 4:** Add `?walkthrough` query param detection: on DOMContentLoaded, if `location.search.includes('walkthrough')`, auto-open modal after 500ms delay.

- [ ] **Step 5:** Fix `terminalObs` selector on line 1804 of index.html: change to `.terminal:not(.wt-terminal)`.

- [ ] **Step 6:** Add backdrop click-to-close: on `#wt-backdrop` click, check `e.target === backdrop` (not a child), then `transition('close')`.

- [ ] **Step 7:** Verify — clicking nav items jumps to sections correctly. Jumping from Paused stays paused. Completed sections show checkmarks. `?walkthrough` auto-opens modal. `terminalObs` fix doesn't affect existing terminal animation. Backdrop click closes.

---

## Task 8: Accessibility + polish + edge cases

**Files:**
- Modify: `docs/walkthrough.js`
- Modify: `docs/index.html` (CSS)

**Dependencies:** Task 7

- [ ] **Step 1:** Add ARIA: `role="dialog"` + `aria-modal="true"` + `aria-label="Jig pipeline walkthrough"` on modal. `role="tablist"` on nav, `role="tab"` + `aria-selected` on nav items. `aria-live="polite"` on terminal body.

- [ ] **Step 2:** Focus management: on modal open, focus the pause/play button. On close, return focus to `.wt-play-btn`. Simple focus trap: on Tab at last focusable element, wrap to first; on Shift+Tab at first, wrap to last.

- [ ] **Step 3:** `prefers-reduced-motion`: check `window.matchMedia('(prefers-reduced-motion: reduce)')`. If true: skip typing animation (reveal all chars instantly), reduce section transition to 50ms, disable progress bar animation (instant fill), set line reveal to instant opacity.

- [ ] **Step 4:** Edge cases: debounce nav clicks during `SECTION_TRANSITION` state (ignore clicks until transition_done). Handle window blur/focus (pause on blur if playing, resume on focus). Prevent double-click on play button.

- [ ] **Step 5:** Play button polish CSS: centered over existing terminal, semi-transparent backdrop, play icon with indigo glow, hover scale + glow intensify, focus-visible outline.
```css
.wt-play-btn { position: relative; display: flex; align-items: center; gap: 0.75rem; margin: 1.5rem auto 0; padding: 0.75rem 1.5rem; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.2); border-radius: 8px; color: var(--accent); font-family: var(--font-mono); font-size: 0.8rem; cursor: pointer; transition: all 0.3s ease; }
.wt-play-btn:hover { background: rgba(99,102,241,.18); border-color: rgba(99,102,241,.35); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,.15); }
.wt-play-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.wt-play-btn svg { width: 18px; height: 18px; }
```

- [ ] **Step 6:** Modal responsive polish: at 768px go full-width with 1rem padding, at 480px reduce nav to abbreviated labels, reduce font sizes.

- [ ] **Step 7:** Verify full end-to-end: open modal, watch entire 2-minute walkthrough, verify all 8 sections play correctly including split-pane Execute, section transitions are smooth, nav works, pause/resume works, replay works. Test with `prefers-reduced-motion` enabled (no typing animation, instant transitions). Test keyboard-only navigation (Tab through controls, Space to play/pause, Arrow keys, Escape). Test mobile viewport (responsive layout, stacked panes). Open/close 10 times rapidly — no console errors.

---

## Verification Plan

1. **Visual inspection**: Open `docs/index.html` in browser, verify play button appearance
2. **Full playthrough**: Click play, watch all 8 sections (~2 min), verify content and timing
3. **Controls**: Space to pause/resume, Arrow keys to navigate, Escape to close
4. **Split-pane**: Execute section shows tmux layout, agents work in parallel
5. **Section nav**: Click nav items, verify jump behavior from Playing and Paused states
6. **Replay**: After completion, verify replay resets and plays from beginning
7. **Deep link**: Add `?walkthrough` to URL, verify auto-open
8. **Accessibility**: Tab through modal, verify focus trap. Enable reduced motion, verify simplified animations
9. **Responsive**: Test at 768px and 480px breakpoints
10. **Integration**: Verify existing terminal scroll animation still works after changes
