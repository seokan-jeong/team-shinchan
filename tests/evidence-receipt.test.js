'use strict'

/**
 * tests/evidence-receipt.test.js — unit suite for src/evidence-receipt.js
 * (main-075 benchmark adoption — DUR-02 + WS-06).
 *
 * Covers:
 *   - each surface's valid receipt passes (gui/cli/api/native/math),
 *   - missing per-surface evidence => reject with a SPECIFIC reason (WS-06 taxonomy),
 *   - bad surface kind => reject,
 *   - contractCoverage out of [0,1] (and non-number) => reject,
 *   - empty/absent adversarialCases => reject (red-team case required),
 *   - isReceiptFresh true when scope matches, false (stale) when scope differs.
 *
 * Pure validator — no shells, no disk.
 *
 * Run: node --test tests/evidence-receipt.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const er = require('../src/evidence-receipt.js')

// A scope hash shared by the valid fixtures.
const SCOPE = 'sha256:goal-v1'

// Per-surface valid surfaceEvidence builders.
const validSurfaceEvidence = {
  gui: { automationTranscript: 'click #save -> toast visible', screenshotRef: 'shots/save.png' },
  cli: { replaySafe: true, command: 'node --test tests/x.test.js', recordedStdout: '# pass 3\n# fail 0' },
  native: { ptyCaptureRef: 'pty/run-001.cast' },
  api: {},
  math: {},
}

function validReceipt(surface, overrides = {}) {
  const base = {
    surface,
    contractCoverage: 0.9,
    surfaceEvidence: validSurfaceEvidence[surface],
    artifactRefs: surface === 'api' || surface === 'math' ? ['artifacts/result.json'] : [],
    adversarialCases: [{ name: 'malformed-input', expect: 'rejects' }],
    scope: SCOPE,
  }
  return { ...base, ...overrides }
}

// ── Each surface's valid receipt passes ─────────────────────────────────────
test('valid receipt passes for every surface kind', () => {
  for (const surface of er.SURFACE_KINDS) {
    const r = er.validateEvidenceReceipt(validReceipt(surface))
    assert.equal(r.valid, true, `surface=${surface} should be valid; reasons=${JSON.stringify(r.reasons)}`)
    assert.deepEqual(r.reasons, [], `surface=${surface} should have no reasons`)
  }
})

test('SURFACE_KINDS is the frozen expected taxonomy', () => {
  assert.deepEqual([...er.SURFACE_KINDS], ['gui', 'cli', 'api', 'native', 'math'])
  assert.ok(Object.isFrozen(er.SURFACE_KINDS))
})

// ── Missing per-surface evidence => reject with a specific reason ────────────
test('gui: missing automationTranscript => specific reason', () => {
  const r = er.validateEvidenceReceipt(
    validReceipt('gui', { surfaceEvidence: { screenshotRef: 'shots/x.png' } })
  )
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /automationTranscript/.test(x)), `reasons=${JSON.stringify(r.reasons)}`)
})

test('gui: missing screenshotRef => specific reason', () => {
  const r = er.validateEvidenceReceipt(
    validReceipt('gui', { surfaceEvidence: { automationTranscript: 'did a thing' } })
  )
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /screenshotRef/.test(x)))
})

test('cli: replaySafe not true => specific reason', () => {
  const r = er.validateEvidenceReceipt(
    validReceipt('cli', { surfaceEvidence: { replaySafe: false, command: 'node x', recordedStdout: 'ok' } })
  )
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /replaySafe/.test(x)))
})

test('cli: missing command and recordedStdout => specific reasons', () => {
  const r = er.validateEvidenceReceipt(
    validReceipt('cli', { surfaceEvidence: { replaySafe: true } })
  )
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /command/.test(x)))
  assert.ok(r.reasons.some((x) => /recordedStdout/.test(x)))
})

test('native: neither ptyCaptureRef nor screenshotRef => specific reason', () => {
  const r = er.validateEvidenceReceipt(
    validReceipt('native', { surfaceEvidence: {} })
  )
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /ptyCaptureRef|screenshotRef/.test(x)))
})

test('native: screenshotRef alone is sufficient', () => {
  const r = er.validateEvidenceReceipt(
    validReceipt('native', { surfaceEvidence: { screenshotRef: 'shots/term.png' } })
  )
  assert.equal(r.valid, true, `reasons=${JSON.stringify(r.reasons)}`)
})

test('api: no artifactRefs => specific reason', () => {
  const r = er.validateEvidenceReceipt(validReceipt('api', { artifactRefs: [] }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /artifactRef/.test(x)))
})

test('math: no artifactRefs => specific reason', () => {
  const r = er.validateEvidenceReceipt(validReceipt('math', { artifactRefs: undefined }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /artifactRef/.test(x)))
})

// ── Bad surface kind => reject ───────────────────────────────────────────────
test('unknown surface kind => reject with specific reason', () => {
  const r = er.validateEvidenceReceipt(validReceipt('gui', { surface: 'voice' }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /not a known surface kind/.test(x)))
})

test('non-object receipt => reject', () => {
  assert.equal(er.validateEvidenceReceipt(null).valid, false)
  assert.equal(er.validateEvidenceReceipt('done').valid, false)
})

// ── contractCoverage out of [0,1] => reject ──────────────────────────────────
test('contractCoverage > 1 => reject with range reason', () => {
  const r = er.validateEvidenceReceipt(validReceipt('api', { contractCoverage: 1.5 }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /contractCoverage.*range \[0,1\]/.test(x)))
})

test('contractCoverage < 0 => reject', () => {
  const r = er.validateEvidenceReceipt(validReceipt('api', { contractCoverage: -0.1 }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /contractCoverage/.test(x)))
})

test('contractCoverage non-number => reject', () => {
  const r = er.validateEvidenceReceipt(validReceipt('api', { contractCoverage: 'high' }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /contractCoverage must be a number/.test(x)))
})

test('contractCoverage boundary values 0 and 1 are accepted', () => {
  assert.equal(er.validateEvidenceReceipt(validReceipt('api', { contractCoverage: 0 })).valid, true)
  assert.equal(er.validateEvidenceReceipt(validReceipt('api', { contractCoverage: 1 })).valid, true)
})

// ── Empty adversarialCases => reject ─────────────────────────────────────────
test('empty adversarialCases => reject', () => {
  const r = er.validateEvidenceReceipt(validReceipt('api', { adversarialCases: [] }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /adversarialCases.*non-empty/.test(x)))
})

test('absent adversarialCases => reject', () => {
  const r = er.validateEvidenceReceipt(validReceipt('api', { adversarialCases: undefined }))
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => /adversarial/.test(x)))
})

// ── Freshness scoping ────────────────────────────────────────────────────────
test('isReceiptFresh: true when scope matches current scope hash', () => {
  assert.equal(er.isReceiptFresh(validReceipt('cli'), SCOPE), true)
})

test('isReceiptFresh: false (stale) when scope differs (goal/spec changed)', () => {
  assert.equal(er.isReceiptFresh(validReceipt('cli'), 'sha256:goal-v2'), false)
})

test('isReceiptFresh: false when scope missing on either side', () => {
  assert.equal(er.isReceiptFresh(validReceipt('cli', { scope: '' }), SCOPE), false)
  assert.equal(er.isReceiptFresh(validReceipt('cli'), ''), false)
  assert.equal(er.isReceiptFresh(null, SCOPE), false)
})
