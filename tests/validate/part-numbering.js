#!/usr/bin/env node
/**
 * PART Numbering Validator
 * Validates that CLAUDE.md PART numbering is sequential
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const CLAUDE_MD = path.join(ROOT_DIR, 'CLAUDE.md');

function extractPartNumbers(content) {
  // Match all "## PART X:" headings
  const regex = /##\s+PART\s+(\d+(?:\.\d+)?)\s*:/gi;
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const partNumber = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    matches.push({
      number: partNumber,
      parsed: parseFloat(partNumber),
      line: lineNumber
    });
  }

  return matches;
}

function validateSequence(parts) {
  const errors = [];

  if (parts.length === 0) {
    return ['No PART headings found in CLAUDE.md'];
  }

  // Check if all are integers (no decimals like 1.5)
  parts.forEach((part, index) => {
    if (!Number.isInteger(part.parsed)) {
      errors.push(`PART ${part.number} (line ${part.line}): Should be an integer, not a decimal`);
    }
  });

  // Check sequential order (1, 2, 3, ...)
  parts.forEach((part, index) => {
    const expected = index + 1;
    if (part.parsed !== expected) {
      errors.push(`PART ${part.number} (line ${part.line}): Expected PART ${expected}`);
    }
  });

  // Check for duplicates
  const numbers = parts.map(p => p.parsed);
  const duplicates = numbers.filter((num, index) => numbers.indexOf(num) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate PART numbers found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return errors;
}

function runValidation() {
  console.log('========================================');
  console.log('  PART Numbering Validation');
  console.log('========================================\n');

  if (!fs.existsSync(CLAUDE_MD)) {
    console.log('\x1b[31mERROR: CLAUDE.md not found\x1b[0m\n');
    return 1;
  }

  const content = fs.readFileSync(CLAUDE_MD, 'utf-8');
  const parts = extractPartNumbers(content);

  console.log(`Found ${parts.length} PART headings:\n`);
  parts.forEach(part => {
    console.log(`  PART ${part.number} (line ${part.line})`);
  });

  console.log('');

  // If no PART headings found, that's valid (compact CLAUDE.md format)
  if (parts.length === 0) {
    console.log('\x1b[32m✓ CLAUDE.md uses compact format (no PART headings)\x1b[0m');
    console.log('\n----------------------------------------');
    console.log('Errors: 0');
    console.log('----------------------------------------\n');
    return 0;
  }

  const errors = validateSequence(parts);

  if (errors.length === 0) {
    console.log('\x1b[32m✓ All PART numbers are sequential\x1b[0m');
    console.log(`  Expected: 1 through ${parts.length}`);
    console.log(`  Found: 1 through ${parts.length}`);
    console.log('\n----------------------------------------');
    console.log('Errors: 0');
    console.log('----------------------------------------\n');
    return 0;
  } else {
    console.log('\x1b[31m✗ PART numbering errors found:\x1b[0m\n');
    errors.forEach(err => {
      console.log(`  \x1b[31m${err}\x1b[0m`);
    });
    console.log('\n----------------------------------------');
    console.log(`Errors: ${errors.length}`);
    console.log('----------------------------------------\n');
    return 1;
  }
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
