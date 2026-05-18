#!/usr/bin/env node
/**
 * Unit tests for src/mechanical-check.js HTML mode
 * (main-068 Phase 1 AC-4 / AC-4a + Phase 2 AC-4b + 2 new templates)
 *
 * Cases:
 *   1. Valid HTML — golden REQUESTS.html passes all HTML checks
 *   2. Missing AC section — checkHA must surface error
 *   3. Missing root data-ts-kind — checkHB must surface error
 *   4. Missing frontmatter <script id="ts-frontmatter"> — checkHC must surface error
 *   5. Frontmatter present but missing required keys (document_type / doc_id) — checkHC error
 *   6. Empty document — multiple errors aggregated
 *   7. Extension routing — isHtmlMode true for .html / .htm, false for .md / no-ext
 *   8. (Phase 2) PROGRESS golden HTML passes all HTML checks
 *   9. (Phase 2) RETROSPECTIVE golden HTML passes all HTML checks
 *  10. (Phase 2 HB-1) Missing <article> tag → HB error
 *  11. (Phase 2 HB-2) Missing <section> tag → HB error
 *
 * Output format: `N passed, M failed`
 * Exits non-zero only if any case fails.
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  checkHA, checkHB, checkHC, checkHtml,
  extractHtmlKinds, extractHtmlFrontmatter, isHtmlMode,
} = require('../src/mechanical-check.js');

const CLI_PATH    = path.join(__dirname, '..', 'src', 'mechanical-check.js');
const GOLDEN_HTML = path.join(__dirname, 'fixtures', 'main-068-vslice', 'REQUESTS.html');
const GOLDEN_MD   = path.join(__dirname, 'fixtures', 'main-068-vslice', 'REQUESTS-golden.md');
const GOLDEN_PROGRESS_HTML      = path.join(__dirname, 'fixtures', 'templates', 'PROGRESS-golden.html');
const GOLDEN_RETROSPECTIVE_HTML = path.join(__dirname, 'fixtures', 'templates', 'RETROSPECTIVE-golden.html');

// ── Tiny test harness (matches html-token-estimator.test.js style) ─────────────

let casePassed = 0;
let caseFailed = 0;
let currentCaseFailed = false;
let currentCaseName  = '(none)';
const caseFailures   = [];

let assertPassed = 0;
let assertFailed = 0;

function startCase(name) {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadGoldenHtml() {
  return fs.readFileSync(GOLDEN_HTML, 'utf-8');
}

const MINIMAL_VALID = '' +
  '<article data-ts-kind="requirements" data-ts-doc-id="t-1">' +
  '<header data-ts-role="frontmatter">' +
  '<script type="application/json" id="ts-frontmatter">' +
  '{"document_type":"requirements","doc_id":"t-1"}' +
  '</script></header>' +
  '<section data-ts-kind="ac"><h2>AC</h2>' +
  '<ul><li data-ts-id="AC-1">AC-1: x</li></ul></section>' +
  '</article>';

// ── Case 1: Valid HTML — golden REQUESTS.html passes ──────────────────────────
startCase('Case 1: golden REQUESTS.html passes all HTML checks');
{
  const html = loadGoldenHtml();
  const errors = checkHtml(html);
  assertEqual(errors.length, 0, 'Case1: checkHtml returns 0 errors');
}

// ── Case 2: Missing AC section ────────────────────────────────────────────────
startCase('Case 2: missing data-ts-kind="ac" surfaces error');
{
  const noAc = '' +
    '<article data-ts-kind="requirements">' +
    '<script type="application/json" id="ts-frontmatter">{"document_type":"requirements","doc_id":"t-2"}</script>' +
    '<section data-ts-kind="problem"><h2>P</h2></section>' +
    '</article>';
  const errors = checkHA(noAc);
  assertEqual(errors.length, 1, 'Case2: checkHA returns 1 error');
  assert(errors[0].includes('Check HA'), 'Case2: error message includes "Check HA"');
}

// ── Case 3: Missing root data-ts-kind ─────────────────────────────────────────
startCase('Case 3: missing root data-ts-kind in {requirements|progress|retrospective}');
{
  const orphan = '' +
    '<article data-ts-kind="other">' +
    '<section data-ts-kind="ac">AC-1</section>' +
    '</article>';
  const errors = checkHB(orphan);
  assert(errors.some(e => e.includes('no root data-ts-kind')), 'Case3: HB flags missing root');
}

// ── Case 4: Missing frontmatter script ────────────────────────────────────────
startCase('Case 4: missing <script id="ts-frontmatter">');
{
  const noFm = '' +
    '<article data-ts-kind="requirements">' +
    '<section data-ts-kind="ac">AC-1</section>' +
    '</article>';
  const errors = checkHC(noFm);
  assertEqual(errors.length, 1, 'Case4: checkHC returns 1 error');
  assert(errors[0].includes('no <script'), 'Case4: HC flags missing script');
}

// ── Case 5: Frontmatter missing required keys ─────────────────────────────────
startCase('Case 5: frontmatter present but missing document_type/doc_id');
{
  const badFm = '' +
    '<article data-ts-kind="requirements">' +
    '<script type="application/json" id="ts-frontmatter">{"status":"draft"}</script>' +
    '<section data-ts-kind="ac">AC-1</section>' +
    '</article>';
  const errors = checkHC(badFm);
  assert(errors.some(e => e.includes('document_type')), 'Case5: HC flags missing document_type');
  assert(errors.some(e => e.includes('doc_id')), 'Case5: HC flags missing doc_id');
}

// ── Case 6: Empty document aggregates multiple errors ─────────────────────────
startCase('Case 6: empty document aggregates errors across HA/HB/HC');
{
  const empty = '';
  const errors = checkHtml(empty);
  assert(errors.length >= 3, 'Case6: checkHtml returns ≥3 errors for empty doc');
  assert(errors.some(e => e.includes('Check HA')), 'Case6: HA error present');
  assert(errors.some(e => e.includes('Check HB')), 'Case6: HB error present');
  assert(errors.some(e => e.includes('Check HC')), 'Case6: HC error present');
}

// ── Case 7: Extension routing (isHtmlMode) ────────────────────────────────────
startCase('Case 7: isHtmlMode extension routing');
{
  assertEqual(isHtmlMode('foo.html'), true,  'Case7: .html → html mode');
  assertEqual(isHtmlMode('FOO.HTM'), true,   'Case7: .HTM (upper) → html mode');
  assertEqual(isHtmlMode('foo.md'), false,   'Case7: .md → markdown mode');
  assertEqual(isHtmlMode('README'), false,   'Case7: no extension → markdown mode');
}

// ── Case 8: PROGRESS golden HTML passes all HTML checks ───────────────────────
startCase('Case 8: golden PROGRESS-golden.html passes all HTML checks');
{
  const html = fs.readFileSync(GOLDEN_PROGRESS_HTML, 'utf-8');
  const errors = checkHtml(html);
  assertEqual(errors.length, 0, 'Case8: checkHtml returns 0 errors');
}

// ── Case 9: RETROSPECTIVE golden HTML passes all HTML checks ──────────────────
startCase('Case 9: golden RETROSPECTIVE-golden.html passes all HTML checks');
{
  const html = fs.readFileSync(GOLDEN_RETROSPECTIVE_HTML, 'utf-8');
  const errors = checkHtml(html);
  assertEqual(errors.length, 0, 'Case9: checkHtml returns 0 errors');
}

// ── Case 10: Missing <article> tag → HB-1 error ───────────────────────────────
startCase('Case 10: missing <article> tag surfaces HB-1 error');
{
  const noArticle = '' +
    '<div data-ts-kind="requirements" data-ts-doc-id="t-10">' +
    '<script type="application/json" id="ts-frontmatter">{"document_type":"requirements","doc_id":"t-10"}</script>' +
    '<section data-ts-kind="ac"><h2>AC</h2><ul><li data-ts-id="AC-1">x</li></ul></section>' +
    '</div>';
  const errors = checkHB(noArticle);
  assert(errors.some(e => e.includes('<article>')), 'Case10: HB flags missing <article> tag');
}

// ── Case 11: Missing <section> tag → HB-2 error ───────────────────────────────
startCase('Case 11: missing <section> tag surfaces HB-2 error');
{
  const noSection = '' +
    '<article data-ts-kind="requirements" data-ts-doc-id="t-11">' +
    '<script type="application/json" id="ts-frontmatter">{"document_type":"requirements","doc_id":"t-11"}</script>' +
    '<div data-ts-kind="ac"><h2>AC</h2><ul><li data-ts-id="AC-1">x</li></ul></div>' +
    '</article>';
  const errors = checkHB(noSection);
  assert(errors.some(e => e.includes('<section>')), 'Case11: HB flags missing <section> tag');
}

// ── End final case + supplementary ─────────────────────────────────────────────
endCase();

// Supplementary checks (not counted in the primary N-passed headline)
console.log('\n[supplementary checks — not counted in case totals]');
{
  // Helper: extractHtmlKinds
  const kinds = extractHtmlKinds(MINIMAL_VALID);
  console.log('  ' + (kinds.has('requirements') && kinds.has('ac') ? 'PASS' : 'FAIL') +
              '  extractHtmlKinds picks up requirements + ac');
  if (kinds.has('requirements') && kinds.has('ac')) assertPassed++; else assertFailed++;

  // Helper: extractHtmlFrontmatter
  const fm = extractHtmlFrontmatter(MINIMAL_VALID);
  const fmOk = fm.found && fm.parsed && fm.parsed.document_type === 'requirements';
  console.log('  ' + (fmOk ? 'PASS' : 'FAIL') + '  extractHtmlFrontmatter parses valid JSON');
  if (fmOk) assertPassed++; else assertFailed++;

  // CLI smoke — HTML mode (AC-4a direct verification)
  try {
    const out = execFileSync('node', [CLI_PATH, '--file', GOLDEN_HTML], { encoding: 'utf-8' });
    const parsed = JSON.parse(out);
    const okHtml = parsed.pass === true && parsed.mode === 'html' && parsed.errors.length === 0;
    console.log('  ' + (okHtml ? 'PASS' : 'FAIL') + '  CLI smoke (HTML): pass=true, mode=html, 0 errors');
    if (okHtml) assertPassed++; else assertFailed++;
  } catch (e) {
    // execFileSync throws on non-zero exit — that itself is a fail
    console.log('  FAIL  CLI smoke (HTML): ' + e.message);
    assertFailed++;
  }

  // CLI smoke — Markdown regression: golden markdown still passes
  try {
    const out = execFileSync('node', [CLI_PATH, '--file', GOLDEN_MD], { encoding: 'utf-8' });
    const parsed = JSON.parse(out);
    const okMd = parsed.pass === true && parsed.mode === 'markdown';
    console.log('  ' + (okMd ? 'PASS' : 'FAIL') + '  CLI smoke (MD regression): pass=true, mode=markdown');
    if (okMd) assertPassed++; else assertFailed++;
  } catch (e) {
    console.log('  FAIL  CLI smoke (MD regression): ' + e.message);
    assertFailed++;
  }

  // CLI smoke — HTML mode (Phase 2 PROGRESS golden)
  try {
    const out = execFileSync('node', [CLI_PATH, '--file', GOLDEN_PROGRESS_HTML], { encoding: 'utf-8' });
    const parsed = JSON.parse(out);
    const ok = parsed.pass === true && parsed.mode === 'html' && parsed.errors.length === 0;
    console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  CLI smoke (PROGRESS golden HTML): pass=true, 0 errors');
    if (ok) assertPassed++; else assertFailed++;
  } catch (e) {
    console.log('  FAIL  CLI smoke (PROGRESS golden HTML): ' + e.message);
    assertFailed++;
  }

  // CLI smoke — HTML mode (Phase 2 RETROSPECTIVE golden)
  try {
    const out = execFileSync('node', [CLI_PATH, '--file', GOLDEN_RETROSPECTIVE_HTML], { encoding: 'utf-8' });
    const parsed = JSON.parse(out);
    const ok = parsed.pass === true && parsed.mode === 'html' && parsed.errors.length === 0;
    console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  CLI smoke (RETROSPECTIVE golden HTML): pass=true, 0 errors');
    if (ok) assertPassed++; else assertFailed++;
  } catch (e) {
    console.log('  FAIL  CLI smoke (RETROSPECTIVE golden HTML): ' + e.message);
    assertFailed++;
  }

  // CLI smoke — HTML mode failure path (broken HTML exits 1, still valid JSON)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-mc-html-'));
  const brokenPath = path.join(tmp, 'broken.html');
  fs.writeFileSync(brokenPath, '<div>nothing semantic</div>');
  try {
    execFileSync('node', [CLI_PATH, '--file', brokenPath], { encoding: 'utf-8' });
    // If we get here, exit was 0 — that means pass was true on an obviously broken file
    console.log('  FAIL  CLI smoke (broken HTML): expected non-zero exit, got 0');
    assertFailed++;
  } catch (e) {
    // execFileSync throws → non-zero exit, which is correct for a broken HTML doc
    const out = e.stdout ? e.stdout.toString() : '';
    try {
      const parsed = JSON.parse(out);
      const okFail = parsed.pass === false && parsed.mode === 'html' && parsed.errors.length > 0;
      console.log('  ' + (okFail ? 'PASS' : 'FAIL') + '  CLI smoke (broken HTML): pass=false with errors');
      if (okFail) assertPassed++; else assertFailed++;
    } catch (parseErr) {
      console.log('  FAIL  CLI smoke (broken HTML): output not valid JSON');
      assertFailed++;
    }
  } finally {
    try { fs.unlinkSync(brokenPath); fs.rmdirSync(tmp); } catch (_) {}
  }
}

// ── Summary (AC-4 format) ─────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(casePassed + ' passed, ' + caseFailed + ' failed');
console.log('(assertion-level: ' + assertPassed + ' passed, ' + assertFailed + ' failed)');

if (caseFailed > 0) {
  console.log('\nCase failures:');
  for (const f of caseFailures) console.log('  - ' + f);
  process.exit(1);
}
process.exit(0);
