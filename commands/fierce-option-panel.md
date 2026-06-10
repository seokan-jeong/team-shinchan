---
description: Default-on interview option-quality panel (Workflow tier) — diverse generators, majority-vote consensus, cautious-confidence judge, top-K
---

# Fierce Option Panel Command

A main-loop Workflow that hardens interview recommendation options: N diverse generators
produce structure-free candidate options, a SelfCheckGPT majority-vote consensus
(≥ ceil(N/2+1) backing) filters hallucinations, a SteerConf cautious-confidence judge scores
the survivors, and a deterministic top-K is returned. Falls back to the basic B-path on any
failure (graceful degradation).

This is the **single fierce-\* skill that is ON by default** — an explicit, intentional
exception to the fierce-* opt-in convention, made under quality-over-cost. Opt out via
`.shinchan-config.yaml` → `interview.fierce_option_panel: false`.

See `skills/fierce-option-panel/SKILL.md` for the full procedure and
`docs/fierce-option-panel.md` for the design rationale.

## Usage

```
/team-shinchan:fierce-option-panel [the interview question to design options for]
```

## Examples

```
/team-shinchan:fierce-option-panel "what is the primary failure mode we are solving?"
/team-shinchan:fierce-option-panel "which scope boundary should phase 1 cover?"
```

## Config

| Key | Default | Purpose |
|-----|---------|---------|
| `interview.fierce_option_panel` | `true` | Master on/off (default-on exception). |
| `interview.fierce_panel_k_max` | `6` | Max options into the top-K / DINCO (O(K²) bound). |
| `interview.fierce_panel_generators` | `3` | Diverse generators; majority threshold = ceil(N/2+1). |
| `interview.fierce_panel_token_budget_per_turn` | `60000` | Per-turn DoS cap; over budget → basic path. |

## Limitations

ECE/AUROC calibration transfers from factual-QA literature via a proxy (user's eventual
option selection = ground truth) and is unvalidated for design options. Gating bars
(`ECE < 0.10`, `AUROC >= 0.70`, `Distinct-2 >= 0.55`, `self-BLEU <= 0.40`) are pragmatic
targets, not universal guarantees.
