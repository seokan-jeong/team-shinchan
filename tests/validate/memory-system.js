#!/usr/bin/env node
/**
 * Memory System Validator
 * Validates that memory skills (learn/memories/forget) and load-kb hook are consistent
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');

const REQUIRED_FILES = [
  { path: 'skills/learn/SKILL.md', name: 'learn skill' },
  { path: 'skills/memories/SKILL.md', name: 'memories skill' },
  { path: 'skills/forget/SKILL.md', name: 'forget skill' },
  { path: 'hooks/load-kb.md', name: 'load-kb hook' },
];

const STORAGE_PATH = '.shinchan-docs/learnings.md';

function runValidation() {
  console.log('========================================');
  console.log('  Memory System Validation');
  console.log('========================================\n');

  const errors = [];

  // Check all required files exist
  console.log('Checking required files...');
  REQUIRED_FILES.forEach(({ path: filePath, name }) => {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    } else {
      errors.push(`Missing: ${name} (${filePath})`);
      console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    }
  });

  // Check storage path consistency
  console.log('\nChecking storage path consistency...');
  let pathConsistent = true;

  REQUIRED_FILES.forEach(({ path: filePath, name }) => {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes(STORAGE_PATH) || content.includes('.shinchan-docs/learnings')) {
        console.log(`  \x1b[32m✓\x1b[0m ${name} references ${STORAGE_PATH}`);
      } else {
        // load-kb hook may reference it differently
        if (content.includes('.shinchan-docs')) {
          console.log(`  \x1b[32m✓\x1b[0m ${name} references .shinchan-docs/`);
        } else {
          pathConsistent = false;
          errors.push(`${name} does not reference ${STORAGE_PATH}`);
          console.log(`  \x1b[31m✗\x1b[0m ${name} missing storage path reference`);
        }
      }
    }
  });

  // Check that .shinchan-docs is gitignored
  console.log('\nChecking gitignore...');
  const gitignorePath = path.join(ROOT_DIR, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (gitignore.includes('.shinchan-docs')) {
      console.log('  \x1b[32m✓\x1b[0m .shinchan-docs/ is gitignored');
    } else {
      errors.push('.shinchan-docs/ not in .gitignore');
      console.log('  \x1b[31m✗\x1b[0m .shinchan-docs/ not gitignored');
    }
  }

  // Check learn skill has auto-categorize
  console.log('\nChecking learn skill features...');
  const learnPath = path.join(ROOT_DIR, 'skills/learn/SKILL.md');
  if (fs.existsSync(learnPath)) {
    const learnContent = fs.readFileSync(learnPath, 'utf-8');
    if (/categor/i.test(learnContent)) {
      console.log('  \x1b[32m✓\x1b[0m Auto-categorize feature present');
    } else {
      errors.push('learn skill missing auto-categorize');
      console.log('  \x1b[31m✗\x1b[0m Auto-categorize missing');
    }
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
