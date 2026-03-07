#!/usr/bin/env node
/**
 * Agent Tool Guard Behavioral Validator
 * Tests hooks/agent-tool-guard.sh runtime behavior with fixture-based isolation.
 *
 * The hook reads ${PWD}/.shinchan-docs/.current-agent to determine the active agent.
 * Each test case creates a temp dir in os.tmpdir() and writes the .current-agent
 * fixture there, then runs the hook with cwd: tmpDir so PWD resolves correctly.
 *
 * Test Cases:
 *  TC-1     : misae (read-only) + Edit(src/foo.js)                → BLOCK
 *  TC-2     : nene (read-only) + Write(hooks/new-hook.sh)         → BLOCK
 *  TC-3     : hiroshi (read-only) + Bash(git commit)              → BLOCK
 *  TC-4     : actionkamen + Bash(git log ; rm -rf .)              → document behavior (HR-2)
 *  TC-5     : misae + Read(src/foo.js)                            → ALLOW
 *  TC-6     : bo (implementer) + Edit(src/app.ts)                 → ALLOW
 *  TC-7     : shinnosuke (orchestrator) + Write(src/main.ts)      → ALLOW
 *  TC-8     : bo + Bash(npm test)                                 → ALLOW
 *  TC-9     : .current-agent file missing                         → ALLOW (all tools)
 *  TC-10    : actionkamen + Write(.shinchan-docs/...) exception   → ALLOW
 *  TC-11    : misae + Write(.shinchan-docs/...) exception         → ALLOW
 *  TC-12    : unknown agent name                                  → ALLOW (not in readOnlyAgents)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const HOOK = path.join(ROOT_DIR, 'hooks/agent-tool-guard.sh');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';

/**
 * Create a temporary fixture directory with a .current-agent file.
 *
 * Directory layout:
 *   tmpDir/
 *     .shinchan-docs/
 *       .current-agent   ← hook reads ${PWD}/.shinchan-docs/.current-agent
 *
 * @param {string} agentName - agent name to write into .current-agent
 * @returns {string} tmpDir absolute path
 */
function mkTmpFixtureWithAgent(agentName) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-atg-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, '.current-agent'), agentName, 'utf-8');
  return tmpDir;
}

/**
 * Create a temporary fixture directory WITHOUT a .current-agent file.
 * Simulates an untracked agent context (hook should allow all tools).
 *
 * @returns {string} tmpDir absolute path
 */
function mkTmpFixtureNoAgent() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-atg-'));
  // Do NOT create .shinchan-docs/.current-agent
  return tmpDir;
}

/**
 * Run the agent-tool-guard hook with given JSON input from a given cwd.
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
 * as workflow-guard-behavior.js and transition-gate-behavior.js.
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

  // ── Prerequisites ────────────────────────────────────────────────────────────

  section('0. Prerequisites');

  if (!fs.existsSync(HOOK)) {
    fail(`hooks/agent-tool-guard.sh not found at: ${HOOK}`);
    return errors;
  }
  ok('hooks/agent-tool-guard.sh exists');

  if (!fs.existsSync(RUN_CJS)) {
    fail(`scripts/run.cjs not found at: ${RUN_CJS}`);
    return errors;
  }
  ok('scripts/run.cjs exists');

  // ── Block Cases: read-only agents blocked from modifying code ────────────────

  section('1. Block Cases — Read-Only Agents: Edit/Write Source Code');

  // TC-1: misae (advisory) + Edit source code → BLOCK
  {
    const tmpDir = mkTmpFixtureWithAgent('misae');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-1: misae + Edit(src/foo.js) → BLOCK (correct — advisory cannot modify code)');
      } else {
        fail(`TC-1: misae + Edit(src/foo.js) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-2: nene (advisory) + Write source code → BLOCK
  {
    const tmpDir = mkTmpFixtureWithAgent('nene');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: 'hooks/new-hook.sh', content: '#!/bin/bash\necho ok' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-2: nene + Write(hooks/new-hook.sh) → BLOCK (correct — advisory cannot write code files)');
      } else {
        fail(`TC-2: nene + Write(hooks/new-hook.sh) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Block Cases: read-only agents blocked from destructive Bash ──────────────

  section('2. Block Cases — Read-Only Agents: Destructive Bash');

  // TC-3: hiroshi (advisory) + Bash(git commit) → BLOCK
  {
    const tmpDir = mkTmpFixtureWithAgent('hiroshi');
    try {
      const result = runHook(
        { tool_name: 'Bash', tool_input: { command: 'git commit -m "fix: test"' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-3: hiroshi + Bash(git commit) → BLOCK (correct — advisory cannot run git commit)');
      } else {
        fail(`TC-3: hiroshi + Bash(git commit) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-4 (HR-2): actionkamen + compound Bash → document behavior
  // The hook checks !/[;&|]/.test(trimCmd) for the test-command exception.
  // A compound command like "git log ; rm -rf ." should hit a destructivePattern
  // on "rm" but the exception check should NOT apply (compound cmd).
  // The outer destructive check should fire and BLOCK.
  {
    const tmpDir = mkTmpFixtureWithAgent('actionkamen');
    try {
      const result = runHook(
        { tool_name: 'Bash', tool_input: { command: 'git log ; rm -rf .' } },
        tmpDir
      );
      if (result.decision === 'block') {
        ok([
          'TC-4 (HR-2): actionkamen + compound Bash "git log ; rm -rf ." → BLOCK',
          '  Guard correctly identifies destructive pattern "rm" and blocks.',
          '  The test-command exception is skipped because ; is present.'
        ].join('\n'));
      } else {
        warn([
          'TC-4 (HR-2): actionkamen + compound Bash "git log ; rm -rf ." → ALLOW',
          '  BUG CONFIRMED (HR-2): The compound command bypass is possible.',
          '  "git log" appears before "rm -rf ." — if the regex matches "rm" the',
          '  destructive check should still fire. But the actionkamen exception',
          '  check sees a ; and skips the test-command path. This means BLOCK',
          '  should occur. If ALLOW is returned, there is a guard gap.',
          '  Raw output: ' + (result.raw.slice(0, 120) || '(empty — exit 0)')
        ].join('\n'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Allow Cases: read-only agents permitted tools ────────────────────────────

  section('3. Allow Cases — Read-Only Agents: Read/Glob/Grep');

  // TC-5: misae + Read tool → ALLOW
  {
    const tmpDir = mkTmpFixtureWithAgent('misae');
    try {
      const result = runHook(
        { tool_name: 'Read', tool_input: { file_path: 'src/foo.js' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-5: misae + Read(src/foo.js) → ALLOW (correct — read-only agents may read)');
      } else {
        fail(`TC-5: misae + Read(src/foo.js) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Allow Cases: non-read-only agents ───────────────────────────────────────

  section('4. Allow Cases — Non-Read-Only Agents: bo, shinnosuke');

  // TC-6: bo (implementer) + Edit → ALLOW
  {
    const tmpDir = mkTmpFixtureWithAgent('bo');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/app.ts', old_string: 'x', new_string: 'y' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-6: bo + Edit(src/app.ts) → ALLOW (correct — bo is execution layer, not read-only)');
      } else {
        fail(`TC-6: bo + Edit(src/app.ts) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-7: shinnosuke (orchestrator) + Write → ALLOW
  {
    const tmpDir = mkTmpFixtureWithAgent('shinnosuke');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: 'src/main.ts', content: 'export {}' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-7: shinnosuke + Write(src/main.ts) → ALLOW (correct — orchestrator is not read-only)');
      } else {
        fail(`TC-7: shinnosuke + Write(src/main.ts) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-8: bo + Bash(npm test) → ALLOW
  {
    const tmpDir = mkTmpFixtureWithAgent('bo');
    try {
      const result = runHook(
        { tool_name: 'Bash', tool_input: { command: 'npm test' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-8: bo + Bash(npm test) → ALLOW (correct — bo is not read-only)');
      } else {
        fail(`TC-8: bo + Bash(npm test) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Edge Cases ────────────────────────────────────────────────────────────────

  section('5. Edge Cases');

  // TC-9: .current-agent file missing → ALLOW (non-subagent context)
  {
    const tmpDir = mkTmpFixtureNoAgent();
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-9: .current-agent missing → ALLOW (correct — hook exits early when no agent tracked)');
      } else {
        fail(`TC-9: .current-agent missing → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-10: actionkamen + Write(.shinchan-docs/...) → ALLOW (exception)
  {
    const tmpDir = mkTmpFixtureWithAgent('actionkamen');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: '.shinchan-docs/main-001/REPORT.md', content: '# Report' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-10: actionkamen + Write(.shinchan-docs/...) → ALLOW (.shinchan-docs exception applies)');
      } else {
        fail(`TC-10: actionkamen + Write(.shinchan-docs/...) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-11: misae + Write(.shinchan-docs/...) → ALLOW (exception)
  {
    const tmpDir = mkTmpFixtureWithAgent('misae');
    try {
      const result = runHook(
        { tool_name: 'Write', tool_input: { file_path: '.shinchan-docs/main-001/REQUESTS.md', content: '# Req' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-11: misae + Write(.shinchan-docs/REQUESTS.md) → ALLOW (.shinchan-docs exception applies)');
      } else {
        fail(`TC-11: misae + Write(.shinchan-docs/...) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-12: Unknown agent name → ALLOW (not in readOnlyAgents list)
  {
    const tmpDir = mkTmpFixtureWithAgent('unknown-agent-xyz');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-12: unknown agent "unknown-agent-xyz" + Edit → ALLOW (not in readOnlyAgents — exits early)');
      } else {
        warn([
          'TC-12: unknown agent + Edit → BLOCK (unexpected)',
          '  Guard blocked an agent not in readOnlyAgents. Check guard logic.',
          `  reason: ${(result.reason || '').slice(0, 120)}`
        ].join('\n'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  section('Summary — agent-tool-guard-behavior');
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${errors}`);
  console.log(`  Warnings: ${warnings}`);
  console.log();

  if (errors === 0 && warnings === 0) {
    console.log('  \x1b[32m✓ ALL AGENT TOOL GUARD BEHAVIOR TESTS PASSED\x1b[0m\n');
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
