#!/usr/bin/env node
/**
 * Workflow State Schema Validator
 * Validates stage_rules (in CLAUDE.md Stage-Tool Matrix) and transition_gates (in CLAUDE.md Transition Gates)
 * Also checks that skills/start/SKILL.md has a WORKFLOW_STATE.yaml template
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const START_SKILL = path.join(ROOT_DIR, 'skills/start/SKILL.md');
const CLAUDE_MD = path.join(ROOT_DIR, 'CLAUDE.md');

const REQUIRED_STAGES = ['requirements', 'planning', 'execution', 'completion'];
const REQUIRED_GATES = [
  'requirements_to_planning',
  'planning_to_execution',
  'execution_to_completion',
  'completion_to_done'
];

function runValidation() {
  console.log('========================================');
  console.log('  Workflow State Schema Validation');
  console.log('========================================\n');

  const errors = [];

  // Check SKILL.md exists and has YAML template
  if (!fs.existsSync(START_SKILL)) {
    console.log('\x1b[31m✗ skills/start/SKILL.md not found\x1b[0m\n');
    return 1;
  }

  const skillContent = fs.readFileSync(START_SKILL, 'utf-8');
  const hasYamlTemplate = skillContent.match(/```yaml[\s\S]*?current:[\s\S]*?stage:[\s\S]*?```/);
  if (hasYamlTemplate) {
    console.log('  \x1b[32m✓\x1b[0m WORKFLOW_STATE.yaml template found in SKILL.md');
  } else {
    errors.push('Missing WORKFLOW_STATE.yaml template in SKILL.md');
    console.log('  \x1b[31m✗\x1b[0m Missing WORKFLOW_STATE.yaml template in SKILL.md');
  }

  // Check CLAUDE.md exists
  if (!fs.existsSync(CLAUDE_MD)) {
    console.log('\x1b[31m✗ CLAUDE.md not found\x1b[0m\n');
    return 1;
  }

  const claudeContent = fs.readFileSync(CLAUDE_MD, 'utf-8');

  // Check stage rules - either inline in CLAUDE.md or referenced via workflow-guard.md
  console.log('\nChecking stage_rules...');

  if (claudeContent.includes('Stage-Tool Matrix')) {
    REQUIRED_STAGES.forEach(stage => {
      const stagePattern = new RegExp(stage, 'i');
      if (stagePattern.test(claudeContent)) {
        console.log(`  \x1b[32m✓\x1b[0m ${stage}`);
      } else {
        errors.push(`Missing stage_rules for: ${stage}`);
        console.log(`  \x1b[31m✗\x1b[0m ${stage}`);
      }
    });
  } else if (claudeContent.includes('workflow-guard')) {
    console.log('  \x1b[32m✓\x1b[0m Stage rules delegated to workflow-guard.md');
    // Verify workflow-guard.md has all stages
    const guardPath = path.join(ROOT_DIR, 'hooks/workflow-guard.md');
    if (fs.existsSync(guardPath)) {
      const guardContent = fs.readFileSync(guardPath, 'utf-8');
      REQUIRED_STAGES.forEach(stage => {
        if (new RegExp(stage, 'i').test(guardContent)) {
          console.log(`  \x1b[32m✓\x1b[0m ${stage} (in workflow-guard.md)`);
        } else {
          errors.push(`Missing stage_rules for: ${stage} in workflow-guard.md`);
          console.log(`  \x1b[31m✗\x1b[0m ${stage}`);
        }
      });
    }
  } else {
    errors.push('No stage rules found in CLAUDE.md or reference to workflow-guard.md');
    console.log('  \x1b[31m✗\x1b[0m No stage rules found');
  }

  // Check Transition Gates - either in CLAUDE.md or in shinnosuke.md/workflow-guide.md
  console.log('\nChecking transition_gates...');

  const gateLabels = {
    'requirements_to_planning': /requirements.*→.*planning|requirements.*planning/i,
    'planning_to_execution': /planning.*→.*execution|planning.*execution/i,
    'execution_to_completion': /execution.*→.*completion|execution.*completion/i,
    'completion_to_done': /completion.*→.*done|Final review/i
  };

  // Check across CLAUDE.md and shinnosuke.md
  const shinnosukePath = path.join(ROOT_DIR, 'agents/shinnosuke.md');
  const combinedContent = claudeContent + '\n' + (fs.existsSync(shinnosukePath) ? fs.readFileSync(shinnosukePath, 'utf-8') : '');

  REQUIRED_GATES.forEach(gate => {
    const pattern = gateLabels[gate];
    if (pattern.test(combinedContent)) {
      console.log(`  \x1b[32m✓\x1b[0m ${gate}`);
    } else {
      errors.push(`Missing transition_gate: ${gate}`);
      console.log(`  \x1b[31m✗\x1b[0m ${gate}`);
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
