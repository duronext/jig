---
name: pr-create
description: >
  Use when creating a pull request. Analyzes branch changes, writes a clear
  PR description with friendly tone, and generates a structured test plan.
  Triggered by "create a PR", "open a pull request", or /pr-create.
tier: workflow
alwaysApply: false
---

# PR Creator

**PURPOSE**: Create pull requests with clear, well-written descriptions that tell reviewers exactly what changed and how to verify it.

**CONFIGURATION**: Reads `jig.config.md` for `git-host`, `ticket-system`, `ticket-prefix`, `branching.format`, `require-ticket-reference`, and `main-branch`.

**GIT HOST**: Commands in this skill use GitHub (`gh`) as the default. If `git-host` in `jig.config.md` is not `github`, read `framework/GIT_HOST.md` for the platform-specific command equivalents.

---

## When to Use

- "Create a PR", "open a pull request", "/pr-create"
- `kickoff` routes here during the SHIP stage
- `finish` Option 2 (Push and Create PR)

**Do NOT use when:** You need to respond to existing PR comments. Use `pr-respond` instead.

---

## Workflow

```
Run review (code review swarm)
  |
  +-- blocking/major issues? --> Fix issues first, re-run
  |
  +-- clean/minor --> Gather context
                        |
                        Detect ticket from branch
                        |
                        Analyze ALL commits
                        |
                        Group changes by theme
                        |
                        Determine test plan items
                        |
                        Write PR body
                        |
                        Push + create PR
```

### Step 0a: Check for premortem-triggering risk signals

Before running the code review swarm, scan the diff for signals that suggest a premortem would be valuable.

Run:
```bash
git diff origin/{main-branch}...HEAD --name-only
git diff origin/{main-branch}...HEAD --stat
```

Read `premortem-detectors` and `premortem-critical-paths` from `jig.config.md`.

For each detector class, check if any changed path matches. The detectors are:

**Backend** (path globs):
- `migrations`: `**/migrations/**`, `**/*schema*`, `**/*.sql`, `**/models/**`, `**/entities/**`, `**/prisma/**`
- `api-routes`: `**/api/**`, `**/routes/**`, `**/handlers/**`, `**/*openapi*`, `**/*.proto`, `**/graphql/**`
- `cross-service-deps`: `package.json`, `go.mod`, `Cargo.toml`, `requirements*.txt`, `pyproject.toml`
- `large-diff`: total LOC changes exceed `premortem-detectors.thresholds.large-diff-loc` (default 500)

**Frontend** (path globs):
- `routing`: `**/pages/**`, `**/app/**`, `**/routes/**`, `**/middleware.{ts,js}`
- `layouts`: `**/layout*`, `**/_app.*`, `**/providers/**`, `**/{App,Root}.{tsx,jsx}`
- `auth-ui`: `**/{auth,login,signup,session,oauth}*`
- `money-ui`: `**/{checkout,billing,subscription,payment,pricing,cart}*`
- `build-config`: `**/next.config.*`, `**/vite.config.*`, `**/webpack.config.*`, `**/turbo.json`, `**/tsconfig*.json`
- `flags`: `**/feature*flag*`, `**/{flags,experiments}/**`, `**/growthbook*`, `**/launchdarkly*`, `**/statsig*`
- `i18n`: `**/i18n/**`, `**/locales/**`, `**/messages/**`
- `service-workers`: `**/sw.{ts,js}`, `**/service-worker.*`, `**/workbox*`
- `csp`: `**/{csp,headers,next.config}*`
- `public-copy`: `**/{terms,privacy,legal}*`, `**/pricing/**`
- `a11y-primitives`: `**/components/**/{modal,dialog,menu,combobox,select,form}*`

**Content-based** (grep the diff):
- `third-party-scripts`: diff lines add `<script src=` or `from "next/script"`
- `new-fetch-origin`: diff adds `fetch(` or `axios(` with a URL not previously seen
- `new-storage`: diff adds `localStorage`, `sessionStorage`, or `IndexedDB` in a file that didn't have them
- `bundle-size`: a new dependency in `package.json` exceeds `premortem-detectors.thresholds.bundle-size-kb` (default 50)
- `error-boundaries`: any file matching `**/{error,ErrorBoundary}*` changed

**Critical paths** (team-configured): match against any glob in `premortem-critical-paths`.

If **any** detector fires, prompt the author:

```
This change touches: {comma-separated detector names that fired}.
Premortem is recommended for this kind of change. Run /jig:premortem before opening the PR?
[Y/n]
```

- If the author accepts: invoke the `premortem` skill, wait for completion, then continue to Step 0 (review).
- If the author declines: log the skipped detectors as a one-line note for the PR description, then continue to Step 0.

If a premortem file exists at `docs/premortems/*-{branch}-premortem.md`, skip the prompt entirely — premortem already happened.

### Step 0: Run the code review swarm

**Before writing the PR, run `review` to catch issues while they are cheap to fix.**

The swarm dispatches parallel specialist agents and produces a confidence score. If blocking or major issues are found, fix them first -- do not create a PR that reviewers will flag.

- **Score 8+**: Proceed to Step 1.
- **Score 5-7**: Review the major findings. Fix what is real, acknowledge what is intentional, then proceed.
- **Score 4 or below**: Blocking issues found. Fix them before creating the PR.

If the swarm was already run earlier in the session (e.g., during `team-dev` quality gates), you can skip re-running it -- just confirm no new changes were made since the last review.

### Step 1: Gather context

Run these in parallel:

```bash
# Current state
git status

# All commits since divergence from base branch
git log {main-branch}..HEAD --oneline

# Full diff against base
git diff {main-branch}...HEAD --stat

# Check remote tracking
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

Read `main-branch` from `jig.config.md` (default: `main`).

### Step 2: Detect ticket reference

Check the branch name for a ticket reference. Read `jig.config.md` for:
- `ticket-system` -- which system (GitHub Issues, Linear, Jira, etc.)
- `ticket-prefix` -- the prefix pattern to look for (e.g., `ENG`, `PROJ`, `GH`)
- `branching.format` -- to understand where the ticket number appears in the branch name

**Examples of ticket detection by system:**

| System | Branch Pattern | PR Reference |
|--------|---------------|--------------|
| GitHub Issues | `user/gh-42-fix-login` | `Fixes #42` |
| Linear | `user/eng-1234-add-export` | `Fixes ENG-1234` |
| Jira | `user/proj-567-update-api` | `Fixes PROJ-567` |

If `require-ticket-reference` is `true` in `jig.config.md` and no ticket is detected, warn the user before proceeding.

### Step 3: Analyze changes

Read through ALL commits -- not just the latest. Group them by theme:
- What is the headline change?
- What supporting changes were made?
- Were there any test, translation, or config changes?

**Analyze every commit.** A PR with 12 commits needs all 12 examined. Do not summarize based on the latest commit alone.

### Step 4: Determine test plan

Select the appropriate checkboxes based on what changed:

| Change type | Test plan items |
|-------------|----------------|
| UI components, styling, layout | Manual verification, Screenshots |
| Business logic, API, data flow | Automated tests, Manual verification |
| New API endpoints/queries/mutations | Automated tests, Manual verification |
| Translation keys only | Automated tests |
| Docs, typos, comments only | No testing required |
| Database migrations | Automated tests, Manual verification |
| Config, CI, build changes | Automated tests |

Add **context-specific items** when applicable:
- `Tested in dark mode / light mode` (for theme-sensitive UI)
- `Verified responsive behavior` (for layout changes)
- `Tested with empty state / loaded state` (for data-dependent views)
- `Verified backward compatibility` (for API changes)
- `Tested error states` (for error handling changes)

### Step 5: Write the PR

**Title**: Follow the project's commit convention from `jig.config.md` (e.g., `type(scope): description`), under 70 chars.

**Body**: Use this structure:

```markdown
## Summary

{2-4 sentences. What changed and why -- in plain language. This is the part
reviewers read first, so make it count. If there is a ticket, mention what
it asked for and how this addresses it.}

## Changes

- **{Theme}**: {What changed}. {Brief why if non-obvious.}
- **{Theme}**: {What changed}.
- **{Theme}**: {What changed}.

## Test plan

- [ ] Automated tests (Unit/Integration) passed
- [ ] Manual verification (Screenshots attached if UI)
- [ ] No testing required (Docs/Typos only)

{Context-specific items from Step 4, if any}

Fixes {TICKET-REFERENCE}
```

**If a premortem file exists for this branch** (`docs/premortems/*-{branch}-premortem.md`):

1. Parse the file for the synthesis section's risks.
2. Extract any risk with a checked Accept/Mitigate/Instrument box.
3. Append a `## Premortem decisions` section to the PR body containing:
   - One bullet per decided risk: `**{title}**: {decision} — {rationale if provided}`
   - A link to the full premortem file: `Full premortem: docs/premortems/{filename}`

Do not include the full narratives — they're in the file. The PR body shows what the author *decided*.

### Step 6: Push and create

```bash
# Push with upstream tracking
git push -u origin HEAD

# Create PR with HEREDOC for body formatting
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
## Summary

...

## Changes

...

## Test plan

...

Fixes TICKET-REF
EOF
)"
```

Return the PR URL when done.

---

## Voice & Tone

Write like you are talking to a smart colleague. Not a press release, not a commit log.

- **Short paragraphs.** Often single sentences. Let the whitespace work.
- **Lead with what changed**, not how you got there. Reviewers care about the destination.
- **Be honest about scope.** A 3-file fix is a 3-file fix. Do not inflate it.
- **Em dashes for rhythm** -- parenthetical asides for color (when earned).
- **Zero corporate speak.** Banned: "enhances", "streamlines", "leverages", "improves the overall experience". If it sounds like a changelog generator wrote it, rewrite it.

### Good summary -- feature

> Adds webhook delivery for component update events. When a component is modified, the system publishes an event that the webhook service picks up and delivers to registered endpoints with exponential backoff retry.

### Good summary -- bug fix

> Fixes a race condition where the auth token could expire mid-request during long-running mutations. The refresh now happens preemptively when the token is within 30 seconds of expiry.

### Good summary -- redesign

> Redesigns the library dashboard with a two-column fixed+scroll layout. The left column pins quick actions in place while the right column scrolls through activity cards. Stat strip replaces the hero cards, charts are gone, and everything got the monotone treatment.

### Bad summary -- do not do this

> This PR enhances the dashboard experience by streamlining the layout and improving the overall visual hierarchy to provide a more intuitive user interface.

That tells the reviewer nothing. What actually changed? Which files? Why?

---

## Pre-Submit Checklist

- [ ] `review` run -- score 8+ (or blocking/major issues addressed)
- [ ] All CI checks pass locally (build, tests)
- [ ] PR description matches actual implementation
- [ ] Appropriate test coverage for the change type
- [ ] No merge conflicts with base branch
- [ ] Ticket referenced (per `jig.config.md` settings)

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Listing every commit as a bullet | Group by theme -- reviewers do not need your git log |
| "Updated files" with no context | Say *what* changed and *why* |
| Empty test plan | Always include checkboxes -- even "No testing required" is a choice |
| Title longer than 70 chars | Move details to the body |
| Corporate tone in summary | Read it out loud. Would you say this to a teammate? |
| Missing ticket reference | Check branch name for ticket pattern from `jig.config.md` |
| Hardcoding owner/repo | Extract from git remote -- never assume a specific repository |

---

## Integration

**Called by:**
- `kickoff` during the SHIP stage
- `finish` Option 2 (Push and Create PR)

**Related skills:**
- `review` -- run before creating the PR
- `pr-respond` -- for handling reviewer feedback after PR is created
- `postmortem` -- uses PR data for retrospectives
