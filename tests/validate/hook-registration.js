#!/usr/bin/env node
/**
 * Hook Registration Validator
 * Validates that all .md files in hooks/ are registered in hooks.json
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const HOOKS_DIR = path.join(ROOT_DIR, 'hooks');
const HOOKS_JSON = path.join(ROOT_DIR, 'hooks/hooks.json');

function getHookMdFiles() {
  return fs.readdirSync(HOOKS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();
}

function getRegisteredMdFiles(hooksJson) {
  const registered = new Set();
  const jsonStr = JSON.stringify(hooksJson);
  // Extract all .md filenames referenced in prompt_file fields
  const pattern = /hooks\/([^"]+\.md)/g;
  let match;
  while ((match = pattern.exec(jsonStr)) !== null) {
    registered.add(match[1]);
  }
  return registered;
}

function runValidation() {
  console.log('========================================');
  console.log('  Hook Registration Validation');
  console.log('========================================\n');

  const errors = [];
  const warnings = [];

  if (!fs.existsSync(HOOKS_JSON)) {
    console.log('  \x1b[31m✗\x1b[0m hooks.json not found');
    return 1;
  }

  const hooksJson = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf-8'));
  const registeredFiles = getRegisteredMdFiles(hooksJson);
  const mdFiles = getHookMdFiles();

  console.log(`Found ${mdFiles.length} .md file(s) in hooks/`);
  console.log(`Found ${registeredFiles.size} .md file reference(s) in hooks.json\n`);

  console.log('Checking hook .md files are registered in hooks.json...');
  mdFiles.forEach(filename => {
    if (registeredFiles.has(filename)) {
      console.log(`  \x1b[32m✓\x1b[0m ${filename}`);
    } else {
      console.log(`  \x1b[33m?\x1b[0m ${filename} (not referenced in hooks.json)`);
      warnings.push(`Hook file not registered in hooks.json: ${filename}`);
    }
  });

  console.log('\nRegistered hook files:');
  registeredFiles.forEach(f => {
    const exists = mdFiles.includes(f);
    if (exists) {
      console.log(`  \x1b[32m✓\x1b[0m ${f}`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${f} (referenced in hooks.json but file missing)`);
      errors.push(`hooks.json references missing file: ${f}`);
    }
  });

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
  console.log('----------------------------------------\n');

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log('Warnings (unregistered hook files):');
    warnings.forEach(w => console.log(`  \x1b[33m• ${w}\x1b[0m`));
    console.log();
  }

  // PASS if no errors (missing file references). Unregistered files are warnings, not errors.
  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
