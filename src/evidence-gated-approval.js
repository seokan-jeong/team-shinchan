#!/usr/bin/env node
/**
 * Evidence-Gated Change Approval — Team-Shinchan (INFRA-04)
 *
 * Blocks an "efficiency / default-reduction" change (e.g. trimming a default
 * prompt/budget to save tokens) unless it carries BOTH measured benchmark
 * evidence AND an anchored human approval. Conceptual port of gajae-code's
 * MIT-licensed pattern.
 *
 * Origin: packages/orchestration-token-benchmark/src/default-reduction-gate.ts (MIT).
 *
 * This strengthens the existing PR-doc-gate / regression-detect posture: instead
 * of gating on mere artifact existence (a PR file exists, a doc exists), it gates
 * on a *measured* before/after benchmark (tokens decreased, fixture success not
 * regressed) AND an anchored approval (PR + named approver + URL).
 *
 * Zero npm dependencies.
 */
'use strict';

const fs = require('fs');

/**
 * Best-effort URL shape check — no network, no npm.
 * Accepts http(s):// and common forge-style hosts.
 * @param {string} value
 * @returns {boolean}
 */
function looksLikeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  return /^https?:\/\/[^\s]+\.[^\s]+/.test(value.trim());
}

/**
 * Non-empty string guard.
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Decide whether an efficiency / default-reduction change may proceed.
 *
 * Requires ALL of:
 *   - benchmarkEvidence.status === "passed"
 *   - benchmarkEvidence.tokenAfter < benchmarkEvidence.tokenBefore (tokens decreased)
 *   - benchmarkEvidence.successAfter >= benchmarkEvidence.successBefore (success not regressed)
 *   - approval anchored: approval.pr, approval.approver, approval.url (URL-shaped)
 *
 * Pure: no I/O, no mutation of inputs.
 *
 * @param {Object} args
 * @param {Object} [args.benchmarkEvidence] - { status, tokenBefore, tokenAfter, successBefore, successAfter }
 * @param {Object} [args.approval] - { pr, approver, url }
 * @returns {{ outcome: "approved"|"blocked", reasons: string[] }}
 */
function evaluateDefaultReduction({ benchmarkEvidence, approval } = {}) {
  const reasons = [];
  const ev = benchmarkEvidence || {};
  const ap = approval || {};

  // (a) Benchmark evidence ────────────────────────────────────────────────
  if (ev.status !== 'passed') {
    reasons.push(
      `benchmark status must be "passed" (got ${JSON.stringify(ev.status)})`,
    );
  }

  if (!(typeof ev.tokenAfter === 'number' && typeof ev.tokenBefore === 'number')) {
    reasons.push(
      'benchmark must report numeric tokenBefore and tokenAfter',
    );
  } else if (!(ev.tokenAfter < ev.tokenBefore)) {
    reasons.push(
      `token metric did not decrease (tokenAfter=${ev.tokenAfter} >= tokenBefore=${ev.tokenBefore})`,
    );
  }

  if (!(typeof ev.successAfter === 'number' && typeof ev.successBefore === 'number')) {
    reasons.push(
      'benchmark must report numeric successBefore and successAfter',
    );
  } else if (!(ev.successAfter >= ev.successBefore)) {
    reasons.push(
      `fixture success regressed (successAfter=${ev.successAfter} < successBefore=${ev.successBefore})`,
    );
  }

  // (b) Anchored human approval ───────────────────────────────────────────
  if (!isNonEmptyString(ap.pr)) {
    reasons.push('approval.pr is required (non-empty)');
  }
  if (!isNonEmptyString(ap.approver)) {
    reasons.push('approval.approver is required (non-empty)');
  }
  if (!looksLikeUrl(ap.url)) {
    reasons.push('approval.url is required and must look like a URL');
  }

  return {
    outcome: reasons.length === 0 ? 'approved' : 'blocked',
    reasons,
  };
}

/**
 * Append one JSON line (JSONL) to a ledger file. Creates the file if absent.
 * The one fs-touching helper — kept minimal.
 *
 * @param {string} ledgerPath - Absolute path to the JSONL ledger.
 * @param {Object} entry - Entry to record (one line).
 * @returns {Object} The entry written.
 */
function appendReductionLedgerEntry(ledgerPath, entry) {
  fs.appendFileSync(ledgerPath, JSON.stringify(entry) + '\n', 'utf-8');
  return entry;
}

module.exports = {
  evaluateDefaultReduction,
  appendReductionLedgerEntry,
  looksLikeUrl,
};
