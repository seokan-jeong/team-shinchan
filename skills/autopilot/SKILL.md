---
name: team-shinchan:autopilot
description: Autonomously completes from requirements analysis to verification without user intervention. Used for "auto", "automatically", "autopilot" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

**Output immediately before executing:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Autopilot mode engaged~ 🤖
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 1: Validate Input

```
If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`/team-shinchan:autopilot has been invoked.

## Autonomous Execution Mode

Complete autonomously without user intervention:

1. Create WORKFLOW_STATE.yaml (stage: requirements)
2. Auto-analyze requirements with Misae
3. Create plan with Nene in MICRO-TASK FORMAT (REQUESTS.md, PROGRESS.md)
   - Each phase broken into 2-3 minute tasks with exact file paths, code, and verification commands
4. Execute using micro-execute pattern (RULE 2.7 in agents/shinnosuke.md):
   - For each micro-task: fresh implementer subagent → spec compliance review → code quality review
   - See skills/micro-execute/SKILL.md for full protocol
5. Action Kamen final verification
6. Auto-fix issues when discovered

## Stage Rule Compliance

- requirements Stage: Only requirements gathering (no code modification)
- planning Stage: Only planning (no code modification)
- execution Stage: Implementation proceeds
- completion Stage: Documentation and verification

## Safety Limits

- **Max iterations**: 15 (pause and report if reached)
- **Progress check**: If no measurable progress in 3 consecutive iterations, pause and report to user
- **Scope escalation**: If requirements analysis reveals 20+ files or 3+ domains, recommend switching to /team-shinchan:bigproject

## On Max Iterations Reached

If the 15-iteration limit is reached, output:
- Current stage and phase
- What was completed
- What remains incomplete
- Specific blocker (if any)
- Recommended next step for user

User request: ${args || '(Request content analysis needed)'}
`
)
```

**STOP HERE. The above Task handles everything.**
