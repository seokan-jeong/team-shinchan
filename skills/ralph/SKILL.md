---
name: team-shinchan:ralph
description: Persistently loops until task is fully complete. Used for "until done", "complete it", "dont stop" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

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
  subagent_type="team-shinchan:kazama",
  model="opus",
  prompt=`/team-shinchan:ralph has been invoked.

## Persistent Execution Until Complete Mode

Don't stop until complete:

1. Check TODO list
2. Execute next task (delegate to appropriate agent)
3. Verify results
4. On failure → Analyze cause → Retry
5. On success → Next task
6. All tasks complete → Action Kamen final verification
7. Verification fails → Fix and re-verify

## Completion Conditions

Complete only when all conditions met:
- All TODO list items completed
- Build/tests pass
- Action Kamen review approved

**If conditions not met, automatically continue!**

User request: ${args || '(Task to complete)'}
`
)
```

**STOP HERE. The above Task handles everything.**
