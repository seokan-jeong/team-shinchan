#!/usr/bin/env node
/**
 * AGENTS.md Validator
 * Checks that AGENTS.md exists, lists every agent, and matches layer-map.json
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');
const AGENTS_MD = path.join(ROOT_DIR, 'AGENTS.md');
const LAYER_MAP = path.join(AGENTS_DIR, '_shared', 'layer-map.json');

function runValidation() {
  console.log('========================================');
  console.log('  AGENTS.md Map Validation');
  console.log('========================================\n');

  const errors = [];

  // 1. Check AGENTS.md exists
  if (!fs.existsSync(AGENTS_MD)) {
    errors.push('AGENTS.md not found at project root');
    console.log(`  \x1b[31m✗\x1b[0m AGENTS.md not found`);
    console.log('\n----------------------------------------');
    console.log(`Errors: ${errors.length}`);
    console.log('----------------------------------------\n');
    return 1;
  }
  console.log(`  \x1b[32m✓\x1b[0m AGENTS.md exists`);

  const content = fs.readFileSync(AGENTS_MD, 'utf-8');

  // 2. Every agent file must appear in AGENTS.md
  const agentFiles = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));

  console.log(`\nChecking ${agentFiles.length} agents listed...`);
  for (const agent of agentFiles) {
    // Check agent name appears in the registry table
    if (content.includes(`| ${agent} |`)) {
      console.log(`  \x1b[32m✓\x1b[0m ${agent}`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${agent} not found in AGENTS.md`);
      errors.push(`Agent '${agent}' not listed in AGENTS.md`);
    }
  }

  // 3. Verify layer info matches layer-map.json
  if (!fs.existsSync(LAYER_MAP)) {
    errors.push('layer-map.json not found');
    console.log(`\n  \x1b[31m✗\x1b[0m layer-map.json missing`);
  } else {
    const data = JSON.parse(fs.readFileSync(LAYER_MAP, 'utf-8'));
    console.log('\nChecking layer assignments...');
    for (const [layerName, agents] of Object.entries(data.layers)) {
      for (const agent of agents) {
        const row = content.split('\n').find(line => line.startsWith(`| ${agent} |`));
        if (row && row.toLowerCase().includes(layerName)) {
          console.log(`  \x1b[32m✓\x1b[0m ${agent} → ${layerName}`);
        } else if (!row) {
          console.log(`  \x1b[31m✗\x1b[0m ${agent} row not found`);
          errors.push(`Agent '${agent}' from layer-map not in AGENTS.md`);
        } else {
          console.log(`  \x1b[31m✗\x1b[0m ${agent} layer mismatch (expected ${layerName})`);
          errors.push(`Agent '${agent}' layer mismatch: expected '${layerName}'`);
        }
      }
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length}`);
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
