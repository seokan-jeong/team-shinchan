'use strict';

/**
 * benchmarks/lib/eval-record.js — Phase 7 (main-078)
 *
 * Reuse wrapper (NFR-4): the production createEvalRecord/appendEval persistence
 * (src/eval-schema.js) is reused READ-ONLY, and MODEL_PRICING (src/cost-estimator.js)
 * is imported for USD conversion. The forbidden per-agent average-token heuristic
 * (cost-estimator.js:27) is NEVER imported — real usage drives cost (FR-5).
 *
 * createEvalRecord has a fixed body (ts/agent/doc_id/phase/scores/notes) and cannot
 * hold the extended benchmark record, so createBenchmarkRecord wraps it and spreads
 * the extended fields (DESIGN LOW note). src/ is require()'d, never edited.
 */

const { createEvalRecord } = require('../../src/eval-schema.js');
const { MODEL_PRICING } = require('../../src/cost-estimator.js');

/**
 * Convert REAL usage token counts to USD using MODEL_PRICING only.
 * Cache tokens are counted honestly (FR-5): cache-read and cache-creation tokens
 * are priced at the model's input rate (they are input-side tokens).
 *
 * @param {{input_tokens:number, output_tokens:number, cache_read_input_tokens?:number, cache_creation_input_tokens?:number}} usage
 * @param {string} model  e.g. "haiku"
 * @returns {number} USD cost derived from real token counts (NOT the average-token heuristic)
 */
function usageToUsd(usage, model) {
  const price = MODEL_PRICING[model];
  if (!price) {
    throw new Error(`usageToUsd: unknown model "${model}" (no MODEL_PRICING entry)`);
  }
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheCreate = usage.cache_creation_input_tokens || 0;
  // input-side tokens (fresh input + both cache flavors) priced at input rate; output at output rate.
  const inputSide = input + cacheRead + cacheCreate;
  return (inputSide / 1e6) * price.input + (output / 1e6) * price.output;
}

/**
 * Build the extended benchmark result record by wrapping createEvalRecord.
 * Base fields (ts, agent, doc_id, phase, scores, notes) come from the reused
 * createEvalRecord; the benchmark-specific fields are spread on top.
 *
 * @param {Object} o
 * @returns {Object} extended record (persist via reused appendEval)
 */
function createBenchmarkRecord(o) {
  const base = createEvalRecord('bo', 'main-078', o.phase, o.scores || {}, o.notes || '');
  return {
    ...base,
    task_id: o.task_id,
    arm: o.arm,
    repeat: o.repeat,
    pass: o.pass,
    loc_added: o.loc_added,
    loc_deleted: o.loc_deleted,
    wall_clock_ms: o.wall_clock_ms,
    cost_usd: o.cost_usd,
    usage: o.usage,
    safety_ok: o.safety_ok,
    prompt_persisted_path: o.prompt_persisted_path,
  };
}

module.exports = { usageToUsd, createBenchmarkRecord };
