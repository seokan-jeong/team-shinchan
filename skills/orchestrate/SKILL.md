---
name: team-shinchan:orchestrate
description: Explicitly invoke Shinnosuke to orchestrate through the integrated workflow. Creates documentation folder and guides through requirements → planning → execution → completion stages.
user-invocable: true
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, you MUST execute the tasks below immediately. Do not explain, just execute.**

## Step 1: Validate Input

```
If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Determine Document ID (Immediately)

```
IF args contains ISSUE-xxx format:
  DOC_ID = args (e.g., ISSUE-123)
ELSE:
  Check current branch: git branch --show-current
  Check existing folders: ls shinchan-docs/
  DOC_ID = {branch}-{next_index} (e.g., main-004)
```

## Step 3: Create Folder (Immediately - Use Bash)

```bash
mkdir -p shinchan-docs/{DOC_ID}
```

## Step 4: Create WORKFLOW_STATE.yaml (Immediately - Use Write)

File path: `shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml`

```yaml
version: 1
doc_id: "{DOC_ID}"
created: "{current timestamp}"
updated: "{current timestamp}"

current:
  stage: requirements
  phase: null
  owner: shinnosuke
  status: active

stage_rules:
  requirements:
    allowed_tools: [Read, Glob, Grep, Task, AskUserQuestion]
    blocked_tools: [Edit, Write, TodoWrite, Bash]
    interpretation: "All user requests are interpreted as 'requirements'"
  planning:
    allowed_tools: [Read, Glob, Grep, Task, AskUserQuestion]
    blocked_tools: [Edit, Write, TodoWrite, Bash]
  execution:
    allowed_tools: [Read, Glob, Grep, Task, Edit, Write, TodoWrite, Bash, AskUserQuestion]
    blocked_tools: []
  completion:
    allowed_tools: [Read, Glob, Grep, Task, Write]
    blocked_tools: [Edit, TodoWrite, Bash, AskUserQuestion]

transition_gates:
  requirements_to_planning:
    requires:
      - REQUESTS.md exists
      - Problem Statement section
      - Requirements section
      - Acceptance Criteria section
      - User approval
  planning_to_execution:
    requires:
      - PROGRESS.md exists
      - Phase list defined
      - Each Phase has Acceptance Criteria
  execution_to_completion:
    requires:
      - All phases complete
      - All Action Kamen reviews passed
  completion_to_done:
    requires:
      - RETROSPECTIVE.md exists
      - IMPLEMENTATION.md exists
      - Final review passed

history:
  - timestamp: "{current timestamp}"
    event: workflow_started
    agent: shinnosuke
```

## Step 5: Output Progress (Immediately)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Team-Shinchan Orchestration Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Document ID: {DOC_ID}
📂 Folder: shinchan-docs/{DOC_ID}/
📄 WORKFLOW_STATE.yaml ✅ Created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Stage 1: Requirements
👤 Orchestrator: Shinnosuke
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 6: Invoke Shinnosuke (Immediately - Use Task)

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`Starting Orchestration Mode with integrated workflow.

## Context
- DOC_ID: {DOC_ID}
- User Request: {args}
- WORKFLOW_STATE.yaml Location: shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml

## Your Mission
You are Shinnosuke, the Orchestrator. Guide this task through the full integrated workflow:

### Stage 1: Requirements
1. Analyze the user request
2. If unclear, delegate to Nene for interview OR Misae for hidden requirements analysis
3. If design decision needed, trigger Debate via Midori
4. Create REQUESTS.md with:
   - Problem Statement
   - Requirements
   - Acceptance Criteria
5. Get user approval before proceeding

### Stage 2: Planning
1. Delegate to Nene: Break into phases with acceptance criteria
2. Delegate to Shiro: Impact analysis across codebase
3. Create PROGRESS.md with phase plan
4. Update WORKFLOW_STATE.yaml (stage: planning → execution)

### Stage 3: Execution (Per Phase)
For each phase:
1. Delegate to Shiro: Impact analysis for this phase
2. If design decision needed: Trigger Debate
3. Delegate implementation:
   - Frontend → Aichan
   - Backend → Bunta
   - DevOps → Masao
   - General → Bo
4. Delegate to Action Kamen: Review (MANDATORY)
5. Update PROGRESS.md with phase retrospective

### Stage 4: Completion (Auto-proceed)
1. Delegate to Masumi: Write RETROSPECTIVE.md
2. Delegate to Masumi: Write IMPLEMENTATION.md
3. Delegate to Action Kamen: Final verification
4. Report completion

## Important Rules
- NEVER do substantive work yourself - always delegate to specialists
- Follow stage rules in WORKFLOW_STATE.yaml
- Cannot proceed to next stage without meeting transition gates
- Action Kamen review is MANDATORY for every phase
- Document everything in shinchan-docs/{DOC_ID}/

## Debate Integration
Automatically trigger debate when:
- 2+ implementation approaches possible
- Architecture changes required
- Breaking existing patterns
- Security-sensitive decisions
- Technology stack selection

User request: {args}`
)
```

---

# ⛔ Prohibited Actions

1. ❌ Only explaining the steps without executing them
2. ❌ Skipping Steps 3-4
3. ❌ Proceeding without WORKFLOW_STATE.yaml
4. ❌ Orchestrating directly without invoking Shinnosuke

# ✅ Checklist

After execution, all of the following must be completed:
- [ ] `shinchan-docs/{DOC_ID}/` folder created
- [ ] `shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml` file exists
- [ ] Shinnosuke agent invoked via Task
- [ ] Orchestration mode active
