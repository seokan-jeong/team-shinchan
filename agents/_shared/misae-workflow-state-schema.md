# Misae — WORKFLOW_STATE `clarity_score` schema (worked example)

> Extracted from `agents/misae.md` (FR-1.4). The operative `#### Write protocol` numbered list
> stays inline in misae.md; this file holds the full annotated schema example.

#### WORKFLOW_STATE schema (FR-7 — additive)

Extend the existing `clarity_score` block with two new sub-keys (backwards-compatible —
old four-field shape continues to parse):

```yaml
clarity_score:
  goal_clarity: 0.8
  constraint_clarity: 0.7
  success_criteria: 0.6
  context_clarity: 0.5            # NEW — brownfield only (4th axis); absent for greenfield
  overall: 0.70
  weighted_overall: 0.74         # NEW — project-type-weighted; present from turn 1 onward (HR-7)
  components:                     # NEW (WS-01) — turn-1 topology decomposition; OPTIONAL.
    - name: auth                  #   absent (or single-element) → legacy flat score, no regression
      goal: 0.9
      constraint: 0.8
      success: 0.85
    - name: billing               #   weakest component dominates topology_overall (min)
      goal: 0.4
      constraint: 0.3
      success: 0.2
  history:                        # NEW — append-only per turn (incl. turn 0)
    - turn: 0
      source: pre_interview       # one of: pre_interview | post_answer | autopilot_inferred | user_skip_override | anchor_signal_skip (WS-09)
      goal_clarity: 0.6
      constraint_clarity: 0.4
      success_criteria: 0.5
      overall: 0.50
      # weighted_overall ABSENT at turn 0 — project_type not yet confirmed (HR-7)
    - turn: 1
      source: post_answer
      goal_clarity: 0.8
      constraint_clarity: 0.4
      success_criteria: 0.5
      overall: 0.57
      weighted_overall: 0.61      # NEW — present from turn >= 1
      question_targeted: constraint_clarity
      closed_unknown: "Affected user segment"
unresolved_unknowns:              # NEW — list you maintain; empty → eligible to exit
  - "Latency target (p50/p95/p99 ms)"
  - "Failure mode when upstream times out"
established_facts:                # NEW (WS-02) — append-only commitments; OPTIONAL.
  - turn: 2                       #   used to detect contradiction / scope-expansion (non-monotonic clarity)
    fact: "must support offline mode"
    dimension: constraint_clarity
    superseded_by: null           #   set to the turn# that contradicted it; never delete (audit trail)

# Gate-Loop bookkeeping (interview-metrics-researc-001 — gate_loop_enabled: true)
current:
  project_type: greenfield        # NEW — brownfield | greenfield (default greenfield)
  interview:
    step: 0
    collected_count: 0
    last_question: null
    stagnation_counter: 0         # NEW — consecutive low-Δ turns (reset on Δ ≥ stagnation_delta)
    escalation_choice: null       # NEW — A | B | C after an ESCALATE prompt
    ak_double_check_result: null  # NEW — opt-in materiality double-check result
  gate_loop_enabled: true         # NEW — resolved from .shinchan-config.yaml by skills/start; read by mechanical-check Check D
  gate_threshold: 0.8             # NEW — written so Check D can read it ($0, no second file)
```

**Write protocol additions (gate_loop_enabled: true):**
- From turn 1 onward, compute and write `clarity_score.weighted_overall` (top-level current value) and append `weighted_overall` to each history entry (HR-7: never at turn 0).
- Maintain `current.interview.stagnation_counter`: increment when `Δweighted_overall < stagnation_delta`, reset to 0 otherwise.
- Mirror the resolved `gate_loop_enabled` and `gate_threshold` into `current.` so mechanical-check Check D can enforce the gate without reading `.shinchan-config.yaml`.

Per-entry size budget (NFR-4): ≤150 tokens. `closed_unknown` ≤80 chars. No prose / CoT
in WORKFLOW_STATE — that's what the streaming output is for (FR-5).
