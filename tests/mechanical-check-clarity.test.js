'use strict';

const path   = require('path');
const test   = require('node:test');
const assert = require('node:assert/strict');
const { checkD, checkHD } = require('../src/mechanical-check.js');

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

test('Check D: version 1 missing clarity_score.history → no error (warning only)', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-v1-no-history', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, [], 'version 1 docs must not hard-fail (AC6)');
});

test('Check D: version 2 missing clarity_score.history → hard-fail', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-v2-no-history', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Check D.*clarity_score\.history/);
  assert.match(errors[0], /version 2/);
});

test('Check D: version 2 with history present → no error', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-v2-with-history', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, []);
});

test('Check D: no WORKFLOW_STATE.yaml sibling → no error (vacuous pass)', () => {
  const requests = path.join(FIXTURE_DIR, 'no-such-dir', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, []);
});

test('Check HD: aliases checkD for html mode', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-v2-no-history', 'REQUESTS.html');
  const errors = checkHD(requests);
  // The .html path doesn't exist; checkD reads the WORKFLOW_STATE.yaml from the directory regardless.
  // So we expect the same hard-fail as checkD on v2-no-history.
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Check D/);
});

test('AC6 regression: main-073 REQUESTS.md returns no Check D errors', () => {
  const requests = path.join(__dirname, '..', '.shinchan-docs', 'main-073', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, [], 'AC6: existing approved docs must not be broken by Check D');
});

// ── Extended Check D: clarity gate (interview-metrics-researc-001 FR-7) ──────

test('Check D gate: version 2, gate_loop_enabled:true, score < 0.8 → hard-fail (AC-12)', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-gate-fail', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.equal(errors.length, 1, 'expect exactly 1 error');
  assert.match(errors[0], /Check D: clarity gate not met/);
  assert.match(errors[0], /0\.75/);
  assert.match(errors[0], /gate_threshold 0\.8/);
});

test('Check D gate: version 2, gate_loop_enabled:true, weighted_overall >= 0.8 → pass (AC-13)', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-gate-pass', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, []);
});

test('Check D gate: version 2, gate_loop_enabled:false → skip gate check (AC-5, NFR-2)', () => {
  const requests = path.join(FIXTURE_DIR, 'check-d-gate-disabled', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, [], 'gate_loop_enabled:false must skip gate check');
});

test('Check D gate: version 1 with low score → no error (AC-14, NFR-2 backward compat)', () => {
  // version 1 must NEVER hard-fail on the gate, even with a low score.
  const requests = path.join(FIXTURE_DIR, 'check-d-v1-no-history', 'REQUESTS.md');
  const errors = checkD(requests);
  assert.deepEqual(errors, [], 'version 1 must not hard-fail even with low score');
});
