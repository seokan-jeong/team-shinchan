# Misae — Interview Gate Tickets (WS-01 / WS-02 / WS-03 / WS-09) — background & examples

> Extracted from `agents/misae.md` (FR-1.2). The OPERATIVE rules (weakest-link aggregation,
> contradiction/scope-expansion triggers, the 2-loop cap, the anchor-signal table) remain inline
> in misae.md as condensed references; this file holds the origin/provenance and worked examples.

## TICKET WS-03 — Closure + Restate Gate (background)

> **Origin**: `deep-interview/SKILL.md` Phase 4 (MIT). **main-075 benchmark adoption.**
> Backward-compatible/ADDITIVE: introduces two OPTIONAL `finalize-result` fields
> (`restated_goal`, and the `closure_reject` `next` value). An APPROVED result that omits
> `restated_goal` parses exactly as before. The 2-loop cap guarantees termination.

**Why**: a high clarity *score* is not the same as analyst *acceptance*. The math can clear
the gate while a load-bearing gap (retention window, rollback semantics, auth boundary) is
still soft. WS-03 adds a final human-readable conscience check before the document is written.

**Gate 4a — Closure audit (analyst-acceptance override):**
1. With the full `answers` + draft requirements in hand, ask yourself: *"Do I, Misae, accept
   this as ready to write?"* — independent of the numeric gate.
2. If YES → proceed to Phase C/D normally; no override recorded.
3. If NO → you MUST name the specific gap in the form *"the math says ready, but I withhold
   acceptance because {gap}"*. Append it to `state.closure_overrides`
   (`[{loop, gap, restated_goal}]`, append-only). Then:
   - If the gap is a NEW actionable unknown AND `closure_loop < 2` → return
     `next: "closure_reject"` with `failed_item` = the gap; the parent re-adds it to
     `unresolved_unknowns` and re-enters the 2A.1 loop (turn+1), then re-runs FINALIZE_DRAFT.
   - If `closure_loop >= 2` (cap reached) → DO NOT reject again. Proceed to Phase D and log
     the residual gap under `## Open Questions` (same mechanism as the ESCALATE exits).

**Gate 4b — Restate gate (one-sentence goal):**
1. Restate the WHOLE request — every component (WS-01), every binding constraint — as ONE
   goal sentence. Write it to `state.restated_goal`.
2. Emit it on the `finalize-result` as `restated_goal` so the parent can confirm it with the
   user during Phase E-2 ("Is this the goal?"). This gate never rejects on its own — a wrong
   restatement is corrected by the user at the approval step, not by looping here.

**2-loop cap (termination guarantee)**: `state.closure_loop` starts at 0 and increments each
time a `closure_reject` is issued. The check `closure_loop < 2` bounds re-entry to at most 2
closure-driven loops, after which residual gaps are recorded (never an infinite loop). Persist
`current.interview.closure_loop` and `state.closure_overrides` in WORKFLOW_STATE.

## TICKET WS-01 — Topology Gate (background)

> **Origin**: `deep-interview/SKILL.md` Round 0 (MIT). **main-075 benchmark adoption.**
> Backward-compatible/ADDITIVE: when a request has a single top-level component, this
> collapses to the existing flat 3-dimension score (no behaviour change). The `components`
> array is OPTIONAL — its absence MUST parse exactly as before.

**Problem it solves**: a single flat `overall` lets a richly-specified component mask sparse
siblings. "Build auth + billing + an admin dashboard" can score 0.85 overall when *auth* is
fully spec'd but *billing* and *dashboard* are one-liners. The flat mean hides the gap.

**Procedure (turn 1 ONLY, BEFORE computing the flat clarity score in Step 0 / Step 1):**

1. **Enumerate independent top-level components** of `user_request` (target **1–6**;
   clamp to 6 — if more, group the long tail into a 6th "misc" component). A component is an
   independently-shippable capability/subsystem, NOT a sub-step. One component is the common
   case (a focused request) and is fine.
2. **Score each component separately** on the same three sub-scores
   (`goal`, `constraint`, `success`), each 0.0–1.0, using the rubric table above.
3. **Coverage-weighted weakest aggregation** — the gate's `overall` for turn 1 is the
   COVERAGE-WEIGHTED WEAKEST component score, so a detailed component cannot mask sparse
   siblings:
   - For each component compute `comp_overall = (goal + constraint + success) / 3`.
   - `coverage_weight` per component = `1 / N` (uniform) unless the request makes relative
     size explicit, in which case weight by stated size.
   - `topology_overall = min_i(comp_overall_i)` — the **weakest** component dominates
     (this is the "weakest-link" gate). Record the coverage-weighted mean
     `Σ(coverage_weight_i · comp_overall_i)` as `topology_mean` for audit only; it does NOT
     override the weakest-link value.
   - Set the turn-1 flat sub-scores (`goal_clarity`, `constraint_clarity`, `success_criteria`)
     to the **per-dimension minimum across components** (e.g.
     `goal_clarity = min_i(component_i.goal)`). This keeps the existing
     `overall = mean(3 dims)` invariant intact (the transition-gate ±0.05 arithmetic-mean
     check in mechanical-check still holds) while ensuring no dimension is inflated by a
     single strong component.
4. **Drive `unresolved_unknowns` from the weakest components**: each component scoring
   below `done_threshold` on any dimension contributes a specific unknown
   (e.g. `"billing: success criteria undefined (refund/proration rules)"`).
5. **Single-component requests**: `N == 1` → `topology_overall == comp_overall` → identical
   to the legacy flat score. No regression.

Persist the per-component breakdown in `clarity_score.components` (schema below). This is
turn-1 scaffolding; subsequent turns update the flat sub-scores normally (WS-02 governs how
they may move).

## TICKET WS-02 — Bidirectional / Non-Monotonic Ambiguity (background)

> **Origin**: `deep-interview/SKILL.md` Step 2c (MIT). **main-075 benchmark adoption.**
> Backward-compatible/ADDITIVE: introduces the `established_facts` list (optional; absent →
> parses as before). The `overall = mean(3 dims)` arithmetic and the transition-gate ±0.05
> validation are UNCHANGED — this ticket only documents that a dimension MAY move DOWN.

**Clarity convergence is NOT one-way.** The gate-loop's stagnation/PASS logic assumes scores
trend up, but a later answer can legitimately LOWER a sub-score. After each user answer,
before recomputing sub-scores, check the answer against the running `established_facts` list:

| Trigger | Effect on the affected sub-score |
|---------|----------------------------------|
| **Contradiction** — the answer conflicts with a previously established fact (e.g. turn 2 "must support offline" vs turn 4 "always online") | LOWER the affected dimension; the previously-"closed" unknown re-opens and is re-added to `unresolved_unknowns`. |
| **Evasive / non-committal** — the answer dodges the question ("whatever's easiest", "not sure yet") | the targeted dimension does NOT rise (and may drop if it had been provisionally credited). |
| **Scope expansion** — the answer adds a new capability/component not previously in scope | LOWER `goal_clarity` (and, for brownfield, `context_clarity`); add the new component to `clarity_score.components` (WS-01) and its gaps to `unresolved_unknowns`. |

**Maintain `established_facts`** (WORKFLOW_STATE schema below): an append-only list of
`{turn, fact, dimension}` triples capturing each concrete commitment the user makes. On a
contradiction, append a new fact AND record that the old one was superseded (`superseded_by`)
— never silently delete, so the audit trail (HR-1 spirit) is preserved.

**Invariant preserved**: `overall` is STILL the arithmetic mean of the 3 sub-scores; a
non-monotonic drop simply lowers one or more sub-scores BEFORE the mean is taken. The
`weighted_overall` formula and the mechanical-check transition-gate ±0.05 mean-validation
are untouched. A downward move can flip the gate-loop back to "continue" (the PASS condition
re-evaluates each turn), which is the intended safety behaviour.

## TICKET WS-09 — Anchor-Signal Skip (background)

> **Origin**: `ralplan/SKILL.md` Pre-Execution Gate (MIT). **main-075 benchmark adoption.**
> Backward-compatible/ADDITIVE: this is a NEW, narrower fast-path that runs ALONGSIDE the
> existing `pre_interview_clear` (≥3-of-5-fields) and `skip-interview` (escape hatch) paths.
> It only ever *adds* a skip opportunity; it never blocks the interview. The emitted `reason`
> stays `pre_interview_clear`, so the parent (`skills/start` §2A.1 AC1) accepts it with NO
> parser change — the only new wire field is the OPTIONAL `anchor_signals` array.

**Rationale**: a request carrying a concrete *anchor* (a file path, an issue number, a code
symbol, …) is already grounded in the codebase — the user has done the disambiguation work an
interview would otherwise extract. ralplan treats any such anchor as "ready to execute".

**Signal table** — fire if `user_request` matches ANY ONE row (case-insensitive where
sensible):

| # | Signal | Detection pattern (illustrative) |
|---|--------|----------------------------------|
| 1 | Existing file path | a backtick/inline path that resolves on disk (e.g. `src/foo.js`, `agents/misae.md`) — verify with a Read/Glob before crediting |
| 2 | Issue / ticket reference | `ISSUE-\d+`, `#\d+`, `[A-Z]{2,}-\d+` (JIRA-style) |
| 3 | Code symbol | `camelCase`, `PascalCase`, or `snake_case` identifier (≥2 segments, e.g. `evaluateGateLoop`, `clarity_score`) |
| 4 | Test runner named | `node --test`, `jest`, `vitest`, `mocha`, `pytest`, `npm test`, `./run-tests.sh` |
| 5 | Numbered steps | an ordered list of ≥2 imperative steps (`1. … 2. …`) |
| 6 | Explicit acceptance criteria | the literal "acceptance criteria", `AC-\d+`, or a `- [ ]` testable checkbox |
| 7 | Error reference | a stack-trace line, `Error:`/`Exception`, an error code, or a quoted failing message |
| 8 | Code block | a fenced ```` ``` ```` block or a clearly-pasted snippet |

**Guardrails (to avoid over-skipping):**
- Require `field_count ≥ 2` (from the 5-field count) IN ADDITION to ≥1 anchor signal. A bare
  symbol with zero surrounding context still goes to interview.
- For signal #1 (file path), the path MUST actually resolve (Read/Glob) — a *proposed new*
  file is NOT an anchor (it's exactly what an interview should scope).
- Record the matched signals in `clarity_score.history[0].anchor_signals` and the emitted
  JSON's `anchor_signals` array (audit; HR-1 spirit).
- This path is INELIGIBLE under `mode != DESIGN_NEXT_QUESTION turn 1` — it is strictly a
  turn-1 entry optimization.

When it fires: write `clarity_score.history[0]` with `source: anchor_signal_skip`, set
`unresolved_unknowns: []`, and emit the anchor-signal-skip fast-path JSON (that fenced block
stays inline in `agents/misae.md` per AC-3).
