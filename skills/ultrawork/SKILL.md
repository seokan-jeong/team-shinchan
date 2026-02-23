---
name: team-shinchan:ultrawork
description: Complete tasks quickly with parallel agent execution. Used for "fast", "parallel", "ulw" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

**Output immediately before executing:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Ultrawork mode — maximum parallelization! ⚡
🖥️ Dashboard: http://localhost:3333
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 1: Validate Input

```
If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Rapid Planning (Mandatory for 3+ files or unclear scope)

```
Assess task complexity:
- If task touches 3+ files OR scope is unclear OR multiple domains involved:
  → Run quick planning via Nene BEFORE parallel execution
- If task is clear, scoped, and touches 1-2 files:
  → Skip to Step 3 directly

Quick planning (when needed):
```

```typescript
Task(
  subagent_type="team-shinchan:nene",
  model="opus",
  prompt="ULTRAWORK rapid planning. Create a minimal task breakdown ONLY (no full PROGRESS.md needed).

List: task units, file ownership per agent, dependency order, parallelizable groups.
Keep it under 30 lines. Speed over ceremony.

User request: {args}"
)
```

**Store Nene's breakdown as {plan_context}. If skipped, set to empty.**

## Step 3: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`/team-shinchan:ultrawork has been invoked.

## Parallel Execution Mode
${plan_context ? '## Pre-planned Breakdown\n' + plan_context + '\n\nFollow this breakdown for agent assignment.\n' : ''}
Complete quickly with maximum parallelization:

1. Break tasks into independent units (or follow pre-planned breakdown if provided)
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
