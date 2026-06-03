---
description: Deterministic adversarial code review (Workflow tier) for high-stakes scope
---

# Fierce Review Command

A main-loop Workflow runs a non-skippable, multi-dimension review: dimension agents (correctness, security, performance, quality, tests, principles) fan out independently, every finding is challenged by a skeptic, a completeness critic hunts the files and rules nobody examined, and an Action-Kamen judge scores against the shared rubric. Use when a single-pass review risks stopping at "good enough" — pre-release diffs, security/payment/auth boundaries, data-loss paths.

See `skills/fierce-review/SKILL.md` for the full procedure.

## Usage

```
/team-shinchan:fierce-review [paths, a feature description, or nothing for the current diff]
```

## Examples

```
/team-shinchan:fierce-review                       # review the working-tree / branch diff
/team-shinchan:fierce-review "src/auth/"           # review a path
/team-shinchan:fierce-review "the new payment webhook handler"
```

## When to use this vs /team-shinchan:review

| Use fierce-review | Use review (Action Kamen) |
|---|---|
| High-stakes scope: pre-release, security/payment/auth boundary, data-loss path | Routine change, single file, quick check |
| You want guaranteed per-dimension coverage + adversarial per-finding verification + a completeness critic | A single thorough pass is acceptable |
| Explicit opt-in (runs a Workflow, higher token cost) | Auto-triggered or delegated, cheap |

An **APPROVED** fierce-review writes `.shinchan-docs/reviews/REVIEW-{NNN}.json`, which counts as code-review evidence for the verification-before-completion gate.
