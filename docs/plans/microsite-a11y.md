# Microsite Accessibility (WCAG 2.1 AA) — Implementation Plan

**Source:** [web-accessibility skill](https://skills.sh/supercent-io/skills-template/web-accessibility) audit against `docs/index.html` and `docs/10x-trap.html`
**Standard:** WCAG 2.1 Level AA
**Date:** 2026-03-31

---

## Context

The Jig microsite is a two-page static site (landing page + white paper). It's well-structured with semantic `<header>`, `<section>`, `<footer>` elements, proper `lang="en"`, and good color contrast ratios. But it's missing several WCAG 2.1 AA requirements: no `<main>` landmark, no skip link, no focus-visible styles, heading hierarchy uses `<p>` tags for section labels, decorative SVGs lack `aria-hidden`, and the terminal animation is invisible to screen readers.

All changes are CSS + HTML attribute additions. No JavaScript behavior changes. No visual regressions.

---

## Tasks

### Task 1 — Add skip-to-content link and focus-visible styles (both files)

**Files:** `docs/index.html`, `docs/10x-trap.html`
**Why:** Keyboard users currently have no way to skip past the hero/header to reach content. No focus indicators exist for any interactive elements — a WCAG Level A violation.

**Changes:**

CSS (add to both files' `<style>` blocks):
```css
/* ── Skip Link ─────────────────────────────────────────── */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  z-index: 100;
  padding: 0.75rem 1.25rem;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  border-radius: 4px;
  border-bottom: none;
  text-decoration: none;
}
.skip-link:focus {
  top: 1rem;
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── Focus Styles ──────────────────────────────────────── */
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}
```

HTML (add immediately after `<body>` in both files):
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

**Verify:** Tab into the page — skip link should appear on first focus, and pressing Enter should jump to main content. All links should show a visible outline on focus-visible.

---

### Task 2 — Add `<main>` landmark (both files)

**Files:** `docs/index.html`, `docs/10x-trap.html`
**Why:** Screen readers use landmarks to navigate. Without `<main>`, users can't jump to the primary content area. WCAG Level A requirement.

**Changes:**

`docs/index.html`:
- Add `<main id="main-content">` after the closing `</header>` tag (line ~915)
- Add `</main>` before the `<footer>` tag (before line ~1475)

`docs/10x-trap.html`:
- Add `<main id="main-content">` after the closing `</header>` (after the site-header `</div>`, line ~435)
- Add `</main>` before the `<footer>` tag (before line ~722)

**Verify:** Use browser accessibility inspector → landmarks should show `main` region.

---

### Task 3 — Fix heading hierarchy in index.html

**File:** `docs/index.html`
**Why:** Section labels use `<p class="section-label">` instead of heading elements. Screen readers and accessibility tools can't build a proper document outline. WCAG Level A.

**Changes:**

Replace all `<p class="section-label">` with `<h2 class="section-label">` (and closing `</h2>`). There are 7 instances:
- "The Problem"
- "The Pipeline"
- "Core Skills"
- "How It Works"
- "Origin"
- "See It In Action"
- "Get Started"

Also change these labels that use different classes but same pattern:
- `<p class="team-label">` → `<h2 class="team-label">`
- `<p class="install-label">` → `<h2 class="install-label">`

The existing CSS applies identically since these are class-based selectors, not element selectors. No visual change.

**Verify:** Run accessibility tree inspector — should show `h1: Jig` followed by `h2: The Problem`, `h2: The Pipeline`, etc.

---

### Task 4 — Add `aria-hidden="true"` to decorative icons (index.html)

**File:** `docs/index.html`
**Why:** Decorative SVG icons inside `.icon` spans have no text alternative and shouldn't be announced by screen readers. The adjacent text already serves as the label. WCAG Level A.

**Changes:**

Replace all occurrences of `<span class="icon"><svg` with `<span class="icon" aria-hidden="true"><svg`. This is a global find-and-replace across the file (~18 instances across skills cards, step titles, extras labels, and CTA links).

**Verify:** Screen reader should announce "Discover", "Brainstorm", etc. — not attempt to describe the SVG paths.

---

### Task 5 — Add `aria-hidden="true"` to decorative pipeline arrows and separators (index.html)

**File:** `docs/index.html`
**Why:** Pipeline arrow characters (`→`) and CTA separator spans (`/`) are visual decoration. Screen readers shouldn't announce "right arrow" seven times when reading the pipeline.

**Changes:**

Pipeline arrows — replace all occurrences of:
```html
<span class="pipeline-arrow">&rarr;</span>
```
with:
```html
<span class="pipeline-arrow" aria-hidden="true">&rarr;</span>
```
(6 instances)

CTA separators — add `aria-hidden="true"` to both separator `<span>` elements in the CTA links section (the ones with inline `color: var(--text-tertiary); opacity: .3`).

**Verify:** Screen reader should announce pipeline stages as a list of words without "right arrow" between each.

---

### Task 6 — Add `aria-hidden="true"` to terminal chrome (index.html)

**File:** `docs/index.html`
**Why:** Terminal window chrome (traffic light dots, tab labels) is purely decorative. The meaningful content is the terminal body text.

**Changes:**

Add `aria-hidden="true"` to the terminal titlebar:
```html
<div class="terminal-titlebar" aria-hidden="true">
```

Add `aria-label` to the terminal for context:
```html
<div class="terminal" aria-label="Terminal showing a Jig workflow from kickoff to review">
```

**Verify:** Screen reader should announce the terminal label, then read the command/output text — not "red dot, yellow dot, green dot, Claude Code Jig".

---

### Task 7 — Add `role="region"` and `aria-label` to skills scroll (index.html)

**File:** `docs/index.html`
**Why:** The horizontally-scrolling skills band is a distinct content region. Screen readers need a label to announce what the scrollable area contains.

**Changes:**

Update the skills scroll wrapper:
```html
<div class="skills-scroll-wrap" role="region" aria-label="Core skills by pipeline stage" tabindex="0">
```

Adding `tabindex="0"` makes the scrollable region keyboard-focusable so users can scroll it with arrow keys.

**Verify:** Tab to the skills region — it should receive focus and be scrollable with arrow keys. Screen reader should announce "Core skills by pipeline stage, region".

---

### Task 8 — Accessibility improvements to 10x-trap.html

**File:** `docs/10x-trap.html`
**Why:** The article page needs the same foundational a11y fixes plus one heading fix.

**Changes:**

1. The `<div class="sources-label">` should be `<h2 class="sources-label">` for heading hierarchy.

2. The back link `&larr; Jig` uses a visual arrow that screen readers will announce as "left arrow". Wrap the arrow in a span:
```html
<a href="./" class="back-link"><span aria-hidden="true">&larr;</span> Jig</a>
```

3. The stat grid conveys information through layout. Add `role="list"` to `.stat-grid` and `role="listitem"` to each `.stat-card` for screen reader structure.

**Verify:** Document outline shows proper h1 → h2 hierarchy. Back link reads as "Jig" not "left arrow Jig". Stats are announced as a structured list.

---

## Out of scope

- **`prefers-reduced-motion`**: The animations are subtle scroll-reveals. Could add `@media (prefers-reduced-motion: reduce)` to disable transitions, but this is a nice-to-have beyond the core WCAG AA pass.
- **Lighthouse 90+ audit**: Worth running after all fixes land, but not a task itself.
- **Screen reader end-to-end testing**: Manual testing should follow implementation but isn't a code task.

## Execution order

Tasks 1–2 are foundational (skip link, main landmark). Task 3 fixes structure. Tasks 4–7 are independent ARIA attribute additions on index.html. Task 8 covers 10x-trap.html. All tasks can be executed serially in order, or tasks 4–7 can be parallelized.

```
[1: skip link + focus] → [2: main landmark] → [3: headings]
                                                    ↓
                                        [4: icons] [5: arrows] [6: terminal] [7: scroll]
                                                    ↓
                                              [8: 10x-trap fixes]
```
