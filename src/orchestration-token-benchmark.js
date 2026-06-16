#!/usr/bin/env node
/**
 * Orchestration-Token Benchmark — Team-Shinchan (INFRA-01)
 *
 * A deterministic, fixture-driven token benchmark. There is NO network, provider,
 * clock, or filesystem randomness anywhere in the exported surface — every function
 * is a pure transform of its inputs, so CI can assert token-cost regressions
 * byte-for-byte and fixtures cannot silently drift.
 *
 * Zero npm dependencies (mirrors src/eval-metrics.js / src/option-metrics.js).
 *
 * ── ORIGIN ───────────────────────────────────────────────────────────────────────────
 * Conceptual port of the MIT-licensed gajae-code pattern at
 *   packages/orchestration-token-benchmark/src/{index,metrics}.ts (MIT).
 * It answers the interview-metrics / quality-over-cost benchmark demand: tokens are not
 * a constraint to minimize blindly, but cache-hit efficiency IS a measurable, regressable
 * quality signal of how well the orchestration reuses context across agent hand-offs.
 *
 * ── DETERMINISM CONTRACT ─────────────────────────────────────────────────────────────
 * - assertTokenLogShape rejects any malformed/negative/non-number field (guards drift).
 * - computeTokenMetrics aggregates a sample array into a stable metric object.
 * - runOrchestrationTokenBenchmark sorts fixtures by name so JSON.stringify is stable.
 */
'use strict';

/**
 * Validate that a token-log sample has the four required numeric fields.
 * Throws a descriptive Error on any malformed / missing / negative / non-number field.
 * @param {{input:number, output:number, cacheRead:number, cacheWrite:number}} entry
 * @returns {true} when valid (otherwise throws)
 */
function assertTokenLogShape(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`assertTokenLogShape: sample must be a plain object, got ${describe(entry)}`);
  }
  const fields = ['input', 'output', 'cacheRead', 'cacheWrite'];
  for (const field of fields) {
    if (!(field in entry)) {
      throw new Error(`assertTokenLogShape: missing required field "${field}"`);
    }
    const value = entry[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(
        `assertTokenLogShape: field "${field}" must be a finite number, got ${describe(value)}`
      );
    }
    if (value < 0) {
      throw new Error(`assertTokenLogShape: field "${field}" must be >= 0, got ${value}`);
    }
  }
  return true;
}

/**
 * Aggregate an array of token-log samples into stable metrics.
 * cacheHitRate = totalCacheRead / (totalInput + totalCacheRead); 0 when denominator is 0.
 * Each sample is validated via assertTokenLogShape before aggregation.
 * @param {Array<{input:number, output:number, cacheRead:number, cacheWrite:number}>} samples
 * @returns {{totalInput:number, totalOutput:number, totalCacheRead:number,
 *   totalCacheWrite:number, cacheHitRate:number}}
 */
function computeTokenMetrics(samples) {
  if (!Array.isArray(samples)) {
    throw new Error(`computeTokenMetrics: samples must be an array, got ${describe(samples)}`);
  }
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  for (const sample of samples) {
    assertTokenLogShape(sample);
    totalInput += sample.input;
    totalOutput += sample.output;
    totalCacheRead += sample.cacheRead;
    totalCacheWrite += sample.cacheWrite;
  }
  const denom = totalInput + totalCacheRead;
  const cacheHitRate = denom === 0 ? 0 : round(totalCacheRead / denom, 6);
  return { totalInput, totalOutput, totalCacheRead, totalCacheWrite, cacheHitRate };
}

/**
 * Run the benchmark over a map (object) or array of named fixture sample-sets and return
 * a STABLE structured report. Fixtures are sorted by name for deterministic serialization.
 * @param {Object<string,Array>|Array<{name:string, samples:Array}>} fixtures
 * @returns {{fixtures:Array<{name:string, metrics:object}>, aggregate:object}}
 */
function runOrchestrationTokenBenchmark(fixtures) {
  const named = normalizeFixtures(fixtures);
  const perFixture = named
    .map(({ name, samples }) => ({ name, metrics: computeTokenMetrics(samples) }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  // Aggregate is the metrics over the concatenation of every fixture's samples.
  const allSamples = named.reduce((acc, f) => acc.concat(f.samples), []);
  return { fixtures: perFixture, aggregate: computeTokenMetrics(allSamples) };
}

// ─── Internal utils ────────────────────────────────────────────────────────────────────

/** Normalize the {name, samples}[] | {name: samples} input into a {name, samples}[] list. */
function normalizeFixtures(fixtures) {
  if (Array.isArray(fixtures)) {
    return fixtures.map((f) => {
      if (f === null || typeof f !== 'object' || typeof f.name !== 'string') {
        throw new Error(
          `runOrchestrationTokenBenchmark: array fixtures need {name, samples}, got ${describe(f)}`
        );
      }
      return { name: f.name, samples: Array.isArray(f.samples) ? f.samples : [] };
    });
  }
  if (fixtures !== null && typeof fixtures === 'object') {
    return Object.keys(fixtures).map((name) => ({
      name,
      samples: Array.isArray(fixtures[name]) ? fixtures[name] : [],
    }));
  }
  throw new Error(
    `runOrchestrationTokenBenchmark: fixtures must be an object map or array, got ${describe(fixtures)}`
  );
}

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function round(x, d = 6) {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}

module.exports = {
  assertTokenLogShape,
  computeTokenMetrics,
  runOrchestrationTokenBenchmark,
};

// ── CLI self-test spot-check (node src/orchestration-token-benchmark.js) ─────────────────
if (require.main === module) {
  const fixtures = {
    'phase-2-execution': [
      { input: 1000, output: 200, cacheRead: 3000, cacheWrite: 500 },
      { input: 500, output: 100, cacheRead: 1500, cacheWrite: 0 },
    ],
    'phase-1-planning': [{ input: 800, output: 400, cacheRead: 0, cacheWrite: 200 }],
  };
  const report = runOrchestrationTokenBenchmark(fixtures);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
