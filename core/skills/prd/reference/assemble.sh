#!/usr/bin/env bash
# Inline the Jig kit into one self-contained page for publishing.
#   bash assemble.sh page.html > page.out.html
# Replaces the exact lines
#   <link rel="stylesheet" href="base.css">
#   <script src="live.js"></script>
#   <script src="toc.js"></script>
# with the contents of those files from this directory. Everything else passes
# through unchanged. Fails if the stylesheet line is missing.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
page="${1:?usage: assemble.sh page.html > page.out.html}"
grep -q '<link rel="stylesheet" href="base.css">' "$page" || { echo "assemble.sh: no base.css link line in $page" >&2; exit 1; }
awk -v css="$here/base.css" -v live="$here/live.js" -v toc="$here/toc.js" '
  function emit(tag, file,   line) { print "<" tag ">"; while ((getline line < file) > 0) print line; close(file); print "</" tag ">" }
  /^[[:space:]]*<link rel="stylesheet" href="base.css">[[:space:]]*$/ { emit("style", css); next }
  /^[[:space:]]*<script src="live.js"><\/script>[[:space:]]*$/       { emit("script", live); next }
  /^[[:space:]]*<script src="toc.js"><\/script>[[:space:]]*$/        { emit("script", toc); next }
  { print }
' "$page"
