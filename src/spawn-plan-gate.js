#!/usr/bin/env node
/**
 * Spawn-Plan Gate — Team-Shinchan
 *
 * A pure decision function for gating large agent fan-out: before spawning a
 * batch of N parallel agents, require an explicit, complete SpawnPlanReceipt
 * justifying the parallelism. This is a HARD gate (no override) once invoked.
 *
 * Origin: conceptual port of the MIT-licensed pattern from gajae-code,
 *   `packages/orchestration-token-benchmark/src/spawn-gate.ts` (MIT).
 *
 * ADOPTION POSTURE — OPT-IN, NOT A SILENT DEFAULT HOOK:
 *   Team-Shinchan's hook convention is ADVISORY (exit-0): hooks nudge but never
 *   block. A *hard* gate that can deny a spawn is therefore deliberately NOT
 *   wired into the default hook pipeline. It is OPT-IN only — invoked explicitly
 *   from a Workflow-tier flow (e.g. ultrawork / bigproject) or by an explicit
 *   call site that has decided to enforce fan-out discipline. Importing this
 *   module changes no default behavior; nothing here runs unless called.
 *
 * Zero npm dependencies.
 */
'use strict';

/**
 * Default fan-out threshold. Batches of this size or smaller are always allowed
 * without a plan; larger batches require a complete SpawnPlanReceipt.
 * @type {number}
 */
const DEFAULT_SPAWN_THRESHOLD = 4;

/**
 * Required SpawnPlanReceipt field names, in canonical order.
 * @type {string[]}
 */
const REQUIRED_PLAN_FIELDS = [
  'whyParallel',
  'whyNotLocal',
  'independence',
  'expectedReceiptShape',
  'maxInlineTokens',
];

/**
 * Determine whether a single plan field is "present".
 * - `maxInlineTokens`: present only if it is a number > 0.
 * - all others: present only if a non-empty string (after trim) OR any other
 *   non-empty/truthy non-string value.
 * @param {string} field
 * @param {*} value
 * @returns {boolean}
 */
function isFieldPresent(field, value) {
  if (field === 'maxInlineTokens') {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }
  if (typeof value === 'string') return value.trim().length > 0;
  if (value === null || value === undefined) return false;
  // Non-empty array / object / other truthy value counts as present.
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

/**
 * Return the list of missing required SpawnPlanReceipt field names.
 * A field is "present" only if it holds a non-empty value (non-empty string,
 * or a number > 0 for maxInlineTokens).
 * @param {Object} [plan] - candidate SpawnPlanReceipt
 * @returns {string[]} missing field names (empty if plan is complete)
 */
function findMissingPlanFields(plan) {
  const p = plan && typeof plan === 'object' ? plan : {};
  return REQUIRED_PLAN_FIELDS.filter((field) => !isFieldPresent(field, p[field]));
}

/**
 * HARD spawn gate (no override).
 *
 * - If `batchSize <= threshold` → allowed, regardless of plan.
 * - If `batchSize > threshold` → allowed only when the SpawnPlanReceipt is
 *   complete (no missing fields); otherwise denied with the missing list and a
 *   human-readable reason.
 *
 * @param {Object} input
 * @param {number} input.batchSize - number of agents about to be spawned
 * @param {Object} [input.plan] - SpawnPlanReceipt justifying the fan-out
 * @param {number} [input.threshold=DEFAULT_SPAWN_THRESHOLD]
 * @returns {{ allowed: boolean, missing: string[], reason?: string }}
 */
function evaluateSpawnGate({ batchSize, plan, threshold } = {}) {
  const limit = typeof threshold === 'number' ? threshold : DEFAULT_SPAWN_THRESHOLD;

  if (batchSize <= limit) {
    return { allowed: true, missing: [] };
  }

  const missing = findMissingPlanFields(plan);
  if (missing.length === 0) {
    return { allowed: true, missing: [] };
  }

  return {
    allowed: false,
    missing,
    reason: `batch size ${batchSize} exceeds threshold ${limit}; SpawnPlanReceipt incomplete`,
  };
}

/**
 * BENCHMARK-ONLY variant.
 *
 * Identical decision logic to {@link evaluateSpawnGate}, exposed separately so
 * the orchestration-token benchmark can sweep `threshold` values without any
 * risk of being mistaken for the runtime gate. This MUST NEVER be used as the
 * runtime spawn gate — call {@link evaluateSpawnGate} for that. It exists only
 * to make threshold sweeps explicit and self-documenting in benchmark code.
 *
 * @param {Object} input
 * @param {number} input.batchSize
 * @param {Object} [input.plan]
 * @param {number} [input.threshold]
 * @returns {{ allowed: boolean, missing: string[], reason?: string }}
 */
function evaluateSpawnGateAtThreshold({ batchSize, plan, threshold } = {}) {
  return evaluateSpawnGate({ batchSize, plan, threshold });
}

module.exports = {
  DEFAULT_SPAWN_THRESHOLD,
  REQUIRED_PLAN_FIELDS,
  findMissingPlanFields,
  evaluateSpawnGate,
  evaluateSpawnGateAtThreshold,
};
