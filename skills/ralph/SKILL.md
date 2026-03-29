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
5. **Stagnation detection** (after each idle-detection check):
   Run: \`node src/stagnation-detector.js --jsonl .shinchan-docs/work-tracker.jsonl --doc-id {DOC_ID} --window 20\`
   If output \`stagnation: true\`, include pattern names in the continuation prompt:
   "Stagnation detected: {pattern names}. Adjusting approach to address: {evidence}."
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
- **Max retries per task**: 3 (report failure if exceeded)
- **Progress narration**: Every iteration, show current Phase, task, and progress indicator
- **Log file**: .shinchan-docs/{DOC_ID}/boulder-log.jsonl (append-only JSONL, skip if no active workflow)
  Format: \`{"ts":"ISO8601","iteration":N,"event":"idle_detected|retry|success|limit_reached","reason":"...","backoff_ms":N}\`

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

**STOP HERE. The above Task handles everything.**
