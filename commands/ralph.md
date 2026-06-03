---
description: Persistently loops until task is fully complete
---

# Ralph Command

Continues working until the task is 100% complete. Auto-recovers from errors.

See `skills/ralph/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:ralph [task description]
```

## Two tiers

This command is **Tier 1** — Kazama's narrated boulder loop, cheap and delegatable. For high-stakes, genuinely long-running work where a stalled or early-stopped loop is costly, escalate to **Tier 2 — `/team-shinchan:fierce-ralph`**, a Workflow whose loop condition the script owns (worker→verifier iterations bounded by an iteration cap, token budget, and stagnation limit, closed by an Action-Kamen gate).
