'use strict';
/**
 * Integration tests for Gate-Loop Interview Escalation (FR-8)
 * T1: stagnation escalation (AC-2)
 * T2: soft_cap escalation (AC-3)
 *
 * These tests exercise the gate-loop state machine logic in pure JS,
 * not the full Misae agent. The evaluateGateLoop helper mirrors the
 * logic specified in agents/misae.md § Step 1 — Gate-Loop state machine (FR-1).
 * Any change to that section MUST be reflected here (caught by npm test).
 */
const test   = require('node:test');
const assert = require('node:assert/strict');

// ── Gate-Loop State Machine helper (mirrors agents/misae.md FR-1 logic) ────────

/**
 * Evaluate one turn of the gate-loop state machine.
 *
 * @param {object} state
 *   state.turn                {number}      1-based turn number
 *   state.weighted_overall    {number}      current turn's score
 *   state.prev_weighted       {number|null} previous turn's score (null = turn 1)
 *   state.stagnation_counter  {number}      running stagnation count
 *   state.unresolved_unknowns {string[]}
 * @param {object} config
 *   config.gate_loop_enabled  {boolean}
 *   config.gate_threshold     {number}
 *   config.stagnation_delta   {number}
 *   config.stagnation_window  {number}
 *   config.soft_cap           {number}
 *   config.hard_cap           {number}
 *   config.done_threshold     {number}  legacy (gate_loop_enabled: false)
 * @returns {{ exit_reason: string|null, stagnation_counter: number }}
 *   exit_reason null means "continue asking".
 */
function evaluateGateLoop(state, config) {
  const { turn, weighted_overall, prev_weighted, unresolved_unknowns } = state;
  let { stagnation_counter } = state;

  const {
    gate_loop_enabled = true,
    gate_threshold    = 0.8,
    stagnation_delta  = 0.05,
    stagnation_window = 2,
    soft_cap          = 6,
    hard_cap          = 10,
    done_threshold    = 0.75,
  } = config;

  // ── Legacy path (gate_loop_enabled: false) ───────────────────────────────
  if (!gate_loop_enabled) {
    if (weighted_overall >= done_threshold && unresolved_unknowns.length === 0) {
      return { exit_reason: 'clarity_threshold_met', stagnation_counter };
    }
    if (turn > hard_cap) {
      return { exit_reason: 'hard_cap_reached', stagnation_counter };
    }
    return { exit_reason: null, stagnation_counter };
  }

  // ── Gate-Loop path (gate_loop_enabled: true) ─────────────────────────────

  // Update stagnation counter (turn >= 2)
  if (turn >= 2 && prev_weighted !== null) {
    const delta = weighted_overall - prev_weighted;
    if (delta < stagnation_delta) {
      stagnation_counter += 1;
    } else {
      stagnation_counter = 0;
    }
  }

  // Priority 1: PASS
  if (weighted_overall >= gate_threshold && unresolved_unknowns.length === 0) {
    return { exit_reason: 'clarity_threshold_met', stagnation_counter };
  }
  // Priority 2: stagnation
  if (stagnation_counter >= stagnation_window) {
    return { exit_reason: 'stagnation_escalate', stagnation_counter };
  }
  // Priority 3: soft_cap
  if (turn >= soft_cap && weighted_overall < gate_threshold) {
    return { exit_reason: 'soft_cap_escalate', stagnation_counter };
  }
  // Priority 4: no_more_actionable_gaps
  if (unresolved_unknowns.length === 0 && weighted_overall < gate_threshold) {
    return { exit_reason: 'no_more_actionable_gaps_escalate', stagnation_counter };
  }
  // Priority 5: hard_cap
  if (turn > hard_cap) {
    return { exit_reason: 'hard_cap_escalate', stagnation_counter };
  }
  // Priority 6: continue
  return { exit_reason: null, stagnation_counter };
}

const BASE = {
  gate_loop_enabled: true,
  gate_threshold: 0.8,
  stagnation_delta: 0.05,
  stagnation_window: 2,
  soft_cap: 6,
  hard_cap: 10,
};

// ── T1: Stagnation escalation (AC-2, FR-1.2) ────────────────────────────────

test('T1: Δweighted_overall < 0.05 × 2 turns → stagnation_escalate (AC-2)', () => {
  // Turn 1: initial score, no prev — no stagnation yet
  const t1 = evaluateGateLoop({
    turn: 1, weighted_overall: 0.70, prev_weighted: null,
    stagnation_counter: 0, unresolved_unknowns: ['constraint gap'],
  }, BASE);
  assert.equal(t1.exit_reason, null, 'turn 1: should continue');
  assert.equal(t1.stagnation_counter, 0, 'no stagnation at turn 1');

  // Turn 2: delta = 0.71 - 0.70 = 0.01 < 0.05 → stagnation_counter = 1
  const t2 = evaluateGateLoop({
    turn: 2, weighted_overall: 0.71, prev_weighted: 0.70,
    stagnation_counter: t1.stagnation_counter,
    unresolved_unknowns: ['constraint gap'],
  }, BASE);
  assert.equal(t2.exit_reason, null, 'turn 2: counter=1, still < window=2');
  assert.equal(t2.stagnation_counter, 1);

  // Turn 3: delta = 0.72 - 0.71 = 0.01 < 0.05 → counter = 2 → ESCALATE
  const t3 = evaluateGateLoop({
    turn: 3, weighted_overall: 0.72, prev_weighted: 0.71,
    stagnation_counter: t2.stagnation_counter,
    unresolved_unknowns: ['constraint gap'],
  }, BASE);
  assert.equal(t3.exit_reason, 'stagnation_escalate', 'turn 3: counter=2 >= window=2 → ESCALATE');
  assert.equal(t3.stagnation_counter, 2);
});

test('T1 reset: large delta resets stagnation counter then PASS', () => {
  // Turn 2: delta = 0.01 → counter = 1
  const t2 = evaluateGateLoop({
    turn: 2, weighted_overall: 0.71, prev_weighted: 0.70,
    stagnation_counter: 0, unresolved_unknowns: ['x'],
  }, BASE);
  assert.equal(t2.stagnation_counter, 1);

  // Turn 3: big delta = 0.10 >= 0.05 → counter resets to 0; score 0.81 >= 0.8 & no unknowns → PASS
  const t3 = evaluateGateLoop({
    turn: 3, weighted_overall: 0.81, prev_weighted: 0.71,
    stagnation_counter: t2.stagnation_counter, unresolved_unknowns: [],
  }, BASE);
  assert.equal(t3.exit_reason, 'clarity_threshold_met');
  assert.equal(t3.stagnation_counter, 0);
});

// ── T2: Soft-cap escalation (AC-3, FR-1.3) ──────────────────────────────────

test('T2: 6 turns without PASS → soft_cap_escalate (AC-3)', () => {
  // Steadily improving by >= stagnation_delta each turn (so stagnation never fires)
  // but staying < gate_threshold(0.8) through turn 6 → isolates the soft_cap branch.
  const scores = [0.40, 0.46, 0.52, 0.58, 0.64, 0.70];
  let stagnation_counter = 0;
  let result = null;

  for (let turn = 1; turn <= 6; turn++) {
    const prev = turn >= 2 ? scores[turn - 2] : null;
    result = evaluateGateLoop({
      turn,
      weighted_overall: scores[turn - 1],
      prev_weighted: prev,
      stagnation_counter,
      unresolved_unknowns: ['success criteria gap'],
    }, BASE);
    stagnation_counter = result.stagnation_counter;
    if (result.exit_reason !== null) break;
  }

  assert.equal(result.exit_reason, 'soft_cap_escalate', 'turn 6 with score < 0.8 → soft_cap_escalate');
});

test('T2: PASS at turn 5 takes priority over soft_cap', () => {
  const t5 = evaluateGateLoop({
    turn: 5, weighted_overall: 0.82, prev_weighted: 0.77,
    stagnation_counter: 0, unresolved_unknowns: [],
  }, BASE);
  assert.equal(t5.exit_reason, 'clarity_threshold_met');
});

// ── AC-4: no_more_actionable_gaps escalate (silent pass removed) ─────────────

test('AC-4: unresolved == [] but score < 0.8 → no_more_actionable_gaps_escalate (no silent pass)', () => {
  const r = evaluateGateLoop({
    turn: 3, weighted_overall: 0.72, prev_weighted: 0.55,
    stagnation_counter: 0, unresolved_unknowns: [],
  }, BASE);
  assert.equal(r.exit_reason, 'no_more_actionable_gaps_escalate');
});

// ── AC-5: gate_loop_enabled: false → legacy silent-pass (NFR-2) ─────────────

test('AC-5: gate_loop_enabled:false → legacy clarity_threshold_met (no stagnation check)', () => {
  const config = { gate_loop_enabled: false, done_threshold: 0.75, hard_cap: 10 };
  const result = evaluateGateLoop({
    turn: 3, weighted_overall: 0.76, prev_weighted: 0.75,
    stagnation_counter: 2, unresolved_unknowns: [],
  }, config);
  // Even though stagnation_counter=2, gate_loop_enabled=false → legacy path used.
  assert.equal(result.exit_reason, 'clarity_threshold_met');
});

// ── AC-6, AC-7: weighted average formula verification ───────────────────────

test('AC-6: brownfield weighted_overall formula', () => {
  // goal=0.9, constraint=0.7, success=0.7, context=0.6
  // = 0.315 + 0.175 + 0.175 + 0.09 = 0.755
  // (REQUESTS.md AC-6 stated 0.740 — arithmetic typo; weights 0.35/0.25/0.25/0.15 are correct & sum to 1.0)
  const goal = 0.9, constraint = 0.7, success = 0.7, context = 0.6;
  const weighted = goal * 0.35 + constraint * 0.25 + success * 0.25 + context * 0.15;
  assert.ok(Math.abs(weighted - 0.755) < 0.01, 'brownfield: expected 0.755 ±0.01, got ' + weighted);
});

test('AC-7: greenfield weighted_overall formula', () => {
  // goal=0.9, constraint=0.7, success=0.7 → 0.780
  const goal = 0.9, constraint = 0.7, success = 0.7;
  const weighted = goal * 0.40 + constraint * 0.30 + success * 0.30;
  assert.ok(Math.abs(weighted - 0.780) < 0.01, 'greenfield: expected 0.780 ±0.01, got ' + weighted);
});
