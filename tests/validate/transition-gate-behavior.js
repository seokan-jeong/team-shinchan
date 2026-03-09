#!/usr/bin/env node
/**
 * Transition Gate Behavioral Validator
 * Tests hooks/transition-gate.sh runtime behavior with fixture-based isolation.
 *
 * Critical implementation detail:
 *   transition-gate.sh calls fs.readFileSync(filePath) to read the CURRENT stage
 *   from disk. Therefore, the `file_path` in the hook input must point to an
 *   ACTUAL FILE on disk (not a fake path). We create real files in os.tmpdir().
 *
 * Each test case:
 *  1. Creates a temp dir in os.tmpdir() with a real WORKFLOW_STATE.yaml
 *  2. Creates supporting artifact files (REQUESTS.md, PROGRESS.md, etc.) as needed
 *  3. Pipes JSON input to the hook via execSync with cwd: tmpDir
 *     (the hook checks PWD/.shinchan-docs for the docs directory)
 *  4. Asserts the decision (block vs allow)
 *  5. Cleans up the temp dir in finally
 *
 * Test Cases:
 *  TC-1: requirements→planning WITHOUT REQUESTS.md            → BLOCK
 *  TC-2: requirements→planning WITH incomplete REQUESTS.md    → BLOCK
 *  TC-3: requirements→planning WITH valid REQUESTS.md         → ALLOW
 *  TC-4: planning→execution WITHOUT PROGRESS.md               → BLOCK
 *  TC-5: execution→completion WITHOUT Action Kamen review     → BLOCK
 *  TC-6: status:completed WITHOUT RETROSPECTIVE/IMPLEMENTATION → BLOCK
 *  TC-7: execution→requirements (reverse transition)          → document behavior
 *  TC-8: status:completed from stage=execution (artifacts ok) → BLOCK (stage!=completion)
 *  TC-9: combined stage:completion+status:completed from exec → BLOCK (on-disk stage!=completion)
 *  TC-10: Edit status:completed from stage=planning           → BLOCK (stage!=completion)
 *  HR-3: WORKFLOW_STATE.yaml does not exist on disk           → document behavior
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const HOOK = path.join(ROOT_DIR, 'hooks/transition-gate.sh');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';

/**
 * Create a temporary fixture directory.
 *
 * The directory layout mirrors what transition-gate.sh expects:
 *   tmpDir/
 *     .shinchan-docs/          ← hook checks this exists in PWD
 *       test-doc/
 *         WORKFLOW_STATE.yaml  ← hook reads fs.readFileSync(filePath) from here
 *         [optional artifacts]
 *
 * Returns { tmpDir, docsDir, workflowFile } so callers can add extra artifacts
 * and pass `workflowFile` as the `file_path` in hook input.
 *
 * @param {string} stage  - current stage written to WORKFLOW_STATE.yaml on disk
 * @param {object} [opts]
 * @param {string} [opts.status]         - workflow status (default: 'active')
 * @param {boolean} [opts.includeAKReview] - add action_kamen review entry to YAML
 * @returns {{ tmpDir: string, docsDir: string, workflowFile: string }}
 */
function mkTmpFixture(stage, opts = {}) {
  const { status = 'active', includeAKReview = false } = opts;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-tg-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs', 'test-doc');
  fs.mkdirSync(docsDir, { recursive: true });

  const reviewSection = includeAKReview
    ? '\naction_kamen_review:\n  - date: "2026-03-07"\n    phase: 2\n    result: pass\n'
    : '';

  const yaml = [
    '---',
    'document_type: workflow_state',
    `status: ${status}`,
    `stage: ${stage}`,
    'created: "2026-03-07"',
    'doc_id: test-doc',
    '---',
    reviewSection
  ].join('\n');

  const workflowFile = path.join(docsDir, 'WORKFLOW_STATE.yaml');
  fs.writeFileSync(workflowFile, yaml, 'utf-8');

  return { tmpDir, docsDir, workflowFile };
}

/**
 * Create a fixture WITHOUT any WORKFLOW_STATE.yaml on disk.
 * Used for the HR-3 edge case.
 *
 * @returns {{ tmpDir: string, docsDir: string, workflowFile: string }}
 */
function mkTmpFixtureNoWorkflowFile() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-tg-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs', 'test-doc');
  fs.mkdirSync(docsDir, { recursive: true });
  // workflowFile path exists conceptually, but the file is NOT created
  const workflowFile = path.join(docsDir, 'WORKFLOW_STATE.yaml');
  return { tmpDir, docsDir, workflowFile };
}

/**
 * Run the transition-gate hook with given JSON input from a given cwd.
 *
 * The hook uses PWD to locate .shinchan-docs/ and fs.readFileSync(filePath)
 * to read the current workflow state. The cwd must be tmpDir so that
 * `.shinchan-docs/` is found by the shell portion of the hook.
 *
 * @param {object} input - the JSON object to pipe as stdin
 * @param {string} cwd   - working directory (should be tmpDir)
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
 * as workflow-guard-behavior.js.
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

  // ── Prerequisites ───────────────────────────────────────────────────────────

  section('0. Prerequisites');

  if (!fs.existsSync(HOOK)) {
    fail(`hooks/transition-gate.sh not found at: ${HOOK}`);
    return errors;
  }
  ok('hooks/transition-gate.sh exists');

  if (!fs.existsSync(RUN_CJS)) {
    fail(`scripts/run.cjs not found at: ${RUN_CJS}`);
    return errors;
  }
  ok('scripts/run.cjs exists');

  // ── TC-1: requirements→planning WITHOUT REQUESTS.md → BLOCK ─────────────────

  section('1. Block Cases — Stage transition prerequisites missing');

  {
    const { tmpDir, workflowFile } = mkTmpFixture('requirements');
    try {
      // No REQUESTS.md created — it simply doesn't exist in docsDir
      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: planning\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        const mentionsRequests = (result.reason || '').includes('REQUESTS.md');
        if (mentionsRequests) {
          ok('TC-1: requirements→planning (no REQUESTS.md) → BLOCK with REQUESTS.md in reason');
        } else {
          ok(`TC-1: requirements→planning (no REQUESTS.md) → BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
        }
      } else {
        fail(`TC-1: requirements→planning (no REQUESTS.md) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── TC-2: requirements→planning WITH incomplete REQUESTS.md → BLOCK ─────────

  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('requirements');
    try {
      // REQUESTS.md exists but has no Problem Statement / Objective
      fs.writeFileSync(
        path.join(docsDir, 'REQUESTS.md'),
        '# Requirements\n- Some feature requirement\n',
        'utf-8'
      );

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: planning\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-2: requirements→planning (REQUESTS.md missing Problem Statement) → BLOCK');
      } else {
        fail(`TC-2: requirements→planning (incomplete REQUESTS.md) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── TC-4: planning→execution WITHOUT PROGRESS.md → BLOCK ────────────────────

  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('planning');
    try {
      // REQUESTS.md is present and valid, but PROGRESS.md is missing
      fs.writeFileSync(
        path.join(docsDir, 'REQUESTS.md'),
        '# Problem Statement\nWe need X.\n\n# Requirements\n- Requirement A\n',
        'utf-8'
      );
      // PROGRESS.md intentionally not created

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: execution\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        const mentionsProgress = (result.reason || '').includes('PROGRESS.md');
        if (mentionsProgress) {
          ok('TC-4: planning→execution (no PROGRESS.md) → BLOCK with PROGRESS.md in reason');
        } else {
          ok(`TC-4: planning→execution (no PROGRESS.md) → BLOCK (reason: ${(result.reason || '').slice(0, 80)})`);
        }
      } else {
        fail(`TC-4: planning→execution (no PROGRESS.md) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── TC-5: execution→completion WITHOUT Action Kamen review → BLOCK ───────────

  {
    // includeAKReview: false (default) — no action_kamen in WORKFLOW_STATE.yaml
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('execution', { includeAKReview: false });
    try {
      fs.writeFileSync(
        path.join(docsDir, 'PROGRESS.md'),
        '# PROGRESS\n\n## Phase 1\nSome phase content.\n',
        'utf-8'
      );

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: completion\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-5: execution→completion (no Action Kamen review) → BLOCK');
      } else {
        fail(`TC-5: execution→completion (no AK review) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── TC-6: status:completed WITHOUT RETROSPECTIVE/IMPLEMENTATION → BLOCK ──────

  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('completion');
    try {
      // Neither RETROSPECTIVE.md nor IMPLEMENTATION.md is created

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: completion\nstatus: completed\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-6: status:completed (no RETROSPECTIVE/IMPLEMENTATION) → BLOCK');
      } else {
        fail(`TC-6: status:completed (missing artifacts) → expected BLOCK, got decision="${result.decision}" (raw: ${result.raw.slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Allow Cases ─────────────────────────────────────────────────────────────

  section('2. Allow Cases — Valid transitions');

  // TC-3: requirements→planning WITH valid REQUESTS.md → ALLOW
  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('requirements');
    try {
      // Full valid REQUESTS.md with both Problem Statement and Requirements sections
      fs.writeFileSync(
        path.join(docsDir, 'REQUESTS.md'),
        [
          '# Problem Statement',
          '',
          'We need to implement feature X to solve problem Y.',
          '',
          '# Requirements',
          '',
          '- Requirement A: The system shall do Z',
          '- Requirement B: The system shall also do W',
          ''
        ].join('\n'),
        'utf-8'
      );

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: planning\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-3: requirements→planning (valid REQUESTS.md) → ALLOW');
      } else {
        fail(`TC-3: requirements→planning (valid REQUESTS.md) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-4b: planning→execution WITH both REQUESTS.md and PROGRESS.md → ALLOW
  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('planning');
    try {
      fs.writeFileSync(
        path.join(docsDir, 'REQUESTS.md'),
        '# Problem Statement\nWe need X.\n\n# Requirements\n- Requirement A\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(docsDir, 'PROGRESS.md'),
        '# PROGRESS\n\n## Phase 1\nImplement the feature.\n\n## Phase 2\nWrite tests.\n',
        'utf-8'
      );

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: execution\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-4b: planning→execution (REQUESTS.md + PROGRESS.md present) → ALLOW');
      } else {
        fail(`TC-4b: planning→execution (valid artifacts) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-6b: status:completed WITH RETROSPECTIVE.md + IMPLEMENTATION.md → ALLOW
  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('completion');
    try {
      fs.writeFileSync(
        path.join(docsDir, 'RETROSPECTIVE.md'),
        '# Retrospective\n\nWhat went well...\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(docsDir, 'IMPLEMENTATION.md'),
        '# Implementation Notes\n\nFiles changed...\n',
        'utf-8'
      );

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: completion\nstatus: completed\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('TC-6b: status:completed (RETROSPECTIVE.md + IMPLEMENTATION.md present) → ALLOW');
      } else {
        fail(`TC-6b: status:completed (valid artifacts) → expected ALLOW, got BLOCK (reason: ${(result.reason || '').slice(0, 120)})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Non-WORKFLOW_STATE file write → ALLOW (gate doesn't apply)
  {
    const { tmpDir } = mkTmpFixture('requirements');
    try {
      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: path.join(tmpDir, 'src', 'app.ts'),
            content: 'export const x = 1;'
          }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok('Allow: Write to non-WORKFLOW_STATE file → ALLOW (gate skipped)');
      } else {
        fail(`Allow: Write to non-WORKFLOW_STATE file → expected ALLOW, got BLOCK`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Edge Cases ───────────────────────────────────────────────────────────────

  section('3. Edge Cases — Behavior Documentation');

  // TC-7: Reverse transition execution→requirements — document behavior
  {
    const { tmpDir, workflowFile } = mkTmpFixture('execution');
    try {
      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: requirements\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      // Logic: newIdx (0) < currentIdx (2), so condition newIdx > currentIdx is false
      // → gate transitions are NOT checked → should be ALLOW
      if (result.decision !== 'block') {
        ok([
          'TC-7: execution→requirements (reverse transition) → ALLOW',
          '  DESIGN NOTE: Reverse transitions are not gated. newIdx < currentIdx',
          '  bypasses all gate checks. Deliberate design or gap — see HR-3 analysis.'
        ].join('\n'));
      } else {
        warn([
          'TC-7: execution→requirements (reverse transition) → BLOCK',
          '  UNEXPECTED: Reverse transitions blocked by gate — check gate logic.',
          `  reason: ${(result.reason || '').slice(0, 120)}`
        ].join('\n'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // HR-3: WORKFLOW_STATE.yaml does not exist on disk → fs.readFileSync throws
  // The hook catches the error and sets currentStage = '' → currentIdx = -1
  // Condition: newIdx > currentIdx becomes e.g. 1 > -1 = true BUT also
  // the condition requires currentIdx !== -1: `newIdx > currentIdx && currentIdx !== -1`
  // → gate is NOT entered → process.exit(0) → ALLOW
  {
    const { tmpDir, workflowFile } = mkTmpFixtureNoWorkflowFile();
    try {
      // workflowFile path does not exist on disk
      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: planning\nstatus: active\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision !== 'block') {
        ok([
          'HR-3: WORKFLOW_STATE.yaml missing on disk → fs.readFileSync catch → currentStage="" → currentIdx=-1',
          '  Gate condition: newIdx > -1 && -1 !== -1 → false → gate bypassed → ALLOW',
          '  DESIGN GAP: Creating new WORKFLOW_STATE.yaml with stage transition skips gate checks.'
        ].join('\n'));
      } else {
        ok([
          'HR-3: WORKFLOW_STATE.yaml missing on disk → BLOCK',
          '  Unexpected path — gate blocked even on new file creation.',
          `  reason: ${(result.reason || '').slice(0, 120)}`
        ].join('\n'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── TC-8/9/10: Stage skip prevention — status:completed from non-completion stage ─

  section('4. Stage Skip Prevention — status:completed from non-completion stage');

  // TC-8: status:completed from stage=execution (artifacts present) → BLOCK
  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('execution', { includeAKReview: true });
    try {
      // Create all completion artifacts — gate should still block because stage !== completion
      fs.writeFileSync(path.join(docsDir, 'RETROSPECTIVE.md'), '# Retrospective\n\nLessons learned.\n', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'IMPLEMENTATION.md'), '# Implementation\n\nFiles changed.\n', 'utf-8');

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: execution\nstatus: completed\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        const mentionsStage = (result.reason || '').includes('must be "completion"');
        if (mentionsStage) {
          ok('TC-8: status:completed from stage=execution (artifacts present) → BLOCK (stage must be completion)');
        } else {
          ok(`TC-8: status:completed from stage=execution → BLOCK (reason: ${(result.reason || '').slice(0, 100)})`);
        }
      } else {
        fail('TC-8: status:completed from stage=execution (artifacts present) → expected BLOCK, got ALLOW');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-9: combined write (stage:completion + status:completed) from execution → BLOCK
  // The on-disk stage is "execution", so even writing stage:completion + status:completed
  // simultaneously should be blocked because currentStage (from disk) is still "execution".
  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('execution', { includeAKReview: true });
    try {
      fs.writeFileSync(path.join(docsDir, 'PROGRESS.md'), '# PROGRESS\n\n## Phase 1\nDone.\n', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'RETROSPECTIVE.md'), '# Retrospective\n\nLessons.\n', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'IMPLEMENTATION.md'), '# Implementation\n\nDone.\n', 'utf-8');

      const result = runHook(
        {
          tool_name: 'Write',
          tool_input: {
            file_path: workflowFile,
            content: '---\nstage: completion\nstatus: completed\n---\n'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        ok('TC-9: combined stage:completion + status:completed from execution → BLOCK (on-disk stage is execution)');
      } else {
        fail('TC-9: combined stage:completion + status:completed from execution → expected BLOCK, got ALLOW');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // TC-10: Edit status:completed from stage=planning → BLOCK
  {
    const { tmpDir, docsDir, workflowFile } = mkTmpFixture('planning');
    try {
      fs.writeFileSync(path.join(docsDir, 'RETROSPECTIVE.md'), '# Retrospective\n\nLessons.\n', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'IMPLEMENTATION.md'), '# Implementation\n\nDone.\n', 'utf-8');

      const result = runHook(
        {
          tool_name: 'Edit',
          tool_input: {
            file_path: workflowFile,
            old_string: 'status: active',
            new_string: 'status: completed'
          }
        },
        tmpDir
      );
      if (result.decision === 'block') {
        const mentionsStage = (result.reason || '').includes('must be "completion"');
        if (mentionsStage) {
          ok('TC-10: Edit status:completed from stage=planning → BLOCK (stage must be completion)');
        } else {
          ok(`TC-10: Edit status:completed from stage=planning → BLOCK (reason: ${(result.reason || '').slice(0, 100)})`);
        }
      } else {
        fail('TC-10: Edit status:completed from stage=planning → expected BLOCK, got ALLOW');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  section('Summary — transition-gate-behavior');
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${errors}`);
  console.log(`  Warnings: ${warnings}`);
  console.log();

  if (errors === 0 && warnings === 0) {
    console.log('  \x1b[32m✓ ALL TRANSITION GATE BEHAVIOR TESTS PASSED\x1b[0m\n');
  } else if (errors === 0) {
    console.log(`  \x1b[33m! PASSED with ${warnings} warning(s) — see behavior notes above\x1b[0m\n`);
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
