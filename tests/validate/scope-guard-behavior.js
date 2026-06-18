#!/usr/bin/env node
/**
 * Scope Guard Behavioral Validator
 * Tests hooks/scope-guard.sh runtime behavior with fixture-based isolation.
 *
 * The scope-invariant gate (main-075 adoption): when WORKFLOW_STATE.yaml declares
 * scope.forbidden_paths, an Edit/Write to a matching path is HARD-BLOCKED in real time.
 * Absent forbidden_paths ⇒ no-op (backward compatibility). .shinchan-docs/ is always allowed.
 *
 * Test Cases:
 *  SG-1: forbidden src/** + Edit to src/foo.js          → BLOCK
 *  SG-2: forbidden src/** + Edit to lib/foo.js          → ALLOW (not forbidden)
 *  SG-3: forbidden src/** + Edit to .shinchan-docs/...  → ALLOW (workflow docs always allowed)
 *  SG-4: NO forbidden_paths + Edit to src/foo.js        → ALLOW (legacy backward-compat)
 *  SG-5: forbidden *.lock + Edit to yarn.lock           → BLOCK (suffix glob)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const HOOK = path.join(ROOT_DIR, 'hooks/scope-guard.sh');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

/**
 * Build a fixture with an active execution-stage workflow.
 * @param {string|null} forbiddenBlock - YAML for the `scope:` block (or null for none)
 */
function mkFixture(forbiddenBlock) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-sg-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs', 'test-doc');
  fs.mkdirSync(docsDir, { recursive: true });

  const yaml = [
    '---',
    'document_type: workflow_state',
    'status: active',
    'stage: execution',
    'doc_id: test-doc',
    '---',
    forbiddenBlock || '',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(docsDir, 'WORKFLOW_STATE.yaml'), yaml, 'utf-8');
  // PROGRESS.md must exist for the hook to proceed past its early guard
  fs.writeFileSync(path.join(docsDir, 'PROGRESS.md'), '# PROGRESS\n\n## Phase 1\nWork on `lib/foo.js`.\n', 'utf-8');
  return { tmpDir, docsDir };
}

function runHook(input, cwd) {
  try {
    const raw = execSync(`node "${RUN_CJS}" "${HOOK}"`, {
      input: JSON.stringify(input), cwd, timeout: 8000, encoding: 'utf-8',
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT_DIR }
    });
    const trimmed = (raw || '').trim();
    try { const p = JSON.parse(trimmed); return { decision: p.decision || null, reason: p.reason || null }; }
    catch { return { decision: null, reason: null }; }
  } catch (e) {
    const raw = (e.stdout || '').trim();
    try { const p = JSON.parse(raw); return { decision: p.decision || null, reason: p.reason || null }; }
    catch { return { decision: null, reason: null }; }
  }
}

function runValidation() {
  let errors = 0, passed = 0;
  const ok = (m) => { console.log(`  ${PASS} ${m}`); passed++; };
  const fail = (m) => { console.log(`  ${FAIL} ${m}`); errors++; };

  console.log(`\n${'─'.repeat(60)}\n  Scope Guard Behavior — scope.forbidden_paths hard block\n${'─'.repeat(60)}\n`);

  const SRC_FORBIDDEN = 'scope:\n  forbidden_paths:\n    - "src/**"';

  // SG-1: forbidden src/** + Edit to src/foo.js → BLOCK
  {
    const { tmpDir } = mkFixture(SRC_FORBIDDEN);
    try {
      const r = runHook({ tool_name: 'Edit', tool_input: { file_path: path.join(tmpDir, 'src', 'foo.js'), old_string: 'a', new_string: 'b' } }, tmpDir);
      if (r.decision === 'block' && /SCOPE-INVARIANT GATE/.test(r.reason || '')) ok('SG-1: Edit src/foo.js with forbidden src/** → BLOCK');
      else fail(`SG-1: Edit src/foo.js → expected BLOCK, got decision="${r.decision}"`);
    } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
  }

  // SG-2: forbidden src/** + Edit to lib/foo.js → ALLOW
  {
    const { tmpDir } = mkFixture(SRC_FORBIDDEN);
    try {
      const r = runHook({ tool_name: 'Edit', tool_input: { file_path: path.join(tmpDir, 'lib', 'foo.js'), old_string: 'a', new_string: 'b' } }, tmpDir);
      if (r.decision !== 'block') ok('SG-2: Edit lib/foo.js (not forbidden) → ALLOW');
      else fail(`SG-2: Edit lib/foo.js → expected ALLOW, got BLOCK: ${(r.reason || '').slice(0, 80)}`);
    } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
  }

  // SG-3: forbidden src/** + Edit to .shinchan-docs/... → ALLOW (workflow docs always allowed)
  {
    const { tmpDir, docsDir } = mkFixture(SRC_FORBIDDEN);
    try {
      const r = runHook({ tool_name: 'Write', tool_input: { file_path: path.join(docsDir, 'NOTES.md'), content: 'x' } }, tmpDir);
      if (r.decision !== 'block') ok('SG-3: Write .shinchan-docs/NOTES.md → ALLOW (workflow docs exempt)');
      else fail(`SG-3: Write .shinchan-docs → expected ALLOW, got BLOCK`);
    } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
  }

  // SG-4: NO forbidden_paths + Edit to src/foo.js → ALLOW (legacy backward-compat)
  {
    const { tmpDir } = mkFixture(null);
    try {
      const r = runHook({ tool_name: 'Edit', tool_input: { file_path: path.join(tmpDir, 'src', 'foo.js'), old_string: 'a', new_string: 'b' } }, tmpDir);
      if (r.decision !== 'block') ok('SG-4: Edit src/foo.js with NO forbidden_paths declared → ALLOW (backward-compat)');
      else fail(`SG-4: legacy workflow → expected ALLOW, got BLOCK`);
    } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
  }

  // SG-5: forbidden *.lock + Edit to yarn.lock → BLOCK (suffix glob)
  {
    const { tmpDir } = mkFixture('scope:\n  forbidden_paths:\n    - "*.lock"');
    try {
      const r = runHook({ tool_name: 'Write', tool_input: { file_path: path.join(tmpDir, 'yarn.lock'), content: 'x' } }, tmpDir);
      if (r.decision === 'block') ok('SG-5: Write yarn.lock with forbidden *.lock → BLOCK (suffix glob)');
      else fail(`SG-5: Write yarn.lock → expected BLOCK, got ALLOW`);
    } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
  }

  console.log(`\n  Passed: ${passed}   Failed: ${errors}\n`);
  if (errors === 0) console.log('  \x1b[32m✓ ALL SCOPE GUARD BEHAVIOR TESTS PASSED\x1b[0m\n');
  else console.log(`  \x1b[31m✗ ${errors} test(s) failed\x1b[0m\n`);
  return errors;
}

if (require.main === module) {
  process.exit(runValidation() > 0 ? 1 : 0);
}

module.exports = { runValidation };
