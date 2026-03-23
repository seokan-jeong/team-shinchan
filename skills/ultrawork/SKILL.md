---
name: team-shinchan:ultrawork
description: Use when you need to complete tasks quickly with parallel agent execution.
user-invocable: false
---

# EXECUTE IMMEDIATELY

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Ultrawork mode -- maximum parallelization!
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

## Step 2.5: Wave Order Calculation (if plan_context exists)

If `{plan_context}` was generated, compute Wave execution order using ontology:

```bash
node -e "
const { getWaveOrder } = require('${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js');
const taskList = /* parse task units from plan_context as [{id, files:[...]}] */;
const { waves, warnings } = getWaveOrder(process.cwd(), taskList);
console.log(JSON.stringify({ waves, warnings }, null, 2));
"
```

- `waves` = `[[task1, task2], [task3], ...]` — 같은 Wave 내 태스크는 병렬 실행 가능
- Wave 1 완료 후 Wave 2 실행, 순차적으로 진행
- **Fallback**: `getWaveOrder`가 단일 Wave를 반환하거나 온톨로지가 없으면, 모든 태스크를 동시 병렬 실행 (기존 동작 유지)

Store result as `{wave_plan}`. Pass to Step 3 execution.

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
