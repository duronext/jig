#!/usr/bin/env bash
# Tests live.js and toc.js against template.html with a fake window.claude.
#   bash core/skills/prd/reference/test/run.sh
# Needs Google Chrome (or set CHROME=/path/to/chrome). Exits non-zero on any FAIL.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ref="$(dirname "$here")"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
command -v "$chrome" >/dev/null 2>&1 || [ -x "$chrome" ] || { echo "run.sh: Chrome not found; set CHROME" >&2; exit 2; }
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
{ echo '<meta charset="utf-8">'; echo "<script>"; cat "$here/fake-claude.js"; echo "</script>"
  bash "$ref/assemble.sh" "$ref/template.html"
  echo "<script>"; cat "$here/driver.js"; echo "</script>"; } > "$work/page.html"
"$chrome" --headless=new --disable-gpu --no-first-run --user-data-dir="$work/profile" \
  --virtual-time-budget=20000 --dump-dom "file://$work/page.html" 2>/dev/null > "$work/dom.html" &
pid=$!; for _ in $(seq 1 60); do kill -0 $pid 2>/dev/null || break; sleep 1; done; kill $pid 2>/dev/null || true
python3 - "$work/dom.html" <<'PY'
import sys, re, html
s = open(sys.argv[1]).read()
m = re.search(r'<pre id="test-results">(.*?)</pre>\s*</body>', s, re.S)
if not m:
    print("FAIL no results: the driver never finished"); sys.exit(1)
out = html.unescape(m.group(1)).strip()
print(out)
fails = sum(1 for l in out.splitlines() if l.startswith("FAIL"))
print(f"\n{len(out.splitlines()) - fails} passed, {fails} failed")
sys.exit(1 if fails else 0)
PY
