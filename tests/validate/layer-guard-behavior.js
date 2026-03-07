#!/usr/bin/env node
/**
 * Layer Guard Behavioral Validator
 * Tests hooks/layer-guard.sh runtime behavior with fixture-based isolation.
 *
 * The hook reads ${PWD}/.shinchan-docs/.current-agent to determine the source agent,
 * then checks agents/_shared/layer-map.json to determine allowed Task calls.
 *
 * Critical implementation detail:
 *   - The hook uses SCRIPT_DIR to locate layer-map.json (absolute path from hook location).
 *   - The hook uses ${PWD}/.shinchan-docs/.current-agent (resolved from cwd).
 *   - Only Task calls to "team-shinchan:" agents are checked.
 *   - .current-agent missing → defaults to 'shinnosuke' (orchestration layer) [HR-1].
 *
 * Test Cases:
 *  TC-1     : misae(advisory) → aichan(specialist) Task        → BLOCK
 *  TC-2     : bo(execution) → shinnosuke(orchestration) Task   → BLOCK
 *  TC-3     : bo(execution) → actionkamen(advisory) Task       → ALLOW (exception)
 *  TC-4     : kazama(execution) → midori(orchestration) Task   → ALLOW (exception)
 *  TC-5     : shiro(utility) → bo(execution) Task              → BLOCK
 *  TC-6     : .current-agent missing → default shinnosuke → bo → ALLOW (HR-1 doc)
 *  TC-7     : misae + non-team-shinchan Task → ALLOW (no check)
 *  TC-8     : non-Task tool (Edit) with any agent              → ALLOW (gate skips)
 *  TC-9     : shinnosuke(orchestration) → bo(execution) Task   → ALLOW (downward OK)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const HOOK = path.join(ROOT_DIR, 'hooks/layer-guard.sh');

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
 * Note: layer-guard.sh locates layer-map.json via SCRIPT_DIR (hook's own directory),
 * so layer-map.json does NOT need to be in tmpDir. The real file in the repo is used.
 *
 * @param {string} agentName - agent name to write into .current-agent
 * @returns {string} tmpDir absolute path
 */
function mkTmpFixtureWithAgent(agentName) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-lg-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, '.current-agent'), agentName, 'utf-8');
  return tmpDir;
}

/**
 * Create a temporary fixture directory WITHOUT a .current-agent file.
 * Simulates the HR-1 scenario where no agent is tracked.
 * The hook defaults to 'shinnosuke' (orchestration layer).
 *
 * @returns {string} tmpDir absolute path
 */
function mkTmpFixtureNoAgent() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-lg-'));
  // Do NOT create .shinchan-docs/.current-agent
  return tmpDir;
}

/**
 * Run the layer-guard hook with given JSON input from a given cwd.
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
    fail(`hooks/layer-guard.sh not found at: ${HOOK}`);
    return errors;
  }
  ok('hooks/layer-guard.sh exists');

  if (!fs.existsSync(RUN_CJS)) {
    fail(`scripts/run.cjs not found at: ${RUN_CJS}`);
    return errors;
  }
  ok('scripts/run.cjs exists');

  const layerMapPath = path.join(ROOT_DIR, 'agents/_shared/layer-map.json');
  if (!fs.existsSync(layerMapPath)) {
    fail(`agents/_shared/layer-map.json not found — layer-guard.sh will degrade gracefully`);
    return errors;
  }
  ok('agents/_shared/layer-map.json exists');

  // ── Block Cases: upward layer violations ─────────────────────────────────────

  section('1. Block Cases — Layer Violations');

  // TC-1: misae(advisory) → aichan(specialist) Task → BLOCK
  // advisory allowed_calls: ["utility"] — specialist not included
  {
    const tmpDir = mkTmpFixtureWithAgent('misae');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:aichan', prompt: 'Do frontend work' }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-1: misae(advisory) → aichan(specialist) Task → BLOCK (correct — advisory cannot call specialist)');
      } else {
        fail(`TC-1: misae→aichan Task → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-2: bo(execution) → shinnosuke(orchestration) Task → BLOCK
  // execution allowed_calls: ["utility"] — orchestration not included, and
  // the only execution→orchestration exception is for "midori", not "shinnosuke"
  {
    const tmpDir = mkTmpFixtureWithAgent('bo');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:shinnosuke', prompt: 'Orchestrate something' }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-2: bo(execution) → shinnosuke(orchestration) Task → BLOCK (correct — no upward orchestration call)');
      } else {
        fail(`TC-2: bo→shinnosuke Task → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-5: shiro(utility) → bo(execution) Task → BLOCK
  // utility allowed_calls: [] — cannot call any other layer
  {
    const tmpDir = mkTmpFixtureWithAgent('shiro');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:bo', prompt: 'Implement this' }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-5: shiro(utility) → bo(execution) Task → BLOCK (correct — utility cannot call execution)');
      } else {
        fail(`TC-5: shiro→bo Task → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Allow Cases: downward calls and exceptions ────────────────────────────────

  section('2. Allow Cases — Valid Calls and Exceptions');

  // TC-9: shinnosuke(orchestration) → bo(execution) Task → ALLOW (downward OK)
  // orchestration allowed_calls: ["execution", "specialist", "advisory", "utility"]
  {
    const tmpDir = mkTmpFixtureWithAgent('shinnosuke');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:bo', prompt: 'Execute Phase 4' }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-9: shinnosuke(orchestration) → bo(execution) Task → ALLOW (downward call permitted)');
      } else {
        fail(`TC-9: shinnosuke→bo Task → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-3: bo(execution) → actionkamen(advisory) Task → ALLOW (exception)
  // exceptions entry: { from: "execution", to: "advisory", agent: "actionkamen" }
  {
    const tmpDir = mkTmpFixtureWithAgent('bo');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:actionkamen', prompt: 'Review my implementation' }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-3: bo(execution) → actionkamen(advisory) Task → ALLOW (exception: review callable from execution)');
      } else {
        fail(`TC-3: bo→actionkamen Task → expected ALLOW (exception), got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-4: kazama(execution) → midori(orchestration) Task → ALLOW (exception)
  // exceptions entry: { from: "execution", to: "orchestration", agent: "midori" }
  {
    const tmpDir = mkTmpFixtureWithAgent('kazama');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:midori', prompt: 'Debate this architecture' }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-4: kazama(execution) → midori(orchestration) Task → ALLOW (exception: debate via Midori)');
      } else {
        fail(`TC-4: kazama→midori Task → expected ALLOW (exception), got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Edge Cases ────────────────────────────────────────────────────────────────

  section('3. Edge Cases — Behavior Documentation');

  // TC-7: misae + non-team-shinchan Task → ALLOW (hook skips external agents)
  {
    const tmpDir = mkTmpFixtureWithAgent('misae');
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'computer', prompt: 'Do something' }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-7: misae + non-team-shinchan Task("computer") → ALLOW (external agents not checked)');
      } else {
        fail(`TC-7: misae + external Task → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-8: non-Task tool (Edit) with read-only agent → ALLOW (layer guard skips non-Task)
  {
    const tmpDir = mkTmpFixtureWithAgent('misae');
    try {
      const result = runHook(
        { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js', old_string: 'a', new_string: 'b' } },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-8: misae + Edit (non-Task) → ALLOW (layer-guard only checks Task tool, skips all others)');
      } else {
        fail(`TC-8: misae + Edit (non-Task) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-6 (HR-1): .current-agent missing → defaults to shinnosuke → Task with bo → ALLOW
  // This documents the HR-1 vulnerability: if .current-agent is absent, the hook
  // defaults to 'shinnosuke' (orchestration), which has the broadest allowed_calls.
  // Any agent could benefit from this if .current-agent is not set.
  {
    const tmpDir = mkTmpFixtureNoAgent();
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:bo', prompt: 'Execute something' }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok([
          'TC-6 (HR-1): .current-agent missing → default shinnosuke → Task(bo) → ALLOW',
          '  DESIGN NOTE (HR-1): When .current-agent is absent, the hook defaults to',
          '  "shinnosuke" (orchestration layer). This means any agent running without',
          '  a tracked .current-agent file can call any target as if it were shinnosuke.',
          '  This is a potential privilege escalation path if .current-agent is not set.'
        ].join('\n'));
      } else {
        warn([
          'TC-6 (HR-1): .current-agent missing → Task(bo) → BLOCK (unexpected)',
          '  The hook blocked even with default shinnosuke. Check default behavior.',
          `  reason: ${(result.reason || '').slice(0, 120)}`
        ].join('\n'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // HR-1 follow-up: shiro without .current-agent → defaults to shinnosuke →
  // can call execution layer agents despite shiro's own layer having allowed_calls: []
  // This is the actual vulnerability: shiro (utility) bypasses its own restrictions
  // because the hook does not know shiro is the caller.
  {
    const tmpDir = mkTmpFixtureNoAgent();
    try {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'team-shinchan:bo', prompt: 'Escalate via missing agent file' }
        },
        tmpDir
      );
      // Same test as TC-6 but documenting the shiro-specific scenario
      if (result.decision !== 'block') {
        warn([
          'HR-1 Vulnerability: utility agent (e.g., shiro) running without .current-agent',
          '  → hook defaults to shinnosuke (orchestration) → can call any layer.',
          '  If shiro fails to set .current-agent (or it is deleted), it effectively',
          '  becomes shinnosuke from the guard\'s perspective.',
          '  Recommendation: default to a restricted agent (e.g., "unknown") rather',
          '  than the most privileged orchestrator.'
        ].join('\n'));
      } else {
        ok('HR-1: Missing .current-agent → BLOCK (guard is conservative — good)');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  section('Summary — layer-guard-behavior');
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${errors}`);
  console.log(`  Warnings: ${warnings}`);
  console.log();

  if (errors === 0 && warnings === 0) {
    console.log('  \x1b[32m✓ ALL LAYER GUARD BEHAVIOR TESTS PASSED\x1b[0m\n');
  } else if (errors === 0) {
    console.log(`  \x1b[33m! PASSED with ${warnings} warning(s) — see HR-1 notes above\x1b[0m\n`);
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
