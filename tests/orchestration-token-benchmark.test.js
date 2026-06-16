'use strict';

/**
 * Unit tests for src/orchestration-token-benchmark.js (INFRA-01).
 *
 * Proves the deterministic, fixture-driven token benchmark: cacheHitRate math on a known
 * fixture, zero-denominator -> 0, shape-guard rejection of malformed samples, and the
 * byte-identical / name-sorted determinism of runOrchestrationTokenBenchmark.
 *
 * Conceptual port of the MIT-licensed gajae-code pattern
 * (packages/orchestration-token-benchmark/src/{index,metrics}.ts).
 *
 * Run: node --test tests/orchestration-token-benchmark.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const b = require('../src/orchestration-token-benchmark.js');

// ── computeTokenMetrics: cacheHitRate math on a known fixture ────────────────────────────

test('computeTokenMetrics: cacheHitRate on a known fixture', () => {
  const samples = [
    { input: 1000, output: 200, cacheRead: 3000, cacheWrite: 500 },
    { input: 500, output: 100, cacheRead: 1500, cacheWrite: 0 },
  ];
  const m = b.computeTokenMetrics(samples);
  assert.equal(m.totalInput, 1500);
  assert.equal(m.totalOutput, 300);
  assert.equal(m.totalCacheRead, 4500);
  assert.equal(m.totalCacheWrite, 500);
  // cacheHitRate = 4500 / (1500 + 4500) = 0.75
  assert.equal(m.cacheHitRate, 0.75);
});

test('computeTokenMetrics: zero-denominator -> cacheHitRate 0', () => {
  // No input and no cacheRead -> denominator 0 -> 0 (not NaN).
  const m = b.computeTokenMetrics([{ input: 0, output: 50, cacheRead: 0, cacheWrite: 0 }]);
  assert.equal(m.cacheHitRate, 0);
  assert.equal(Number.isNaN(m.cacheHitRate), false);
});

test('computeTokenMetrics: empty array aggregates to zeros', () => {
  const m = b.computeTokenMetrics([]);
  assert.deepEqual(m, {
    totalInput: 0,
    totalOutput: 0,
    totalCacheRead: 0,
    totalCacheWrite: 0,
    cacheHitRate: 0,
  });
});

test('computeTokenMetrics: rejects a non-array', () => {
  assert.throws(() => b.computeTokenMetrics(null), /must be an array/);
});

// ── assertTokenLogShape: rejects malformed samples ───────────────────────────────────────

test('assertTokenLogShape: valid sample returns true', () => {
  assert.equal(
    b.assertTokenLogShape({ input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }),
    true
  );
});

test('assertTokenLogShape: throws on a missing field', () => {
  assert.throws(
    () => b.assertTokenLogShape({ input: 1, output: 2, cacheRead: 3 }),
    /missing required field "cacheWrite"/
  );
});

test('assertTokenLogShape: throws on a negative field', () => {
  assert.throws(
    () => b.assertTokenLogShape({ input: -1, output: 2, cacheRead: 3, cacheWrite: 4 }),
    /"input" must be >= 0/
  );
});

test('assertTokenLogShape: throws on a non-number field', () => {
  assert.throws(
    () => b.assertTokenLogShape({ input: '100', output: 2, cacheRead: 3, cacheWrite: 4 }),
    /"input" must be a finite number/
  );
});

test('assertTokenLogShape: throws on NaN / Infinity (non-finite)', () => {
  assert.throws(
    () => b.assertTokenLogShape({ input: NaN, output: 2, cacheRead: 3, cacheWrite: 4 }),
    /must be a finite number/
  );
  assert.throws(
    () => b.assertTokenLogShape({ input: Infinity, output: 2, cacheRead: 3, cacheWrite: 4 }),
    /must be a finite number/
  );
});

test('assertTokenLogShape: throws on non-object input', () => {
  assert.throws(() => b.assertTokenLogShape(null), /must be a plain object/);
  assert.throws(() => b.assertTokenLogShape([]), /must be a plain object/);
});

test('computeTokenMetrics: propagates shape validation to each sample', () => {
  assert.throws(
    () => b.computeTokenMetrics([
      { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
      { input: 1, output: 2, cacheRead: 3 }, // malformed
    ]),
    /missing required field "cacheWrite"/
  );
});

// ── runOrchestrationTokenBenchmark: determinism + name-sorting ───────────────────────────

const benchFixtures = {
  'phase-2-execution': [
    { input: 1000, output: 200, cacheRead: 3000, cacheWrite: 500 },
    { input: 500, output: 100, cacheRead: 1500, cacheWrite: 0 },
  ],
  'phase-1-planning': [{ input: 800, output: 400, cacheRead: 0, cacheWrite: 200 }],
};

test('runOrchestrationTokenBenchmark: fixtures are sorted by name', () => {
  const report = b.runOrchestrationTokenBenchmark(benchFixtures);
  assert.deepEqual(
    report.fixtures.map((f) => f.name),
    ['phase-1-planning', 'phase-2-execution']
  );
});

test('runOrchestrationTokenBenchmark: determinism -> byte-identical JSON', () => {
  const a = JSON.stringify(b.runOrchestrationTokenBenchmark(benchFixtures));
  const c = JSON.stringify(b.runOrchestrationTokenBenchmark(benchFixtures));
  assert.equal(a, c);
});

test('runOrchestrationTokenBenchmark: key-insertion order does not change output', () => {
  // Same fixtures, different object key insertion order -> identical serialized report.
  const reordered = {
    'phase-1-planning': benchFixtures['phase-1-planning'],
    'phase-2-execution': benchFixtures['phase-2-execution'],
  };
  assert.equal(
    JSON.stringify(b.runOrchestrationTokenBenchmark(benchFixtures)),
    JSON.stringify(b.runOrchestrationTokenBenchmark(reordered))
  );
});

test('runOrchestrationTokenBenchmark: array fixtures form is supported', () => {
  const report = b.runOrchestrationTokenBenchmark([
    { name: 'b-fixture', samples: [{ input: 10, output: 1, cacheRead: 30, cacheWrite: 0 }] },
    { name: 'a-fixture', samples: [{ input: 20, output: 2, cacheRead: 0, cacheWrite: 5 }] },
  ]);
  assert.deepEqual(report.fixtures.map((f) => f.name), ['a-fixture', 'b-fixture']);
});

test('runOrchestrationTokenBenchmark: aggregate spans all fixture samples', () => {
  const report = b.runOrchestrationTokenBenchmark(benchFixtures);
  // totals across all 3 samples: input 1000+500+800=2300, cacheRead 3000+1500+0=4500
  assert.equal(report.aggregate.totalInput, 2300);
  assert.equal(report.aggregate.totalOutput, 700);
  assert.equal(report.aggregate.totalCacheRead, 4500);
  assert.equal(report.aggregate.totalCacheWrite, 700);
  // cacheHitRate = 4500 / (2300 + 4500) = 0.661765
  assert.equal(report.aggregate.cacheHitRate, b.computeTokenMetrics(
    benchFixtures['phase-2-execution'].concat(benchFixtures['phase-1-planning'])
  ).cacheHitRate);
});

test('runOrchestrationTokenBenchmark: rejects malformed fixture container', () => {
  assert.throws(() => b.runOrchestrationTokenBenchmark(42), /must be an object map or array/);
});
