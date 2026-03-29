#!/usr/bin/env node

/**
 * Bumps the version in both package.json and .claude-plugin/plugin.json,
 * keeping them in sync. Defaults to patch if no argument provided.
 *
 * Usage:
 *   node scripts/bump.js          # patch: 1.0.0 → 1.0.1
 *   node scripts/bump.js minor    # minor: 1.0.0 → 1.1.0
 *   node scripts/bump.js major    # major: 1.0.0 → 2.0.0
 */

const fs = require("fs");
const path = require("path");

const type = process.argv[2] || "patch";

if (!["major", "minor", "patch"].includes(type)) {
  console.error(`Invalid bump type: "${type}". Use major, minor, or patch.`);
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const files = [
  path.join(root, "package.json"),
  path.join(root, ".claude-plugin", "plugin.json"),
];

// Read current version from package.json
const pkg = JSON.parse(fs.readFileSync(files[0], "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

const next =
  type === "major"
    ? `${major + 1}.0.0`
    : type === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

// Update version in package.json and plugin.json
for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.version = next;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
}

// Update version in marketplace.json plugin entries
const marketplacePath = path.join(
  root,
  ".claude-plugin",
  "marketplace.json",
);
const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
for (const plugin of marketplace.plugins) {
  plugin.version = next;
}
fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");

console.log(`${pkg.version} → ${next} (${type})`);
console.log(
  `Updated: package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json`,
);
