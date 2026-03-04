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

/**
 * Extract YAML frontmatter value from markdown content
 */
function extractFrontmatter(content, key) {
  const match = content.match(new RegExp(`^---[\\s\\S]*?^${key}:\\s*(.+?)$[\\s\\S]*?^---`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

/**
 * Check content sync between skill SKILL.md and command .md
 * Detects drift in key fields (agent names, owner references, subagent_type)
 */
function checkContentSync(skillName, errors, warnings) {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const cmdPath = path.join(COMMANDS_DIR, `${skillName}.md`);

  if (!fs.existsSync(skillPath) || !fs.existsSync(cmdPath)) return;

  const skillContent = fs.readFileSync(skillPath, 'utf8');
  const cmdContent = fs.readFileSync(cmdPath, 'utf8');

  // Check 1: subagent_type references should match
  const skillAgents = [...skillContent.matchAll(/subagent_type\s*=\s*"([^"]+)"/g)].map(m => m[1]).sort();
  const cmdAgents = [...cmdContent.matchAll(/subagent_type\s*=\s*"([^"]+)"/g)].map(m => m[1]).sort();

  if (skillAgents.length > 0 && cmdAgents.length > 0) {
    if (JSON.stringify(skillAgents) !== JSON.stringify(cmdAgents)) {
      warnings.push(`${skillName}: subagent_type mismatch — skill has [${skillAgents.join(', ')}] but command has [${cmdAgents.join(', ')}]`);
    }
  }

  // Check 2: owner references in YAML blocks should match
  const skillOwners = [...skillContent.matchAll(/owner:\s*(\w+)/g)].map(m => m[1]);
  const cmdOwners = [...cmdContent.matchAll(/owner:\s*(\w+)/g)].map(m => m[1]);

  if (skillOwners.length > 0 && cmdOwners.length > 0) {
    const skillSet = [...new Set(skillOwners)].sort();
    const cmdSet = [...new Set(cmdOwners)].sort();
    if (JSON.stringify(skillSet) !== JSON.stringify(cmdSet)) {
      warnings.push(`${skillName}: owner mismatch — skill has [${skillSet.join(', ')}] but command has [${cmdSet.join(', ')}]`);
    }
  }

  // Check 3: user-invocable field should match between skill and command
  const skillInvocable = extractFrontmatter(skillContent, 'user-invocable');
  // Command files are always user-facing, so if skill says user-invocable: false,
  // the command should not contain direct user invocation patterns (this is just informational)
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

  if (warnings.filter(w => w.includes('no matching skill')).length === 0) {
    console.log('  \x1b[32m✓\x1b[0m No orphaned command files found');
  }

  // Content sync check between paired skill/command files
  console.log('\nChecking skill-command content sync...');
  let syncIssues = 0;
  skillDirs.forEach(skill => {
    if (commandFiles.includes(skill)) {
      const prevLen = warnings.length;
      checkContentSync(skill, errors, warnings);
      if (warnings.length > prevLen) {
        syncIssues++;
        warnings.slice(prevLen).forEach(w => {
          console.log(`  \x1b[33m!\x1b[0m ${w}`);
        });
      }
    }
  });

  if (syncIssues === 0) {
    console.log('  \x1b[32m✓\x1b[0m No content drift detected');
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
