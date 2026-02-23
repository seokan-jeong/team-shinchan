---
name: team-shinchan:resume
description: Resume an interrupted workflow from where it left off
user-invocable: true
---

# team-shinchan:resume

Resume a paused/interrupted workflow by loading saved state and delegating to the appropriate agent.

## Step 0: Input Validation

If DOC_ID not provided: scan `.shinchan-docs/*/WORKFLOW_STATE.yaml`, filter `status: active|paused`, display list to user. If none found: suggest `/team-shinchan:start`.

## Step 1: Load Context

1. Read `.shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml`
   - Not found: error with list of available DOC_IDs
   - `status: completed`: inform user, suggest `/team-shinchan:start`
   - `status: blocked`: show blocker reason
2. Extract: `current_stage`, `current_phase`, `current_owner`

## Step 2: Load Documents

- **Always**: Read `.shinchan-docs/{DOC_ID}/REQUESTS.md` (warn if missing)
- **If stage >= planning**: Read `.shinchan-docs/{DOC_ID}/PROGRESS.md`
- **If requirements stage** with `current.interview`: extract step/collected_count/last_question for Nene handoff

## Step 3: Update State

Add `resumed` event to history, set `status: active`.

## Step 4: Output Status

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ Workflow Resumed: {DOC_ID}
Stage: {current_stage} ({n}/4) | Phase: {current_phase|N/A} | Owner: {current_owner}
Dashboard: http://localhost:3333
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 5: Delegate to Agent

| Stage | Agent | Model | Context |
|-------|-------|-------|---------|
| requirements | Nene | Opus | REQUESTS.md + interview state |
| planning | Nene | Opus | REQUESTS.md + PROGRESS.md |
| execution | Bo/Specialist | Sonnet | REQUESTS.md + PROGRESS.md + phase tasks |
| completion | Masumi + Action Kamen | Sonnet + Opus | All docs |

**Execution routing**: frontend -> Aichan, backend -> Bunta, infra -> Masao, default -> Bo.

```typescript
Task(subagent_type="team-shinchan:{agent}", model="{model}",
  prompt="Resume {DOC_ID}. Stage: {stage}, Phase: {phase}.\n{context}\nContinue from: {last_action}")
```

## Error Recovery

| Error | Recovery |
|-------|----------|
| Missing folder | List available workflows |
| Corrupted YAML | Default: execution, owner: bo, phase: 1 |
| Missing REQUESTS.md | Suggest `/team-shinchan:start` |

## Rules

- Always execute, always read WORKFLOW_STATE.yaml first
- Never skip state update, never invoke agent without context, never continue if completed
