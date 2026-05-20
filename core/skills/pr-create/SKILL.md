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

**Configuration check (defensive):** If `premortem-detectors` is not present in `jig.config.md`, premortem detection is not configured for this project. Skip Step 0a entirely and proceed to Step 0 with a one-line note: `Premortem detectors: not configured (skipping)`. Do not prompt the author. Do not halt.

Run:
```bash
git diff origin/{main-branch}...HEAD --name-only
git diff origin/{main-branch}...HEAD --stat
```

Read `premortem-detectors` and `premortem-critical-paths` from `jig.config.md`. The config block looks like:

```yaml
premortem-detectors:
  backend: [migrations, api-routes, cross-service-deps]
  frontend: [routing, layouts, auth-ui, money-ui, ...]
  content: [new-fetch-origin, new-storage, ...]
  thresholds:
    large-diff-loc: 500
    bundle-size-kb: 50
```

The lists `backend`, `frontend`, and `content` are the **enabled-detector sets** for this project. Only detector class names present in those lists actually run. The canonical catalog below describes every detector Jig knows about; if a class is absent from the config list (e.g., a team removes `money-ui`), skip it. If a class is present in config but not in the catalog below, log `Unknown detector: {name}` and skip it.

For each **enabled** detector class, check if any changed path matches. The canonical detector catalog:

**Backend** (path globs):
- `migrations`: `**/migrations/**`, `**/*schema*`, `**/*.sql`, `**/models/**`, `**/entities/**`, `**/prisma/**`
- `api-routes`: `**/api/**`, `**/routes/**`, `**/handlers/**`, `**/*openapi*`, `**/*.proto`, `**/graphql/**`
- `cross-service-deps`: `package.json`, `go.mod`, `Cargo.toml`, `requirements*.txt`, `pyproject.toml`

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

**Visibility: log the detector result.** Always emit a one-line summary of
the Step 0a detector pass before deciding whether to prompt.

- **If one or more detectors fired:**
  `Premortem detectors fired: {comma-separated detector names}`
- **If zero detectors fired AND the diff exceeds `premortem-detectors.thresholds.large-diff-loc` (default 500 LOC):**
  `Premortem detectors: 0 fired ({N} LOC diff — exceeds large-diff-loc threshold; check if critical-path globs are still aligned with the repo's actual paths)`
- **If zero detectors fired AND the diff is below the threshold:** no line needed (the silence is correct).

Note: `large-diff-loc` is a *meta-trigger*, not a detector. It's only used
to decide whether to emit the "zero fired" warning. It does not fire on its
own and is not present in the `premortem-detectors.backend` list.

This makes absence-of-detection visible exactly when it might be wrong — a
large diff that nonetheless hits no detectors usually means a critical-path
glob has drifted out of sync with the repo's actual paths.

**Skip guard (check this BEFORE prompting).** Compute `{sanitized-branch}` using the canonical algorithm in `framework/BRANCH_SANITIZATION.md`. If `docs/premortems/*-{sanitized-branch}-premortem.md` returns one or more matches, premortem already happened for this branch — **skip the rest of Step 0a entirely** (no prompt, no detector-fires message). Proceed to Step 0.

If the lookup glob returns zero matches, emit a single visible log line:
`Premortem lookup: docs/premortems/*-{sanitized-branch}-premortem.md → NOT FOUND (no prior premortem for this branch; proceeding with detector checks)`.

In this Step 0a context, absence is the normal default — most branches won't have a premortem yet. The log is for visibility ("did the skip guard run?"), not an error signal. Contract-violation framing is reserved for sites where a premortem is *expected* to exist (Step 5 embedding, `postmortem` Step 2.5, `pr-respond` Step 2).

**Otherwise (no existing premortem file), if any detector fires, prompt the author:**

```
This change touches: {comma-separated detector names that fired}.
Premortem is recommended for this kind of change. Run /jig:premortem before opening the PR?
[Y/n]
```

- If the author accepts: invoke the `premortem` skill, wait for completion, then continue to Step 0 (review).
- If the author declines: log the skipped detectors as a one-line note for the PR description, then continue to Step 0.

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

**Look up the premortem file:** Compute `{sanitized-branch}` using the canonical algorithm in `framework/BRANCH_SANITIZATION.md`, then check `docs/premortems/*-{sanitized-branch}-premortem.md`. If the lookup glob returns zero matches, emit:
`Premortem lookup: docs/premortems/*-{sanitized-branch}-premortem.md → NOT FOUND`
and skip the rest of this premortem-embedding flow.

**Validate schema version:** Read the file's first line. It must match `<!-- premortem-schema: v1 -->`. If absent or a different major version, do not embed decisions; instead include in the PR description: "⚠️ Premortem file at `{path}` has incompatible schema version — skipping decision embedding. See `framework/PREMORTEM_FILE_FORMAT.md`."

**If the file exists and the schema is valid, embed decisions:**

1. Compute the file's content hash: `git_sha=$(git hash-object docs/premortems/{filename})` so the PR body can reference an immutable version.
2. Parse the file for the synthesis section's risks.
3. Extract any risk with a checked Accept/Mitigate/Instrument box.
4. Append a `## Premortem decisions` section to the PR body containing:
   - **Header line:**
     `Full premortem: docs/premortems/{filename} @ git-sha {git_sha}`
     (this pins the PR body to a specific version of the file)
   - One bullet per decided risk:
     `**{title}**: {decision} — {rationale if provided}`
   - Closing line:
     `Source of truth: the premortem file linked above. To refresh this section after editing the file, regenerate the PR description manually or via /jig:pr-create on a freshly-rebased branch.`
     (this tells reviewers + pr-respond that the file is authoritative)

Do not include the full narratives — they're in the file. The PR body shows what the author *decided* at PR-creation time.

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
