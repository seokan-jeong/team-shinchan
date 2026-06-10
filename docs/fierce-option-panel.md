# fierce-option-panel

A Workflow-tier skill that hardens the quality of interview recommendation options produced
by Misae's `DESIGN_NEXT_QUESTION`. It runs diverse generators, filters with a
SelfCheckGPT-style majority-vote consensus, judges with a SteerConf cautious-confidence
rubric, and returns a calibrated top-K.

This is part of `interview-metrics-researc-002` Phase 1 — "Recommendation option quality
(B default + A opt-in)". See the requirements at
`.shinchan-docs/interview-metrics-researc-002-phase-1/REQUESTS.md`.

## The two paths

| Path | When | Pipeline |
|------|------|----------|
| **A — fierce-option-panel** (default) | `interview.fierce_option_panel` is unset or `true` | diverse generators → SelfCheckGPT majority-vote consensus → SteerConf cautious-confidence judge → top-K |
| **B — basic** (opt-out, fallback) | `interview.fierce_option_panel: false`, OR panel failure (graceful degradation) | structure-free generation → verbalized sampling + weight validation → missing-alternative critic → DINCO calibration |

## Default-ON: an explicit exception to the fierce-\* convention

Every other `fierce-*` skill (fierce-debate, fierce-compete, fierce-ralph, fierce-review) is
**opt-in** — the user must invoke it explicitly because it is expensive. `fierce-option-panel`
is the **single intentional exception**: it is **on by default**.

Rationale (quality-over-cost memory): option quality during requirements gathering compounds
across the entire downstream workflow. A weak option set at the interview stage propagates
false-binary choices and miscalibrated confidence into planning and execution. The cost of a
slightly more expensive interview turn is small relative to the cost of building the wrong
thing. Tokens are not the constraint; decision quality is.

This default-on decision is documented in three places (per FR-10.2): this file,
`skills/fierce-option-panel/SKILL.md`, and `agents/misae.md`.

## Escape hatch

Disable the panel by setting in `.shinchan-config.yaml`:

```yaml
interview:
  fierce_option_panel: false
```

When disabled, the basic B-path runs for every turn and
`current.interview.option_source` is recorded as `basic`.

## Config keys

| Key | Default | Purpose |
|-----|---------|---------|
| `interview.fierce_option_panel` | `true` | Master on/off. Default-on exception (FR-6.2/6.3). |
| `interview.fierce_panel_k_max` | `6` | Max options into DINCO; bounds O(K²) NLI (NFR-4). |
| `interview.fierce_panel_generators` | `3` | Diverse generators; majority threshold = ceil(N/2+1) (HR-2). |
| `interview.fierce_panel_token_budget_per_turn` | `60000` | Per-turn DoS cap (HR-3); over budget → fall back to basic. |

## option_source audit field (FR-6.4)

Each interview turn records `current.interview.option_source` in WORKFLOW_STATE.yaml — one of
`fierce_panel`, `basic`, or `basic_fallback` — so retrospectives can attribute option quality
to the pipeline variant used. This field is additive; pre-existing v1 docs are exempt (NFR-2).

## Safety properties

- **Majority-vote consensus (HR-2)**: an option must be backed by ≥ ceil(N/2+1) generators to
  pass — no any-pass promotion of a single generator's hallucination.
- **Graceful degradation (NFR-3)**: any generator failure or budget overrun falls back to the
  basic B-path and records `basic_fallback`. No turn is ever blocked by panel failure.
- **No raw confidence (FR-4 / HR-1)**: raw/uncalibrated self-confidence is never written to
  WORKFLOW_STATE, logs, or debug output. Only DINCO-normalized values are surfaced.
- **Main-loop only (R-5)**: like all `fierce-*` Workflows, `workflow()` throws inside a Task
  child — never delegate this skill to a sub-agent.

## Limitations / transferability gap (NFR-5)

The ECE/AUROC calibration metrics are transferred from the **factual-QA** literature, where
"correct" is objectively defined. Here, "correct" is a **proxy**: the user's eventual option
selection. This transfer is **unvalidated** for the design-option domain — `ECE < 0.10`,
`AUROC >= 0.70`, `Distinct-2 >= 0.55`, `self-BLEU <= 0.40` are pragmatic targets under the
proxy, not universally validated thresholds. See `src/option-metrics.js` module docstring for
the same caveat.
