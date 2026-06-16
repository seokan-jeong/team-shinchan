#!/usr/bin/env node
'use strict'
/**
 * evidence-receipt.js — Team-Shinchan typed completion-evidence receipt validator
 * (main-075 benchmark adoption — DUR-02 + WS-06)
 *
 * A PURE, zero-dependency validator for typed completion-evidence receipts. It is the
 * machine-checkable counterpart to the dag-executor verify gate (src/dag-executor.js):
 * the verify gate proves "a command exited 0"; an evidence receipt proves "the RIGHT
 * KIND of evidence exists for the surface that was changed". Prose claims ("it works",
 * "looks correct") are insufficient — every rule below is machine-rejectable.
 *
 * ORIGIN (conceptual port, MIT↔MIT, from gajae-code's ultragoal completion gate):
 *   - ultragoal/SKILL.md quality-gate-json + freshness-scoped receipts
 *   - executor red-team mode (adversarial cases required for a "complete" verdict)
 *
 * DESIGN: PURE functions only (no fs, no spawn, no side effects) so the validator is
 * trivially unit-testable and safe to call from any gate. The natural carrier for a
 * receipt is `.shinchan-docs/reviews/REVIEW-{NNN}.json` (see
 * skills/verification-before-completion/SKILL.md), but this module takes a plain object
 * and never touches disk.
 *
 * BACKWARD-COMPAT: this module is ADDITIVE. It does not import from, or modify, the
 * dag-executor completion gate; the existing exit-0 verify gate keeps working unchanged.
 */

// ---------------------------------------------------------------------------
// WS-06 — Surface taxonomy
// ---------------------------------------------------------------------------
/**
 * The kinds of surface a completed unit of work can present. Each surface demands a
 * different, machine-checkable form of evidence (see PER_SURFACE_RULES below).
 *   gui    — a graphical UI (browser/desktop) — needs an automation transcript + screenshot
 *   cli    — a command-line surface — needs a replay-safe recorded command + stdout
 *   api    — a programmatic/HTTP/RPC surface — needs at least one artifact reference
 *   native — a native/PTY/terminal app surface — needs a PTY capture or screenshot
 *   math   — a pure computation / proof / numeric surface — needs at least one artifact ref
 */
const SURFACE_KINDS = Object.freeze(['gui', 'cli', 'api', 'native', 'math'])

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------
function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function nonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== ''
}

function nonEmptyArray(v) {
  return Array.isArray(v) && v.length > 0
}

// ---------------------------------------------------------------------------
// WS-06 — Per-surface required-evidence rules
// ---------------------------------------------------------------------------
/**
 * Each rule receives the receipt's `surfaceEvidence` object (+ the full receipt for the
 * artifactRef-based surfaces) and returns an array of SPECIFIC failure reasons (empty =>
 * the surface evidence is sufficient). Never returns a generic "invalid".
 */
const PER_SURFACE_RULES = Object.freeze({
  gui(se) {
    const reasons = []
    if (!isObject(se)) {
      return ['gui surface requires surfaceEvidence object with {automationTranscript, screenshotRef}']
    }
    if (!nonEmptyString(se.automationTranscript)) {
      reasons.push('gui surface requires surfaceEvidence.automationTranscript (non-empty)')
    }
    if (!nonEmptyString(se.screenshotRef)) {
      reasons.push('gui surface requires surfaceEvidence.screenshotRef (non-empty)')
    }
    return reasons
  },
  cli(se) {
    const reasons = []
    if (!isObject(se)) {
      return ['cli surface requires surfaceEvidence object with {replaySafe:true, command, recordedStdout}']
    }
    if (se.replaySafe !== true) {
      reasons.push('cli surface requires surfaceEvidence.replaySafe === true')
    }
    if (!nonEmptyString(se.command)) {
      reasons.push('cli surface requires surfaceEvidence.command (non-empty)')
    }
    if (!nonEmptyString(se.recordedStdout)) {
      reasons.push('cli surface requires surfaceEvidence.recordedStdout (non-empty)')
    }
    return reasons
  },
  native(se) {
    if (!isObject(se)) {
      return ['native surface requires surfaceEvidence object with {ptyCaptureRef or screenshotRef}']
    }
    if (!nonEmptyString(se.ptyCaptureRef) && !nonEmptyString(se.screenshotRef)) {
      return ['native surface requires surfaceEvidence.ptyCaptureRef or surfaceEvidence.screenshotRef (at least one)']
    }
    return []
  },
  api(_se, receipt) {
    if (!nonEmptyArray(receipt.artifactRefs)) {
      return ['api surface requires at least one artifactRef']
    }
    return []
  },
  math(_se, receipt) {
    if (!nonEmptyArray(receipt.artifactRefs)) {
      return ['math surface requires at least one artifactRef']
    }
    return []
  },
})

// ---------------------------------------------------------------------------
// DUR-02 — Receipt validator
// ---------------------------------------------------------------------------
/**
 * Validate a typed completion-evidence receipt.
 *
 * A receipt = {
 *   surface,           // one of SURFACE_KINDS
 *   contractCoverage,  // number in [0,1] — fraction of the contract/spec demonstrably covered
 *   surfaceEvidence,   // object whose required shape depends on `surface` (WS-06 taxonomy)
 *   artifactRefs,      // array of references (files/links) — required for api/math surfaces
 *   adversarialCases,  // non-empty array — at least one adversarial / red-team case
 *   scope,             // a scope hash; receipts are freshness-scoped (see isReceiptFresh)
 * }
 *
 * Returns { valid:boolean, reasons:string[] }. `reasons` is empty iff valid; otherwise it
 * lists a SPECIFIC reason per failed rule (machine-rejectable, prose-claims insufficient).
 *
 * @param {object} receipt
 * @returns {{valid: boolean, reasons: string[]}}
 */
function validateEvidenceReceipt(receipt) {
  const reasons = []

  if (!isObject(receipt)) {
    return { valid: false, reasons: ['receipt must be an object'] }
  }

  // Rule: surface ∈ SURFACE_KINDS.
  if (!SURFACE_KINDS.includes(receipt.surface)) {
    reasons.push(
      `surface "${receipt.surface}" is not a known surface kind (expected one of: ${SURFACE_KINDS.join(', ')})`
    )
  }

  // Rule: contractCoverage must be a number in [0,1].
  const cc = receipt.contractCoverage
  if (typeof cc !== 'number' || Number.isNaN(cc)) {
    reasons.push('contractCoverage must be a number')
  } else if (cc < 0 || cc > 1) {
    reasons.push(`contractCoverage ${cc} is out of range [0,1]`)
  }

  // Rule: adversarialCases must be a non-empty array (>= one red-team case) for "complete".
  if (!nonEmptyArray(receipt.adversarialCases)) {
    reasons.push('adversarialCases must be a non-empty array (at least one adversarial/red-team case required for a complete verdict)')
  }

  // Rule: per-surface required evidence (only checked when surface is known).
  if (SURFACE_KINDS.includes(receipt.surface)) {
    const surfaceReasons = PER_SURFACE_RULES[receipt.surface](receipt.surfaceEvidence, receipt)
    reasons.push(...surfaceReasons)
  }

  return { valid: reasons.length === 0, reasons }
}

// ---------------------------------------------------------------------------
// DUR-02 / freshness — Receipts are FRESHNESS-SCOPED
// ---------------------------------------------------------------------------
/**
 * A receipt is FRESH only while it describes the current scope. If the goal/spec changes,
 * the scope hash changes and prior evidence is STALE (the work it proved no longer matches
 * what is being completed). Origin: ultragoal freshness-scoped receipts.
 *
 * Stale iff `receipt.scope !== currentScopeHash`. A missing scope on either side is treated
 * as not-fresh (cannot prove the receipt belongs to the current scope).
 *
 * @param {object} receipt
 * @param {string} currentScopeHash
 * @returns {boolean} true iff the receipt is fresh for the current scope
 */
function isReceiptFresh(receipt, currentScopeHash) {
  if (!isObject(receipt)) return false
  if (!nonEmptyString(receipt.scope) || !nonEmptyString(currentScopeHash)) return false
  return receipt.scope === currentScopeHash
}

module.exports = {
  SURFACE_KINDS,
  validateEvidenceReceipt,
  isReceiptFresh,
}
