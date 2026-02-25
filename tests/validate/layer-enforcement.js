#!/usr/bin/env node
/**
 * Layer Enforcement Validator
 * Validates that agent-to-agent references respect the dependency layer map
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');
const LAYER_MAP_PATH = path.join(AGENTS_DIR, '_shared/layer-map.json');

// Skills (not agents) - skip these references
const KNOWN_SKILLS = [
  'start', 'status', 'autopilot', 'ralph', 'ultrawork', 'plan', 'analyze', 'deepsearch',
  'debate', 'orchestrate', 'learn', 'memories', 'forget', 'help', 'resume', 'review',
  'frontend', 'backend', 'devops', 'implement', 'requirements', 'vision', 'bigproject',
  'verify-implementation', 'manage-skills', 'verify-agents', 'verify-skills',
  'verify-consistency', 'verify-workflow', 'verify-memory', 'verify-budget',
  'research', 'work-log', 'session-summary'
];

function getLayerForAgent(agent, layers) {
  for (const [layer, agents] of Object.entries(layers)) {
    if (agents.includes(agent)) return layer;
  }
  return null;
}

function isAllowedCall(srcLayer, tgtLayer, tgtAgent, allowedCalls, exceptions) {
  if (srcLayer === tgtLayer) return true;
  if ((allowedCalls[srcLayer] || []).includes(tgtLayer)) return true;
  return exceptions.some(e => e.from === srcLayer && e.to === tgtLayer && e.agent === tgtAgent);
}

function getAgentReferences(content) {
  const pattern = /team-shinchan:([\w-]+)/g;
  const refs = new Set();
  let m;
  while ((m = pattern.exec(content)) !== null) {
    if (!KNOWN_SKILLS.includes(m[1])) refs.add(m[1]);
  }
  return Array.from(refs);
}

function runValidation() {
  console.log('========================================');
  console.log('  Layer Enforcement Validation');
  console.log('========================================\n');

  const errors = [];
  const warnings = [];

  if (!fs.existsSync(LAYER_MAP_PATH)) {
    console.log('  \x1b[33m?\x1b[0m layer-map.json not found, skipping\n');
    return 0;
  }

  const layerMap = JSON.parse(fs.readFileSync(LAYER_MAP_PATH, 'utf-8'));
  const { layers, allowed_calls, exceptions } = layerMap;

  const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).sort();
  const allAgents = agentFiles.map(f => f.replace('.md', ''));
  console.log(`Found ${agentFiles.length} agent(s), layer map defines ${Object.values(layers).flat().length}\n`);

  // Verify all agent files are in the layer map
  console.log('Checking agent layer coverage...');
  allAgents.forEach(agent => {
    const layer = getLayerForAgent(agent, layers);
    if (layer) {
      console.log(`  \x1b[32m✓\x1b[0m ${agent} → ${layer}`);
    } else {
      console.log(`  \x1b[33m?\x1b[0m ${agent} → not in layer map`);
      warnings.push(`Agent not in layer map: ${agent}`);
    }
  });

  // Scan each agent file for cross-layer references
  console.log('\nChecking layer dependency rules...');
  let checkedCount = 0;

  agentFiles.forEach(file => {
    const name = file.replace('.md', '');
    const srcLayer = getLayerForAgent(name, layers);
    if (!srcLayer) return;

    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const crossRefs = getAgentReferences(content).filter(r => r !== name);
    if (crossRefs.length === 0) return;

    crossRefs.forEach(target => {
      const tgtLayer = getLayerForAgent(target, layers);
      if (!tgtLayer) return;
      checkedCount++;

      if (isAllowedCall(srcLayer, tgtLayer, target, allowed_calls, exceptions)) {
        console.log(`  \x1b[32m✓\x1b[0m ${name}(${srcLayer}) → ${target}(${tgtLayer})`);
      } else {
        console.log(`  \x1b[31m✗\x1b[0m ${name}(${srcLayer}) → ${target}(${tgtLayer}) VIOLATION`);
        errors.push(`Layer violation: ${name}(${srcLayer}) → ${target}(${tgtLayer})`);
      }
    });
  });

  console.log(`\n  Checked ${checkedCount} cross-layer reference(s)`);

  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
  console.log('----------------------------------------\n');

  if (errors.length > 0) {
    console.log('Errors (layer violations):');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  \x1b[33m• ${w}\x1b[0m`));
    console.log();
  }

  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
