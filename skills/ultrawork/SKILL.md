---
name: team-shinchan:ultrawork
description: Complete tasks quickly with parallel agent execution. Used for "fast", "parallel", "ulw" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Ultrawork mode -- maximum parallelization!
🖥️ Dashboard: http://localhost:3333
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 1: Validate

If args > 2000 chars: truncate + warn.

## Step 2: Rapid Planning (if 3+ files or unclear scope)

```typescript
Task(subagent_type="team-shinchan:nene", model="opus",
  prompt="ULTRAWORK rapid planning. Minimal breakdown: task units, file ownership per agent, dependency order, parallelizable groups. Under 30 lines.\nUser request: {args}")
```

Store as `{plan_context}`. Skip if task is clear and touches 1-2 files.

## Step 3: Execute

```typescript
Task(subagent_type="team-shinchan:shinnosuke", model="opus",
  prompt="/team-shinchan:ultrawork invoked.
  ${plan_context ? 'Pre-planned:\n' + plan_context : ''}
  Parallel execution:
  1. Break into independent units (or follow plan)
  2. Assign to agents in parallel (run_in_background=true)
     Routing: Analysis→Shiro/Misae/Hiroshi | Execution→Bo/Kazama | Frontend→Aichan | Backend→Bunta | DevOps→Masao | Verification→Action Kamen
  3. Queue sequential tasks, wait for completion
  4. Integrate results + Action Kamen verification
  Done when: all TODOs complete, features working, tests pass, no errors. Keep working if not met.
  User request: ${args}")
```

**STOP HERE. The above Task handles everything.**

## Concurrency Guidelines

- **File-level ownership**: each agent owns specific files, no overlaps
- **Max 3-4 concurrent agents** to avoid context confusion
- **Check for conflicts** before merging parallel results
- **Failure isolation**: if one fails, others continue; report failures after all complete
