---
name: team-shinchan:status
description: Show current workflow status. Displays active stage, phase, completed items, and pending requirements.
user-invocable: true
---

# Status Skill

## Input Validation

If no active workflow is found:
```
No active workflow found.
Use /team-shinchan:start to begin a new task.
```

## Execution Steps

1. Find the most recently updated WORKFLOW_STATE.yaml in .shinchan-docs/
2. Read WORKFLOW_STATE.yaml and extract current state
3. Check existence of workflow documents (REQUESTS.md, PROGRESS.md, etc.)
4. Display status dashboard

## Dashboard Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Workflow Status Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Document: {doc_id}
📋 Stage: {stage} ({status})
👤 Owner: {owner}
🔄 Phase: {phase or "N/A"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Documents:
  ✅ WORKFLOW_STATE.yaml
  {✅|❌} REQUESTS.md
  {✅|❌} PROGRESS.md
  {✅|❌} RETROSPECTIVE.md
  {✅|❌} IMPLEMENTATION.md

📈 Metrics:
  ⏱️ Stages Completed: {N}/4
  {stage_name}: {duration} min (if available)
  Agents: {agent_count} invoked

📜 Recent History:
  {last 3-5 history entries}

⏭️ Next Step:
  {transition requirements for current stage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Metrics Section Rules
- Read `metrics:` section from WORKFLOW_STATE.yaml
- Show stage durations for completed stages only
- Show agent invocation count if `metrics.agents` is populated
- If `metrics:` section is missing (legacy workflows), skip metrics display

## Transition Requirements Reference

### requirements → planning
- REQUESTS.md exists with Problem Statement
- Requirements defined
- Acceptance Criteria defined
- User approval

### planning → execution
- PROGRESS.md exists with Phases
- Each phase has acceptance criteria

### execution → completion
- All phases complete
- All Action Kamen reviews passed

### completion → done
- RETROSPECTIVE.md written
- IMPLEMENTATION.md written
- Final Action Kamen review passed

## Error Handling

If WORKFLOW_STATE.yaml is corrupted or unreadable:
```
⚠️ WORKFLOW_STATE.yaml is corrupted or unreadable.
Showing available information from folder structure.
```
