#!/usr/bin/env node
/**
 * Stage-Tool Matrix Validator
 * Validates Stage-Tool Matrix consistency across CLAUDE.md and workflow-guard.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const CLAUDE_MD = path.join(ROOT_DIR, 'CLAUDE.md');
const GUARD_MD = path.join(ROOT_DIR, 'hooks/workflow-guard.md');

const STAGES = ['requirements', 'planning', 'execution', 'completion'];
const TOOLS = ['Read', 'Glob', 'Grep', 'Task', 'Edit', 'Write', 'TodoWrite', 'Bash', 'AskUserQuestion'];

// Extract matrix from markdown table
function extractMatrix(content) {
  const lines = content.split('\n');
  const matrix = {};

  let inMatrix = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Stage-Tool Matrix')) {
      inMatrix = true;
      continue;
    }

    if (inMatrix && lines[i].startsWith('|')) {
      const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);

      // Check if this is a data row (not header)
      if (cells.length > 1 && TOOLS.includes(cells[0])) {
        const tool = cells[0];
        matrix[tool] = {};

        for (let j = 1; j < cells.length && j - 1 < STAGES.length; j++) {
          const stage = STAGES[j - 1];
          const value = cells[j].toUpperCase();

          // Normalize values
          if (value.includes('ALLOW')) {
            matrix[tool][stage] = 'ALLOW';
          } else if (value.includes('BLOCK')) {
            matrix[tool][stage] = 'BLOCK';
          }
        }
      }
    }

    // Stop when we hit the next section
    if (inMatrix && lines[i].startsWith('##') && !lines[i].includes('Stage-Tool Matrix')) {
      break;
    }
  }

  return matrix;
}

function compareMatrices(matrix1, matrix2, file1Name, file2Name) {
  const errors = [];

  TOOLS.forEach(tool => {
    STAGES.forEach(stage => {
      const val1 = matrix1[tool]?.[stage];
      const val2 = matrix2[tool]?.[stage];

      if (!val1) {
        errors.push(`${file1Name}: Missing ${tool} permission for ${stage} stage`);
      }
      if (!val2) {
        errors.push(`${file2Name}: Missing ${tool} permission for ${stage} stage`);
      }

      if (val1 && val2 && val1 !== val2) {
        errors.push(`Mismatch: ${tool} in ${stage} stage (${file1Name}: ${val1}, ${file2Name}: ${val2})`);
      }
    });
  });

  return errors;
}

function runValidation() {
  console.log('========================================');
  console.log('  Stage-Tool Matrix Validation');
  console.log('========================================\n');

  const errors = [];

  // Check files exist
  if (!fs.existsSync(CLAUDE_MD)) {
    errors.push('CLAUDE.md not found');
  }
  if (!fs.existsSync(GUARD_MD)) {
    errors.push('hooks/workflow-guard.md not found');
  }

  if (errors.length > 0) {
    console.log('\x1b[31m✗ Missing required files\x1b[0m');
    errors.forEach(e => console.log(`  ${e}`));
    return 1;
  }

  // Extract matrices - workflow-guard.md is the authoritative source
  // CLAUDE.md may reference it via link instead of duplicating the matrix
  const claudeContent = fs.readFileSync(CLAUDE_MD, 'utf-8');
  const guardContent = fs.readFileSync(GUARD_MD, 'utf-8');

  const claudeMatrix = extractMatrix(claudeContent);
  const guardMatrix = extractMatrix(guardContent);

  console.log('Extracted matrices:');
  console.log(`  CLAUDE.md: ${Object.keys(claudeMatrix).length} tools`);
  console.log(`  workflow-guard.md: ${Object.keys(guardMatrix).length} tools\n`);

  // workflow-guard.md must have the matrix
  if (Object.keys(guardMatrix).length === 0) {
    errors.push('workflow-guard.md: Stage-Tool Matrix not found');
  } else {
    console.log('\x1b[32m✓ workflow-guard.md has Stage-Tool Matrix\x1b[0m');
  }

  // CLAUDE.md may either have the matrix inline or reference workflow-guard.md
  if (Object.keys(claudeMatrix).length === 0) {
    if (claudeContent.includes('workflow-guard')) {
      console.log('\x1b[32m✓ CLAUDE.md references workflow-guard.md for stage rules\x1b[0m');
    } else {
      errors.push('CLAUDE.md: Neither has Stage-Tool Matrix nor references workflow-guard.md');
    }
  } else {
    // Both have matrices - check consistency
    const matrixErrors = compareMatrices(claudeMatrix, guardMatrix, 'CLAUDE.md', 'workflow-guard.md');
    errors.push(...matrixErrors);
  }

  // Report results
  if (errors.length === 0) {
    console.log('\x1b[32m✓ Stage-Tool Matrix is consistent\x1b[0m');
  } else {
    console.log('\x1b[31m✗ Stage-Tool Matrix has inconsistencies:\x1b[0m');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
  }

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length}`);
  console.log('----------------------------------------\n');

  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
