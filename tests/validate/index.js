#!/usr/bin/env node
/**
 * Main Validation Entry Point
 * Runs all static validation tests
 */

const agentSchema = require('./agent-schema');
const skillSchema = require('./skill-schema');
const crossRefs = require('./cross-refs');
const stageMatrix = require('./stage-matrix');
const debateConsistency = require('./debate-consistency');
const workflowStateSchema = require('./workflow-state-schema');
const skillFormat = require('./skill-format');
const sharedRefs = require('./shared-refs');
const inputValidation = require('./input-validation');
const errorHandling = require('./error-handling');
const partNumbering = require('./part-numbering');
const quickFixPath = require('./quick-fix-path');
const memorySystem = require('./memory-system');
const tokenBudget = require('./token-budget');
const hookRegistration = require('./hook-registration');
const skillCommandParity = require('./skill-command-parity');
const versionConsistency = require('./version-consistency');
const agentsMap = require('./agents-map');

async function runAllValidations() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Team-Shinchan Static Validation       ║');
  console.log('╚════════════════════════════════════════╝\n');

  const results = {
    agentSchema: 0,
    skillSchema: 0,
    crossRefs: 0,
    stageMatrix: 0,
    debateConsistency: 0,
    workflowStateSchema: 0,
    skillFormat: 0,
    sharedRefs: 0,
    inputValidation: 0,
    errorHandling: 0,
    partNumbering: 0,
    quickFixPath: 0,
    memorySystem: 0,
    tokenBudget: 0,
    hookRegistration: 0,
    skillCommandParity: 0,
    versionConsistency: 0,
    agentsMap: 0
  };

  const times = {
    agentSchema: 0,
    skillSchema: 0,
    crossRefs: 0,
    stageMatrix: 0,
    debateConsistency: 0,
    workflowStateSchema: 0,
    skillFormat: 0,
    sharedRefs: 0,
    inputValidation: 0,
    errorHandling: 0,
    partNumbering: 0,
    quickFixPath: 0,
    memorySystem: 0,
    tokenBudget: 0,
    hookRegistration: 0,
    skillCommandParity: 0,
    versionConsistency: 0,
    agentsMap: 0
  };

  // Run agent schema validation
  let start = Date.now();
  results.agentSchema = agentSchema.runValidation();
  times.agentSchema = Date.now() - start;

  // Run skill schema validation
  start = Date.now();
  results.skillSchema = skillSchema.runValidation();
  times.skillSchema = Date.now() - start;

  // Run cross-reference validation
  start = Date.now();
  results.crossRefs = crossRefs.runValidation();
  times.crossRefs = Date.now() - start;

  // Run stage-tool matrix validation
  start = Date.now();
  results.stageMatrix = stageMatrix.runValidation();
  times.stageMatrix = Date.now() - start;

  // Run debate consistency validation
  start = Date.now();
  results.debateConsistency = debateConsistency.runValidation();
  times.debateConsistency = Date.now() - start;

  // Run workflow state schema validation
  start = Date.now();
  results.workflowStateSchema = workflowStateSchema.runValidation();
  times.workflowStateSchema = Date.now() - start;

  // Run skill format validation
  start = Date.now();
  results.skillFormat = skillFormat.runValidation();
  times.skillFormat = Date.now() - start;

  // Run shared references validation
  start = Date.now();
  results.sharedRefs = sharedRefs.runValidation();
  times.sharedRefs = Date.now() - start;

  // Run input validation check
  start = Date.now();
  results.inputValidation = inputValidation.runValidation();
  times.inputValidation = Date.now() - start;

  // Run error handling check
  start = Date.now();
  results.errorHandling = errorHandling.runValidation();
  times.errorHandling = Date.now() - start;

  // Run part numbering validation
  start = Date.now();
  results.partNumbering = partNumbering.runValidation();
  times.partNumbering = Date.now() - start;

  // Run quick fix path validation
  start = Date.now();
  results.quickFixPath = quickFixPath.runValidation();
  times.quickFixPath = Date.now() - start;

  // Run memory system validation
  start = Date.now();
  results.memorySystem = memorySystem.runValidation();
  times.memorySystem = Date.now() - start;

  // Run token budget validation
  start = Date.now();
  const tokenResult = tokenBudget.validateTokenBudget();
  results.tokenBudget = tokenResult.warnings > 0 ? tokenResult.warnings : 0;
  times.tokenBudget = Date.now() - start;

  // Run hook registration validation
  start = Date.now();
  results.hookRegistration = hookRegistration.runValidation();
  times.hookRegistration = Date.now() - start;

  // Run skill-command parity validation
  start = Date.now();
  results.skillCommandParity = skillCommandParity.runValidation();
  times.skillCommandParity = Date.now() - start;

  // Run version consistency validation
  start = Date.now();
  results.versionConsistency = versionConsistency.runValidation();
  times.versionConsistency = Date.now() - start;

  // Run AGENTS.md map validation
  start = Date.now();
  results.agentsMap = agentsMap.runValidation();
  times.agentsMap = Date.now() - start;

  // Summary
  const totalErrors = Object.values(results).reduce((a, b) => a + b, 0);
  const totalTime = Object.values(times).reduce((a, b) => a + b, 0);

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Validation Summary                            ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  Agent Schema:       ${results.agentSchema === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.agentSchema).padStart(5)}ms  ║`);
  console.log(`║  Skill Schema:       ${results.skillSchema === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.skillSchema).padStart(5)}ms  ║`);
  console.log(`║  Cross-Refs:         ${results.crossRefs === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.crossRefs).padStart(5)}ms  ║`);
  console.log(`║  Stage Matrix:       ${results.stageMatrix === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.stageMatrix).padStart(5)}ms  ║`);
  console.log(`║  Debate Consistency: ${results.debateConsistency === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.debateConsistency).padStart(5)}ms  ║`);
  console.log(`║  Workflow State:     ${results.workflowStateSchema === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.workflowStateSchema).padStart(5)}ms  ║`);
  console.log(`║  Skill Format:       ${results.skillFormat === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.skillFormat).padStart(5)}ms  ║`);
  console.log(`║  Shared Refs:        ${results.sharedRefs === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.sharedRefs).padStart(5)}ms  ║`);
  console.log(`║  Input Validation:   ${results.inputValidation === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.inputValidation).padStart(5)}ms  ║`);
  console.log(`║  Error Handling:     ${results.errorHandling === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.errorHandling).padStart(5)}ms  ║`);
  console.log(`║  PART Numbering:     ${results.partNumbering === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.partNumbering).padStart(5)}ms  ║`);
  console.log(`║  Quick Fix Path:     ${results.quickFixPath === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.quickFixPath).padStart(5)}ms  ║`);
  console.log(`║  Memory System:      ${results.memorySystem === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.memorySystem).padStart(5)}ms  ║`);
  console.log(`║  Token Budget:       ${results.tokenBudget === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[33mWARN\x1b[0m'}  ${String(times.tokenBudget).padStart(5)}ms  ║`);
  console.log(`║  Hook Registration:  ${results.hookRegistration === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.hookRegistration).padStart(5)}ms  ║`);
  console.log(`║  Skill-Cmd Parity:   ${results.skillCommandParity === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.skillCommandParity).padStart(5)}ms  ║`);
  console.log(`║  Version Consist.:   ${results.versionConsistency === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.versionConsistency).padStart(5)}ms  ║`);
  console.log(`║  Agents Map:         ${results.agentsMap === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${String(times.agentsMap).padStart(5)}ms  ║`);
  console.log('╠════════════════════════════════════════════════╣');

  if (totalErrors === 0) {
    console.log('║  \x1b[32m✓ All validations passed!\x1b[0m                      ║');
  } else {
    console.log(`║  \x1b[31m✗ ${totalErrors} validation(s) failed\x1b[0m                      ║`);
  }

  console.log(`║  Total time: ${String(totalTime).padStart(5)}ms                       ║`);
  console.log('╚════════════════════════════════════════════════╝\n');

  return totalErrors > 0 ? 1 : 0;
}

if (require.main === module) {
  runAllValidations().then(code => process.exit(code));
}

module.exports = { runAllValidations };
