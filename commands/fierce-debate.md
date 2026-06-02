---
description: Deterministic adversarial debate (Workflow tier) for high-stakes decisions
---

# Fierce Debate Command

A main-loop Workflow runs a non-skippable adversarial debate: advocates argue each option maximally, cross-refute the others, and Action Kamen scores them on a rubric. Use for irreversible / high-stakes decisions where consensus-seeking debate risks converging too early.

See `skills/fierce-debate/SKILL.md` for the full procedure.

## Usage

```
/team-shinchan:fierce-debate [decision topic + the competing options]
```

## Examples

```
/team-shinchan:fierce-debate "REST vs GraphQL for the public API"
/team-shinchan:fierce-debate "Postgres row-level security vs app-layer authz"
/team-shinchan:fierce-debate "synchronous vs event-driven order processing"
```

## When to use this vs /team-shinchan:debate

| Use fierce-debate | Use debate (Midori) |
|---|---|
| Irreversible / high-stakes (migration, public API, security boundary, data-loss) | Reversible, low-stakes, 2-option |
| You want a guaranteed refutation round + scored judge panel | Quick consensus is acceptable |
| Explicit opt-in (runs a Workflow, higher token cost) | Auto-triggered, cheap |
