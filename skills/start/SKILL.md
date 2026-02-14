---
name: team-shinchan:start
description: Start a new task with the integrated workflow. Creates documentation folder and begins requirements gathering.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Step 0: Pause Active Workflows

```
Before creating a new workflow, check for active ones:
1. Scan .shinchan-docs/*/WORKFLOW_STATE.yaml
2. For each with status: active:
   - Set status to "paused"
   - Add paused event to history
   - Notify: "Paused {doc_id} (was at Stage {stage}, Phase {phase})"
3. If none found, proceed silently.
```

## Step 1: Setup (Folder + State)

```
1. Determine DOC_ID:
   - If args contains ISSUE-xxx -> DOC_ID = args
   - Else -> git branch + ls .shinchan-docs/ -> {branch}-{next_index}
   - If args > 2000 chars -> truncate + warn

2. Create folder: mkdir -p .shinchan-docs/{DOC_ID}

3. Create WORKFLOW_STATE.yaml (Write tool):
```

```yaml
version: 1
doc_id: "{DOC_ID}"
created: "{timestamp}"
updated: "{timestamp}"

current:
  stage: requirements
  phase: null
  owner: shinnosuke
  status: active

history:
  - timestamp: "{timestamp}"
    event: workflow_started
    agent: shinnosuke
```

> Stage rules and transition gates are defined in CLAUDE.md and hooks/workflow-guard.md. Do not duplicate here.

## Step 2: Friendly Greeting + Invoke Shinnosuke

**Output a warm, friendly greeting (adapt to user's language):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Hey! Let's build something great~ 💪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Project: {DOC_ID}
🎯 Stage: Requirements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then immediately invoke Shinnosuke:

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt="Starting Orchestration via /team-shinchan:start.

## Context
- DOC_ID: {DOC_ID}
- User Request: {args}
- WORKFLOW_STATE.yaml Location: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml

## Your Mission
Guide this task through the full integrated workflow:

### Stage 1: Requirements
1. Analyze the user request
2. Delegate to Nene for requirements interview
3. If design decision needed, trigger Debate via Midori
4. Create REQUESTS.md
5. Get user approval before proceeding

### Stage 2-4: Follow standard workflow
See agents/shinnosuke.md for full stage details.

User request: {args}"
)
```

---

# Prohibited

- Only explaining steps without executing
- Skipping folder/YAML creation
- Gathering requirements directly without invoking Shinnosuke
