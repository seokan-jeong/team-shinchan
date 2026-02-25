#!/usr/bin/env node
/**
 * Cross-Reference Validator
 * Validates that agent references in CLAUDE.md match actual agent files
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
const CLAUDE_MD = path.join(ROOT_DIR, 'CLAUDE.md');

// Skills are not agents - they have their own files in skills/
const KNOWN_SKILLS = [
  'start', 'status', 'autopilot', 'ralph', 'ultrawork', 'plan', 'analyze',
  'deepsearch', 'debate', 'orchestrate', 'learn', 'memories', 'forget', 'help', 'resume',
  'review', 'frontend', 'backend', 'devops', 'implement',
  'requirements', 'vision', 'bigproject', 'verify-implementation', 'manage-skills',
  'verify-agents', 'verify-skills', 'verify-consistency',
  'verify-workflow', 'verify-memory', 'verify-budget', 'research', 'work-log',
  'session-summary',
  'eval',
  'ontology',
  'impact-analysis'
];

function getActualAgents() {
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

function getActualSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

function getReferencedItems(content) {
  const pattern = /team-shinchan:([\w-]+)/g;
  const agents = new Set();
  const skills = new Set();
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const name = match[1];
    if (KNOWN_SKILLS.includes(name)) {
      skills.add(name);
    } else {
      agents.add(name);
    }
  }
  return { agents: Array.from(agents), skills: Array.from(skills) };
}

function runValidation() {
  console.log('========================================');
  console.log('  Cross-Reference Validation');
  console.log('========================================\n');

  const errors = [];
  const warnings = [];

  // Get actual files
  const actualAgents = getActualAgents();
  const actualSkills = getActualSkills();
  console.log(`Found ${actualAgents.length} agent files, ${actualSkills.length} skill files\n`);

  // Check CLAUDE.md references
  if (fs.existsSync(CLAUDE_MD)) {
    const claudeContent = fs.readFileSync(CLAUDE_MD, 'utf-8');
    const { agents: referencedAgents, skills: referencedSkills } = getReferencedItems(claudeContent);

    console.log('Checking agent references...');
    referencedAgents.forEach(agent => {
      if (actualAgents.includes(agent)) {
        console.log(`  \x1b[32m✓\x1b[0m team-shinchan:${agent}`);
      } else {
        console.log(`  \x1b[31m✗\x1b[0m team-shinchan:${agent} (file not found)`);
        errors.push(`Referenced agent not found: ${agent}`);
      }
    });

    console.log('\nSkills referenced (not validated as files):');
    referencedSkills.forEach(skill => {
      console.log(`  \x1b[36m•\x1b[0m team-shinchan:${skill}`);
    });

    // Check for unreferenced agents
    const unreferenced = actualAgents.filter(a => !referencedAgents.includes(a));
    if (unreferenced.length > 0) {
      console.log('\nUnreferenced agents (might be intentional):');
      unreferenced.forEach(a => {
        console.log(`  \x1b[33m?\x1b[0m ${a}.md`);
        warnings.push(`Agent not referenced in CLAUDE.md: ${a}`);
      });
    }
  } else {
    errors.push('CLAUDE.md not found');
  }

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
  console.log('----------------------------------------\n');

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
  }

  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
