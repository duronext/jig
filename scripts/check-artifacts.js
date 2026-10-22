#!/usr/bin/env node

/**
 * Checks Jig's artifacts for the mechanical faults a fit review should not
 * have to find: registration, frontmatter, git-host rows, cited headings and
 * reference links. Prints file:line and a reason for each, exits 1 on any.
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

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} problem(s) in ${root}`);
  process.exit(1);
}
console.log(`Artifacts OK: ${root}`);
