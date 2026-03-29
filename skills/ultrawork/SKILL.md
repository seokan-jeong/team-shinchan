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

## Step 1.5: Preset Lookup (if args includes a preset name)

If args contains a recognized preset name, resolve agent list from `agents/_shared/team-presets.json`:

```bash
node -e "
const fs = require('fs');
const presets = JSON.parse(fs.readFileSync('${CLAUDE_PLUGIN_ROOT}/agents/_shared/team-presets.json', 'utf8')).presets;
const input = process.argv[1] || '';
const matched = Object.values(presets).find(p => input.toLowerCase().includes(p.name));
if (matched) console.log(JSON.stringify(matched));
" "{args}"
```

- If a preset matches: use its `agents` array to constrain which domain agents are assigned in Step 3
- If no preset matches: proceed with full routing table (no constraint)

Recognized preset names: `fullstack`, `backend-api`, `quality`, `data-pipeline`, `security-audit`

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

## Step 3.5: Post-Integration Stagnation Check

After all parallel agents complete:
Run: `node src/stagnation-detector.js --jsonl .shinchan-docs/work-tracker.jsonl --window 20`
If `stagnation: true`, surface findings in the summary before handing off to Action Kamen:
"Stagnation patterns detected: {pattern names} — {evidence}. Reviewing before AK handoff."

## Concurrency Guidelines

- **File-level ownership**: each agent owns specific files, no overlaps
- **Max 3-4 concurrent agents** to avoid context confusion
- **Check for conflicts** before merging parallel results
- **Failure isolation**: if one fails, others continue; report failures after all complete
