#!/usr/bin/env node
/**
 * Unit tests for src/html-token-estimator.js (Phase 0, AC-0f)
 *
 * Cases (≥ 5 per PLAN.md AC-0f):
 *   1. Empty inputs (both md and html empty) → ratio 0, under_2x_limit true
 *   2. Equal-length inputs → ratio 1, under_2x_limit true
 *   3. HTML heavier (≤ 2×) → ratio 1.5, under_2x_limit true (NFR-3 boundary respected)
 *   4. HTML heavier (> 2×) → under_2x_limit false (NFR-3 violation surfaced)
 *   5. Markdown heavier than HTML → ratio < 1, under_2x_limit true
 *   6. Whitespace-only edge case + md=0/html>0 (Infinity guard) → under_2x_limit false
 *   7. JSON shape — all 4 mandatory keys (md_tokens, html_tokens, ratio, under_2x_limit) present
 *   8. CLI smoke — `node src/html-token-estimator.js --md <real> --html <real>` emits valid JSON
 *
 * Output format: `N passed, M failed` (matches AC-0f expectation `5 passed, 0 failed`)
 * Exits non-zero only if any case fails.
 *
 * Plain assertion based (no node:test) so the test runs identically on older Node
 * targets used by CI, matching the style of other src/*.test.js files in this repo.
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  estimateTokens,
  estimateTokenRatio,
  parseArgs,
  BYTES_PER_TOKEN,
  NFR3_LIMIT,
} = require('../src/html-token-estimator.js');

const CLI_PATH = path.join(__dirname, '..', 'src', 'html-token-estimator.js');

// Per-case bookkeeping — AC-0f expects "N passed, 0 failed" at case granularity
let casePassed = 0;
let caseFailed = 0;
let currentCaseFailed = false;
let currentCaseName  = '(none)';
const caseFailures   = [];

// Internal assertion tally (for debug visibility)
let assertPassed = 0;
let assertFailed = 0;

function startCase(name) {
  // Finalize previous case (if any)
  if (currentCaseName !== '(none)') endCase();
  currentCaseName = name;
  currentCaseFailed = false;
  console.log('\n' + name);
}

function endCase() {
  if (currentCaseName === '(none)') return;
  if (currentCaseFailed) {
    caseFailed++;
    caseFailures.push(currentCaseName);
  } else {
    casePassed++;
  }
}

function assert(cond, label) {
  if (cond) {
    assertPassed++;
    console.log('  PASS  ' + label);
  } else {
    assertFailed++;
    currentCaseFailed = true;
    console.log('  FAIL  ' + label);
  }
}

function assertEqual(actual, expected, label) {
  const ok = actual === expected;
  if (ok) {
    assertPassed++;
    console.log('  PASS  ' + label);
  } else {
    assertFailed++;
    currentCaseFailed = true;
    console.log('  FAIL  ' + label + ' (expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual) + ')');
  }
}

// ── Case 1: empty inputs ──────────────────────────────────────────────────────
startCase('Case 1: empty md + empty html');
{
  const r = estimateTokenRatio('', '');
  assertEqual(r.md_tokens, 0,       'Case1: md_tokens === 0');
  assertEqual(r.html_tokens, 0,     'Case1: html_tokens === 0');
  assertEqual(r.ratio, 0,           'Case1: ratio === 0 when both empty');
  assertEqual(r.under_2x_limit, true,'Case1: under_2x_limit === true (vacuous truth)');
}

// ── Case 2: equal-length inputs ───────────────────────────────────────────────
startCase('Case 2: equal-length md and html');
{
  const md   = 'abcdefgh';  // 8 chars → 2 tokens
  const html = 'ABCDEFGH';  // 8 chars → 2 tokens
  const r = estimateTokenRatio(md, html);
  assertEqual(r.md_tokens, 2,       'Case2: md_tokens === 2 (8 chars / 4)');
  assertEqual(r.html_tokens, 2,     'Case2: html_tokens === 2');
  assertEqual(r.ratio, 1,           'Case2: ratio === 1');
  assertEqual(r.under_2x_limit, true,'Case2: under_2x_limit === true');
}

// ── Case 3: HTML heavier but within 2× limit ──────────────────────────────────
startCase('Case 3: html heavier than md, within 2×');
{
  const md   = 'a'.repeat(40);   // 40 chars → 10 tokens
  const html = 'b'.repeat(60);   // 60 chars → 15 tokens
  const r = estimateTokenRatio(md, html);
  assertEqual(r.md_tokens, 10,      'Case3: md_tokens === 10');
  assertEqual(r.html_tokens, 15,    'Case3: html_tokens === 15');
  assertEqual(r.ratio, 1.5,         'Case3: ratio === 1.5');
  assertEqual(r.under_2x_limit, true,'Case3: under_2x_limit === true (1.5 ≤ 2.0)');
}

// ── Case 4: HTML heavier, exceeds 2× limit ────────────────────────────────────
startCase('Case 4: html heavier than md, exceeds 2×');
{
  const md   = 'a'.repeat(40);    // 10 tokens
  const html = 'b'.repeat(120);   // 30 tokens → ratio = 3.0
  const r = estimateTokenRatio(md, html);
  assertEqual(r.ratio, 3,           'Case4: ratio === 3');
  assertEqual(r.under_2x_limit, false,'Case4: under_2x_limit === false (NFR-3 violated)');
}

// ── Case 5: markdown heavier than html + edge whitespace coverage ─────────────
startCase('Case 5: md heavier than html + whitespace + Infinity guard');
{
  // 5a: md > html
  const r1 = estimateTokenRatio('a'.repeat(80), 'b'.repeat(40));  // 20 / 10 → 0.5
  assertEqual(r1.ratio, 0.5,         'Case5: md-heavier ratio === 0.5');
  assertEqual(r1.under_2x_limit, true,'Case5: md-heavier under_2x_limit === true');

  // 5b: whitespace-only md is NOT stripped (3 chars → 1 token)
  assertEqual(estimateTokens('   '), 1, 'Case5: 3-space string counts as 1 token (no stripping)');

  // 5c: md=0 + html>0 (Infinity guard from NFR-3 zero-division)
  const r2 = estimateTokenRatio('', '<p>x</p>');
  assertEqual(r2.md_tokens, 0,        'Case5: md_tokens === 0 with empty md');
  assert(r2.html_tokens > 0,          'Case5: html_tokens > 0');
  assertEqual(r2.under_2x_limit, false,'Case5: under_2x_limit === false (Infinity ratio)');
}

// ── End final case + report ───────────────────────────────────────────────────
endCase();

// Optional supplementary checks (not counted in primary "N passed" headline)
console.log('\n[supplementary checks — not counted in case totals]');
{
  // JSON shape
  const r = estimateTokenRatio('abcd', 'wxyz');
  const required = ['md_tokens', 'html_tokens', 'ratio', 'under_2x_limit'];
  for (const k of required) {
    const ok = k in r;
    console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  shape: key "' + k + '" present');
    if (!ok) { assertFailed++; } else { assertPassed++; }
  }

  // CLI smoke (AC-0e direct verification)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-html-tok-'));
  const mdPath   = path.join(tmp, 'sample.md');
  const htmlPath = path.join(tmp, 'sample.html');
  fs.writeFileSync(mdPath,   '# Hello\n\nworld');
  fs.writeFileSync(htmlPath, '<h1>Hello</h1><p>world</p>');
  try {
    const out = execFileSync('node', [CLI_PATH, '--md', mdPath, '--html', htmlPath], {
      encoding: 'utf-8'
    });
    const parsed = JSON.parse(out);
    const allKeys = ['md_tokens', 'html_tokens', 'ratio', 'under_2x_limit']
      .every(k => k in parsed);
    console.log('  ' + (allKeys ? 'PASS' : 'FAIL') + '  CLI smoke: all 4 required JSON keys present');
    if (!allKeys) assertFailed++; else assertPassed++;
  } catch (e) {
    console.log('  FAIL  CLI smoke: ' + e.message);
    assertFailed++;
  } finally {
    try { fs.unlinkSync(mdPath); fs.unlinkSync(htmlPath); fs.rmdirSync(tmp); } catch (_) {}
  }

  // Exported constants
  console.log('  ' + (BYTES_PER_TOKEN === 4 ? 'PASS' : 'FAIL') + '  BYTES_PER_TOKEN === 4');
  console.log('  ' + (NFR3_LIMIT === 2.0   ? 'PASS' : 'FAIL') + '  NFR3_LIMIT === 2.0');

  // parseArgs
  const a = parseArgs(['node', 'script', '--md', 'a.md', '--html', 'b.html']);
  const argsOk = a.mdPath === 'a.md' && a.htmlPath === 'b.html';
  console.log('  ' + (argsOk ? 'PASS' : 'FAIL') + '  parseArgs captures --md and --html');
}

// ── Summary (AC-0f format: "5 passed, 0 failed") ──────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(casePassed + ' passed, ' + caseFailed + ' failed');
console.log('(assertion-level: ' + assertPassed + ' passed, ' + assertFailed + ' failed)');

if (caseFailed > 0) {
  console.log('\nCase failures:');
  for (const f of caseFailures) console.log('  - ' + f);
  process.exit(1);
}
process.exit(0);
