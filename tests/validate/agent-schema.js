#!/usr/bin/env node
/**
 * Agent Schema Validator
 * Validates markdown structure of agent definitions
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '../../agents');

// Required sections in agent markdown
const REQUIRED_PATTERNS = [
  { name: 'Name/Title', pattern: /^#\s+.+/m },
  { name: 'Role Description', pattern: /(role|역할|You are|당신은|is the|is an?|specialist|facilitator|moderator|orchestrator|executor|planner|reviewer|explorer|librarian)/i },
  { name: 'Signature Emoji', pattern: /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u },
];

// Content section completeness checks (warnings only, FR-4.2, NFR-4)
const CONTENT_SECTION_PATTERNS = [
  {
    name: 'Mission',
    primary: /^##\s+.*(?:mission|core mission)/im,
    fallback: /^##\s+.*(?:role|purpose|goal)/im
  },
  {
    name: 'Critical Rules',
    primary: /^##\s+.*(?:critical rules|rules|constraints|immutable)/im,
    fallback: /^##\s+.*(?:must|never|always)/im
  },
  {
    name: 'Workflow',
    primary: /^##\s+.*(?:workflow|process|procedure)/im,
    fallback: /^##\s+.*(?:step|how|execution)/im
  }
];

// Forbidden patterns (agents shouldn't have these unless specific role)
const ROLE_RESTRICTIONS = {
  'shiro.md': {
    forbidden: [/Edit|Write|수정|작성/],
    reason: 'Shiro is read-only explorer'
  },
  'hiroshi.md': {
    forbidden: [/Edit|Write|코드.*작성/],
    reason: 'Hiroshi is advisor, not implementer'
  },
  'nene.md': {
    forbidden: [/코드.*작성/],
    reason: 'Nene is planner, not implementer'
  }
};

function validateAgent(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];

  // Check required patterns
  REQUIRED_PATTERNS.forEach(({ name, pattern }) => {
    if (!pattern.test(content)) {
      errors.push(`Missing: ${name}`);
    }
  });

  // Check role restrictions
  const restriction = ROLE_RESTRICTIONS[fileName];
  if (restriction) {
    restriction.forbidden.forEach(pattern => {
      if (pattern.test(content)) {
        warnings.push(`Role violation: ${restriction.reason} (found pattern: ${pattern})`);
      }
    });
  }

  // Check content section completeness (warnings only)
  CONTENT_SECTION_PATTERNS.forEach(({ name, primary, fallback }) => {
    if (!primary.test(content) && !fallback.test(content)) {
      warnings.push(`[CONTENT] ${fileName}: missing '${name}' section (expected heading matching ${primary})`);
    }
  });

  // Check for empty or too short content
  if (content.length < 100) {
    errors.push('Content too short (< 100 chars)');
  }

  return {
    file: fileName,
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function runValidation() {
  console.log('========================================');
  console.log('  Agent Schema Validation');
  console.log('========================================\n');

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('.'));
  let hasErrors = false;
  let totalErrors = 0;
  let totalWarnings = 0;
  let contentWarnings = 0;

  files.forEach(file => {
    const result = validateAgent(path.join(AGENTS_DIR, file));
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
      contentWarnings += result.warnings.filter(w => w.startsWith('[CONTENT]')).length;
    }
  });

  // IMMUTABLE RULE assertions: AK-GATE presence checks
  const immutableChecks = [
    {
      label: 'AK-GATE misae',
      file: 'misae.md',
      check: (content) => content.includes('AK-GATE'),
      description: 'IMMUTABLE RULES contains AK-GATE'
    },
    {
      label: 'AK-GATE shinnosuke',
      file: 'shinnosuke.md',
      check: (content) => content.includes('AK-GATE'),
      description: 'IMMUTABLE RULES contains AK-GATE'
    },
    {
      label: 'AK-GATE STOP misae',
      file: 'misae.md',
      check: (content) => content.includes('AK-GATE') && content.includes('STOP'),
      description: 'IMMUTABLE RULES AK-gate rule contains STOP'
    }
  ];

  console.log('\n--- IMMUTABLE RULE Assertions ---');
  immutableChecks.forEach(({ label, file, check, description }) => {
    const filePath = path.join(AGENTS_DIR, file);
    let passed = false;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      passed = check(content);
    } catch (e) {
      passed = false;
    }
    const status = passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${status} ${label}: ${description}`);
    if (!passed) {
      hasErrors = true;
      totalErrors += 1;
      console.log(`    \x1b[31mERROR: ${label} assertion failed in ${file}\x1b[0m`);
    }
  });

  console.log('\n----------------------------------------');
  console.log(`Agents: ${files.length} | Errors: ${totalErrors} | Warnings: ${totalWarnings}`);
  if (contentWarnings > 0) {
    console.log(`\u26a0\ufe0f  ${contentWarnings} content section warning(s) — run locally to review`);
  }
  console.log('----------------------------------------\n');

  return hasErrors ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { validateAgent, runValidation };
