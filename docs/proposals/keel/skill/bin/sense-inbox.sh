#!/usr/bin/env bash
# Inbox sensor: every file dropped in <feature-dir>/inbox becomes a source item (id = filename, hash = content).
# Usage: sense-inbox.sh <feature-dir> <out.json>
set -euo pipefail
FD="$1"; OUT="$2"; DIR="$FD/inbox"; items="[]"
if [ -d "$DIR" ]; then
  while IFS= read -r -d '' f; do
    rel="${f#$DIR/}"; h=$(shasum -a 256 "$f" | cut -c1-16); sz=$(wc -c < "$f" | tr -d ' ')
    items=$(echo "$items" | jq --arg id "inbox:$rel" --arg h "$h" --arg sz "$sz" '. + [{id:$id,hash:$h,meta:{bytes:($sz|tonumber)}}]')
  done < <(find "$DIR" -type f ! -name '.*' ! -name 'README.md' -print0)
fi
jq -n --arg at "$(date -u +%FT%TZ)" --argjson items "$items" '{source:"inbox",at:$at,items:$items}' > "$OUT"
echo "inbox sensor: $(jq '.items|length' "$OUT") items"
