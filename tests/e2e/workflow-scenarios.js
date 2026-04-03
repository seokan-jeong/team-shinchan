#!/usr/bin/env node
/**
 * Team-Shinchan E2E Workflow Scenario Tests
 * Fixture-based integration tests for stage transitions, AK gate,
 * and transition-gate pipeline.
 *
 * Inspired by claw-code compat-harness pattern: fixture-based conditional
 * integration tests that validate end-to-end pipeline behavior.
 *
 * Test Scenarios:
 *   S-1: Full stage progression (requirements → planning → execution → completion)
 *   S-2: AK gate enforcement — transition blocked without AK approval on disk
 *   S-3: Transition gate pipeline — artifact prerequisites enforced per stage
 *   S-4: Pre-compact state preservation — semantic context saved correctly
 *   S-5: Token estimator — threshold detection and recommendation
 *   S-6: Status completion gate — status:completed requires stage=completion + artifacts
 *
 * Conditional execution: tests requiring hook execution are skipped when
 * scripts/run.cjs is unavailable (CI environments without Node.js hooks).
 *
 * Only uses Node.js built-in modules. No external dependencies.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const TRANSITION_GATE = path.join(ROOT_DIR, 'hooks/transition-gate.sh');
const PRE_COMPACT = path.join(ROOT_DIR, 'hooks/pre-compact.sh');
const TOKEN_ESTIMATOR = path.join(ROOT_DIR, 'src/token-estimator.js');

const PASS = '\x1b[32m\u2713\x1b[0m';
const FAIL = '\x1b[31m\u2717\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';
const SKIP = '\x1b[36m-\x1b[0m';

// ── Fixture helpers ──────────────────────────────────────────────────────────

/**
 * Create a temporary fixture directory with a WORKFLOW_STATE.yaml.
 *
 * @param {string} stage   - e.g. 'requirements', 'planning', 'execution', 'completion'
 * @param {object} [opts]
 * @param {string} [opts.status]      - workflow status (default: 'active')
 * @param {string|null} [opts.akStage] - append AK APPROVED history entry for this stage
 * @param {boolean} [opts.withRequests]  - create a valid REQUESTS.md
 * @param {boolean} [opts.withProgress]  - create a valid PROGRESS.md
 * @param {boolean} [opts.withRetro]     - create RETROSPECTIVE.md
 * @param {boolean} [opts.withImpl]      - create IMPLEMENTATION.md
 * @param {boolean} [opts.withTracker]   - create work-tracker.jsonl with sample events
 * @returns {{ tmpDir: string, docsDir: string, workflowFile: string }}
 */
function mkFixture(stage, opts = {}) {
  const {
    status = 'active',
    akStage = null,
    withRequests = false,
    withProgress = false,
    withRetro = false,
    withImpl = false,
    withTracker = false,
  } = opts;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-e2e-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs', 'test-doc');
  fs.mkdirSync(docsDir, { recursive: true });

  let yaml = [
    '---',
    'document_type: workflow_state',
    `status: ${status}`,
    `stage: ${stage}`,
    'created: "2026-03-15"',
    'doc_id: test-doc',
    '---',
    ''
  ].join('\n');

  if (akStage) {
    yaml += [
      'history:',
      '  - event: ak_review',
      '    agent: action_kamen',
      `    stage: ${akStage}`,
      '    verdict: APPROVED',
      '    retry_count: 0',
      ''
    ].join('\n');
  }

  const workflowFile = path.join(docsDir, 'WORKFLOW_STATE.yaml');
  fs.writeFileSync(workflowFile, yaml, 'utf-8');

  if (withRequests) {
    fs.writeFileSync(
      path.join(docsDir, 'REQUESTS.md'),
      '# Problem Statement\nWe need feature X.\n\n# Requirements\n- Requirement A\n- Requirement B\n',
      'utf-8'
    );
  }

  if (withProgress) {
    fs.writeFileSync(
      path.join(docsDir, 'PROGRESS.md'),
      [
        '# Progress',
        '',
        '## Phase 1: Initialize project structure and configure all required dependencies (AC-1)',
        '### Phase 1',
        '- [x] Initialize project structure with proper directory layout',
        '- [x] Configure package dependencies and build tooling',
        '',
        '**AC**: AC-1 verified — project compiles and tests pass',
        '',
        '## Phase 2: Implement core business logic with comprehensive error handling (AC-2)',
        '### Phase 2',
        '- [ ] Implement core logic for user-facing features',
        '- [ ] Add error handling and input validation',
        '',
        '**AC**: AC-2 pending — all integration tests pass',
        ''
      ].join('\n'),
      'utf-8'
    );
  }

  if (withRetro) {
    fs.writeFileSync(
      path.join(docsDir, 'RETROSPECTIVE.md'),
      '# Retrospective\n\n## What went well\n- Fast iteration\n\n## What to improve\n- Better testing\n',
      'utf-8'
    );
  }

  if (withImpl) {
    fs.writeFileSync(
      path.join(docsDir, 'IMPLEMENTATION.md'),
      '# Implementation Summary\n\n## Changes\n- Added feature X\n- Modified component Y\n',
      'utf-8'
    );
  }

  if (withTracker) {
    const events = [
      { ts: '2026-03-15T10:00:00Z', type: 'SessionStart', data: { hook_event: 'SessionStart' } },
      { ts: '2026-03-15T10:01:00Z', type: 'UserPromptSubmit', data: { hook_event: 'UserPromptSubmit', content: 'Implement the dark mode toggle feature' } },
      { ts: '2026-03-15T10:02:00Z', type: 'file_change', data: { file: 'src/components/Settings.tsx', action: 'modify', doc_id: 'test-doc' } },
      { ts: '2026-03-15T10:03:00Z', type: 'file_change', data: { file: 'src/styles/theme.css', action: 'create', doc_id: 'test-doc' } },
      { ts: '2026-03-15T10:04:00Z', type: 'PostToolUse', data: { tool_input: { file_path: 'tests/settings.test.ts' } } },
      { ts: '2026-03-15T10:05:00Z', type: 'UserPromptSubmit', data: { hook_event: 'UserPromptSubmit', content: 'Add unit tests for the toggle component' } },
    ];
    const jsonl = events.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(path.join(tmpDir, '.shinchan-docs', 'work-tracker.jsonl'), jsonl, 'utf-8');
  }

  return { tmpDir, docsDir, workflowFile };
}

/**
 * Clean up a fixture directory.
 */
function cleanFixture(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
}

/**
 * Run a hook with given JSON input from a given cwd.
 */
function runHook(hookPath, input, cwd) {
  const inputJson = JSON.stringify(input);
  try {
    const raw = execSync(
      `node "${RUN_CJS}" "${hookPath}"`,
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

// ── Test runner ──────────────────────────────────────────────────────────────

function runValidation() {
  let errors = 0;
  let warnings = 0;
  let passed = 0;
  let skipped = 0;

  function ok(msg) { console.log(`  ${PASS} ${msg}`); passed++; }
  function fail(msg) { console.log(`  ${FAIL} ${msg}`); errors++; }
  function warn(msg) { console.log(`  ${WARN} ${msg}`); warnings++; }
  function skip(msg) { console.log(`  ${SKIP} ${msg}`); skipped++; }

  function section(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(60)}\n`);
  }

  // ── Prerequisites ─────────────────────────────────────────────────────────

  section('0. Prerequisites');

  const hasRunCjs = fs.existsSync(RUN_CJS);
  const hasTransitionGate = fs.existsSync(TRANSITION_GATE);
  const hasPreCompact = fs.existsSync(PRE_COMPACT);
  const hasTokenEstimator = fs.existsSync(TOKEN_ESTIMATOR);

  if (hasRunCjs) ok('scripts/run.cjs exists');
  else warn('scripts/run.cjs not found — hook-based tests will be skipped');

  if (hasTransitionGate) ok('hooks/transition-gate.sh exists');
  else warn('hooks/transition-gate.sh not found');

  if (hasPreCompact) ok('hooks/pre-compact.sh exists');
  else warn('hooks/pre-compact.sh not found');

  if (hasTokenEstimator) ok('src/token-estimator.js exists');
  else warn('src/token-estimator.js not found');

  const canRunHooks = hasRunCjs && hasTransitionGate;

  // ── S-1: Full stage progression ───────────────────────────────────────────

  section('S-1: Stage Transition — requirements -> planning (valid artifacts + AK)');

  if (!canRunHooks) {
    skip('S-1: Skipped — hook prerequisites missing');
  } else {
    const { tmpDir, docsDir, workflowFile } = mkFixture('requirements', {
      withRequests: true,
      akStage: 'requirements'
    });
    try {
      const result = runHook(TRANSITION_GATE, {
        tool_name: 'Write',
        tool_input: {
          file_path: workflowFile,
          content: '---\nstage: planning\nstatus: active\n---\n'
        }
      }, tmpDir);

      if (result.decision !== 'block') {
        ok('S-1a: requirements->planning with valid REQUESTS.md + AK -> ALLOW');
      } else {
        fail(`S-1a: requirements->planning expected ALLOW, got BLOCK: ${(result.reason || '').slice(0, 100)}`);
      }
    } finally {
      cleanFixture(tmpDir);
    }
  }

  // S-1b: planning -> execution (valid artifacts + AK)
  if (!canRunHooks) {
    skip('S-1b: Skipped — hook prerequisites missing');
  } else {
    const { tmpDir, docsDir, workflowFile } = mkFixture('planning', {
      withRequests: true,
      withProgress: true,
      akStage: 'planning'
    });
    try {
      const result = runHook(TRANSITION_GATE, {
        tool_name: 'Write',
        tool_input: {
          file_path: workflowFile,
          content: '---\nstage: execution\nstatus: active\n---\n'
        }
      }, tmpDir);

      if (result.decision !== 'block') {
        ok('S-1b: planning->execution with valid PROGRESS.md + AK -> ALLOW');
      } else {
        fail(`S-1b: planning->execution expected ALLOW, got BLOCK: ${(result.reason || '').slice(0, 100)}`);
      }
    } finally {
      cleanFixture(tmpDir);
    }
  }

  // ── S-2: AK gate enforcement ──────────────────────────────────────────────

  section('S-2: AK Gate — transition blocked without AK approval');

  if (!canRunHooks) {
    skip('S-2: Skipped — hook prerequisites missing');
  } else {
    // S-2a: requirements->planning WITHOUT AK approval
    {
      const { tmpDir, docsDir, workflowFile } = mkFixture('requirements', {
        withRequests: true
        // No akStage — no AK approval on disk
      });
      try {
        const result = runHook(TRANSITION_GATE, {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: planning\nstatus: active\n---\n'
          }
        }, tmpDir);

        if (result.decision === 'block' && (result.reason || '').includes('Action Kamen')) {
          ok('S-2a: requirements->planning without AK -> BLOCK (AK mentioned in reason)');
        } else if (result.decision === 'block') {
          ok(`S-2a: requirements->planning without AK -> BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
        } else {
          fail(`S-2a: requirements->planning without AK -> expected BLOCK, got ALLOW`);
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }

    // S-2b: planning->execution WITHOUT AK approval
    {
      const { tmpDir, docsDir, workflowFile } = mkFixture('planning', {
        withRequests: true,
        withProgress: true
        // No akStage — no AK approval on disk
      });
      try {
        const result = runHook(TRANSITION_GATE, {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: execution\nstatus: active\n---\n'
          }
        }, tmpDir);

        if (result.decision === 'block' && (result.reason || '').includes('Action Kamen')) {
          ok('S-2b: planning->execution without AK -> BLOCK (AK mentioned in reason)');
        } else if (result.decision === 'block') {
          ok(`S-2b: planning->execution without AK -> BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
        } else {
          fail(`S-2b: planning->execution without AK -> expected BLOCK, got ALLOW`);
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }
  }

  // ── S-3: Transition gate pipeline — artifact prerequisites ────────────────

  section('S-3: Transition Gate Pipeline — artifact prerequisites');

  if (!canRunHooks) {
    skip('S-3: Skipped — hook prerequisites missing');
  } else {
    // S-3a: planning->execution without PROGRESS.md
    {
      const { tmpDir, docsDir, workflowFile } = mkFixture('planning', {
        withRequests: true,
        akStage: 'planning'
        // No withProgress — PROGRESS.md missing
      });
      try {
        const result = runHook(TRANSITION_GATE, {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: execution\nstatus: active\n---\n'
          }
        }, tmpDir);

        if (result.decision === 'block' && (result.reason || '').includes('PROGRESS.md')) {
          ok('S-3a: planning->execution without PROGRESS.md -> BLOCK (PROGRESS.md cited)');
        } else if (result.decision === 'block') {
          ok(`S-3a: planning->execution without PROGRESS.md -> BLOCK`);
        } else {
          fail('S-3a: planning->execution without PROGRESS.md -> expected BLOCK, got ALLOW');
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }

    // S-3b: execution->completion without AK review
    {
      const { tmpDir, docsDir, workflowFile } = mkFixture('execution', {
        withRequests: true,
        withProgress: true
        // No akStage and no action_kamen in yaml
      });
      try {
        const result = runHook(TRANSITION_GATE, {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: completion\nstatus: active\n---\n'
          }
        }, tmpDir);

        if (result.decision === 'block') {
          ok('S-3b: execution->completion without AK review -> BLOCK');
        } else {
          fail('S-3b: execution->completion without AK review -> expected BLOCK, got ALLOW');
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }
  }

  // ── S-4: Pre-compact state preservation ───────────────────────────────────

  section('S-4: Pre-Compact — semantic context preservation');

  if (!hasRunCjs || !hasPreCompact) {
    skip('S-4: Skipped — pre-compact prerequisites missing');
  } else {
    const { tmpDir, docsDir, workflowFile } = mkFixture('execution', {
      withProgress: true,
      withTracker: true
    });
    try {
      // Run pre-compact hook
      try {
        execSync(
          `node "${RUN_CJS}" "${PRE_COMPACT}"`,
          {
            input: '{}',
            cwd: tmpDir,
            timeout: 8000,
            encoding: 'utf-8',
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT_DIR }
          }
        );
      } catch (_) {
        // pre-compact always exits 0, but execSync might still throw
      }

      const statePath = path.join(tmpDir, '.shinchan-docs', 'pre-compact-state.json');
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

        // Verify basic fields
        if (state.doc_id === 'test-doc') {
          ok('S-4a: pre-compact-state.json has correct doc_id');
        } else {
          fail(`S-4a: expected doc_id=test-doc, got ${state.doc_id}`);
        }

        if (state.stage === 'execution') {
          ok('S-4b: pre-compact-state.json has correct stage');
        } else {
          fail(`S-4b: expected stage=execution, got ${state.stage}`);
        }

        // Verify semantic context fields (FR-2 — new fields from Task 1)
        if (Array.isArray(state.referenced_files)) {
          ok(`S-4c: referenced_files is array (${state.referenced_files.length} entries)`);
        } else {
          fail('S-4c: referenced_files missing or not an array');
        }

        if (Array.isArray(state.recent_user_requests)) {
          ok(`S-4d: recent_user_requests is array (${state.recent_user_requests.length} entries)`);
        } else {
          fail('S-4d: recent_user_requests missing or not an array');
        }

        if (Array.isArray(state.pending_task_keywords)) {
          ok(`S-4e: pending_task_keywords is array (${state.pending_task_keywords.length} entries)`);
        } else {
          fail('S-4e: pending_task_keywords missing or not an array');
        }

        // Verify handoff_summary exists
        if (typeof state.handoff_summary === 'string' && state.handoff_summary.length > 0) {
          ok('S-4f: handoff_summary present and non-empty');
        } else {
          fail('S-4f: handoff_summary missing or empty');
        }

        // Verify pending phases detected from PROGRESS.md
        if (Array.isArray(state.pending_phases) && state.pending_phases.length > 0) {
          ok(`S-4g: pending_phases detected (${state.pending_phases.join(',')})`);
        } else {
          warn(`S-4g: pending_phases empty or not array (value: ${JSON.stringify(state.pending_phases)})`);
        }
      } else {
        fail('S-4: pre-compact-state.json was not created');
      }
    } finally {
      cleanFixture(tmpDir);
    }
  }

  // ── S-5: Token estimator ──────────────────────────────────────────────────

  section('S-5: Token Estimator — threshold detection');

  if (!hasTokenEstimator) {
    skip('S-5: Skipped — src/token-estimator.js not found');
  } else {
    // S-5a: Empty/missing file → safe output
    {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-te-'));
      try {
        const nonexistentPath = path.join(tmpDir, 'nonexistent.jsonl');
        const raw = execSync(
          `node "${TOKEN_ESTIMATOR}" --jsonl "${nonexistentPath}"`,
          { encoding: 'utf-8', timeout: 5000 }
        );
        const result = JSON.parse(raw.trim());
        if (result.estimated_tokens === 0 && result.exceeds_threshold === false) {
          ok('S-5a: missing file -> safe output (0 tokens, no exceed)');
        } else {
          fail(`S-5a: missing file -> unexpected: ${JSON.stringify(result)}`);
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }

    // S-5b: Small JSONL → below threshold
    {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-te-'));
      try {
        const jsonlPath = path.join(tmpDir, 'test.jsonl');
        const events = [];
        for (let i = 0; i < 5; i++) {
          events.push(JSON.stringify({
            ts: new Date().toISOString(),
            type: 'file_change',
            data: { file: `src/file${i}.js`, action: 'modify' }
          }));
        }
        fs.writeFileSync(jsonlPath, events.join('\n') + '\n', 'utf-8');

        const raw = execSync(
          `node "${TOKEN_ESTIMATOR}" --jsonl "${jsonlPath}" --threshold 50000`,
          { encoding: 'utf-8', timeout: 5000 }
        );
        const result = JSON.parse(raw.trim());
        if (result.exceeds_threshold === false && result.event_count === 5) {
          ok(`S-5b: small JSONL (5 events) -> below threshold (${result.estimated_tokens} tokens)`);
        } else {
          fail(`S-5b: unexpected result: ${JSON.stringify(result)}`);
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }

    // S-5c: Large JSONL with low threshold → exceeds threshold
    {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-te-'));
      try {
        const jsonlPath = path.join(tmpDir, 'test.jsonl');
        const events = [];
        // Generate enough events to exceed a low threshold
        for (let i = 0; i < 100; i++) {
          events.push(JSON.stringify({
            ts: new Date().toISOString(),
            type: 'file_change',
            data: {
              file: `src/module${i}/component.tsx`,
              action: 'modify',
              content: 'a'.repeat(200) // large payload
            }
          }));
        }
        fs.writeFileSync(jsonlPath, events.join('\n') + '\n', 'utf-8');

        const raw = execSync(
          `node "${TOKEN_ESTIMATOR}" --jsonl "${jsonlPath}" --threshold 100`,
          { encoding: 'utf-8', timeout: 5000 }
        );
        const result = JSON.parse(raw.trim());
        if (result.exceeds_threshold === true && result.recommendation) {
          ok(`S-5c: large JSONL with low threshold -> exceeds (${result.estimated_tokens} tokens)`);
        } else {
          fail(`S-5c: expected threshold exceeded, got: ${JSON.stringify(result)}`);
        }

        // Verify trigger file was created
        const triggerPath = path.join(tmpDir, '.token-threshold-exceeded');
        if (fs.existsSync(triggerPath)) {
          ok('S-5d: .token-threshold-exceeded trigger file created');
        } else {
          warn('S-5d: .token-threshold-exceeded trigger file not created (non-critical)');
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }

    // S-5e: Token estimator module exports
    {
      try {
        const te = require(TOKEN_ESTIMATOR);
        const hasExports = typeof te.parseArgs === 'function' &&
                          typeof te.estimateTokens === 'function' &&
                          typeof te.parseEvents === 'function';
        if (hasExports) {
          ok('S-5e: token-estimator exports parseArgs, estimateTokens, parseEvents');
        } else {
          fail('S-5e: token-estimator missing expected exports');
        }
      } catch (e) {
        fail(`S-5e: failed to require token-estimator: ${e.message}`);
      }
    }
  }

  // ── S-6: Status completion gate ───────────────────────────────────────────

  section('S-6: Status Completion Gate');

  if (!canRunHooks) {
    skip('S-6: Skipped — hook prerequisites missing');
  } else {
    // S-6a: status:completed from stage=execution -> BLOCK (stage must be completion)
    {
      const { tmpDir, workflowFile } = mkFixture('execution', {
        withRetro: true,
        withImpl: true
      });
      try {
        const result = runHook(TRANSITION_GATE, {
          tool_name: 'Edit',
          tool_input: {
            file_path: workflowFile,
            old_string: 'status: active',
            new_string: 'status: completed'
          }
        }, tmpDir);

        if (result.decision === 'block' && (result.reason || '').includes('completion')) {
          ok('S-6a: status:completed from stage=execution -> BLOCK (stage!=completion cited)');
        } else if (result.decision === 'block') {
          ok(`S-6a: status:completed from stage=execution -> BLOCK`);
        } else {
          fail('S-6a: status:completed from stage=execution -> expected BLOCK, got ALLOW');
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }

    // S-6b: status:completed from stage=completion WITHOUT RETROSPECTIVE.md -> BLOCK
    {
      const { tmpDir, workflowFile } = mkFixture('completion', {
        withImpl: true
        // No withRetro
      });
      try {
        const result = runHook(TRANSITION_GATE, {
          tool_name: 'Edit',
          tool_input: {
            file_path: workflowFile,
            old_string: 'status: active',
            new_string: 'status: completed'
          }
        }, tmpDir);

        if (result.decision === 'block' && (result.reason || '').includes('RETROSPECTIVE.md')) {
          ok('S-6b: status:completed without RETROSPECTIVE.md -> BLOCK');
        } else if (result.decision === 'block') {
          ok('S-6b: status:completed without RETROSPECTIVE.md -> BLOCK (reason may differ)');
        } else {
          fail('S-6b: expected BLOCK without RETROSPECTIVE.md, got ALLOW');
        }
      } finally {
        cleanFixture(tmpDir);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  section('Summary');

  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${errors}`);
  console.log(`  Warned:  ${warnings}`);
  console.log(`  Skipped: ${skipped}`);

  if (errors === 0) {
    if (warnings > 0) {
      console.log(`\n  ${WARN} PASSED with ${warnings} warning(s)`);
    } else {
      console.log(`\n  ${PASS} All E2E workflow scenarios passed!`);
    }
  } else {
    console.log(`\n  ${FAIL} ${errors} scenario(s) failed`);
  }

  return errors;
}

// ── Entry point ─────────────────────────────────────────────────────────────

if (require.main === module) {
  const exitCode = runValidation();
  process.exit(exitCode);
}

module.exports = { runValidation };
