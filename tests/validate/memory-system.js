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

  // Check tier field support in hook/skill files
  console.log('\nChecking tier field support...');
  const tierFiles = [
    { path: 'hooks/auto-retrospective.md', name: 'auto-retrospective hook' },
    { path: 'hooks/load-kb.md', name: 'load-kb hook' },
    { path: 'skills/learn/SKILL.md', name: 'learn skill' },
  ];
  for (const { path: filePath, name } of tierFiles) {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (/tier/i.test(content)) {
        console.log(`  \x1b[32m✓\x1b[0m ${name} has tier support`);
      } else {
        errors.push(`${name} missing tier field support`);
        console.log(`  \x1b[31m✗\x1b[0m ${name} missing tier support`);
      }
    }
  }

  // Validate tier field values in learnings.md (if it exists in project)
  console.log('\nChecking learnings.md tier values...');
  const projectLearnPath = path.join(ROOT_DIR, '.shinchan-docs/learnings.md');
  if (fs.existsSync(projectLearnPath)) {
    const learnContent = fs.readFileSync(projectLearnPath, 'utf-8');
    const tierMatches = learnContent.match(/\*\*Tier\*\*:\s*(\w+)/g) || [];
    const validTiers = ['preference', 'procedural', 'tool'];
    let invalidTiers = [];
    for (const match of tierMatches) {
      const tierValue = match.replace(/\*\*Tier\*\*:\s*/, '').trim();
      if (!validTiers.includes(tierValue)) {
        invalidTiers.push(tierValue);
      }
    }
    if (tierMatches.length === 0) {
      console.log('  \x1b[33m-\x1b[0m No tier fields found (backward compatible — OK)');
    } else if (invalidTiers.length > 0) {
      errors.push(`Invalid tier values found: ${invalidTiers.join(', ')}`);
      console.log(`  \x1b[31m✗\x1b[0m Invalid tier values: ${invalidTiers.join(', ')}`);
    } else {
      console.log(`  \x1b[32m✓\x1b[0m All ${tierMatches.length} tier values are valid`);
    }
    // Check heading format: entries must use ### [ (3 hashes), not ## [ (2 hashes)
    console.log('\nChecking heading format...');
    const badHeadings = learnContent.split('\n').filter(line => /^## \[/.test(line));
    if (badHeadings.length > 0) {
      errors.push(`Invalid heading format: ${badHeadings.length} line(s) use ## [ instead of ### [`);
      console.log(`  \x1b[31m✗\x1b[0m ${badHeadings.length} invalid heading(s) found (use ### [ not ## [)`);
    } else {
      console.log('  \x1b[32m✓\x1b[0m All headings use correct ### [ format');
    }

    // Check that every entry has a Tier field
    console.log('\nChecking Tier field presence...');
    const entryBlocks = learnContent.split(/\n---\n/).filter(b => /^### \[/.test(b.trim()));
    const missingTier = entryBlocks.filter(b => !/\*\*Tier\*\*:/.test(b));
    if (missingTier.length > 0) {
      errors.push(`${missingTier.length} learning entry(ies) missing **Tier**: field`);
      console.log(`  \x1b[31m✗\x1b[0m ${missingTier.length} entry(ies) missing **Tier** field`);
    } else if (entryBlocks.length > 0) {
      console.log(`  \x1b[32m✓\x1b[0m All ${entryBlocks.length} entries have **Tier** field`);
    } else {
      console.log('  \x1b[33m-\x1b[0m No entries found to check');
    }
  } else {
    console.log('  \x1b[33m-\x1b[0m No learnings.md found (skipped)');
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
