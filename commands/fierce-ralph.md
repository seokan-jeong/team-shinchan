---
description: Deterministic loop-until-done (Workflow tier) for high-stakes long-running tasks
---

# Fierce Ralph Command

A main-loop Workflow drives a task to completion with a loop the script owns: a worker agent does the next unit of work, a verifier independently checks progress and completion against the real repo, and it repeats — bounded by an iteration cap, a token budget, and a stagnation limit — until an Action-Kamen final gate confirms the goal is met. Use when a stalled or prematurely-stopped loop is costly and you want the loop guarantee enforced rather than narrated.

See `skills/fierce-ralph/SKILL.md` for the full procedure.

## Usage

```
/team-shinchan:fierce-ralph [the goal to drive to completion, with success criteria]
```

## Examples

```
/team-shinchan:fierce-ralph "make the whole test suite green — fix every failing test in tests/"
/team-shinchan:fierce-ralph "finish all unchecked ACs in .shinchan-docs/{DOC_ID}/PROGRESS.md"
/team-shinchan:fierce-ralph "migrate every call site off the deprecated api() helper"
```

## When to use this vs /team-shinchan:ralph

| Use fierce-ralph | Use ralph (Kazama) |
|---|---|
| High-stakes, long-running; a stalled/early-stopped loop is costly | Routine persistence; quick "keep going till done" |
| You want the loop condition + stop bounds ENFORCED deterministically by the script | A narrated boulder loop in one context is acceptable |
| Explicit opt-in (runs a Workflow, token-heavy — set a budget) | Auto/delegated, cheaper |

An **APPROVED** final gate counts as completion evidence for the verification-before-completion gate.
