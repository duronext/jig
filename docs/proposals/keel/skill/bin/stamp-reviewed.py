#!/usr/bin/env python3
"""Stamp plans as reviewed, but only at the hash a review recorded for them.

Usage: stamp-reviewed.py <feature-dir> <plan-id> [plan-id ...]

The reviewer, or the fixer after it applies every `fix` verdict, records one line per plan
in a file under <feature-dir>/reviews/:

    KEEL-REVIEW <plan-id> <sha256 of the plan, first 16 hex> clear|blocker

A plan is stamped only when its newest record (by review file mtime, then line order) names
its current hash and says `clear`. Plans that cannot be stamped are reported and left as
they are; the exit code is 1 if any requested plan was refused, 2 on a usage error.
"""
import datetime
import glob
import hashlib
import json
import os
import re
import sys

RECORD = re.compile(r'^KEEL-REVIEW\s+(\S+)\s+([0-9a-f]{16})\s+(clear|blocker)$')

Record = tuple[str, str, str]  # (reviewed hash, verdict, review file name)


def plan_hash(path: str) -> str:
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]


def newest_records(feature_dir: str) -> dict[str, Record]:
    records: dict[str, Record] = {}
    paths = sorted(glob.glob(os.path.join(feature_dir, 'reviews', '*.md')), key=os.path.getmtime)
    for path in paths:
        with open(path, encoding='utf-8') as f:
            for line in f:
                match = RECORD.match(line.strip())
                if match:
                    plan_id, reviewed_hash, verdict = match.groups()
                    records[plan_id] = (reviewed_hash, verdict, os.path.basename(path))
    return records


def refusal(record: Record | None, current: str) -> str | None:
    if record is None:
        return 'no KEEL-REVIEW record'
    reviewed_hash, verdict, source = record
    if reviewed_hash != current:
        return f'plan changed since review ({source} reviewed {reviewed_hash}, now {current})'
    if verdict != 'clear':
        return f'open blocker in {source}'
    return None


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    feature_dir, wanted = argv[1], argv[2:]
    state_path = os.path.join(feature_dir, 'state.json')
    with open(state_path, encoding='utf-8') as f:
        state = json.load(f)

    known = {pr['id'] for pr in state['prs']}
    unknown = [plan_id for plan_id in wanted if plan_id not in known]
    if unknown:
        print(f'unknown plan ids: {unknown}', file=sys.stderr)
        return 2

    records = newest_records(feature_dir)
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    refused, prs = [], []
    for pr in state['prs']:
        if pr['id'] not in wanted:
            prs.append(pr)
            continue
        current = plan_hash(pr['plan'])
        reason = refusal(records.get(pr['id']), current)
        if reason:
            refused.append(pr['id'])
            print(f"REFUSED {pr['id']}: {reason}")
            prs.append(pr)
        else:
            print(f"stamped {pr['id']} {current}")
            prs.append({**pr, 'planHash': current, 'reviewedPlanHash': current, 'reviewedAt': now})

    tmp_path = state_path + '.tmp'
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump({**state, 'prs': prs}, f, indent=2)
    os.replace(tmp_path, state_path)
    return 1 if refused else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
