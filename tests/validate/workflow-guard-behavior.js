#!/usr/bin/env node
/**
 * Workflow Guard Behavioral Validator
 * Tests hooks/workflow-guard.sh runtime behavior with fixture-based isolation.
 *
 * Each test case:
 *  1. Creates a temp dir in os.tmpdir()
 *  2. Writes a WORKFLOW_STATE.yaml fixture inside .shinchan-docs/test-doc/
 *  3. Pipes JSON input to the hook via execSync with cwd: tmpDir
 *  4. Asserts the decision (block vs allow)
 *  5. Cleans up the temp dir in finally
 *
 * Test Cases:
 *  TC-1  : requirements stage, Edit tool                → BLOCK
 *  TC-2  : requirements stage, Write(src/foo.js)        → BLOCK
 *  TC-3  : requirements stage, Bash(git push)           → BLOCK
 *  TC-4  : planning stage, Edit tool                    → BLOCK
 *  TC-5  : planning stage, Bash(npm install)            → BLOCK
 *  TC-6  : requirements stage, Read tool                → ALLOW
 *  TC-7  : requirements stage, Grep tool                → ALLOW
 *  TC-8  : execution stage, Write(src/app.ts)           → ALLOW
 *  TC-9  : execution stage, Edit(src/app.ts)            → ALLOW
 *  TC-10 : requirements stage, compound Bash            → document behavior (HR-2)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const HOOK = path.join(ROOT_DIR, 'hooks/workflow-guard.sh');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';

/**
 * Create a temporary fixture directory with a WORKFLOW_STATE.yaml.
 * Returns the tmpDir path. Caller is responsible for cleanup.
 *
 * @param {string} stage  - e.g. 'requirements', 'planning', 'execution', 'completion'
 * @param {string} status - e.g. 'active'
 * @returns {string} tmpDir absolute path
 */
function mkTmpFixture(stage, status = 'active') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-wg-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs', 'test-doc');
  fs.mkdirSync(docsDir, { recursive: true });

  const yaml = [
    '---',
    'document_type: workflow_state',
    `status: ${status}`,
    `stage: ${stage}`,
    'created: "2026-03-07"',
    'doc_id: test-doc',
    '---',
    ''
  ].join('\n');

  fs.writeFileSync(path.join(docsDir, 'WORKFLOW_STATE.yaml'), yaml, 'utf-8');
  return tmpDir;
}

/**
 * Create a temporary fixture directory with NO .shinchan-docs directory.
 * Simulates a project with no active workflow.
 *
 * @returns {string} tmpDir absolute path
 */
function mkTmpNoWorkflow() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-wg-'));
}

/**
 * Run the workflow-guard hook with given JSON input from a given cwd.
 *
 * @param {object} input - the JSON object to pipe as stdin
 * @param {string} cwd   - working directory (determines where .shinchan-docs is found)
 * @returns {{ exitCode: number, decision: string|null, reason: string|null, raw: string }}
 */
function runHook(input, cwd) {
  const inputJson = JSON.stringify(input);
  try {
    const raw = execSync(
      `node "${RUN_CJS}" "${HOOK}"`,
      {
        input: inputJson,
        cwd: cwd,
        timeout: 8000,
        encoding: 'utf-8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT_DIR }
      }
    );
    const trimmed = raw.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        return { exitCode: 0, decision: parsed.decision || null, reason: parsed.reason || null, raw: trimmed };
      } catch {
        return { exitCode: 0, decision: null, reason: null, raw: trimmed };
      }
    }
    return { exitCode: 0, decision: null, reason: null, raw: '' };
  } catch (e) {
    // execSync throws when exit code != 0
    const exitCode = e.status || 1;
    const raw = (e.stdout || '').trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { exitCode, decision: parsed.decision || null, reason: parsed.reason || null, raw };
      } catch {
        return { exitCode, decision: null, reason: null, raw };
      }
    }
    return { exitCode, decision: null, reason: null, raw };
  }
}

/**
 * Main validation runner. Follows the same section/ok/fail/warn pattern
 * as hook-execution.js.
 *
 * @returns {number} error count (0 = all passed)
 */
function runValidation() {
  let errors = 0;
  let warnings = 0;
  let passed = 0;

  function ok(msg) { console.log(`  ${PASS} ${msg}`); passed++; }
  function fail(msg) { console.log(`  ${FAIL} ${msg}`); errors++; }
  function warn(msg) { console.log(`  ${WARN} ${msg}`); warnings++; }

  function section(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(60)}\n`);
  }

  // ── Prerequisites ──────────────────────────────────────────────────────────

  section('0. Prerequisites');

  if (!fs.existsSync(HOOK)) {
    fail(`hooks/workflow-guard.sh not found at: ${HOOK}`);
    return errors;
  }
  ok('hooks/workflow-guard.sh exists');

  if (!fs.existsSync(RUN_CJS)) {
    fail(`scripts/run.cjs not found at: ${RUN_CJS}`);
    return errors;
  }
  ok('scripts/run.cjs exists');

  // ── Block Cases: requirements stage ────────────────────────────────────────

  section('1. Block Cases — Stage: requirements');

  // TC-1: Edit tool in requirements → BLOCK
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-1: requirements + Edit → BLOCK (correct)');
      } else {
        fail(`TC-1: requirements + Edit → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-2: Write to source file (non-.shinchan-docs) in requirements → BLOCK
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: 'src/foo.js', content: 'console.log("test")' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-2: requirements + Write(src/foo.js) → BLOCK (correct)');
      } else {
        fail(`TC-2: requirements + Write(src/foo.js) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-3: Bash with destructive command (git push) in requirements → BLOCK
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Bash', tool_input: { command: 'git push origin main' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-3: requirements + Bash(git push) → BLOCK (correct)');
      } else {
        fail(`TC-3: requirements + Bash(git push) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Block Cases: planning stage ────────────────────────────────────────────

  section('2. Block Cases — Stage: planning');

  // TC-4: Edit tool in planning → BLOCK
  {
    const tmpDir = mkTmpFixture('planning');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/bar.ts', old_string: 'x', new_string: 'y' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-4: planning + Edit → BLOCK (correct)');
      } else {
        fail(`TC-4: planning + Edit → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-5: Bash with destructive command (npm install) in planning → BLOCK
  {
    const tmpDir = mkTmpFixture('planning');
    try {
      const result = runHook(
        { tool_name: 'Bash', tool_input: { command: 'npm install lodash' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-5: planning + Bash(npm install) → BLOCK (correct)');
      } else {
        fail(`TC-5: planning + Bash(npm install) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Allow Cases ─────────────────────────────────────────────────────────────

  section('3. Allow Cases');

  // TC-6: Read tool in requirements → ALLOW
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Read', tool_input: { file_path: 'src/foo.js' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-6: requirements + Read → ALLOW (correct)');
      } else {
        fail(`TC-6: requirements + Read → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-7: Grep tool in requirements → ALLOW
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Grep', tool_input: { pattern: 'foo', path: 'src/' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-7: requirements + Grep → ALLOW (correct)');
      } else {
        fail(`TC-7: requirements + Grep → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-8: Write tool in execution stage → ALLOW
  {
    const tmpDir = mkTmpFixture('execution');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: 'src/app.ts', content: 'export {}' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-8: execution + Write(src/app.ts) → ALLOW (correct)');
      } else {
        fail(`TC-8: execution + Write(src/app.ts) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-9: Edit tool in execution stage → ALLOW
  {
    const tmpDir = mkTmpFixture('execution');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/app.ts', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-9: execution + Edit(src/app.ts) → ALLOW (correct)');
      } else {
        fail(`TC-9: execution + Edit(src/app.ts) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Edge Case: HR-2 Compound Command Bypass ─────────────────────────────────

  section('4. Edge Case — HR-2: Compound Bash Command');

  // TC-10: Bash with compound command in requirements → test behavior and document
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Bash', tool_input: { command: 'git log ; rm -rf .' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-10 (HR-2): requirements + compound Bash "git log ; rm -rf ." → BLOCK (guard handles compound cmd correctly)');
      } else {
        warn([
          'TC-10 (HR-2): requirements + compound Bash "git log ; rm -rf ." → ALLOW',
          '  BUG CONFIRMED: workflow-guard.sh compound command bypass (HR-2)',
          '  The destructive regex matches "rm" in "rm -rf ." but "git log" appears first.',
          '  Actual hook output: ' + (result.raw.slice(0, 120) || '(empty — exit 0)')
        ].join('\n'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Bonus: .shinchan-docs/ Write exception in requirements ─────────────────

  section('5. Exception Cases');

  // Write to .shinchan-docs/ in requirements → ALLOW (documented exception)
  {
    const tmpDir = mkTmpFixture('requirements');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: '.shinchan-docs/main-001/REQUESTS.md', content: '# Req' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('Exception: requirements + Write(.shinchan-docs/...) → ALLOW (exception applies)');
      } else {
        fail(`Exception: requirements + Write(.shinchan-docs/...) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // No active workflow (no .shinchan-docs dir) → ALLOW everything
  {
    const tmpDir = mkTmpNoWorkflow();
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('Exception: no .shinchan-docs dir + Edit → ALLOW (no workflow, guard passes)');
      } else {
        fail(`Exception: no .shinchan-docs dir + Edit → expected ALLOW, got BLOCK`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // completion stage, Edit → BLOCK
  {
    const tmpDir = mkTmpFixture('completion');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.ts', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('Exception: completion + Edit → BLOCK (correct)');
      } else {
        fail(`Exception: completion + Edit → expected BLOCK, got decision="${result.decision}"`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // completion stage, Write to .md → ALLOW
  {
    const tmpDir = mkTmpFixture('completion');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: 'IMPLEMENTATION.md', content: '# Impl' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('Exception: completion + Write(IMPLEMENTATION.md) → ALLOW (.md exception applies)');
      } else {
        fail(`Exception: completion + Write(IMPLEMENTATION.md) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  section('Summary — workflow-guard-behavior');
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${errors}`);
  console.log(`  Warnings: ${warnings}`);
  console.log();

  if (errors === 0 && warnings === 0) {
    console.log('  \x1b[32m✓ ALL WORKFLOW GUARD BEHAVIOR TESTS PASSED\x1b[0m\n');
  } else if (errors === 0) {
    console.log(`  \x1b[33m! PASSED with ${warnings} warning(s) — see HR-2 notes above\x1b[0m\n`);
  } else {
    console.log(`  \x1b[31m✗ ${errors} test(s) failed\x1b[0m\n`);
  }

  return errors;
}

// Run directly if invoked as main script
if (require.main === module) {
  const exitErrors = runValidation();
  process.exit(exitErrors > 0 ? 1 : 0);
}

module.exports = { runValidation };
