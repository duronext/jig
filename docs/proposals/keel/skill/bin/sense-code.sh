#!/usr/bin/env bash
# Deterministic code sensor: origin/main schema + open/merged PRs touching watched paths.
# Usage: sense-code.sh <feature-dir> <out.json>
set -euo pipefail
FD="$1"; OUT="$2"
REPO=$(jq -r .repo "$FD/keel.json"); SCHEMA=$(jq -r .sources.code.schemaPath "$FD/keel.json")
WATCH=$(jq -r '.sources.code.watchPaths[]' "$FD/keel.json")
GH_REPO=$(jq -r .sources.code.githubRepo "$FD/keel.json")
git -C "$REPO" fetch -q origin main
MAIN=$(git -C "$REPO" rev-parse origin/main)
schema_hash() { git -C "$REPO" show "$1:$SCHEMA" 2>/dev/null | shasum -a 256 | cut -c1-16; }
items=$(jq -n --arg id "schema@main" --arg h "$(schema_hash origin/main)" --arg sha "$MAIN" '[{id:$id,hash:$h,meta:{sha:$sha}}]')
touches() { local f="$1" w; while read -r w; do [[ -n "$w" && "$f" == "$w"* ]] && return 0; done <<< "$WATCH"; return 1; }
prs=$(gh -R "$GH_REPO" pr list --state open --limit 100 --json number,title,headRefOid,updatedAt,author,isDraft)
for n in $(echo "$prs" | jq -r '.[].number'); do
  files=$(gh -R "$GH_REPO" pr diff "$n" --name-only 2>/dev/null || true)
  hit=0; while read -r f; do [[ -n "$f" ]] && touches "$f" && hit=1 && break; done <<< "$files"
  [[ $hit -eq 0 ]] && continue
  git -C "$REPO" fetch -q origin "+pull/$n/head:refs/keel/pr-$n" 2>/dev/null || true
  meta=$(echo "$prs" | jq --argjson n "$n" '.[]|select(.number==$n)|{title,author:.author.login,head:.headRefOid,updatedAt,isDraft}')
  h=$(schema_hash "refs/keel/pr-$n" || echo none)
  items=$(echo "$items" | jq --arg id "pr#$n" --arg h "$(echo "$meta" | jq -r .head)" --arg sh "$h" --argjson m "$meta" '. + [{id:$id,hash:$h,meta:($m + {schemaHash:$sh})}]')
done
jq -n --arg src code --arg at "$(date -u +%FT%TZ)" --argjson items "$items" '{source:$src,at:$at,items:$items}' > "$OUT"
echo "code sensor: $(jq '.items|length' "$OUT") items -> $OUT"
