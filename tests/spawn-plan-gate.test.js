#!/usr/bin/env node
/**
 * Tests for src/spawn-plan-gate.js — the OPT-IN hard spawn-plan gate.
 * Zero npm dependencies (node:test + node:assert/strict).
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_SPAWN_THRESHOLD,
  findMissingPlanFields,
  evaluateSpawnGate,
  evaluateSpawnGateAtThreshold,
} = require('../src/spawn-plan-gate');

const completePlan = {
  whyParallel: 'fan-out is faster than serial reads',
  whyNotLocal: 'each target lives in a separate package',
  independence: 'no shared state between subtasks',
  expectedReceiptShape: '{ files: string[], summary: string }',
  maxInlineTokens: 2000,
};

test('DEFAULT_SPAWN_THRESHOLD is 4', () => {
  assert.equal(DEFAULT_SPAWN_THRESHOLD, 4);
});

test('batchSize <= threshold is always allowed (even with no plan)', () => {
  for (const batchSize of [1, 2, 3, 4]) {
    const res = evaluateSpawnGate({ batchSize });
    assert.equal(res.allowed, true);
    assert.deepEqual(res.missing, []);
    assert.equal(res.reason, undefined);
  }
});

test('batchSize > threshold with a complete plan is allowed', () => {
  const res = evaluateSpawnGate({ batchSize: 10, plan: completePlan });
  assert.equal(res.allowed, true);
  assert.deepEqual(res.missing, []);
});

test('batchSize > threshold with missing fields is denied with correct missing list', () => {
  const partial = {
    whyParallel: 'speed',
    maxInlineTokens: 1000,
    // whyNotLocal, independence, expectedReceiptShape missing
  };
  const res = evaluateSpawnGate({ batchSize: 8, plan: partial });
  assert.equal(res.allowed, false);
  assert.deepEqual(res.missing, ['whyNotLocal', 'independence', 'expectedReceiptShape']);
  assert.equal(res.reason, 'batch size 8 exceeds threshold 4; SpawnPlanReceipt incomplete');
});

test('batchSize > threshold with no plan at all is denied (all fields missing)', () => {
  const res = evaluateSpawnGate({ batchSize: 5 });
  assert.equal(res.allowed, false);
  assert.deepEqual(res.missing, [
    'whyParallel',
    'whyNotLocal',
    'independence',
    'expectedReceiptShape',
    'maxInlineTokens',
  ]);
  assert.match(res.reason, /exceeds threshold 4/);
});

test('custom threshold changes the gating boundary', () => {
  // threshold 2: batchSize 3 now requires a plan
  const denied = evaluateSpawnGate({ batchSize: 3, threshold: 2 });
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'batch size 3 exceeds threshold 2; SpawnPlanReceipt incomplete');

  // threshold 10: batchSize 8 allowed with no plan
  const allowed = evaluateSpawnGate({ batchSize: 8, threshold: 10 });
  assert.equal(allowed.allowed, true);
  assert.deepEqual(allowed.missing, []);

  // threshold 2 with a complete plan above boundary → allowed
  const okWithPlan = evaluateSpawnGate({ batchSize: 3, threshold: 2, plan: completePlan });
  assert.equal(okWithPlan.allowed, true);
});

test('maxInlineTokens = 0 is treated as missing', () => {
  const plan = { ...completePlan, maxInlineTokens: 0 };
  assert.deepEqual(findMissingPlanFields(plan), ['maxInlineTokens']);

  const res = evaluateSpawnGate({ batchSize: 9, plan });
  assert.equal(res.allowed, false);
  assert.deepEqual(res.missing, ['maxInlineTokens']);
});

test('findMissingPlanFields returns empty for a complete plan', () => {
  assert.deepEqual(findMissingPlanFields(completePlan), []);
});

test('findMissingPlanFields treats empty/whitespace strings as missing', () => {
  const plan = { ...completePlan, whyParallel: '', whyNotLocal: '   ' };
  assert.deepEqual(findMissingPlanFields(plan), ['whyParallel', 'whyNotLocal']);
});

test('benchmark variant exists and mirrors the runtime gate', () => {
  assert.equal(typeof evaluateSpawnGateAtThreshold, 'function');

  const a = evaluateSpawnGateAtThreshold({ batchSize: 3, plan: completePlan, threshold: 2 });
  const b = evaluateSpawnGate({ batchSize: 3, plan: completePlan, threshold: 2 });
  assert.deepEqual(a, b);

  const denied = evaluateSpawnGateAtThreshold({ batchSize: 6, threshold: 1 });
  assert.equal(denied.allowed, false);
});
