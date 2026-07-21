# Misae — Option Generation Pipeline (detail)

> Extracted from `agents/misae.md` (FR-1.1). Operative summary + link live in misae.md's
> "Option Generation Pipeline" stub; this file holds the full 4-step rationale.

##### Option Generation Pipeline (4-step) — interview-metrics-researc-002 Phase 1

When you design a question's `options` (Step 2 below), do NOT generate A/B/C choices in a
single pass. The current single-pass approach causes diversity collapse (Diversity Collapse,
EMNLP 2025: schema-constrained generation suppresses diversity) and exposes un-calibrated
RLHF-overconfident scores. Generate options through this **4-step pipeline** instead:

1. **Structure-free generation** (FR-1). Generate candidate options WITHOUT any schema
   constraints. The generation prompt MUST NOT contain `A:`, `B:`, `C:`, enumeration markers,
   or an option-count target. A/B/C labels are applied ONLY in the separate formatting step
   (Step 2's JSON assembly), never during generation.

2. **Verbalized sampling + weight validation** (FR-2, HR-6). Produce N candidates PLUS a
   relative weight vector (e.g. `[0.45, 0.35, 0.20]`). Weights are ranking signals only —
   NEVER present them to users as calibrated confidence. Validate via
   `validateWeights()` in `src/option-metrics.js`: sum ∈ [0.98, 1.02], no negatives,
   length = N. Malformed → uniform fallback + a one-line stderr warning (NEVER written to
   WORKFLOW_STATE).

3. **Missing-alternative critic** (FR-3, HR-7). Ask: "Is there a substantially better
   alternative NOT in this set?" judged on three dimensions — coverage, alternativeness (is
   it genuinely different?), and evidence quality. "No better alternative exists" is a
   **first-class valid response**: do NOT retry, do NOT treat it as an error — the set
   proceeds unchanged. A surfaced alternative is appended to the candidate set BEFORE
   calibration (`applyMissingAlternativeCritic()`).

4. **DINCO calibration** (FR-4, HR-1, HR-9). Each option receives an INDEPENDENT score; the
   full set is then normalized using NLI-weighted + max-clamped normalization. Simple
   summation normalization is PROHIBITED (it degrades ECE). Options MUST be fully enumerated
   before any calibration score is computed (AC-6). The K-bound truncation
   (`fierce_panel_k_max`, default 6) is applied **AFTER** the missing-alternative critic pass
   — not before — so the critic-appended option is never silently dropped (NFR-4, HR-9).
   **Raw self-confidence MUST NEVER be written anywhere** — not to WORKFLOW_STATE, not to
   logs, not to debug output. Surfacing any `raw_confidence`, `self_confidence`, or
   `uncalibrated_score` value is a hard bug (FR-4, HR-1). Only DINCO-normalized values leave
   the pipeline.

**Per-option code evidence (FR-5)**: each generated option carries an `evidence` field — a
file path / function reference where the answer is derivable from the codebase, or
`evidence: inferred` when it cannot be grounded. At least one option per turn should be
code-grounded.

**fierce-option-panel is DEFAULT-ON** (FR-10.2). The `fierce-option-panel` Workflow
(`skills/fierce-option-panel/`) runs the hardened path (diverse generators →
SelfCheckGPT majority-vote consensus → SteerConf cautious-confidence judge → top-K) for every
question turn. This is an **explicit, intentional exception to the fierce-\* opt-in
convention** (every other fierce-* skill is opt-in), made under quality-over-cost. Opt OUT
via `.shinchan-config.yaml` → `interview.fierce_option_panel: false` (FR-10.3), which runs the
basic B-path (steps 1-4 above) instead. Record `current.interview.option_source`
(`fierce_panel` | `basic` | `basic_fallback`) per turn (FR-6.4). On any panel failure, fall
back to the basic B-path (`basic_fallback`) — never block a turn (NFR-3). See
`docs/fierce-option-panel.md`.

**Transferability gap (NFR-5)**: the calibration metrics (ECE/AUROC in
`src/option-metrics.js`) transfer from factual-QA literature via a proxy (user's eventual
option selection = ground truth) and are unvalidated for design options. Treat the gating
bars as pragmatic targets, not universal guarantees.
