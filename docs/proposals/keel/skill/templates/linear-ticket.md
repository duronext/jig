# Ticket template (one ticket per stack PR)

## Fields
- Title: `<Area>: <what the user or developer gets>`. Area names the layer (for example
  `Frontend`, `Components`, `Chore`).
- Team · parent = the feature or design umbrella ticket · assignee · cycle · estimate (team scale).
- Labels: issue type (`Feature`, `Improvement`, `Refactor`, `Task`) plus the team's feature and
  platform labels.
- Relations: blocked by the previous stack ticket; blocked by a backend ticket only when this PR
  cannot merge without it, otherwise related.

## Description body

```markdown
**Stack · N of M.** <2–4 sentences: what changes, why, and what the user or the next PR gets.>

## References

* Design spec: <umbrella ticket>, <screen ticket>. Designs: <frame links>.
* Engineering umbrella: <ticket>. Backend: <tickets this depends on, with status>.
* Plan: `docs/plans/<date>-<ticket>-<slug>-plan.md` on branch `<branch>`
* PRD: <link> (<section or requirement ids>), when applicable.

## Acceptance

<Group label>:

* <Plain, checkable statement. Exact copy in bold. Design frame or annotation number where it applies.>

Backend gaps (only if any):

* <What works today and how, and what changes when <ticket/schema element> lands.>

Proof:

* <Tests that must pass, UAT scenario ids, screenshots or measurements.>
```

Rules: no checkboxes (plain bullets), no "Out of scope" section (say it in the description if
it matters), no personal names, no line numbers.
