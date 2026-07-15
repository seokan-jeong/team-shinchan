---
name: team-shinchan:ralph
description: Use when you need persistent looping until a task is fully complete.
user-invocable: false
---

# EXECUTE IMMEDIATELY

**Output immediately before executing:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎩 [Kazama] Persistent mode — won't stop until done! 💪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 1: Validate Input

```
If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Escalation: Tier 1 (this skill) vs Tier 2 (fierce-ralph)

This skill (Kazama's narrated boulder loop via Task — cheap, delegatable, auto-recovering) is **Tier 1** and the default. For **high-stakes, genuinely long-running** work where a stalled or prematurely-stopped loop is costly, escalate to **Tier 2 — `team-shinchan:fierce-ralph`** (a main-loop Workflow whose loop condition is owned by the script: worker→verifier iterations bounded by an iteration cap, a token budget, and a stagnation limit, closed by an Action-Kamen gate).

| Stay on Tier 1 (this skill) | Escalate to fierce-ralph |
|---|---|
| Routine persistence, quick "keep going till done" | High-stakes long task; a stalled/early-stopped loop is costly |
| A narrated loop in one context is acceptable | You want the loop + stop bounds ENFORCED deterministically |
| Auto-triggered or delegated, cheaper | Explicit user opt-in only (Workflow can't fire from a subagent; set a budget) |

**Never silently jump to Tier 2** — on a high-stakes long task, offer the opt-in; the user launches `/team-shinchan:fierce-ralph`.

## Step 1.5: Linear Sync — START (standalone only)

If invoked **standalone** (not as Stage 3 of an active `/start`/`autopilot` workflow),
run the **START → In Progress** transition per `agents/_shared/linear-sync.md` before
executing. When driven inside a workflow, skip — the workflow owns the issue lifecycle.
No-op if no Linear issue / Linear MCP unavailable.

## Step 2: Execute Task with Boulder Mechanism

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:kazama",
  model="opus",
  prompt=`/team-shinchan:ralph has been invoked.

## Persistent Execution Until Complete Mode (Boulder v2)

Don't stop until complete. Idle detection enabled.

### Core Loop
1. Check TODO list
2. Execute next task (delegate to appropriate agent)
3. Verify results
4. **Measurable progress check** (after each iteration):
   - Compare current state to previous iteration:
     a. File changes: \`git diff --stat\` output differs from last check
     b. TODO count: unchecked items \`- [ ]\` in PROGRESS.md decreased
     c. Phase completion: checked items \`- [x]\` in PROGRESS.md increased
   - If ANY of (a, b, c) is true → progress detected → reset idle counter to 0
   - If ALL of (a, b, c) are false → no progress → increment idle counter
5. **Stagnation detection** (after each idle-detection check) — a STOP condition, not just narration:
   Run: \`node src/stagnation-detector.js --jsonl .shinchan-docs/work-tracker.jsonl --doc-id {DOC_ID} --window 20\`
   \`stagnation: true\` means a hard pattern (REPEAT_ERROR / OSCILLATION / AC_STALL) RECURRED in the
   window — the loop is stuck, not merely slow (the detector already requires repeated occurrences, so
   it is not a single transient).
   - **First** \`stagnation: true\`: narrate the pattern and try ONE corrective approach —
     "Stagnation detected: {pattern names}. Adjusting approach to address: {evidence}."
   - **Second consecutive** \`stagnation: true\` (the correction did not break the pattern): **STOP the
     loop NOW and escalate to the user** with the pattern + evidence — do NOT continue toward the
     15-iteration cap. A confirmed-recurring stagnation pattern will not resolve by looping; burning
     the remaining iterations is waste. Record \`event: stagnation_stop\` to boulder-log.jsonl.
6. **Idle detection**:
   - If idle counter >= 3: "Idle detected — 3 consecutive iterations with no measurable progress"
   - Auto-generate continuation prompt with new approach:
     "Previous approach stalled on [last task]. Trying alternative: [different strategy or next task]."
   - Apply exponential backoff before retry:
     - Iteration 1-2: 0 seconds (immediate)
     - Iteration 3-4: 2 seconds wait
     - Iteration 5-6: 4 seconds wait
     - Iteration 7+: min(8 * 2^(iter-7), 60) seconds (max 60s)
   - Record to boulder-log.jsonl (if .shinchan-docs/{DOC_ID}/ exists):
     \`{"ts":"ISO8601","iteration":N,"event":"idle_detected","reason":"...","backoff_ms":N}\`
7. On failure → Analyze cause → Retry (max 3 retries per task)
8. On success → Next task
9. All tasks complete → Action Kamen final verification
10. Verification fails → Fix and re-verify

### Safety Limits
- **Max iterations**: 15 (hard limit — "Boulder limit reached — manual intervention required")
- **Stagnation stop**: 2 consecutive `stagnation: true` detections → stop + escalate before the cap (step 5)
- **Max retries per task**: 3 (report failure if exceeded)
- **Progress narration**: Every iteration, show current Phase, task, and progress indicator
- **Log file**: .shinchan-docs/{DOC_ID}/boulder-log.jsonl (append-only JSONL, skip if no active workflow)
  Format: \`{"ts":"ISO8601","iteration":N,"event":"idle_detected|retry|success|limit_reached|stagnation_stop","reason":"...","backoff_ms":N}\`

### Completion Conditions
Complete only when all conditions met:
- All TODO list items completed
- Build/tests pass
- Action Kamen review approved

**If conditions not met, automatically continue (respecting safety limits)!**

User request: ${args || '(Task to complete)'}
`
)
```

**When the loop completes** (all conditions met, Action Kamen approved) and this was a
**standalone** invocation, run the **FINISH → In Review** transition per
`agents/_shared/linear-sync.md` for the same issue (no-op if not Linear-based / driven
inside a workflow), then STOP.

**STOP HERE. The above Task handles everything.**
