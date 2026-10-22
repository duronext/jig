# PR brief: merge the runs (read-only)

You get {n} briefs for the same PR: the files {runs} in `{folder}`.
Each came from an independent run that followed the
review rules below, with no access to the others. The inputs are in
`{folder}`, listed in the review rules below. Their access paragraph (what
you may change or post) and their Evidence discipline (read scope, never
running PR code) apply to you.

1. **Combine the items.** Take the union of all defects and decisions from
   every run.
2. **Re-check every one of them in the code yourself, including the items
   that all runs share.** Keep an item only in the form you verify. Drop an
   item that the code shows is wrong, and record why in the merge log. An
   item you can neither confirm nor refute stays, tagged `[inferred]`.
3. Combine odd items, deferred items and the "Not checked" lines the same way.
   Check each one before you keep it. Keep every source that `sources.md`
   marks unreachable in "Not checked". Check every ticket, thread and PR fact
   (status, author, comments, approvals) against the input files the same
   way, and correct the ones the files contradict, in the merge log.
4. When runs classify one item differently (defect against decision, or
   different severities), classify it by the review rules from what you
   verified, and record the disagreement in the merge log.
5. Re-derive Attention and the verdict by the review rules, from the merged
   items. Write the verdict last.
6. Write the agreement counts from the input runs, before your changes:
   - k of {n} runs give the final verdict class (Approve / Approve after /
     Request changes / Not ready / Follow up / No action);
   - m of t main items (defects and decisions in the final brief) were found
     by every run, and how many of the t an existing thread in
     `threads.json` already raised;
   - r of d decisions get the same recommendation in every run that found
     them.
   Name each split: the verdicts and their counts, and each decision whose
   recommendations differ, with each run's recommendation. With one run,
   write `one run; no agreement measure`.

## Output: exactly this, in this order

```
# Final
<the merged Final, in the review rules' Output layout: full or short brief, with its Evidence and For the author sections>

# Agreement
<k of n runs give "<final verdict class>"; m of t main items found by every run (x already raised in threads); r of d recommendations match. Then each split, e.g. "decision 1: escalate (run 1), accept (run 2)">

# Merge log
<one line per item that was added, dropped or reclassified, with the reason and the file and symbol you checked>
```

---

Use the rules below for classification and the Final layout. Ignore their
Inventory and their Output order: the Output above wins.

{review-prompt}
