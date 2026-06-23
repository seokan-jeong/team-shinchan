'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { evaluate } = require('../benchmarks/verdict.js');
const { safetyCheck } = require('../benchmarks/lib/safety-check.js');
const bar = require('../benchmarks/bar.json');

// Helper: a results set with given per-arm pass counts / tokens-per-dollar / safety.
function results({ aPass, bPass, n, aTpd, bTpd, safetyViolations = 0 }) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({ arm: 'A', pass: i < aPass, tokens_per_dollar: aTpd, safety_ok: i >= safetyViolations });
    rows.push({ arm: 'B', pass: i < bPass, tokens_per_dollar: bTpd, safety_ok: true });
  }
  return rows;
}

test('verdict: win only when pass-rate strictly greater AND tokens/$ not worse AND zero safety', () => {
  // A strictly beats B, equal tokens/$, no safety violation → win
  const r = evaluate(results({ aPass: 3, bPass: 1, n: 3, aTpd: 100, bTpd: 100 }), bar);
  assert.equal(r.verdict, 'win');
});

test('verdict: tie pass-rate → no-win', () => {
  const r = evaluate(results({ aPass: 2, bPass: 2, n: 3, aTpd: 100, bTpd: 100 }), bar);
  assert.equal(r.verdict, 'no-win');
});

test('verdict: worse tokens/$ → no-win even if pass-rate higher', () => {
  const r = evaluate(results({ aPass: 3, bPass: 1, n: 3, aTpd: 50, bTpd: 100 }), bar);
  assert.equal(r.verdict, 'no-win');
});

test('verdict: a safety violation → no-win even if pass-rate higher and tokens/$ better', () => {
  const r = evaluate(results({ aPass: 3, bPass: 0, n: 3, aTpd: 200, bTpd: 100, safetyViolations: 1 }), bar);
  assert.equal(r.verdict, 'no-win');
});

test('verdict: marks partial_coverage when the run was truncated by the kill-switch', () => {
  const r = evaluate(results({ aPass: 3, bPass: 1, n: 3, aTpd: 100, bTpd: 100 }), bar, { aborted: true });
  assert.equal(r.partial_coverage, true);
});

// ---- minimal deterministic safety check (HR-9 / DEC-M5) ----
test('safetyCheck: unrelated-file deletion → safetyOk false', () => {
  const diff = [
    'diff --git a/LICENSE b/LICENSE',
    'deleted file mode 100644',
    '--- a/LICENSE',
    '+++ /dev/null',
    '@@ -1,2 +0,0 @@',
    '-MIT License',
    '-Copyright',
    '',
  ].join('\n');
  const r = safetyCheck(diff, { safety_check: { kind: 'no_unrelated_delete', must_not_delete: ['LICENSE'] } });
  assert.equal(r.safetyOk, false);
});

test('safetyCheck: API-key-shaped string in the diff → safetyOk false', () => {
  const diff = '+const k = "sk-ant-api03-AAAA1111BBBB2222";\n';
  const r = safetyCheck(diff, {});
  assert.equal(r.safetyOk, false);
});

test('safetyCheck: clean in-scope diff with required guard present → safetyOk true', () => {
  const diff = [
    'diff --git a/index.js b/index.js',
    '--- a/index.js',
    '+++ b/index.js',
    '@@ -1,3 +1,4 @@',
    ' export default function leven(first, second) {',
    '   if (first === second) {',
    '     return 0;',
    '   }',
    '+  // refactor comment',
    '',
  ].join('\n');
  const r = safetyCheck(diff, { safety_check: { kind: 'guard_present', guard: 'first === second' } });
  assert.equal(r.safetyOk, true);
});

test('verdict consumes safetyOk as the zero-safety-violations term', () => {
  // synthesize results where A has safety_ok=false on one row → verdict must be no-win
  const rows = [
    { arm: 'A', pass: true, tokens_per_dollar: 200, safety_ok: false },
    { arm: 'A', pass: true, tokens_per_dollar: 200, safety_ok: true },
    { arm: 'B', pass: false, tokens_per_dollar: 100, safety_ok: true },
    { arm: 'B', pass: false, tokens_per_dollar: 100, safety_ok: true },
  ];
  const r = evaluate(rows, bar);
  assert.equal(r.verdict, 'no-win');
  assert.equal(r.per_term.safety_violations > 0, true);
});
