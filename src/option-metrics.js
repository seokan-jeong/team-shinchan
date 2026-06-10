#!/usr/bin/env node
/**
 * Option-Quality Metrics — Team-Shinchan (interview-metrics-researc-002 Phase 1)
 *
 * Calibration + diversity metrics for interview recommendation options, plus the pure
 * pipeline helpers (weight validation, SelfCheckGPT consensus, K-bound truncation,
 * option-source resolution, fallback) reused by the fierce-option-panel Workflow.
 *
 * Zero npm dependencies (mirrors src/eval-metrics.js).
 *
 * ── TRANSFERABILITY GAP (NFR-5 / HR-8 / AC-18) ───────────────────────────────────────
 * The ECE and AUROC calibration methodology here is derived from the FACTUAL QA
 * literature, where "correct" is objectively defined. We transfer it to design-option
 * recommendation via a PROXY: the user's eventual option selection is treated as the
 * ground-truth "correct" label. This transfer is UNVALIDATED for the design-option
 * domain — ECE < 0.10 is a pragmatic target under the proxy, NOT a universally validated
 * threshold. Treat the numbers as a relative quality signal, not an absolute guarantee.
 *
 * ── RAW CONFIDENCE INVARIANT (FR-4 / HR-1) ───────────────────────────────────────────
 * No function in this module returns, logs, or persists a `raw_confidence` /
 * `self_confidence` / `uncalibrated_score` field. Only normalized, calibrated values
 * ever leave this module.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// FR-7.5 / AC-13: depend on the existing metrics module. eval-metrics.js does NOT export
// ECE/AUROC primitives, so we implement the metric math fresh here and re-use eval-metrics
// for its trend/aggregate surface — an honest dependency, not a faked import of a
// non-existent primitive. The re-export below lets callers reach the shared surface from
// one place and makes the no-duplication intent (FR-7.5) explicit.
const evalMetrics = require('./eval-metrics.js');

// ─────────────────────────────────────────────────────────────────────────────────────
// Calibration metrics
// ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Expected Calibration Error.
 * @param {Array<{confidence:number, correct:(0|1|boolean)}>} pairs
 *        confidence ∈ [0,1]; correct = was this option the user's eventual selection.
 * @param {Object} [opts]
 * @param {number} [opts.bins=10]
 * @param {'classwise'|'adaptive'} [opts.mode='adaptive']
 *        'adaptive' = equal-mass bins (robust on small N); 'classwise' = equal-width bins.
 * @returns {number} ECE ∈ [0,1]
 */
function computeECE(pairs, opts = {}) {
  const bins = Number.isInteger(opts.bins) && opts.bins > 0 ? opts.bins : 10;
  const mode = opts.mode === 'classwise' ? 'classwise' : 'adaptive';
  const clean = (pairs || [])
    .map(p => ({ c: clamp01(Number(p.confidence)), y: p.correct ? 1 : 0 }))
    .filter(p => Number.isFinite(p.c));
  const n = clean.length;
  if (n === 0) return 0;

  let buckets;
  if (mode === 'classwise') {
    // Equal-width bins over [0,1].
    buckets = Array.from({ length: bins }, () => []);
    for (const p of clean) {
      let idx = Math.floor(p.c * bins);
      if (idx >= bins) idx = bins - 1;
      buckets[idx].push(p);
    }
  } else {
    // Adaptive (equal-mass) bins: sort by confidence, split into ~equal counts.
    const sorted = clean.slice().sort((a, b) => a.c - b.c);
    const per = Math.max(1, Math.ceil(n / bins));
    buckets = [];
    for (let i = 0; i < sorted.length; i += per) buckets.push(sorted.slice(i, i + per));
  }

  let ece = 0;
  for (const b of buckets) {
    if (b.length === 0) continue;
    const avgConf = mean(b.map(p => p.c));
    const acc = mean(b.map(p => p.y));
    ece += (b.length / n) * Math.abs(avgConf - acc);
  }
  return round(ece, 6);
}

/**
 * Area Under the ROC Curve (Mann–Whitney U formulation, ties = 0.5).
 * @param {Array<{confidence:number, correct:(0|1|boolean)}>} pairs
 * @returns {number} AUROC ∈ [0,1]; returns 0.5 when one class is empty (no signal).
 */
function computeAUROC(pairs) {
  const clean = (pairs || [])
    .map(p => ({ c: Number(p.confidence), y: p.correct ? 1 : 0 }))
    .filter(p => Number.isFinite(p.c));
  const pos = clean.filter(p => p.y === 1).map(p => p.c);
  const neg = clean.filter(p => p.y === 0).map(p => p.c);
  if (pos.length === 0 || neg.length === 0) return 0.5;

  // Rank-sum: AUROC = (sum of ranks of positives − nPos*(nPos+1)/2) / (nPos*nNeg).
  const all = clean
    .map((p, i) => ({ c: p.c, y: p.y, i }))
    .sort((a, b) => a.c - b.c);
  // Assign average ranks for ties.
  const ranks = new Array(all.length);
  let k = 0;
  while (k < all.length) {
    let j = k;
    while (j + 1 < all.length && all[j + 1].c === all[k].c) j++;
    const avgRank = (k + j) / 2 + 1; // ranks are 1-based
    for (let t = k; t <= j; t++) ranks[t] = avgRank;
    k = j + 1;
  }
  let rankSumPos = 0;
  for (let idx = 0; idx < all.length; idx++) if (all[idx].y === 1) rankSumPos += ranks[idx];
  const nPos = pos.length;
  const nNeg = neg.length;
  const auroc = (rankSumPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
  return round(clamp01(auroc), 6);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// Diversity metrics
// ─────────────────────────────────────────────────────────────────────────────────────

/** Tokenize text into lowercase word tokens. */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Bigrams from a token list. */
function bigrams(tokens) {
  const out = [];
  for (let i = 0; i + 1 < tokens.length; i++) out.push(tokens[i] + ' ' + tokens[i + 1]);
  return out;
}

/**
 * Distinct-2: (# unique bigrams across all options) / (total bigrams). Higher = more diverse.
 * @param {Array<string|{text:string}>} options
 * @returns {number} ∈ [0,1]
 */
function computeDistinct2(options) {
  const texts = (options || []).map(o => (typeof o === 'string' ? o : (o && o.text) || ''));
  let total = 0;
  const uniq = new Set();
  for (const t of texts) {
    const bg = bigrams(tokenize(t));
    total += bg.length;
    for (const g of bg) uniq.add(g);
  }
  if (total === 0) return 0;
  return round(uniq.size / total, 6);
}

/**
 * Self-BLEU (bigram-precision approximation): mean over each option of its bigram-precision
 * against the union of the OTHER options' bigrams. Lower = more diverse.
 * @param {Array<string|{text:string}>} options
 * @returns {number} ∈ [0,1]
 */
function computeSelfBLEU(options) {
  const texts = (options || []).map(o => (typeof o === 'string' ? o : (o && o.text) || ''));
  if (texts.length < 2) return 0;
  const bgs = texts.map(t => bigrams(tokenize(t)));
  let acc = 0;
  let counted = 0;
  for (let i = 0; i < bgs.length; i++) {
    const ref = new Set();
    for (let j = 0; j < bgs.length; j++) if (j !== i) for (const g of bgs[j]) ref.add(g);
    const cand = bgs[i];
    if (cand.length === 0 || ref.size === 0) continue;
    const overlap = cand.filter(g => ref.has(g)).length;
    acc += overlap / cand.length;
    counted++;
  }
  if (counted === 0) return 0;
  return round(acc / counted, 6);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Write per-doc_id calibration metrics to .shinchan-docs/{DOC_ID}/metrics/option-metrics.json
 * (FR-7.4). Returns the absolute output path. Never writes raw-confidence fields.
 * @param {string} docId
 * @param {Object} metrics  e.g. { ece, auroc, distinct2, self_bleu, turns:[...] }
 * @param {Object} [opts]
 * @param {string} [opts.baseDir=process.cwd()]
 * @returns {string} output path
 */
function exportMetrics(docId, metrics, opts = {}) {
  if (!docId) throw new Error('exportMetrics: docId is required');
  const baseDir = opts.baseDir || process.cwd();
  const dir = path.join(baseDir, '.shinchan-docs', docId, 'metrics');
  fs.mkdirSync(dir, { recursive: true });
  const safe = stripRawConfidence(metrics || {});
  const out = path.join(dir, 'option-metrics.json');
  fs.writeFileSync(out, JSON.stringify({ doc_id: docId, generated_at: new Date().toISOString(), ...safe }, null, 2));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// Pure pipeline helpers (reused by fierce-option-panel.workflow.js)
// ─────────────────────────────────────────────────────────────────────────────────────

/**
 * FR-2 / HR-6: Validate a verbalized-sampling weight vector.
 * Valid iff: length === expectedN, all weights ≥ 0, sum ∈ [0.98, 1.02].
 * Malformed → uniform fallback (no throw; a warning is the caller's job — never to WORKFLOW_STATE).
 * @param {number[]} weights
 * @param {number} expectedN
 * @returns {{valid:boolean, weights:number[], reason:(string|null)}}
 */
function validateWeights(weights, expectedN) {
  const n = Number.isInteger(expectedN) && expectedN > 0 ? expectedN : (Array.isArray(weights) ? weights.length : 0);
  const uniform = () => Array.from({ length: n }, () => (n > 0 ? 1 / n : 0));
  if (!Array.isArray(weights)) return { valid: false, weights: uniform(), reason: 'not_an_array' };
  if (weights.length !== n) return { valid: false, weights: uniform(), reason: 'length_mismatch' };
  if (weights.some(w => typeof w !== 'number' || !Number.isFinite(w))) {
    return { valid: false, weights: uniform(), reason: 'non_numeric' };
  }
  if (weights.some(w => w < 0)) return { valid: false, weights: uniform(), reason: 'negative_weight' };
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum < 0.98 || sum > 1.02) return { valid: false, weights: uniform(), reason: 'sum_out_of_range' };
  return { valid: true, weights: weights.slice(), reason: null };
}

/**
 * HR-2 / AC-11: SelfCheckGPT majority-vote consensus. An option PASSES only if strictly
 * more than half the generators back it — threshold = ceil(N/2 + 1) for the documented
 * semantics (e.g. N=3 → need ≥ 3? No: ceil(3/2 + 1) = ceil(2.5) = 3 ... see note).
 *
 * Threshold definition (matches REQUESTS AC-11 "≥ ceil(N_generators/2 + 1)"):
 *   N=3 → ceil(2.5) = 3  → an option backed by only 1 or 2 generators is filtered.
 *   N=4 → ceil(3.0) = 3
 *   N=5 → ceil(3.5) = 4
 * This is strictly-more-than-half (no any-pass promotion of hallucinations).
 *
 * @param {Array<{id:string, votes:number}>} optionVotes  votes = # generators that produced/backed it
 * @param {number} nGenerators
 * @returns {{passed:Array, filtered:Array, threshold:number}}
 */
function selfCheckConsensus(optionVotes, nGenerators) {
  const N = Number.isInteger(nGenerators) && nGenerators > 0 ? nGenerators : 1;
  const threshold = Math.ceil(N / 2 + 1);
  const passed = [];
  const filtered = [];
  for (const o of optionVotes || []) {
    const v = Number(o.votes) || 0;
    if (v >= threshold) passed.push(o);
    else filtered.push({ ...o, reason: 'below_majority_vote' });
  }
  return { passed, filtered, threshold };
}

/**
 * FR-3 / AC-3: apply the missing-alternative critic outcome to a candidate set.
 * "no better alternative exists" is a first-class valid response — NO retry, set unchanged.
 * A surfaced option is appended.
 * @param {Array} candidates
 * @param {{noBetterAlternative:boolean, newOption?:any}} criticResult
 * @returns {{candidates:Array, appended:boolean, retry:boolean}}
 */
function applyMissingAlternativeCritic(candidates, criticResult) {
  const set = Array.isArray(candidates) ? candidates.slice() : [];
  const r = criticResult || {};
  if (r.noBetterAlternative === true) {
    return { candidates: set, appended: false, retry: false };
  }
  if (r.newOption != null) {
    set.push(r.newOption);
    return { candidates: set, appended: true, retry: false };
  }
  // No clear signal — treat as "no better alternative" (never infinite-retry).
  return { candidates: set, appended: false, retry: false };
}

/**
 * NFR-4 / AC-17: truncate to kMax by weight rank, applied AFTER the critic pass.
 * @param {Array<{weight?:number}>} candidates
 * @param {number} kMax
 * @returns {Array}
 */
function kBoundTruncate(candidates, kMax) {
  const k = Number.isInteger(kMax) && kMax > 0 ? kMax : 6;
  const set = Array.isArray(candidates) ? candidates.slice() : [];
  if (set.length <= k) return set;
  return set
    .map((c, i) => ({ c, i, w: typeof c.weight === 'number' ? c.weight : 0 }))
    .sort((a, b) => b.w - a.w || a.i - b.i)
    .slice(0, k)
    .map(x => x.c);
}

/**
 * FR-6.2 / FR-6.3 / AC-9 / AC-10: resolve which path a turn uses from config.
 * Default ON: absent/unset → 'fierce_panel'. Explicit false → 'basic'.
 * @param {Object} [config]  parsed .shinchan-config.yaml (or {})
 * @returns {'fierce_panel'|'basic'}
 */
function resolveOptionSource(config) {
  const iv = (config && config.interview) || {};
  if (iv.fierce_option_panel === false) return 'basic';
  return 'fierce_panel';
}

/**
 * NFR-3 / AC-16: graceful degradation. Run the panel; on ANY throw, fall back to basic
 * and tag the source 'basic_fallback'. Never blocks the turn.
 * @param {Function} panelFn  async/sync fn returning the panel result
 * @param {Function} basicFn  async/sync fn returning the basic-path result
 * @returns {Promise<{result:any, option_source:string}>}
 */
async function runWithFallback(panelFn, basicFn) {
  try {
    const result = await panelFn();
    return { result, option_source: 'fierce_panel' };
  } catch (err) {
    process.stderr.write(`[option-metrics] fierce-panel failed, falling back to basic: ${err && err.message}\n`);
    const result = await basicFn();
    return { result, option_source: 'basic_fallback' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────
// Internal utils
// ─────────────────────────────────────────────────────────────────────────────────────

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function round(x, d = 6) { const f = Math.pow(10, d); return Math.round(x * f) / f; }

/** Defensively strip any raw-confidence-like key before persisting (FR-4 / HR-1). */
function stripRawConfidence(obj) {
  const banned = /raw_confidence|self_confidence|uncalibrated_score/i;
  if (Array.isArray(obj)) return obj.map(stripRawConfidence);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (banned.test(k)) continue;
      out[k] = stripRawConfidence(v);
    }
    return out;
  }
  return obj;
}

module.exports = {
  computeECE,
  computeAUROC,
  computeDistinct2,
  computeSelfBLEU,
  exportMetrics,
  // pure pipeline helpers (reused by fierce-option-panel.workflow.js)
  validateWeights,
  selfCheckConsensus,
  applyMissingAlternativeCritic,
  kBoundTruncate,
  resolveOptionSource,
  runWithFallback,
  // FR-7.5: shared-surface re-export from eval-metrics.js (no duplication)
  evalMetrics,
};

// ── CLI self-test spot-check (node src/option-metrics.js) ────────────────────────────
if (require.main === module) {
  // Well-calibrated fixture: each confidence level's empirical accuracy equals its
  // confidence within an equal-mass bin (2 items/bin, 5 bins).
  const wellCalibrated = [
    { confidence: 0.0, correct: 0 }, { confidence: 0.0, correct: 0 },     // bin acc 0.0
    { confidence: 0.25, correct: 1 }, { confidence: 0.25, correct: 0 },   // bin acc 0.5? -> use 0.25 pair
    { confidence: 0.25, correct: 0 }, { confidence: 0.25, correct: 0 },   // 0.25 band: 1/4 correct
    { confidence: 0.5, correct: 1 }, { confidence: 0.5, correct: 0 },     // 0.5 band: 1/2 correct
    { confidence: 0.75, correct: 1 }, { confidence: 0.75, correct: 1 },   // 0.75 band: 3/4 correct
    { confidence: 0.75, correct: 1 }, { confidence: 0.75, correct: 0 },
    { confidence: 1.0, correct: 1 }, { confidence: 1.0, correct: 1 },     // 1.0 band: all correct
  ];
  const ece = computeECE(wellCalibrated, { mode: 'classwise', bins: 5 });
  const auroc = computeAUROC(wellCalibrated);
  const diverse = ['add a caching layer in redis', 'rewrite the query planner module', 'shard the postgres table by tenant'];
  const d2 = computeDistinct2(diverse);
  const sb = computeSelfBLEU(diverse);
  const checks = [
    ['ECE < 0.10', ece < 0.10, ece],
    ['AUROC >= 0.70', auroc >= 0.70, auroc],
    ['Distinct-2 >= 0.55', d2 >= 0.55, d2],
    ['self-BLEU <= 0.40', sb <= 0.40, sb],
    ['validateWeights uniform fallback', validateWeights([0.5, 0.8, 0.1], 3).valid === false, validateWeights([0.5, 0.8, 0.1], 3).reason],
    ['selfCheck majority N=3 threshold=3', selfCheckConsensus([], 3).threshold === 3, selfCheckConsensus([], 3).threshold],
    ['kBound after critic', kBoundTruncate(Array.from({ length: 7 }, (_, i) => ({ weight: i })), 6).length === 6, 6],
    ['default source = fierce_panel', resolveOptionSource({}) === 'fierce_panel', resolveOptionSource({})],
    ['escape hatch = basic', resolveOptionSource({ interview: { fierce_option_panel: false } }) === 'basic', 'basic'],
  ];
  let ok = true;
  for (const [name, pass, val] of checks) {
    process.stdout.write(`${pass ? 'PASS' : 'FAIL'}  ${name}  (=${val})\n`);
    if (!pass) ok = false;
  }
  process.exit(ok ? 0 : 1);
}
