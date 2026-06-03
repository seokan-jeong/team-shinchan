---
description: Deterministic competitive code tournament (Workflow tier) — best of N implementations
---

# Fierce Compete Command

A main-loop Workflow runs a competitive tournament: N builder agents independently solve the same task and each returns an apply-ready patch (read-only — no collisions, nothing to merge), an Action-Kamen judge scores them head-to-head, and the winner is selected deterministically by total score and applied. Use when the best of N implementations is worth the cost.

See `skills/fierce-compete/SKILL.md` for the full procedure.

## Usage

```
/team-shinchan:fierce-compete [the implementation task; optionally "best of N"]
```

## Examples

```
/team-shinchan:fierce-compete "implement the rate limiter — best of 3"
/team-shinchan:fierce-compete "two approaches to the CSV parser, pick the cleaner one"
/team-shinchan:fierce-compete "refactor auth middleware; compete 3 designs"
```

## When to use this vs /team-shinchan:debate (competitive-code mode)

| Use fierce-compete | Use debate competitive-code (Midori) |
|---|---|
| High-value contested implementation; you want a schema-validated, deterministically-scored tournament | Quick best-of-N is acceptable |
| Patch-return (read-only builders, winner applied + tested in the main loop) | Worktree-based, Task-orchestrated |
| Explicit opt-in (runs a Workflow, token-heavy) | Auto/keyword-triggered, cheaper |

The winner is recorded to `.shinchan-docs/debate-decisions.md` (shared ledger) and applied with `git apply`, then verified.
