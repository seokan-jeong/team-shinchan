---
name: team-shinchan:micro-execute
description: Use when you need micro-task execution with per-task two-stage review.
user-invocable: true
---

# Micro-Execute: Subagent-Driven Development

> Break implementation into 2-3 minute micro-tasks. Each task gets a fresh subagent + two-stage review (spec compliance → code quality). No context pollution between tasks.

## Step 1: Validate Input

```
If args is empty:
  Check for active WORKFLOW_STATE.yaml in .shinchan-docs/
  If found → use PROGRESS.md as plan source
  If not found → Ask: "Which plan file should I execute? (path to PROGRESS.md or plan file)"
  STOP and wait

If args is a file path:
  plan_source = args

If args is a task description:
  Generate micro-task plan inline (see Step 2)
```

### Rubric Override Detection

After parsing args, check for a `rubric:` field (YAML-style or as part of a plan file frontmatter):

```
If args contains a `rubric:` field:
  rubric_override = parsed rubric definition
  Announce: "Custom rubric detected: {rubric_override item names}"
Else:
  rubric_override = null  (Action Kamen uses default 3-item rubric)
```

## Step 2: Parse or Generate Micro-Task Plan

### If plan_source exists (PROGRESS.md or plan file):

Read the plan and extract all phases. For each phase, break into micro-tasks:

```
Each micro-task MUST have:
- Title (what to do in 2-3 minutes)
- Files: Create/Modify/Test (exact paths)
- Steps: 2-5 concrete steps
- Verification: command + expected output
```

### If no plan exists (args is a task description):

```typescript
Task(subagent_type="team-shinchan:nene", model="opus",
  prompt=`Create a MICRO-TASK PLAN for the following request.

## Micro-Task Plan Format

Break the work into tasks that each take 2-3 minutes. Each task MUST follow this format:

### Task N: [Component Name]

**Files:**
- Create: exact/path/to/file
- Modify: exact/path/to/existing.py:line_range
- Test: tests/exact/path/to/test.py

**Step 1: [Action]**
[Complete code or exact instructions]

**Step 2: Verify**
Run: [exact command]
Expected: [exact expected output or behavior]

**Step 3: Commit** (optional)
git add [files] && git commit -m "[message]"

## Rules
- Each task is ONE focused change (2-3 minutes of work)
- Exact file paths always (no "add a file somewhere")
- Complete code in plan (not "add validation" but the actual code)
- Exact verification commands with expected output
- Assume the implementer has NO project context
- Order tasks by dependency (later tasks may depend on earlier ones)

User request: ${args}`)
```

Store result as `{micro_plan}`.

## Step 2.5: Determine Model Tier per Task

Before execution, score each micro-task with collaboration-score.js and assign a model tier.

**For EACH micro-task in the plan:**

```
score_result = node ${CLAUDE_PLUGIN_ROOT}/src/collaboration-score.js \
  --task "{task.title}" \
  --files {len(task.files)} \
  --domains {task.domain_count || 1}

Parse JSON output → output.model_tier
Validate: model_tier must be one of ['haiku', 'sonnet', 'opus']
If unknown value: fallback to 'sonnet'
Store as task.model
```

Example output from collaboration-score.js:
```json
{ "score": 45, "mode": "delegate", "model_tier": "sonnet", ... }
```

After scoring all tasks, announce the plan:
```
Model tier assignment:
  Task 1: {title} → {task.model} (score: {score})
  Task 2: {title} → {task.model} (score: {score})
  ...
```

## Step 3: Execute Micro-Tasks

**For EACH micro-task, sequentially (never parallel for implementation):**

### 3a. Dispatch Implementer

```typescript
Task(
  subagent_type="team-shinchan:{domain_agent}",  // Bo | Aichan | Bunta | Masao
  model="{task.model}",  // haiku | sonnet | opus — set in Step 2.5 via collaboration-score.js
  prompt=`You are implementing a SINGLE micro-task.

## Prompt Template
// See: ${CLAUDE_PLUGIN_ROOT}/agents/_shared/micro-task-prompts/implementer-prompt.md

## Your Task
${task_description}

## Files
${file_list}

## Context
- Project: ${project_context}
- Completed tasks: ${completed_tasks_summary}

## Protocol
1. Read ALL listed files first
2. State what you will change (1-2 sentences)
3. Implement EXACTLY what is specified
4. Run verification command
5. Self-review: Did I implement exactly what was asked?
6. Report: changes, verification result, concerns

## Iron Law
NO COMPLETION CLAIMS WITHOUT RUNNING THE VERIFICATION COMMAND.

## Anti-Rationalizations
- "Test is trivial, skip it" → Run it anyway
- "I'll also fix this nearby issue" → Out of scope
- "This approach is better" → Follow the spec, raise concerns`)
```

Store result as `{implementer_report}`.

### 3b. Dispatch Spec Reviewer

```typescript
Task(
  subagent_type="team-shinchan:actionkamen",
  model="opus",
  prompt=`You are a SPEC COMPLIANCE REVIEWER for a micro-task.

## Prompt Template
// See: ${CLAUDE_PLUGIN_ROOT}/agents/_shared/micro-task-prompts/spec-reviewer-prompt.md

## The Original Spec
${task_description}

## Expected File Changes
${file_list}

## Rubric Override (optional)
${rubric_override || '(none — use default 3-item rubric from actionkamen.md)'}

## Implementer Report
${implementer_report}

## YOUR MISSION
DO NOT TRUST THE REPORT. The implementer may have:
- Finished suspiciously quickly
- Reported success without testing
- Misunderstood the spec
- Added or missed functionality

You MUST independently verify by READING THE ACTUAL CODE.

## Checklist
1. Completeness: Every spec requirement implemented?
2. Correctness: Matches spec exactly (not "close enough")?
3. Scope: No EXTRA functionality beyond spec?
4. Verification: Was the command actually run? Output matches?

## Output
- Verdict: PASS or FAIL
- Completeness: N/total requirements met
- Issues (if FAIL): what's wrong, spec says X, code does Y, file:line`)
```

**If FAIL**: Escalate model tier for retry using `escalateModel`:

```javascript
const { escalateModel } = require('./src/collaboration-score.js');
// escalateModel: haiku → sonnet, sonnet → opus, opus → opus (cap)
task.model = escalateModel(task.model);
// Announce: "Task {N} FAIL — escalating model tier to {task.model}"
```

Re-dispatch implementer at the escalateModel-returned tier with spec reviewer's issues → re-run spec review. Max 1 escalation per task (R-1 cost cap).

### 3c. Dispatch Code Quality Reviewer

**Only after spec compliance PASS.**

```typescript
Task(
  subagent_type="team-shinchan:actionkamen",
  model="opus",
  prompt=`You are a CODE QUALITY REVIEWER. Spec compliance already PASSED.

## Prompt Template
// See: ${CLAUDE_PLUGIN_ROOT}/agents/_shared/micro-task-prompts/code-quality-reviewer-prompt.md

## Task Context
${task_description}

## Changed Files
${changed_files}

## Rubric Override (optional)
${rubric_override || '(none — use default 3-item rubric from actionkamen.md)'}

## Focus (NOT checking if right thing was built — only if built WELL)
1. Code Quality: naming, DRY, focused functions, error handling
2. Pattern Compliance: follows project conventions?
3. Security: injection, validation, secrets?
4. Testability: covers behavior, not flaky, readable?
5. Maintainability: understandable by new developer?

## Severity
- CRITICAL: Must fix (security, data loss, correctness)
- IMPORTANT: Should fix (quality, tests)
- MINOR: Nice to have (style)

## Output
- Verdict: APPROVED or NEEDS_FIXES
- Strengths: [at least one]
- Issues: [severity] description — file:line
- Assessment: Ready to merge? Yes / Yes with fixes / No`)
```

**If NEEDS_FIXES with CRITICAL issues**: Re-dispatch implementer → re-run quality review. Max 1 retry.

### 3d. Mark Task Complete

After both reviews pass:
1. Update PROGRESS.md (if in workflow) with task status
2. Log completion
3. Output to user:

```
━━━━━━━━━━━━━━━━━━━━
✅ Task {N}/{total}: {title}
  Spec: PASS | Quality: APPROVED
  Files: {changed_files}
━━━━━━━━━━━━━━━━━━━━
```

4. Move to next task

## Step 4: Final Review

After ALL micro-tasks complete:

```typescript
Task(
  subagent_type="team-shinchan:actionkamen",
  model="opus",
  prompt=`FINAL REVIEW of entire implementation.

All ${total_tasks} micro-tasks passed individual reviews.
Now verify the WHOLE implementation works together.

## Check
1. All tests pass (run full test suite)
2. No integration issues between tasks
3. No duplicate code across tasks
4. Overall architecture is coherent

## Changed Files (all tasks combined)
${all_changed_files}

## Output
- Overall Verdict: APPROVED / NEEDS_FIXES
- Integration Issues: [any cross-task problems]
- Test Results: [full suite output]`)
```

## Step 5: Complete

Output final summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Micro-Execute Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 {total_tasks} tasks | {total_reviews} reviews
✅ All spec compliance checks passed
✅ All code quality checks passed
✅ Final integration review passed

📝 Files changed:
{file_summary}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Agent Routing Table

| Domain | Agent | Model |
|--------|-------|-------|
| General code | Bo | collaboration-score model_tier |
| Frontend/UI/CSS | Aichan | collaboration-score model_tier |
| Backend/API/DB | Bunta | collaboration-score model_tier |
| DevOps/CI/Docker | Masao | collaboration-score model_tier |
| All reviews | Action Kamen | opus (fixed) |
| Plan generation | Nene | opus (fixed) |

## Execution Rules

1. **Sequential tasks**: Implementation tasks run one at a time (no parallel). Review subagents for each task also run sequentially.
2. **Fresh subagent per task**: Each task gets a new subagent. No context pollution.
3. **Controller provides full context**: The controller reads the plan once and provides full task text to each subagent. Subagents never read the plan file.
4. **Two-stage review**: Spec compliance BEFORE code quality. Never skip.
5. **Retry limits**: Max 2 retries for spec compliance, max 1 retry for code quality. If still failing, report to user and pause.
6. **Evidence required**: No "should work" or "looks correct". Every claim needs a verification command output.
