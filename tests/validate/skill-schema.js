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

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function validateSkill(filePath) {
  const fileName = path.basename(path.dirname(filePath)) + '/' + path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];
  const notices = [];

  // Check frontmatter exists
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) {
    errors.push('Missing YAML frontmatter');
  } else {
    // Check required frontmatter fields
    if (!frontmatter.description) {
      warnings.push('Missing description in frontmatter');
    } else {
      // Description word count check
      const descWords = countWords(frontmatter.description);
      if (descWords > 20) {
        warnings.push(`Description too long: ${descWords} words (> 20)`);
      }
    }
  }

  // Check content length
  if (content.length < 50) {
    errors.push('Content too short (< 50 chars)');
  }

  // Body word count checks (body = content after frontmatter)
  const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : content;
  const bodyWords = countWords(body);
  if (bodyWords > 500) {
    warnings.push(`Body too long: ${bodyWords} words (> 500)`);
  } else if (bodyWords < 200) {
    notices.push(`Body short: ${bodyWords} words (< 200)`);
  }

  return {
    file: fileName,
    valid: errors.length === 0,
    errors,
    warnings,
    notices,
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

  const skillDirs = fs.readdirSync(SKILLS_DIR);
  let hasErrors = false;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalNotices = 0;
  let skillCount = 0;

  skillDirs.forEach(dir => {
    const skillPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) return;

    skillCount++;
    const result = validateSkill(skillPath);
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

    if (result.notices && result.notices.length > 0) {
      totalNotices += result.notices.length;
      result.notices.forEach(n => console.log(`    \x1b[36mNOTICE: ${n}\x1b[0m`));
    }
  });

  console.log('\n----------------------------------------');
  console.log(`Skills: ${skillCount} | Errors: ${totalErrors} | Warnings: ${totalWarnings} | Notices: ${totalNotices}`);
  console.log('----------------------------------------\n');

  return hasErrors ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { validateSkill, runValidation };
