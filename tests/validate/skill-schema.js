#!/usr/bin/env node
/**
 * Skill Schema Validator
 * Validates markdown structure of skill definitions
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../../skills');

// Check YAML frontmatter
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
    }
  });
  return frontmatter;
}

function validateSkill(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];

  // Check frontmatter exists
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) {
    errors.push('Missing YAML frontmatter');
  } else {
    // Check required frontmatter fields
    if (!frontmatter.description) {
      warnings.push('Missing description in frontmatter');
    }
  }

  // Check content length
  if (content.length < 50) {
    errors.push('Content too short (< 50 chars)');
  }

  return {
    file: fileName,
    valid: errors.length === 0,
    errors,
    warnings,
    frontmatter
  };
}

function runValidation() {
  console.log('========================================');
  console.log('  Skill Schema Validation');
  console.log('========================================\n');

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('Skills directory not found, skipping...\n');
    return 0;
  }

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('.'));
  let hasErrors = false;
  let totalErrors = 0;
  let totalWarnings = 0;

  files.forEach(file => {
    const result = validateSkill(path.join(SKILLS_DIR, file));
    const status = result.valid ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';

    console.log(`${status} ${result.file}`);

    if (result.errors.length > 0) {
      hasErrors = true;
      totalErrors += result.errors.length;
      result.errors.forEach(e => console.log(`    \x1b[31mERROR: ${e}\x1b[0m`));
    }

    if (result.warnings.length > 0) {
      totalWarnings += result.warnings.length;
      result.warnings.forEach(w => console.log(`    \x1b[33mWARN: ${w}\x1b[0m`));
    }
  });

  console.log('\n----------------------------------------');
  console.log(`Skills: ${files.length} | Errors: ${totalErrors} | Warnings: ${totalWarnings}`);
  console.log('----------------------------------------\n');

  return hasErrors ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { validateSkill, runValidation };
