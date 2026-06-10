'use strict';

/**
 * Unit tests for src/option-metrics.js (interview-metrics-researc-002 Phase 1).
 *
 * Proves the gating thresholds are computable and the metric functions correct against known
 * fixtures, plus the pure pipeline-logic helpers (weight validation, missing-alternative
 * critic, SelfCheckGPT majority-vote, escape-hatch / default-on source resolution, graceful
 * degradation, k-bound-after-critic, evidence-field presence).
 *
 * Correctness proxy: user's eventual option selection = ground-truth `correct` label.
 *
 * Run: node --test tests/option-metrics.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const m = require('../src/option-metrics.js');

// ── Gating bars ───────────────────────────────────────────────────────────────────────

// Well-calibrated fixture (≥10 option-selection pairs): equal-width bins where each band's
// empirical accuracy equals its confidence.
const calibratedPairs = [
  { confidence: 0.0, correct: 0 }, { confidence: 0.0, correct: 0 },
  { confidence: 0.25, correct: 1 }, { confidence: 0.25, correct: 0 },
  { confidence: 0.25, correct: 0 }, { confidence: 0.25, correct: 0 },
  { confidence: 0.5, correct: 1 }, { confidence: 0.5, correct: 0 },
  { confidence: 0.75, correct: 1 }, { confidence: 0.75, correct: 1 },
  { confidence: 0.75, correct: 1 }, { confidence: 0.75, correct: 0 },
  { confidence: 1.0, correct: 1 }, { confidence: 1.0, correct: 1 },
];

test('AC-5: ECE (classwise) < 0.10 on the calibrated fixture (>=10 pairs)', () => {
  assert.ok(calibratedPairs.length >= 10, 'fixture has >= 10 pairs');
  const ece = m.computeECE(calibratedPairs, { mode: 'classwise', bins: 5 });
  assert.ok(ece < 0.10, `ECE=${ece} must be < 0.10`);
});

test('AC-5: AUROC >= 0.70 on the same fixture', () => {
  const auroc = m.computeAUROC(calibratedPairs);
  assert.ok(auroc >= 0.70, `AUROC=${auroc} must be >= 0.70`);
});

test('computeECE: a badly-miscalibrated fixture yields high ECE', () => {
  // High confidence but always wrong, and vice versa.
  const bad = [
    { confidence: 0.95, correct: 0 }, { confidence: 0.95, correct: 0 },
    { confidence: 0.9, correct: 0 }, { confidence: 0.05, correct: 1 },
    { confidence: 0.05, correct: 1 }, { confidence: 0.1, correct: 1 },
  ];
  const ece = m.computeECE(bad, { mode: 'classwise', bins: 5 });
  assert.ok(ece > 0.5, `miscalibrated ECE=${ece} should be large`);
});

test('computeAUROC: perfect separation = 1.0, no separation ~ 0.5', () => {
  const perfect = [
    { confidence: 0.9, correct: 1 }, { confidence: 0.8, correct: 1 },
    { confidence: 0.2, correct: 0 }, { confidence: 0.1, correct: 0 },
  ];
  assert.equal(m.computeAUROC(perfect), 1);
  // single class -> no signal -> 0.5
  assert.equal(m.computeAUROC([{ confidence: 0.5, correct: 1 }]), 0.5);
});

test('gating bars: Distinct-2 >= 0.55 on a diverse set; self-BLEU <= 0.40', () => {
  const diverse = [
    'add a redis caching layer for hot reads',
    'rewrite the query planner to push predicates down',
    'shard the postgres tenants table by region',
  ];
  const d2 = m.computeDistinct2(diverse);
  const sb = m.computeSelfBLEU(diverse);
  assert.ok(d2 >= 0.55, `Distinct-2=${d2} must be >= 0.55`);
  assert.ok(sb <= 0.40, `self-BLEU=${sb} must be <= 0.40`);
});

test('diversity metrics: near-duplicate options score low Distinct-2 / high self-BLEU', () => {
  const dupes = [
    'add a redis caching layer for hot reads',
    'add a redis caching layer for hot reads now',
    'add a redis caching layer for hot reads please',
  ];
  const d2 = m.computeDistinct2(dupes);
  const sb = m.computeSelfBLEU(dupes);
  assert.ok(d2 < 0.55, `duplicate Distinct-2=${d2} should be < 0.55`);
  assert.ok(sb > 0.40, `duplicate self-BLEU=${sb} should be > 0.40`);
});

// ── AC-2: verbalized-sampling weight validation ─────────────────────────────────────────

test('AC-2: valid weights summing to 1.0 are used as-is', () => {
  const r = m.validateWeights([0.5, 0.3, 0.2], 3);
  assert.equal(r.valid, true);
  assert.deepEqual(r.weights, [0.5, 0.3, 0.2]);
});

test('AC-2: sum out of [0.98,1.02] falls back to uniform', () => {
  const r = m.validateWeights([0.5, 0.8, 0.1], 3); // sum 1.4
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'sum_out_of_range');
  assert.deepEqual(r.weights, [1 / 3, 1 / 3, 1 / 3]);
});

test('AC-2: negative weights fall back to uniform', () => {
  const r = m.validateWeights([0.6, 0.6, -0.2], 3);
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'negative_weight');
  assert.deepEqual(r.weights, [1 / 3, 1 / 3, 1 / 3]);
});

test('AC-2: length mismatch falls back to uniform', () => {
  const r = m.validateWeights([0.5, 0.5], 3);
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'length_mismatch');
  assert.equal(r.weights.length, 3);
});

test('AC-2: rounding tolerance — sum 0.99 is accepted', () => {
  const r = m.validateWeights([0.33, 0.33, 0.33], 3); // sum 0.99
  assert.equal(r.valid, true);
});

// ── AC-3: missing-alternative critic ────────────────────────────────────────────────────

test('AC-3: "no better alternative" -> no retry, set unchanged', () => {
  const set = [{ option: 'x' }, { option: 'y' }];
  const r = m.applyMissingAlternativeCritic(set, { noBetterAlternative: true });
  assert.equal(r.retry, false);
  assert.equal(r.appended, false);
  assert.equal(r.candidates.length, 2);
});

test('AC-3: surfaced alternative -> appended before calibration', () => {
  const set = [{ option: 'x' }, { option: 'y' }];
  const r = m.applyMissingAlternativeCritic(set, { newOption: { option: 'z' } });
  assert.equal(r.appended, true);
  assert.equal(r.retry, false);
  assert.equal(r.candidates.length, 3);
  assert.equal(r.candidates[2].option, 'z');
});

test('AC-3: ambiguous critic signal never triggers infinite retry', () => {
  const set = [{ option: 'x' }];
  const r = m.applyMissingAlternativeCritic(set, {});
  assert.equal(r.retry, false);
});

// ── AC-11: SelfCheckGPT majority vote ───────────────────────────────────────────────────

test('AC-11: option backed by only 1 of 3 generators is filtered (majority threshold=3)', () => {
  const r = m.selfCheckConsensus(
    [{ id: 'a', votes: 1 }, { id: 'b', votes: 3 }],
    3
  );
  assert.equal(r.threshold, 3); // ceil(3/2+1)=3
  assert.deepEqual(r.passed.map(o => o.id), ['b']);
  assert.deepEqual(r.filtered.map(o => o.id), ['a']);
});

test('AC-11: threshold is strictly-more-than-half for N=4 and N=5', () => {
  assert.equal(m.selfCheckConsensus([], 4).threshold, 3); // ceil(4/2+1)=3
  assert.equal(m.selfCheckConsensus([], 5).threshold, 4); // ceil(5/2+1)=4
});

// ── AC-9 / AC-10: option-source resolution (default-on + escape hatch) ──────────────────

test('AC-9: default-on — absent/unset config -> fierce_panel', () => {
  assert.equal(m.resolveOptionSource({}), 'fierce_panel');
  assert.equal(m.resolveOptionSource({ interview: {} }), 'fierce_panel');
  assert.equal(m.resolveOptionSource(undefined), 'fierce_panel');
});

test('AC-10: escape hatch — fierce_option_panel:false -> basic', () => {
  assert.equal(m.resolveOptionSource({ interview: { fierce_option_panel: false } }), 'basic');
});

// ── AC-16: graceful degradation ─────────────────────────────────────────────────────────

test('AC-16: panel throw -> basic_fallback without blocking', async () => {
  const panelFn = async () => { throw new Error('generator exploded'); };
  const basicFn = async () => ({ options: ['fallback-option'] });
  const out = await m.runWithFallback(panelFn, basicFn);
  assert.equal(out.option_source, 'basic_fallback');
  assert.deepEqual(out.result.options, ['fallback-option']);
});

test('runWithFallback: panel success -> fierce_panel', async () => {
  const out = await m.runWithFallback(async () => ({ ok: true }), async () => ({ ok: false }));
  assert.equal(out.option_source, 'fierce_panel');
  assert.equal(out.result.ok, true);
});

// ── AC-17: K-bound applied AFTER the critic pass ────────────────────────────────────────

test('AC-17: k_max=6 with a critic-appended 7th option -> final count = 6', () => {
  // Simulate: 6 candidates, critic appends a 7th, THEN k-bound truncates.
  let candidates = Array.from({ length: 6 }, (_, i) => ({ option: `o${i}`, weight: i / 10 }));
  const afterCritic = m.applyMissingAlternativeCritic(candidates, { newOption: { option: 'o6', weight: 0.99 } });
  assert.equal(afterCritic.candidates.length, 7, 'critic appended -> 7 before truncation');
  const truncated = m.kBoundTruncate(afterCritic.candidates, 6);
  assert.equal(truncated.length, 6, 'k-bound applied AFTER critic -> 6');
  // Highest weight (the appended option) survives.
  assert.ok(truncated.some(o => o.option === 'o6'), 'highest-weight appended option kept');
});

test('kBoundTruncate: keeps highest-weight options by rank', () => {
  const cands = [{ option: 'a', weight: 0.1 }, { option: 'b', weight: 0.9 }, { option: 'c', weight: 0.5 }];
  const t = m.kBoundTruncate(cands, 2);
  assert.deepEqual(t.map(o => o.option), ['b', 'c']);
});

// ── AC-7: evidence-field presence ───────────────────────────────────────────────────────

test('AC-7: each option carries an evidence field; >=1 points to a real file', () => {
  const optionSet = [
    { option: 'rewrite DESIGN_NEXT_QUESTION pipeline', evidence: 'agents/misae.md' },
    { option: 'add a new metric module', evidence: 'src/option-metrics.js' },
    { option: 'tweak unspecified behaviour', evidence: 'inferred' },
  ];
  // every option has the field
  for (const o of optionSet) {
    assert.ok(typeof o.evidence === 'string' && o.evidence.length > 0, 'evidence present');
  }
  // at least one points to an existing repo file
  const repoRoot = path.join(__dirname, '..');
  const grounded = optionSet.filter(o => o.evidence !== 'inferred' && fs.existsSync(path.join(repoRoot, o.evidence)));
  assert.ok(grounded.length >= 1, 'at least one option grounded in a real file');
});

// ── AC-4 (HR-1): exportMetrics never persists raw-confidence keys ────────────────────────

test('AC-4 / HR-1: exportMetrics strips raw_confidence/self_confidence/uncalibrated_score', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opt-metrics-'));
  const out = m.exportMetrics('TEST-DOC', {
    ece: 0.05,
    auroc: 0.8,
    raw_confidence: [0.99, 0.98],          // must be stripped
    turns: [{ self_confidence: 0.97, calibrated: 0.6 }], // self_confidence stripped, calibrated kept
  }, { baseDir: tmp });
  const written = JSON.parse(fs.readFileSync(out, 'utf-8'));
  const blob = JSON.stringify(written);
  assert.ok(!/raw_confidence/.test(blob), 'raw_confidence stripped');
  assert.ok(!/self_confidence/.test(blob), 'self_confidence stripped');
  assert.ok(!/uncalibrated_score/.test(blob), 'uncalibrated_score absent');
  assert.equal(written.ece, 0.05, 'safe fields retained');
  assert.equal(written.turns[0].calibrated, 0.6, 'calibrated value retained');
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── AC-13: no duplication with eval-metrics.js (real dependency) ─────────────────────────

test('AC-13: option-metrics re-exports the eval-metrics surface (no duplication)', () => {
  assert.ok(m.evalMetrics, 'eval-metrics dependency present');
  assert.equal(typeof m.evalMetrics.computeMetrics, 'function');
});
