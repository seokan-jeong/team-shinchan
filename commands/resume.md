---
description: Resume an interrupted workflow from where it left off
---

# Resume Workflow Command

## EXECUTE IMMEDIATELY

When this command is invoked, **DO NOT** explain the process. **EXECUTE** the resume workflow.

## Usage

```bash
/team-shinchan:resume              # Auto-detect interrupted workflows
/team-shinchan:resume main-016     # Resume specific workflow by DOC_ID
/team-shinchan:resume ISSUE-123    # Resume workflow by Issue ID
```

## Execution Protocol

### 1. Input Validation

**If no DOC_ID provided:**
- Scan `.shinchan-docs/*/WORKFLOW_STATE.yaml`
- Filter: `status: active` OR `status: paused`
- Display list and await user selection
- If empty: "No interrupted workflows found."

**If DOC_ID provided:**
- Validate existence of `.shinchan-docs/{DOC_ID}/`
- Error if not found: List available workflows

### 2. Load State

Read `.shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml`:
- Extract: `current.stage`, `current.phase`, `current.owner`
- Verify: `status != completed`

### 3. Load Context

**Required:**
- `REQUESTS.md` - Problem statement, requirements, AC

**Conditional:**
- `PROGRESS.md` - If stage is planning/execution/completion

### 4. Update State

Append to `WORKFLOW_STATE.yaml` history:
```yaml
- timestamp: "{ISO 8601}"
  event: resumed
  agent: shinnosuke
  from_stage: {stage}
  from_phase: {phase}
```

Set `current.status: active`

### 5. Announce Resume

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ Workflow Resumed: {DOC_ID}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Stage: {stage} ({N} of 4)
🔄 Phase: {phase}
👤 Owner: {owner}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6. Delegate to Agent

| Stage | Agent Call |
|-------|-----------|
| requirements | `Task(team-shinchan:nene, opus, "Continue requirements gathering...")` |
| planning | `Task(team-shinchan:nene, opus, "Continue planning from phase {N}...")` |
| execution | `Task(team-shinchan:bo, sonnet, "Continue phase {N} implementation...")` |
| completion | `Task(team-shinchan:masumi, sonnet, "Generate RETROSPECTIVE.md...")` |

**Include in prompt:**
- REQUESTS.md summary
- PROGRESS.md current state
- Last completed action
- Next steps

## Error Scenarios

### Workflow Not Found
```
Error: Workflow 'main-999' not found.

Available workflows:
- main-016 (active, execution)
- ISSUE-123 (paused, planning)
```

### Already Completed
```
Workflow 'main-015' is already completed.

See: .shinchan-docs/main-015/RETROSPECTIVE.md

Use /team-shinchan:start for a new task.
```

### Missing REQUESTS.md
```
Warning: REQUESTS.md missing in {DOC_ID}.

Options:
1. /team-shinchan:start (fresh start)
2. Manually create REQUESTS.md
3. Continue anyway (not recommended)
```

### Corrupted State
```
Warning: WORKFLOW_STATE.yaml corrupted.

Defaulting to:
- Stage: execution
- Phase: 1
- Owner: bo

Review and update WORKFLOW_STATE.yaml manually.
```

## Prohibited

- ❌ Explain without executing
- ❌ Skip WORKFLOW_STATE.yaml update
- ❌ Invoke agent without context
- ❌ Assume state without reading files
- ❌ Continue completed workflows

## Examples

### Example 1: Auto-detect

```
User: /team-shinchan:resume

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Scanning for interrupted workflows...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found:
1. main-016 (Stage: execution, Phase: 2, Owner: bo)
2. ISSUE-123 (Stage: planning, Owner: nene)

Which workflow? (enter number or DOC_ID)

User: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ Workflow Resumed: main-016
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Stage: execution (3 of 4)
🔄 Phase: 2
👤 Owner: bo

📝 Context Loaded:
   - REQUESTS.md: 342 words
   - PROGRESS.md: 2/3 phases complete

🎯 Resuming from: Phase 2 - Backend API implementation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Calling Bo to continue Phase 2...
[Task tool invocation]
```

### Example 2: Direct DOC_ID

```
User: /team-shinchan:resume ISSUE-123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ Workflow Resumed: ISSUE-123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Stage: planning (2 of 4)
🔄 Phase: N/A
👤 Owner: nene

📝 Context Loaded:
   - REQUESTS.md: 215 words

🎯 Resuming from: Phase definition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Calling Nene to continue planning...
[Task tool invocation]
```

### Example 3: No interrupted workflows

```
User: /team-shinchan:resume

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Scanning for interrupted workflows...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No interrupted workflows found.

All workflows are either completed or not yet started.

Use /team-shinchan:start to begin a new task.
```

### Example 4: Workflow already completed

```
User: /team-shinchan:resume main-015

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Workflow Already Completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workflow: main-015
Status: completed
Completed: 2026-02-07T14:23:45Z

📄 Documentation:
   - RETROSPECTIVE.md
   - IMPLEMENTATION.md
   - REQUESTS.md
   - PROGRESS.md

Use /team-shinchan:start for a new task.
```

## Integration with Workflow

This command integrates with:
- `WORKFLOW_STATE.yaml` - State persistence
- `/team-shinchan:start` - New workflow creation
- `/team-shinchan:status` - Status checking
- Stage transition gates (PART 6, CLAUDE.md)

## Success Criteria

Resume is successful when:
1. WORKFLOW_STATE.yaml updated with resume event
2. current.status set to 'active'
3. Context documents loaded
4. Appropriate agent invoked via Task
5. User sees resume status output

## Related Commands

- `/team-shinchan:start` - Start new workflow
- `/team-shinchan:status` - Check workflow status
- `/team-shinchan:autopilot` - Autonomous execution
