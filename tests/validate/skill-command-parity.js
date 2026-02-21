#!/usr/bin/env node
/**
 * Skill-Command Parity Validator
 * Validates that every skill directory in skills/ has a corresponding command file in commands/
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
const COMMANDS_DIR = path.join(ROOT_DIR, 'commands');

function getSkillDirs() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function getCommandFiles() {
  if (!fs.existsSync(COMMANDS_DIR)) return [];
  return fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''))
    .sort();
}

function runValidation() {
  console.log('========================================');
  console.log('  Skill-Command Parity Validation');
  console.log('========================================\n');

  const errors = [];
  const warnings = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    errors.push('skills/ directory not found');
    console.log('  \x1b[31m✗\x1b[0m skills/ directory not found');
    return 1;
  }

  if (!fs.existsSync(COMMANDS_DIR)) {
    errors.push('commands/ directory not found');
    console.log('  \x1b[31m✗\x1b[0m commands/ directory not found');
    return 1;
  }

  const skillDirs = getSkillDirs();
  const commandFiles = getCommandFiles();

  console.log(`Found ${skillDirs.length} skill director(ies) in skills/`);
  console.log(`Found ${commandFiles.length} command file(s) in commands/\n`);

  console.log('Checking each skill has a matching command file...');
  skillDirs.forEach(skill => {
    if (commandFiles.includes(skill)) {
      console.log(`  \x1b[32m✓\x1b[0m ${skill} → commands/${skill}.md`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${skill} → commands/${skill}.md (MISSING)`);
      errors.push(`Skill '${skill}' has no matching commands/${skill}.md`);
    }
  });

  console.log('\nChecking for orphaned command files (no matching skill)...');
  commandFiles.forEach(cmd => {
    if (!skillDirs.includes(cmd)) {
      console.log(`  \x1b[33m?\x1b[0m commands/${cmd}.md (no matching skills/${cmd}/ directory)`);
      warnings.push(`Command file 'commands/${cmd}.md' has no matching skill directory`);
    }
  });

  if (warnings.length === 0) {
    console.log('  \x1b[32m✓\x1b[0m No orphaned command files found');
  }

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
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
