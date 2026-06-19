---
description: Start a new task with the integrated workflow
---

# ⚠️ EXECUTE IMMEDIATELY — DO NOT JUST DESCRIBE

When this command is invoked, **execute the full integrated workflow defined in
`skills/start/SKILL.md`**. That file is the single source of truth — run it start to finish:

**Step 0** (expire/archive stale workflows) → **Step 1** (DOC_ID + `WORKFLOW_STATE.yaml`,
including `execution_mode: micro-execute` and the `requirements`/`design`/`planning` AK gates)
→ **Step 2A** (Requirements interview — Misae) → **Step 2B** (Stage 1.5 **Design** interview —
Hiroshi) → **Step 2C** (hand off to Shinnosuke for Planning → Execution → Completion).

Do **not** improvise a shorter flow, and do **not** skip the Design stage — design is
default-on and may be skipped **only** via the explicit Step 2B skip conditions evaluated
inside the skill. (A prior inline summary in this file omitted Step 2B and wrote a stale state
shape; that was the v4.45.x design-skip regression class. The skill is now the only spec — do
not re-encode its steps here.)

## Non-negotiables (the skill carries the full detail)

- **The main thread drives every `AskUserQuestion`.** Sub-agents (Misae, Hiroshi) only *design*
  each question and return a fenced JSON block; their own `AskUserQuestion` calls never reach the
  user. Parse + validate the block per the skill's GUARD, then the main thread asks.
- **Stage transitions are owned by the agent's `Mode: TRANSITION`** (misae → design, hiroshi →
  planning). Do not write `current.stage` from the command/skill or name a destination stage.
- **Stage 3 runs via micro-execute** (the `/start` default): implementer → spec-review →
  quality-review → independent skeptic, per task. Never the dag-executor unless the user opts in.
- **Stage 4 (Completion) is mandatory** after Stage 3 — RETROSPECTIVE + IMPLEMENTATION + final
  Action Kamen review. (Also enforced deterministically by `hooks/session-wrap.sh`.)

## Usage

```bash
/team-shinchan:start                    # Auto-generate ID
/team-shinchan:start ISSUE-123          # Use issue ID
/team-shinchan:start "Add user auth"    # Start with description
```

## ⛔ Prohibited

- Only describing the steps instead of executing them.
- Proceeding without creating `WORKFLOW_STATE.yaml`.
- Skipping the Stage 1.5 Design interview outside the skill's explicit skip conditions.
- Calling `Task(misae/hiroshi)` and expecting the sub-agent's `AskUserQuestion` to reach the user.
- Re-encoding the skill's steps in this file (keep one source of truth in `skills/start/SKILL.md`).
