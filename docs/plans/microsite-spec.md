# PRD: Jig Framework Microsite

**Date:** 2026-03-30
**Author:** Dustin (with Claude)
**Status:** Draft
**Type:** Feature

---

## Problem Statement

Jig is a full-lifecycle AI engineering workflow framework, but it has no
public-facing site to explain what it is, why it matters, or how to get
started. Engineers discovering Jig have only the GitHub README — functional
but not compelling. The framework needs a dedicated microsite that sells the
vision, tells the origin story, and gets teams started in under a minute.

## Target Audience

- **Primary:** Engineering leads and senior engineers evaluating AI workflow
  tools for their team. They've used AI coding assistants but lack a shared
  framework. They know what a PRD is.
- **Secondary:** Individual engineers who've heard about Jig and want to
  understand what it does before installing.
- **Already-sold:** Engineers who just need the install snippet — they should
  find it in under 5 seconds.

## Solution

A static one-pager microsite published to GitHub Pages. Pure HTML/CSS/JS,
zero build step, single `index.html`. Dark mode design inspired by
work.dustindiaz.com — restrained, typographic, modern.

## Content Sections

### 1. Hero
- [UI] Typographic "Jig" wordmark — large, bold, with accent color treatment
- [CONTENT] One-line tagline: "The AI engineering workflow framework for teams"
- [CONTENT] Manufacturing jig metaphor in 2 sentences — what a jig does
  physically, what this framework does for AI workflows
- [UI] Gradient divider below hero

### 2. Quick Install
- [CONTENT] settings.json snippet for Claude Code plugin install
- [CONTENT] One-line instruction: "Add to .claude/settings.json"
- [UI] Styled code block with dark inner background and accent border/glow
- [UI] Positioned immediately after hero for fast access

### 3. The Problem
- [CONTENT] 2-3 paragraphs on the chaos without a framework:
  scattered skills, inconsistent workflows, no shared conventions
- [CONTENT] The opinionated framework insight — what frameworks do for teams
  at scale (onboarding speed, consistency, shared conventions)
- [CONTENT] Must NOT name Rails directly. Describe the principle, let readers
  connect the dots.

### 4. The Pipeline
- [UI] 7-stage horizontal flow: DISCOVER → BRAINSTORM → PLAN → EXECUTE →
  REVIEW → SHIP → LEARN
- [UI] Each stage as a styled pill/badge with connectors
- [CONTENT] One sentence: "Every stage has a skill. Every handoff has a
  quality gate."
- [CONTENT] Brief note that work type determines which stages run
- [UI] Responsive: wraps or stacks on mobile

### 5. Core Skills
- [CONTENT] 16 skills grouped by pipeline stage with one-line descriptions
- [UI] Stage name as small heading, skills listed compactly beneath
- [CONTENT] Mention 5 review specialists and engineering starter pack
- [UI] Skill names in monospace with accent color

### 6. How It Works
- [CONTENT] Three steps: Install → Configure → Extend
- [CONTENT] Install: add to settings.json, whole team gets it
- [CONTENT] Configure: jig.config.md tunes pipeline, concerns checklist
- [CONTENT] Extend: domain skills, specialists, agents — auto-discovered
- [UI] Clear visual hierarchy for the three steps

### 7. Origin Story
- [CONTENT] Narrative about Duro's Phoenix project — 31 skills, 6 agents,
  10 specialists evolved from real usage
- [CONTENT] Hardware startup connection — "born from a company that knows
  what jigs do"
- [CONTENT] Homage to Duro engineering team — warm but brief
- [CONTENT] "They wanted to share what they'd built. So they frameworkized it."
- [UI] Link to durolabs.co

### 8. Walkthrough
- [UI] Terminal mockup — dark background, monospace, realistic styling
- [CONTENT] Condensed workflow showing: kickoff → brainstorm → PRD →
  build (parallel agents) → review (specialist swarm)
- [CONTENT] Concrete scenario: "Add user notification preferences"
- [UI] Success/pass markers, progress indicators, confidence score
- [CONTENT] One line above: "A feature, from idea to shipped"

### 9. Get Started + Footer
- [CONTENT] Two install paths: project settings (recommended) + CLI
- [CONTENT] "Type /jig:kickoff to start your first task"
- [CONTENT] GitHub repo link
- [UI] Minimal footer: MIT license, GitHub link

## Design Requirements

### Visual System
- [UI] Background: near-black (`#08080d`) with subtle dot grid
  (`radial-gradient`, ~1.5% white opacity, 32px spacing)
- [UI] Accent: blue-violet/indigo — shift from resume's `#8b5cf6` toward
  `~#6366f1`. Single hue at multiple opacities for bullets, borders, tags,
  links, glows.
- [UI] Text hierarchy: 4-5 color levels from off-white to dark gray-purple
- [UI] Gradient dividers between sections — fade from accent/white to
  transparent heading right
- [UI] Custom selection styling with accent color

### Typography
- [UI] Inter (Google Fonts, weights 300-800) for all body/display text
- [UI] SF Mono / Fira Code / monospace for code blocks, section labels,
  skill names, terminal mockup
- [UI] Fluid sizing via `clamp()` for wordmark and key headings
- [UI] Section labels: monospace, uppercase, wide letter-spacing, accent color
- [UI] Antialiased font rendering (`-webkit-font-smoothing: antialiased`)

### Layout
- [UI] Single column, max-width ~960px, centered
- [UI] Generous vertical padding per section (5-6rem)
- [UI] Responsive breakpoints at 768px and 480px
- [UI] Code blocks horizontally scrollable on mobile

### Animation
- [INTERACTION] Scroll-triggered fade-in: elements start at opacity 0 +
  translateY(20px), animate to visible on intersection
- [INTERACTION] Duration 0.7s, refined cubic-bezier easing
- [INTERACTION] Intersection Observer with negative root margin (~-60px)
- [INTERACTION] Staggered delays within sections for sequential reveal
- [INTERACTION] Hover effects on links (color + border transition, 0.3s)

## Technical Requirements

- [DEPLOY] Single `index.html` file — all CSS and JS inline
- [DEPLOY] Zero build step, zero npm dependencies
- [DEPLOY] Hosted on GitHub Pages from the repository
- [DEPLOY] Proper meta tags: viewport, description, OG tags, theme-color
- [UI] Font loading with `font-display: swap` to prevent layout shift
- [UI] No external CSS/JS dependencies beyond Google Fonts

## Non-Requirements

- No multi-page navigation or routing
- No JavaScript framework (React, Vue, etc.)
- No dark/light mode toggle — dark mode only
- No analytics or tracking (can add later)
- No contact form or interactive elements beyond scroll animations
- No build tooling (webpack, vite, etc.)

---

## Acceptance Criteria

### Hero + Quick Install
- [ ] [UI] Page loads with near-black background and visible dot grid texture
- [ ] [UI] "Jig" wordmark is the dominant visual element, weight 800, accent treatment
- [ ] [CONTENT] Tagline reads: "The AI engineering workflow framework for teams" (or approved variant)
- [ ] [CONTENT] Manufacturing metaphor is present, ≤3 lines
- [ ] [UI] Install code block appears within first viewport scroll
- [ ] [UI] Code block has dark inner bg, accent border/glow, monospace font
- [ ] [CONTENT] Install snippet is valid, copy-pasteable settings.json

### The Problem
- [ ] [CONTENT] Describes the chaos of AI development without shared framework
- [ ] [CONTENT] Conveys the opinionated framework insight without naming Rails
- [ ] [CONTENT] Copy is ≤3 paragraphs, no bullet lists, flowing prose

### The Pipeline
- [ ] [UI] All 7 stages visible in a horizontal flow with connectors
- [ ] [UI] Stages are styled as pills/badges, monospace text
- [ ] [UI] Pipeline wraps or stacks gracefully at 480px viewport
- [ ] [CONTENT] "Every stage has a skill" line is present

### Core Skills
- [ ] [CONTENT] All 16 core skills are listed with one-line descriptions
- [ ] [CONTENT] Skills are grouped by pipeline stage
- [ ] [UI] Skill names are monospace with accent color
- [ ] [CONTENT] Review specialists and engineering pack are mentioned

### How It Works
- [ ] [CONTENT] Three clear steps: Install, Configure, Extend
- [ ] [CONTENT] Each step has 2-3 sentences of explanation
- [ ] [CONTENT] jig.config.md and /jig:extend are mentioned

### Origin Story
- [ ] [CONTENT] Duro and Phoenix project are named
- [ ] [CONTENT] Numbers are cited: 31 skills, 6 agents, 10 specialists
- [ ] [CONTENT] Hardware/manufacturing connection is made
- [ ] [CONTENT] Tone is warm and authentic, not corporate
- [ ] [UI] durolabs.co link is present and functional

### Walkthrough
- [ ] [UI] Terminal mockup has realistic styling (dark bg, monospace, glow)
- [ ] [CONTENT] Shows kickoff → brainstorm → PRD → build → review flow
- [ ] [CONTENT] Build step shows parallel agent execution
- [ ] [CONTENT] Review step shows specialist dispatch with confidence score
- [ ] [UI] Success markers are visually distinct (green or accent)

### Get Started + Footer
- [ ] [CONTENT] Two install paths are shown (settings.json + CLI)
- [ ] [CONTENT] /jig:kickoff call-to-action is present
- [ ] [UI] GitHub repo link is present and functional
- [ ] [UI] Footer is minimal — MIT license + link

### Design System
- [ ] [UI] Inter font loads correctly (weights 300-800)
- [ ] [UI] Monospace font used for all code/technical elements
- [ ] [UI] Accent color is blue-violet/indigo (distinct from resume violet)
- [ ] [UI] Text hierarchy has ≥4 distinct color levels
- [ ] [UI] Gradient dividers appear between major sections

### Animation + Interaction
- [ ] [INTERACTION] All content sections fade in on scroll
- [ ] [INTERACTION] Animation is smooth (0.7s, no jank)
- [ ] [INTERACTION] Elements above the fold are visible without scroll trigger
- [ ] [INTERACTION] Link hover states transition smoothly

### Responsive + Technical
- [ ] [UI] Layout is usable at 768px (tablet)
- [ ] [UI] Layout is usable at 480px (mobile)
- [ ] [UI] Code blocks scroll horizontally on narrow viewports
- [ ] [DEPLOY] Page is a single index.html with inline CSS/JS
- [ ] [DEPLOY] No external dependencies beyond Google Fonts CDN
- [ ] [DEPLOY] Valid HTML5, proper meta tags
