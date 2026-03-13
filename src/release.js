#!/usr/bin/env node
/**
 * release.js — Atomic version bump across 4 files
 *
 * Usage: node src/release.js <version> [--dry-run]
 *
 * Updates:
 *   1. .claude-plugin/plugin.json    → "version" field
 *   2. .claude-plugin/marketplace.json → plugins[0].version
 *   3. README.md                      → version badge
 *   4. CHANGELOG.md                   → new version header
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN_JSON = path.join(ROOT, '.claude-plugin', 'plugin.json');
const MARKETPLACE_JSON = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const README = path.join(ROOT, 'README.md');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const version = args.find(a => !a.startsWith('--'));

  if (!version) {
    console.error('Error: version argument required');
    console.error('Usage: node src/release.js <X.Y.Z> [--dry-run]');
    process.exit(1);
  }

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Error: invalid semver "${version}" — expected X.Y.Z`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const changes = [];

  // 1. plugin.json
  const pluginRaw = fs.readFileSync(PLUGIN_JSON, 'utf8');
  const pluginObj = JSON.parse(pluginRaw);
  const oldVersion = pluginObj.version;

  if (oldVersion === version) {
    console.error(`Error: version ${version} is already the current version`);
    process.exit(1);
  }

  const pluginNew = pluginRaw.replace(
    `"version": "${oldVersion}"`,
    `"version": "${version}"`
  );
  changes.push({ file: PLUGIN_JSON, label: '.claude-plugin/plugin.json', content: pluginNew });

  // 2. marketplace.json
  const marketRaw = fs.readFileSync(MARKETPLACE_JSON, 'utf8');
  const marketNew = marketRaw.replace(
    `"version": "${oldVersion}"`,
    `"version": "${version}"`
  );
  if (marketNew === marketRaw) {
    console.error(`Warning: marketplace.json version "${oldVersion}" not found — check manually`);
  }
  changes.push({ file: MARKETPLACE_JSON, label: '.claude-plugin/marketplace.json', content: marketNew });

  // 3. README.md badge
  const readmeRaw = fs.readFileSync(README, 'utf8');
  const badgeOld = `version-${oldVersion}-blue`;
  const badgeNew = `version-${version}-blue`;
  const readmeNew = readmeRaw.replace(badgeOld, badgeNew);
  if (readmeNew === readmeRaw) {
    console.error(`Warning: README.md badge with "${badgeOld}" not found — check manually`);
  }
  changes.push({ file: README, label: 'README.md', content: readmeNew });

  // 4. CHANGELOG.md — insert new header after "# Changelog" line
  const changelogRaw = fs.readFileSync(CHANGELOG, 'utf8');
  const changelogHeader = `## [${version}] - ${today}`;
  const insertPoint = '# Changelog\n';
  let changelogNew;
  const idx = changelogRaw.indexOf(insertPoint);
  if (idx !== -1) {
    const afterHeader = idx + insertPoint.length;
    // Skip any blank lines between # Changelog and first ## section
    let insertAt = afterHeader;
    while (insertAt < changelogRaw.length && changelogRaw[insertAt] === '\n') {
      insertAt++;
    }
    changelogNew =
      changelogRaw.slice(0, afterHeader) +
      '\n' + changelogHeader + '\n\n' +
      changelogRaw.slice(insertAt);
  } else {
    console.error('Warning: "# Changelog" header not found in CHANGELOG.md — prepending');
    changelogNew = changelogHeader + '\n\n' + changelogRaw;
  }
  changes.push({ file: CHANGELOG, label: 'CHANGELOG.md', content: changelogNew });

  // Output summary
  console.log(`\nRelease: ${oldVersion} -> ${version}`);
  console.log(`Date: ${today}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files modified)' : 'LIVE'}\n`);

  for (const c of changes) {
    console.log(`  Updated: ${c.label}`);
  }

  // Write files (unless dry-run)
  if (!dryRun) {
    for (const c of changes) {
      fs.writeFileSync(c.file, c.content, 'utf8');
    }
    console.log('\nAll 4 files updated successfully.');
  } else {
    console.log('\nDry run complete — no files were written.');
  }
}

main();
