#!/usr/bin/env python3
"""Diff two snapshot dirs of normalized source files ({source, at, items:[{id,hash,meta}]}).
Usage: diff-snapshots.py <prev-dir|-> <curr-dir> <impact-map.json> <out.json>
Writes changes (added/removed/changed per source) and the stack PRs each change touches."""
import json, sys, os, glob

def load(d):
    out = {}
    if d == '-' or not os.path.isdir(d):
        return out
    for f in glob.glob(os.path.join(d, '*.json')):
        s = json.load(open(f))
        if s.get('blocked'):
            BLOCKED.add(s['source']); continue
        out.setdefault(s['source'], {}).update({i['id']: i for i in s.get('items', [])})
    return out

BLOCKED = set()
prev = load(sys.argv[1]); BLOCKED.clear()
curr = load(sys.argv[2])
impact = json.load(open(sys.argv[3]))
changes, prs = [], set()

def touched(source, item_id):
    hits = set(impact.get(source, {}).get(item_id, []))
    for prefix, nums in impact.get('_prefix', {}).get(source, {}).items():
        if item_id.startswith(prefix):
            hits |= set(nums)
    return sorted(hits) or impact.get('_default', {}).get(source, [])

unavailable = sorted(BLOCKED | (set(prev) - set(curr)))
for source in sorted(set(prev) | set(curr)):
    if source in unavailable:
        changes.append({'source': source, 'id': '*', 'kind': 'unavailable', 'prs': []})
        continue
    p, c = prev.get(source, {}), curr.get(source, {})
    if not p and source not in prev:
        changes.append({'source': source, 'id': '*', 'kind': 'baseline', 'prs': []})
        continue
    for item_id in sorted(set(p) | set(c)):
        kind = ('added' if item_id not in p else 'removed' if item_id not in c
                else 'changed' if p[item_id]['hash'] != c[item_id]['hash'] else None)
        if kind:
            t = touched(source, item_id)
            prs |= set(t)
            changes.append({'source': source, 'id': item_id, 'kind': kind, 'prs': t,
                            'before': p.get(item_id, {}).get('meta'), 'after': c.get(item_id, {}).get('meta')})

json.dump({'changes': changes, 'affectedPRs': sorted(prs), 'unavailable': unavailable}, open(sys.argv[4], 'w'), indent=2, default=str)
real = [x for x in changes if x['kind'] not in ('baseline', 'unavailable')]
if unavailable: print(f"UNAVAILABLE sources (no comparison): {unavailable}")
base = any(x['kind'] == 'baseline' for x in changes)
print(f"{len(real)} changes, affected PRs: {sorted(prs) or 'none'}" + (" (baseline for some sources)" if base else ""))
