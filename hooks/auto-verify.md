---
name: auto-verify
description: Auto-trigger verify-implementation when entering Completion stage
event: PostToolUse
---

# Auto-Verify Hook

**Runs AFTER tool use. Auto-triggers verification on Completion stage entry.**

## Trigger

Only fires when:
- Tool = Write, File = `**/WORKFLOW_STATE.yaml`
- `current.stage == "completion"` AND `history[-1].event == "execution_completed"`
- Verification has NOT already run this session

## Action

When triggered:
1. Set `already_verified_this_session = true`
2. Announce: "Auto-Verify: Execution complete! Running verification..."
3. Execute `/team-shinchan:verify-implementation`
4. Update WORKFLOW_STATE.yaml history:

**On success:**
```yaml
- event: verify_implementation_passed
  agent: action_kamen
  result: all_passed
```

**On failure:**
```yaml
- event: verify_implementation_failed
  agent: action_kamen
  result: issues_found
  blocking: true
```
- If passed → proceed to RETROSPECTIVE.md
- If failed → list issues, stay in execution

## Completion Gate

```yaml
transition_gates:
  completion_to_done:
    - retrospective_written: true
    - implementation_doc_written: true
    - action_kamen_review_passed: true
    - verify_implementation_passed: true
```

## Skip Conditions

Do NOT trigger if:
- `current.stage` != "completion"
- Already verified this session
- Workflow status is "paused" or "blocked"
- User used `--skip-verify` flag (logs `verify_skipped` event)

## Error Handling

- verify-implementation fails to run → log error, warn user, don't block. Allow manual run.
- No verify-* skills found → treat as passed, suggest `/team-shinchan:manage-skills`.
