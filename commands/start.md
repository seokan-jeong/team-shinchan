---
description: Start a new task with the integrated workflow
---

# ⚠️ EXECUTE IMMEDIATELY - DO NOT JUST DESCRIBE

**When this command is invoked, immediately execute the following:**

## 0. Execute Immediately: Pause Active Workflows

```bash
# Scan for active workflows
# For each .shinchan-docs/*/WORKFLOW_STATE.yaml with status: active:
#   - Set status to "paused", add paused event
#   - Notify: "⏸️ Paused {doc_id} (was at Stage {stage}, Phase {phase})"
```

## 1. Execute Immediately: Determine DOC_ID

```bash
# Check current branch
git branch --show-current

# Check existing folders
ls .shinchan-docs/ 2>/dev/null || echo "No folder exists"
```

DOC_ID Rules:
- If `ISSUE-xxx` exists in args → `ISSUE-xxx`
- Otherwise → `{branch}-{next_index}` (e.g., `main-004`)

## 2. Execute Immediately: Create Folder

```bash
mkdir -p .shinchan-docs/{DOC_ID}
```

## 3. Execute Immediately: Create WORKFLOW_STATE.yaml

Use Write tool to create `.shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml`:

```yaml
version: 1
doc_id: "{DOC_ID}"
created: "{ISO timestamp}"
updated: "{ISO timestamp}"

current:
  stage: requirements
  phase: null
  owner: nene
  status: active

stage_rules:
  requirements:
    allowed_tools: [Read, Glob, Grep, Task, AskUserQuestion]
    blocked_tools: [Edit, Write, TodoWrite, Bash]
    interpretation: "All user requests are interpreted as requirements"

history:
  - timestamp: "{ISO timestamp}"
    event: workflow_started
    agent: shinnosuke
```

## 4. Output Immediately: Start Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Team-Shinchan Workflow Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Document ID: {DOC_ID}
📂 Folder: .shinchan-docs/{DOC_ID}/
📄 WORKFLOW_STATE.yaml ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Stage 1: Requirements
👤 Owner: Nene
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 5. Execute Immediately: Invoke Nene

```typescript
Task(
  subagent_type="team-shinchan:nene",
  model="opus",
  prompt="Starting Stage 1 requirements gathering.

DOC_ID: {DOC_ID}
User request: {args}

Write REQUESTS.md and interview the user.
Record all '~do this' requests as requirements (not implementation).

First question: 'What problem do you want to solve?'"
)
```

---

## ⛔ Prohibited

- ❌ Only describing the above steps
- ❌ Proceeding without creating WORKFLOW_STATE.yaml
- ❌ Proceeding directly without invoking Nene

## Usage

```bash
/team-shinchan:start                    # Auto-generate ID
/team-shinchan:start ISSUE-123          # Use issue ID
/team-shinchan:start "Add user auth"    # Start with description
```
