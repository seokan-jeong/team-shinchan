'use strict';

/**
 * Unit tests for src/evidence-gated-approval.js (INFRA-04).
 *
 * Proves the evidence-gated approval decision: an efficiency / default-reduction
 * change is approved ONLY with measured benchmark evidence (status passed, tokens
 * decreased, success not regressed) AND an anchored approval (pr + approver + url).
 * Also proves the JSONL ledger helper writes parseable, append-only lines.
 *
 * Run: node --test tests/evidence-gated-approval.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const m = require('../src/evidence-gated-approval.js');

// Reusable valid building blocks ───────────────────────────────────────────
const validEvidence = {
  status: 'passed',
  tokenBefore: 1000,
  tokenAfter: 800,
  successBefore: 0.95,
  successAfter: 0.96,
};

const validApproval = {
  pr: '#1234',
  approver: 'seokan-jeong',
  url: 'https://github.com/org/repo/pull/1234',
};

// ── Decision: approved ──────────────────────────────────────────────────────

test('fully-valid evidence + anchored approval → approved', () => {
  const res = m.evaluateDefaultReduction({
    benchmarkEvidence: validEvidence,
    approval: validApproval,
  });
  assert.equal(res.outcome, 'approved');
  assert.deepEqual(res.reasons, []);
});

// ── Decision: blocked on benchmark evidence ──────────────────────────────────

test('token not decreased → blocked with token reason', () => {
  const res = m.evaluateDefaultReduction({
    benchmarkEvidence: { ...validEvidence, tokenAfter: 1000 },
    approval: validApproval,
  });
  assert.equal(res.outcome, 'blocked');
  assert.ok(
    res.reasons.some((r) => /token metric did not decrease/.test(r)),
    `expected a token reason, got ${JSON.stringify(res.reasons)}`,
  );
});

test('fixture success regressed → blocked with success reason', () => {
  const res = m.evaluateDefaultReduction({
    benchmarkEvidence: { ...validEvidence, successAfter: 0.90 },
    approval: validApproval,
  });
  assert.equal(res.outcome, 'blocked');
  assert.ok(
    res.reasons.some((r) => /success regressed/.test(r)),
    `expected a success reason, got ${JSON.stringify(res.reasons)}`,
  );
});

test('benchmark status not passed → blocked with status reason', () => {
  const res = m.evaluateDefaultReduction({
    benchmarkEvidence: { ...validEvidence, status: 'failed' },
    approval: validApproval,
  });
  assert.equal(res.outcome, 'blocked');
  assert.ok(
    res.reasons.some((r) => /status must be "passed"/.test(r)),
    `expected a status reason, got ${JSON.stringify(res.reasons)}`,
  );
});

// ── Decision: blocked on missing approval anchors ────────────────────────────

test('missing approver / pr / url → blocked with anchor reasons', () => {
  const res = m.evaluateDefaultReduction({
    benchmarkEvidence: validEvidence,
    approval: { pr: '', approver: '', url: 'not-a-url' },
  });
  assert.equal(res.outcome, 'blocked');
  assert.ok(res.reasons.some((r) => /approval\.pr is required/.test(r)));
  assert.ok(res.reasons.some((r) => /approval\.approver is required/.test(r)));
  assert.ok(res.reasons.some((r) => /approval\.url is required/.test(r)));
  assert.equal(res.reasons.length, 3, 'exactly the three anchor reasons');
});

test('missing args entirely → blocked (no throw)', () => {
  const res = m.evaluateDefaultReduction();
  assert.equal(res.outcome, 'blocked');
  assert.ok(res.reasons.length > 0);
});

// ── Ledger helper: JSONL append ──────────────────────────────────────────────

test('appendReductionLedgerEntry writes a parseable JSONL line and appends', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra04-'));
  const ledgerPath = path.join(dir, 'reduction-ledger.jsonl');

  const e1 = { id: 1, outcome: 'approved', pr: '#1234' };
  const e2 = { id: 2, outcome: 'blocked', pr: '#1235' };

  const returned1 = m.appendReductionLedgerEntry(ledgerPath, e1);
  const returned2 = m.appendReductionLedgerEntry(ledgerPath, e2);

  assert.deepEqual(returned1, e1, 'returns the written entry');
  assert.deepEqual(returned2, e2, 'returns the written entry');

  const lines = fs.readFileSync(ledgerPath, 'utf-8').trim().split('\n');
  assert.equal(lines.length, 2, 'two entries → two lines (append-only)');

  const parsed = lines.map((l) => JSON.parse(l));
  assert.deepEqual(parsed[0], e1);
  assert.deepEqual(parsed[1], e2);

  fs.rmSync(dir, { recursive: true, force: true });
});
