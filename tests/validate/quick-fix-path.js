#!/usr/bin/env node
/**
 * Quick Fix Path Validator
 * Validates that Quick Fix workflow is properly defined in CLAUDE.md and shinnosuke.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const CLAUDE_MD = path.join(ROOT_DIR, 'CLAUDE.md');
const SHINNOSUKE_MD = path.join(ROOT_DIR, 'agents/shinnosuke.md');

const REQUIRED_ELEMENTS = [
  { name: 'Quick Fix criteria defined', pattern: /Quick Fix.*criteria|criteria.*Quick Fix/i },
  { name: 'Action Kamen review mandatory', pattern: /Action Kamen.*(?:MANDATORY|mandatory|required)/i },
  { name: 'Bo delegation mentioned', pattern: /(?:Delegate|delegate).*Bo|Bo.*(?:implement|fix)/i },
];

function runValidation() {
  console.log('========================================');
  console.log('  Quick Fix Path Validation');
  console.log('========================================\n');

  const errors = [];

  // Check CLAUDE.md
  if (!fs.existsSync(CLAUDE_MD)) {
    console.log('\x1b[31m✗ CLAUDE.md not found\x1b[0m\n');
    return 1;
  }

  const claudeContent = fs.readFileSync(CLAUDE_MD, 'utf-8');

  console.log('Checking CLAUDE.md...');
  if (/Quick Fix|Lite Mode/i.test(claudeContent)) {
    console.log('  \x1b[32m✓\x1b[0m Quick Fix / Lite Mode section exists');
  } else {
    errors.push('CLAUDE.md missing Quick Fix / Lite Mode section');
    console.log('  \x1b[31m✗\x1b[0m Quick Fix / Lite Mode section missing');
  }

  // Check shinnosuke.md
  if (!fs.existsSync(SHINNOSUKE_MD)) {
    console.log('\x1b[31m✗ agents/shinnosuke.md not found\x1b[0m\n');
    return 1;
  }

  const shinnosukeContent = fs.readFileSync(SHINNOSUKE_MD, 'utf-8');

  console.log('\nChecking agents/shinnosuke.md...');
  if (/Quick Fix/i.test(shinnosukeContent)) {
    console.log('  \x1b[32m✓\x1b[0m Quick Fix referenced in shinnosuke.md');
  } else {
    errors.push('shinnosuke.md missing Quick Fix reference');
    console.log('  \x1b[31m✗\x1b[0m Quick Fix not referenced');
  }

  // Check required elements across both files
  const combined = claudeContent + '\n' + shinnosukeContent;
  console.log('\nChecking required elements...');

  REQUIRED_ELEMENTS.forEach(({ name, pattern }) => {
    if (pattern.test(combined)) {
      console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    } else {
      errors.push(`Missing: ${name}`);
      console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    }
  });

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
