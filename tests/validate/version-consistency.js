#!/usr/bin/env node
/**
 * Version Consistency Validator
 * Validates that version numbers are consistent across plugin.json, README.md,
 * marketplace.json, and CHANGELOG.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const PLUGIN_JSON = path.join(ROOT_DIR, '.claude-plugin/plugin.json');
const MARKETPLACE_JSON = path.join(ROOT_DIR, '.claude-plugin/marketplace.json');
const README_MD = path.join(ROOT_DIR, 'README.md');
const CHANGELOG_MD = path.join(ROOT_DIR, 'CHANGELOG.md');

function getPluginVersion() {
  if (!fs.existsSync(PLUGIN_JSON)) return null;
  const json = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf-8'));
  return json.version || null;
}

function getMarketplaceVersion() {
  if (!fs.existsSync(MARKETPLACE_JSON)) return null;
  const json = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf-8'));
  // version may be at top level or inside plugins[0]
  if (json.version) return json.version;
  if (json.plugins && json.plugins[0] && json.plugins[0].version) {
    return json.plugins[0].version;
  }
  return null;
}

function getReadmeBadgeVersion(content) {
  // Match shield badge: version-X.X.X-blue.svg or similar
  const match = content.match(/version-(\d+\.\d+\.\d+)-/);
  return match ? match[1] : null;
}

function changelogHasVersion(content, version) {
  // Match ## [X.X.X] heading (escape dots globally for safe regex)
  const escaped = version.replace(/\./g, '\\.');
  const pattern = new RegExp('^## \\[' + escaped + '\\]', 'm');
  return pattern.test(content);
}

function runValidation() {
  console.log('========================================');
  console.log('  Version Consistency Validation');
  console.log('========================================\n');

  const errors = [];

  // Read plugin version as the source of truth
  if (!fs.existsSync(PLUGIN_JSON)) {
    errors.push('.claude-plugin/plugin.json not found');
    console.log('  \x1b[31m✗\x1b[0m .claude-plugin/plugin.json not found');
    return 1;
  }

  const pluginVersion = getPluginVersion();
  if (!pluginVersion) {
    errors.push('No version field found in plugin.json');
    console.log('  \x1b[31m✗\x1b[0m No version field in plugin.json');
    return 1;
  }

  console.log(`Source of truth: plugin.json → v${pluginVersion}\n`);
  console.log('Checking version consistency...');

  // Check marketplace.json
  if (fs.existsSync(MARKETPLACE_JSON)) {
    const marketplaceVersion = getMarketplaceVersion();
    if (marketplaceVersion === pluginVersion) {
      console.log(`  \x1b[32m✓\x1b[0m marketplace.json: v${marketplaceVersion}`);
    } else {
      const found = marketplaceVersion || '(not found)';
      console.log(`  \x1b[31m✗\x1b[0m marketplace.json: v${found} (expected v${pluginVersion})`);
      errors.push(`marketplace.json version mismatch: found ${found}, expected ${pluginVersion}`);
    }
  } else {
    console.log('  \x1b[33m?\x1b[0m marketplace.json not found (skipping)');
  }

  // Check README.md badge
  if (fs.existsSync(README_MD)) {
    const readmeContent = fs.readFileSync(README_MD, 'utf-8');
    const badgeVersion = getReadmeBadgeVersion(readmeContent);
    if (badgeVersion === pluginVersion) {
      console.log(`  \x1b[32m✓\x1b[0m README.md badge: v${badgeVersion}`);
    } else {
      const found = badgeVersion || '(not found)';
      console.log(`  \x1b[31m✗\x1b[0m README.md badge: v${found} (expected v${pluginVersion})`);
      errors.push(`README.md version badge mismatch: found ${found}, expected ${pluginVersion}`);
    }
  } else {
    errors.push('README.md not found');
    console.log('  \x1b[31m✗\x1b[0m README.md not found');
  }

  // Check CHANGELOG.md has an entry for this version
  if (fs.existsSync(CHANGELOG_MD)) {
    const changelogContent = fs.readFileSync(CHANGELOG_MD, 'utf-8');
    if (changelogHasVersion(changelogContent, pluginVersion)) {
      console.log(`  \x1b[32m✓\x1b[0m CHANGELOG.md: [${pluginVersion}] entry found`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m CHANGELOG.md: no [${pluginVersion}] entry found`);
      errors.push(`CHANGELOG.md missing entry for version ${pluginVersion}`);
    }
  } else {
    errors.push('CHANGELOG.md not found');
    console.log('  \x1b[31m✗\x1b[0m CHANGELOG.md not found');
  }

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length}`);
  console.log('----------------------------------------\n');

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
    console.log();
  }

  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
