#!/usr/bin/env python3
"""Stamp plans as reviewed at their current hash. Usage: stamp-reviewed.py <feature-dir> [plan-id ...] (default: all)"""
import json, sys, hashlib, datetime
F = sys.argv[1]; only = set(sys.argv[2:])
st = json.load(open(f'{F}/state.json'))
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
for p in st['prs']:
    if only and p['id'] not in only: continue
    h = hashlib.sha256(open(p['plan'], 'rb').read()).hexdigest()[:16]
    p['planHash'] = h; p['reviewedPlanHash'] = h; p['reviewedAt'] = now
    print(p['id'], h)
json.dump(st, open(f'{F}/state.json', 'w'), indent=2)
