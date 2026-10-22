#!/usr/bin/env node

/**
 * Checks Jig's artifacts for the mechanical faults a fit review should not
 * have to find: registration, frontmatter, git-host rows, cited headings,
 * reference links, repeated or drifted passages, known shell traps and repo
 * paths in tool-less specialists.
 * Prints file:line and a reason for each, exits 1 on any.
 *
 * Usage:
 *   node scripts/check-artifacts.js          # this repo
 *   node scripts/check-artifacts.js <root>   # another checkout
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const HOSTS = ["github", "gitlab", "bitbucket"];
const SKILL_MAX_LINES = 499; // the whole file, frontmatter included

const failures = [];
const fail = (file, line, reason) =>
  failures.push(`${path.relative(root, file) || file}:${line}: ${reason}`);

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const exists = (p) => fs.existsSync(p);
const dirs = (p) =>
  exists(p)
    ? fs.readdirSync(p).filter((d) => fs.statSync(path.join(p, d)).isDirectory())
    : [];
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const findLine = (text, needle) => {
  const i = text.indexOf(needle);
  return i < 0 ? 1 : lineOf(text, i);
};

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Backticked names in the first column of the table under a heading.
function tableNames(file, heading) {
  const lines = read(file).split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return null;
  const names = new Set();
  for (let i = start + 1; i < lines.length && !/^#{1,3} /.test(lines[i]); i++) {
    const m = lines[i].match(/^\|\s*`([^`]+)`/);
    if (m) names.add(m[1]);
  }
  return names;
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fields = {};
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^[>|][-+]?$/.test(value)) {
      const block = [];
      while (i + 1 < lines.length && /^\s+\S|^\s*$/.test(lines[i + 1])) {
        block.push(lines[++i].trim());
      }
      value = block.join(" ").trim();
    }
    fields[kv[1]] = value.replace(/^["']|["']$/g, "");
  }
  return { fields };
}

// 1. plugin.json paths exist; every core and pack skill and core agent is
// listed there, and every pack skill in its pack's pack.json.
const pluginFile = path.join(root, ".claude-plugin", "plugin.json");
const pluginText = read(pluginFile);
const plugin = JSON.parse(pluginText);
const listed = new Set();
for (const key of ["skills", "agents"]) {
  for (const entry of plugin[key] || []) {
    const p = path.resolve(root, entry);
    listed.add(p);
    const target = key === "skills" ? path.join(p, "SKILL.md") : p;
    if (!exists(target)) {
      fail(pluginFile, findLine(pluginText, `"${entry}"`), `${key} entry ${entry} does not exist`);
    }
  }
}
const coreSkills = dirs(path.join(root, "core", "skills")).filter((d) =>
  exists(path.join(root, "core", "skills", d, "SKILL.md")),
);
const packSkills = dirs(path.join(root, "packs")).flatMap((pack) =>
  dirs(path.join(root, "packs", pack, "skills"))
    .filter((d) => exists(path.join(root, "packs", pack, "skills", d, "SKILL.md")))
    .map((d) => ({ pack, name: d, dir: path.join(root, "packs", pack, "skills", d) })),
);
for (const dir of [
  ...coreSkills.map((d) => path.join(root, "core", "skills", d)),
  ...packSkills.map((s) => s.dir),
]) {
  if (!listed.has(dir)) {
    fail(path.join(dir, "SKILL.md"), 1, "not in the skills array of .claude-plugin/plugin.json");
  }
}
for (const { pack, name, dir } of packSkills) {
  const packFile = path.join(root, "packs", pack, "pack.json");
  const skills = exists(packFile) ? JSON.parse(read(packFile)).skills || [] : null;
  if (!skills) fail(path.join(dir, "SKILL.md"), 1, `packs/${pack}/pack.json does not exist`);
  else if (!skills.includes(name)) {
    fail(path.join(dir, "SKILL.md"), 1, `not in the skills array of packs/${pack}/pack.json`);
  }
}
const agentsDir = path.join(root, "core", "agents");
const coreAgents = exists(agentsDir)
  ? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"))
  : [];
for (const f of coreAgents) {
  if (!listed.has(path.join(agentsDir, f))) {
    fail(path.join(agentsDir, f), 1, "not in the agents array of .claude-plugin/plugin.json");
  }
}

// 2. Core skills and agents appear in CLAUDE.md's and README's tables.
for (const doc of ["CLAUDE.md", "README.md"]) {
  const file = path.join(root, doc);
  const text = read(file);
  for (const [heading, items] of [
    ["### Core Skills", coreSkills.map((d) => [d, `core/skills/${d}/SKILL.md`])],
    [
      "### Core Agents",
      coreAgents.map((f) => {
        const fm = frontmatter(read(path.join(agentsDir, f)));
        return [(fm && fm.fields.name) || f.replace(/\.md$/, ""), `core/agents/${f}`];
      }),
    ],
  ]) {
    const names = tableNames(file, heading);
    if (!names) {
      fail(file, 1, `no "${heading}" table`);
      continue;
    }
    for (const [name, src] of items) {
      if (!names.has(name)) {
        fail(file, findLine(text, heading), `${src} (\`${name}\`) has no row in ${heading}`);
      }
    }
  }
}

// 3. SKILL.md frontmatter and length.
const skillFiles = [
  ...coreSkills.map((d) => path.join(root, "core", "skills", d, "SKILL.md")),
  ...packSkills.map((s) => path.join(s.dir, "SKILL.md")),
];
for (const file of skillFiles) {
  const text = read(file);
  const fm = frontmatter(text);
  if (!fm) {
    fail(file, 1, "no YAML frontmatter");
    continue;
  }
  for (const key of ["name", "description", "tier"]) {
    if (!(key in fm.fields)) fail(file, 1, `frontmatter has no ${key}`);
  }
  if ("description" in fm.fields && !fm.fields.description.startsWith("Use when")) {
    fail(file, findLine(text, "description:"), 'description does not start "Use when"');
  }
  const lines = text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
  if (lines > SKILL_MAX_LINES) {
    fail(file, 1, `is ${lines} lines; a SKILL.md stays under 500, frontmatter included`);
  }
}

// 4. Every GIT_HOST operation has a row per host; cited headings exist.
const gitHostFile = path.join(root, "framework", "GIT_HOST.md");
const gitHost = read(gitHostFile).split("\n");
const headings = [];
let inOps = false;
let op = null;
let opsHeading = false;
let opCount = 0;
const checkOp = () => {
  if (!op || op.hosts.has("all")) return;
  const missing = HOSTS.filter((h) => !op.hosts.has(h));
  if (missing.length) {
    fail(gitHostFile, op.line, `"${op.name}" has no row for ${missing.join(", ")}`);
  }
};
gitHost.forEach((l, i) => {
  const h = l.match(/^(#{1,6}) (.+)$/);
  if (h) {
    headings.push(h[2].trim());
    checkOp();
    op = null;
    if (h[1] === "##") {
      inOps = h[2].trim() === "Operations";
      opsHeading = opsHeading || inOps;
    } else if (h[1] === "###" && inOps) {
      op = { name: h[2].trim(), line: i + 1, hosts: new Set() };
      opCount++;
    }
    return;
  }
  const row = l.match(/^\|\s*([a-z-]+)\s*\|/);
  if (op && row) op.hosts.add(row[1]);
});
checkOp();
if (!opsHeading) fail(gitHostFile, 1, 'no "## Operations" heading');
else if (!opCount) fail(gitHostFile, 1, 'no "###" operations under "## Operations"');

// A citation names the heading whole, or without its trailing "(…)" note.
const citedOk = (name) =>
  headings.some((h) => h === name || h.startsWith(`${name} (`));
const citation = [
  /GIT_HOST(?:\.md)?`?(?:'s)?\s*[:,]\s*"([^"]+)"/g, // GIT_HOST: "X", `GIT_HOST.md`, "X"
  /"([^"]+)"\s+in\s+`?(?:framework\/)?GIT_HOST/g, // "X" in `framework/GIT_HOST.md`
];
const textFiles = ["core", "packs", "framework", "adapters", "scaffold"]
  .flatMap((d) => walk(path.join(root, d)))
  .filter((f) => f.endsWith(".md") || f.endsWith(".template"));
for (const file of textFiles) {
  const text = read(file);
  for (const re of citation) {
    for (const m of text.matchAll(re)) {
      const name = m[1].replace(/\s+/g, " ").trim();
      if (!citedOk(name)) {
        fail(file, lineOf(text, m.index), `cites GIT_HOST "${name}", which is not a heading there`);
      }
    }
  }
  // A table whose header names GIT_HOST lists operations, quoted, per row.
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^\|.*GIT_HOST.*\|\s*$/.test(lines[i])) continue;
    for (let j = i + 2; j < lines.length && lines[j].startsWith("|"); j++) {
      for (const q of lines[j].matchAll(/"([^"]+)"/g)) {
        if (!citedOk(q[1])) {
          fail(file, j + 1, `cites GIT_HOST "${q[1]}", which is not a heading there`);
        }
      }
    }
  }
}

// 5. reference/ files do not link other reference/ files.
const refFiles = walk(root).filter(
  (f) => f.endsWith(".md") && path.basename(path.dirname(f)) === "reference",
);
for (const file of refFiles) {
  const text = read(file);
  for (const m of text.matchAll(/\]\(([^)\s#]+)[^)]*\)|`([^`\s]*reference\/[^`\s]+)`/g)) {
    const target = m[1] || m[2];
    if (/^[a-z]+:/.test(target)) continue;
    const local = path.resolve(path.dirname(file), target);
    const isRef =
      (m[2] && true) ||
      (path.basename(path.dirname(local)) === "reference" && local !== file);
    if (isRef) {
      fail(file, lineOf(text, m.index), `links ${target}; reference/ files stay one level deep`);
    }
  }
}

// 6. One home per rule: the same run of RUN_WORDS words (lowercased, markdown
// and punctuation stripped) in two artifacts.
const RUN_WORDS = 15;
// Known copies, each skipped by a phrase it contains. Intentional ones say
// so; "on main" ones predate this check: give each one home, then drop it.
const COPIES = [
  // Intentional: each file carries it because its actor reads only that file.
  ["github gh as the default if git host in jig config md is not github read framework git host md for", "GIT HOST banner (Fit Checklist item 6)"],
  ["this review is language agnostic apply these principles regardless of the programming language or framework", "specialist preamble; each specialist runs alone"],
  ["you have full codebase access via read grep and glob tools use them proactively do not limit yourself to the document input you receive", "specialist preamble"],
  ["the full implementation plan tasks with files dependencies and steps", "plan specialists' input list"],
  ["section hints which sections are most relevant to your concern", "design specialists' input list"],
  ["reviewer your job is not to check patterns or style the swarm specialists already did", "code and plan logic reviewers share a prompt skeleton"],
  ["do not fabricate findings to appear thorough", "logic reviewer skeleton"],
  ["do not use sub agents for things you can check with a single grep or read", "logic reviewer skeleton"],
  ["sub agent spawning for deep dives that would bloat your context", "logic reviewer skeleton"],
  ["wrong and why it breaks be specific about the failure scenario", "logic reviewer skeleton"],
  ["it reads this pack for 1 tool mapping which mcp tool to call and how to structure the payload", "ticket pack README template"],
  ["these words invariant backbone load bearing first class seamless robust leverage utilize synergy north star single source of truth best in class holistic paradigm ecosystem unless it is literally one", "each actor reads only its own file (the PRD writer voice.md, the tool-less reviewer plain-language.md)"],
  // On main before this check: give each one home, then drop it here.
  ["all findings are always reported regardless of score", "on main: review SKILL.md and tiers.md"],
  ["automatic dispatch run the swarm for all medium to large features and improvements skip only for clearly trivial work", "on main: plan and spec"],
  ["git fetch origin git diff origin main branch head git diff origin main branch head name only read main branch from jig config md", "on main: code-review agent and review SKILL.md"],
  ["the spec reviewer already asked did we build what the spec says", "on main: kickoff and prd"],
];
const normWords = (text) =>
  text.split("\n").flatMap((l, i) =>
    l
      .toLowerCase()
      .replace(/\]\([^)]*\)/g, " ")
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map((w) => ({ w, line: i + 1 })),
  );
const copyPhrases = COPIES.map(([p]) => normWords(p).map((x) => x.w));
const artifactFiles = ["core", "framework", "packs"]
  .flatMap((d) => walk(path.join(root, d)))
  .filter((f) => f.endsWith(".md"));
const firstSeen = new Map();
for (const file of artifactFiles) {
  const ws = normWords(read(file));
  const covered = new Uint8Array(ws.length);
  for (const phrase of copyPhrases) {
    for (let i = 0; i + phrase.length <= ws.length; i++) {
      if (phrase.every((w, j) => ws[i + j].w === w)) covered.fill(1, i, i + phrase.length);
    }
  }
  const local = new Set();
  let last = null;
  for (let i = 0; i + RUN_WORDS <= ws.length; i++) {
    // A window inside a known copy still counts, so a copy that drifts from
    // the listed phrase in one file is caught against the file that kept it.
    const inCopy = covered.subarray(i, i + RUN_WORDS).some(Boolean);
    const key = ws.slice(i, i + RUN_WORDS).map((x) => x.w).join(" ");
    if (local.has(key)) continue;
    local.add(key);
    const seen = firstSeen.get(key);
    if (!seen) {
      firstSeen.set(key, { file, pos: i, line: ws[i].line, inCopy });
    } else if (seen.file !== file && !(inCopy && seen.inCopy)) {
      const continues = last && last.file === seen.file && last.pos + 1 === seen.pos && last.at + 1 === i;
      if (!continues) {
        const where = `${path.relative(root, seen.file)}:${seen.line}`;
        const why = inCopy || seen.inCopy ? "differs from a known copy (COPIES); keep the copies identical" : "give the rule one home and point to it";
        fail(file, ws[i].line, `repeats ${RUN_WORDS}+ words of ${where} ("${key.split(" ").slice(0, 8).join(" ")} …"); ${why}`);
      }
      last = { file: seen.file, pos: seen.pos, at: i };
    }
  }
}

// 7. Shell traps in fenced bash/sh blocks.
function flags(tokens, takesArg) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("--")) out.push(t.split("=")[0]);
    else if (/^-[A-Za-z0-9]+$/.test(t)) {
      out.push(...t.slice(1).split("").map((c) => `-${c}`));
      if (t.length === 2 && takesArg.includes(t[1])) i++;
    } else break;
  }
  return out;
}
const afterWord = (line, word) =>
  [...line.matchAll(new RegExp(`(?:^|[\\s|;&(])${word}\\s+([^|;&)]*)`, "g"))].map((m) =>
    m[1].trim().split(/\s+/),
  );
for (const file of textFiles) {
  const lines = read(file).split("\n");
  let inShell = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inShell = !inShell && /^\s*```(bash|sh|shell|zsh)\b/.test(lines[i]);
      continue;
    }
    if (!inShell) continue;
    const start = i;
    let line = lines[i];
    while (line.endsWith("\\") && i + 1 < lines.length) line = line.slice(0, -1) + " " + lines[++i];
    for (const toks of afterWord(line, "xargs")) {
      const f = flags(toks, "EILPdns");
      const nul = f.includes("-0") || f.includes("--null");
      if (nul && !f.includes("-r") && !f.includes("--no-run-if-empty")) {
        fail(file, start + 1, "shell: xargs -0 without -r runs its command once on empty input");
      }
    }
    for (const toks of afterWord(line, "sed")) {
      const f = flags(toks, "efl");
      if (f.includes("-z") || f.includes("--null-data")) {
        fail(file, start + 1, "shell: sed -z is not in macOS sed");
      }
    }
    if (/(?:^|[\s|;&(])git(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+log\b[^|;&]*--pathspec-from-file/.test(line)) {
      fail(file, start + 1, "shell: git log has no --pathspec-from-file");
    }
  }
}

// 8. A specialist runs in the consumer's repo (or none, in prd mode), where
// Jig's core/framework paths do not exist; one without `tools` cannot open
// files at all.
const TOOLLESS_POINTERS = []; // pure attributions, each "<file>|<path>"
const specialistFiles = [
  ...walk(path.join(root, "core", "specialists")),
  ...dirs(path.join(root, "packs")).flatMap((p) => walk(path.join(root, "packs", p, "specialists"))),
].filter((f) => f.endsWith(".md"));
for (const file of specialistFiles) {
  const text = read(file);
  const fm = frontmatter(text);
  if (!fm || "tools" in fm.fields) continue;
  for (const m of text.matchAll(/`\.?\/?((?:core|framework|packs|adapters)\/[^`\s]+)`/g)) {
    if (TOOLLESS_POINTERS.includes(`${path.relative(root, file)}|${m[1]}`)) continue;
    fail(file, lineOf(text, m.index), `tool-less specialist points to ${m[1]}; it cannot read it in a consumer install — inline the rule`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} problem(s) in ${root}`);
  process.exit(1);
}
console.log(`Artifacts OK: ${root}`);
