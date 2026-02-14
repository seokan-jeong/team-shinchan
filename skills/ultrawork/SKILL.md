---
name: team-shinchan:ultrawork
description: Complete tasks quickly with parallel agent execution. Used for "fast", "parallel", "ulw" requests.
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
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`/team-shinchan:ultrawork has been invoked.

## Parallel Execution Mode

Complete quickly with maximum parallelization:

1. Break tasks into independent units
2. Assign each unit to appropriate agents in parallel
   - Use run_in_background=true
   - Agent routing:
     | Domain | Haiku | Sonnet | Opus |
     |--------|-------|--------|------|
     | Analysis | Shiro | Misae | Hiroshi |
     | Execution | - | Bo | Kazama |
     | Frontend | - | Aichan | - |
     | Backend | - | Bunta | - |
     | DevOps | - | Masao | - |
     | Verification | - | - | Action Kamen |
3. Queue sequential tasks
4. Wait for all tasks to complete
5. Integrate results and Action Kamen verification

## Completion Conditions

- All TODO list items completed
- All features working properly
- Tests pass
- No errors

**If conditions not met, keep working!**

User request: ${args || '(Tasks to process in parallel)'}
`
)
```

**STOP HERE. The above Task handles everything.**

## Concurrency Guidelines

When running agents in parallel:

1. **File-Level Assignment**: Each parallel agent should own specific files. Never assign the same file to multiple agents.
2. **Maximum Parallel Agents**: Limit to 3-4 concurrent agents to avoid context confusion.
3. **Conflict Prevention**: Before merging parallel results, check for conflicting changes.
4. **Failure Isolation**: If one parallel agent fails, others should continue. Report failures after all complete.
