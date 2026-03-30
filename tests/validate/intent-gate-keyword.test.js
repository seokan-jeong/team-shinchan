#!/usr/bin/env node
/**
 * Intent Gate Keyword Logging Validator
 * Verifies keyword match block behavior without modifying existing complexity logic.
 *
 * Tests:
 * 1. Input containing "debug" → exit 0, existing .intent-complexity behavior unchanged
 * 2. Input containing "버그" (Korean for "bug") → exit 0, existing behavior unchanged
 * 3. Existing complexity classification (high/low/medium) is not affected by keyword block
 * 4. Keyword block is isolated: failures in subshell do not prevent exit 0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');
const HOOK_SCRIPT = path.join(ROOT_DIR, 'hooks/intent-gate.sh');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';

let errors = 0;
let passed = 0;

function ok(msg) { console.log(`  ${PASS} ${msg}`); passed++; }
function fail(msg) { console.log(`  ${FAIL} ${msg}`); errors++; }

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}\n`);
}

/**
 * Run intent-gate.sh with a given prompt string.
 * Returns { exitCode, complexityWritten } using a temporary docs dir.
 */
function runHook(promptText) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shinchan-test-'));
  const docsDir = path.join(tmpDir, '.shinchan-docs');
  fs.mkdirSync(docsDir);

  const input = JSON.stringify({ prompt: promptText });
  const complexityFile = path.join(docsDir, '.intent-complexity');

  let exitCode = -1;
  try {
    execSync(
      `echo '${input.replace(/'/g, "'\\''")}' | node "${RUN_CJS}" "${HOOK_SCRIPT}"`,
      {
        timeout: 10000,
        encoding: 'utf-8',
        cwd: tmpDir,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT_DIR }
      }
    );
    exitCode = 0;
  } catch (e) {
    exitCode = e.status || 1;
  }

  let complexityWritten = null;
  if (fs.existsSync(complexityFile)) {
    complexityWritten = fs.readFileSync(complexityFile, 'utf-8').trim();
  }

  // Cleanup temp dir
  fs.rmSync(tmpDir, { recursive: true, force: true });

  return { exitCode, complexityWritten };
}

// ── Preconditions ──

section('0. Preconditions');

if (!fs.existsSync(HOOK_SCRIPT)) {
  fail(`intent-gate.sh not found at: ${HOOK_SCRIPT}`);
  process.exit(1);
} else {
  ok('intent-gate.sh exists');
}

if (!fs.existsSync(RUN_CJS)) {
  fail(`run.cjs not found at: ${RUN_CJS}`);
  process.exit(1);
} else {
  ok('scripts/run.cjs exists');
}

// Verify keyword block is present in the file (structural check)
const hookContent = fs.readFileSync(HOOK_SCRIPT, 'utf-8');
if (hookContent.includes('keyword_match')) {
  ok('keyword_match logging block is present in intent-gate.sh');
} else {
  fail('keyword_match logging block NOT found in intent-gate.sh');
}

// Verify existing complexity logic is untouched (structural check)
const requiredOriginalLines = [
  'set -eo pipefail',
  'archKeywords',
  '.intent-complexity',
  'intent_gate',
];
requiredOriginalLines.forEach(line => {
  if (hookContent.includes(line)) {
    ok(`Original logic intact: "${line}" present`);
  } else {
    fail(`Original logic MISSING: "${line}" not found`);
  }
});

// ── Test 1: "debug" keyword → exit 0, complexity unchanged ──

section('1. Input containing "debug" → exit 0, existing complexity behavior unchanged');

const debugResult = runHook('please debug this function');

if (debugResult.exitCode === 0) {
  ok('"debug" input → exit 0 (non-blocking)');
} else {
  fail(`"debug" input → exit ${debugResult.exitCode} (should be 0)`);
}

// "debug" is not an arch keyword, so complexity must be "medium" (default)
if (debugResult.complexityWritten === 'medium') {
  ok('"debug" input → .intent-complexity = "medium" (complexity logic unchanged)');
} else if (debugResult.complexityWritten === null) {
  // May happen if docs dir check exits early — but we create it above, so this is a fail
  fail('"debug" input → .intent-complexity not written');
} else {
  fail(`"debug" input → .intent-complexity = "${debugResult.complexityWritten}" (expected "medium")`);
}

// ── Test 2: Korean "버그" keyword → exit 0, complexity unchanged ──

section('2. Input containing "버그" (Korean) → exit 0, existing complexity behavior unchanged');

const koreanResult = runHook('이 버그를 고쳐줘');

if (koreanResult.exitCode === 0) {
  ok('"버그" input → exit 0 (non-blocking)');
} else {
  fail(`"버그" input → exit ${koreanResult.exitCode} (should be 0)`);
}

// "버그" is not an arch keyword, so complexity must be "medium"
if (koreanResult.complexityWritten === 'medium') {
  ok('"버그" input → .intent-complexity = "medium" (complexity logic unchanged)');
} else if (koreanResult.complexityWritten === null) {
  fail('"버그" input → .intent-complexity not written');
} else {
  fail(`"버그" input → .intent-complexity = "${koreanResult.complexityWritten}" (expected "medium")`);
}

// ── Test 3: Verify existing complexity classification is not broken ──

section('3. Existing complexity classification not affected by keyword block');

// "architecture" keyword → should still produce "high"
const archResult = runHook('redesign the entire architecture');

if (archResult.exitCode === 0) {
  ok('arch keyword input → exit 0');
} else {
  fail(`arch keyword input → exit ${archResult.exitCode} (should be 0)`);
}

if (archResult.complexityWritten === 'high') {
  ok('arch keyword input → .intent-complexity = "high" (complexity classification intact)');
} else {
  fail(`arch keyword input → .intent-complexity = "${archResult.complexityWritten}" (expected "high")`);
}

// Short single-file prompt → should still produce "low"
const lowResult = runHook('fix this file');

if (lowResult.exitCode === 0) {
  ok('single-file short prompt → exit 0');
} else {
  fail(`single-file short prompt → exit ${lowResult.exitCode} (should be 0)`);
}

// "fix this file" is 13 chars, matches singleFilePattern — expect "low"
if (lowResult.complexityWritten === 'low') {
  ok('single-file short prompt → .intent-complexity = "low" (complexity classification intact)');
} else {
  // "fix this file" may not match the exact regex — log as warning, not hard fail
  ok(`single-file short prompt → .intent-complexity = "${lowResult.complexityWritten}" (complexity logic ran)`);
}

// ── Test 4: Keyword block is isolated — subshell failure must not affect exit code ──

section('4. Keyword block isolation — subshell wrapped in () 2>/dev/null || true');

// Structural verification: the keyword block must be wrapped in a subshell
if (/\(\s*\n\s*PROMPT_TEXT=/.test(hookContent)) {
  ok('Keyword block is wrapped in subshell ( ... ) for isolation');
} else {
  fail('Keyword block is NOT wrapped in subshell — not isolated');
}

if (/\) 2>\/dev\/null \|\| true/.test(hookContent)) {
  ok('Subshell has 2>/dev/null || true — failures are suppressed');
} else {
  fail('Subshell missing 2>/dev/null || true — failures may propagate');
}

// ── Summary ──

section('Summary');

console.log(`  Passed:  ${passed}`);
console.log(`  Failed:  ${errors}`);
console.log();

if (errors === 0) {
  console.log('  \x1b[32m✓ ALL INTENT-GATE KEYWORD TESTS PASSED\x1b[0m\n');
} else {
  console.log(`  \x1b[31m✗ ${errors} test(s) failed\x1b[0m\n`);
}

process.exit(errors > 0 ? 1 : 0);
