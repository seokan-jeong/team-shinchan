---
name: ralph
description: Persistently loops until task is fully complete. Used for "until done", "complete it", "dont stop" requests.
user-invocable: true
---

# Ralph Skill

## Features

- Infinite retry until task completion
- Auto-recovery on errors
- Progress tracking via TODO list
- Final verification by Action Kamen(Reviewer)

## Ralph Loop

1. Check TODO list
2. Execute next task
3. Verify result
4. On failure → analyze cause → retry
5. On success → next task
6. All tasks done → final verification
7. Verification failed → fix and re-verify

## Workflow Checklist

```
[ ] Initialize task list
[ ] Execute current task
[ ] Verify task result
[ ] Complete all tasks
[ ] Action Kamen final verification
```

## Completion Criteria

Complete only when ALL conditions met:
- All TODO list items completed
- Build/tests pass
- Action Kamen review approved

**Auto-continues if criteria not met**
