/**
 * Token Budget Validator
 * Warns when files exceed recommended size thresholds.
 */
const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  'CLAUDE.md': 8000,           // Main prompt - loaded every turn
  'agents/*.md': 6000,         // Agent files - loaded per invocation
  'skills/*/SKILL.md': 5000,   // Skill files - loaded per invocation
  'hooks/*.md': 5000,          // Hook files - loaded per event
};

function validateTokenBudget() {
  const rootDir = path.resolve(__dirname, '../..');
  let warnings = 0;
  let errors = 0;

  console.log('\n========================================');
  console.log('  Token Budget Validation');
  console.log('========================================\n');

  // Check CLAUDE.md
  const claudePath = path.join(rootDir, 'CLAUDE.md');
  if (fs.existsSync(claudePath)) {
    const size = fs.statSync(claudePath).size;
    if (size > THRESHOLDS['CLAUDE.md']) {
      console.log(`\x1b[33m⚠\x1b[0m CLAUDE.md: ${size} bytes (threshold: ${THRESHOLDS['CLAUDE.md']})`);
      warnings++;
    } else {
      console.log(`\x1b[32m✓\x1b[0m CLAUDE.md: ${size} bytes`);
    }
  }

  // Check agent files
  const agentsDir = path.join(rootDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    for (const file of agentFiles) {
      const filePath = path.join(agentsDir, file);
      const size = fs.statSync(filePath).size;
      const threshold = THRESHOLDS['agents/*.md'];
      if (size > threshold) {
        console.log(`\x1b[33m⚠\x1b[0m agents/${file}: ${size} bytes (threshold: ${threshold})`);
        warnings++;
      } else {
        console.log(`\x1b[32m✓\x1b[0m agents/${file}: ${size} bytes`);
      }
    }
  }

  // Check skill files
  const skillsDir = path.join(rootDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    const skillDirs = fs.readdirSync(skillsDir).filter(d => {
      return fs.statSync(path.join(skillsDir, d)).isDirectory();
    });
    for (const dir of skillDirs) {
      const skillFile = path.join(skillsDir, dir, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const size = fs.statSync(skillFile).size;
        const threshold = THRESHOLDS['skills/*/SKILL.md'];
        if (size > threshold) {
          console.log(`\x1b[33m⚠\x1b[0m skills/${dir}/SKILL.md: ${size} bytes (threshold: ${threshold})`);
          warnings++;
        } else {
          console.log(`\x1b[32m✓\x1b[0m skills/${dir}/SKILL.md: ${size} bytes`);
        }
      }
    }
  }

  // Check hook files
  const hooksDir = path.join(rootDir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.md'));
    for (const file of hookFiles) {
      const filePath = path.join(hooksDir, file);
      const size = fs.statSync(filePath).size;
      const threshold = THRESHOLDS['hooks/*.md'];
      if (size > threshold) {
        console.log(`\x1b[33m⚠\x1b[0m hooks/${file}: ${size} bytes (threshold: ${threshold})`);
        warnings++;
      } else {
        console.log(`\x1b[32m✓\x1b[0m hooks/${file}: ${size} bytes`);
      }
    }
  }

  console.log(`\n----------------------------------------`);
  console.log(`Warnings: ${warnings} | Errors: ${errors}`);
  console.log(`----------------------------------------\n`);

  return { warnings, errors };
}

module.exports = { validateTokenBudget };

// Run directly
if (require.main === module) {
  validateTokenBudget();
}
