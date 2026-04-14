---
description: Start a new task with the integrated workflow
---

# ⚠️ EXECUTE IMMEDIATELY - DO NOT JUST DESCRIBE

**When this command is invoked, immediately execute the following:**

## 0. Execute Immediately: Expire, Archive, or Pause Active Workflows

Read `workflow_expiry_days`:
- Check `.shinchan-config.yaml` in project root first (key: `workflow_expiry_days`)
- Fall back to plugin default **7** days
- If `workflow_expiry_days: 0` or cannot be read → skip expiry, use pause-only behavior

For each `.shinchan-docs/*/WORKFLOW_STATE.yaml` with `status: active`:

**If expiry_days > 0 AND elapsed days since `updated` >= expiry_days:**
```yaml
# In WORKFLOW_STATE.yaml:
# status: expired
# history append:
#   - timestamp: "{now}"
#     event: auto_expired
#     agent: shinnosuke
#     archived_at: "{now}"
#     archived_reason: auto_expiry
```
Then attempt to move: `mkdir -p .shinchan-docs/archived/{YYYY-MM}/ && mv .shinchan-docs/{DOC_ID}/ .shinchan-docs/archived/{YYYY-MM}/{DOC_ID}/`
- If mv fails: silent fallback (no notification, no abort)
- **No paused notification** for expired workflows

**If NOT expired (or expiry disabled):**
```bash
# Set status to "paused", add paused event
# Notify: "⏸️ Paused {doc_id} (was at Stage {stage}, Phase {phase})"
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
  owner: misae
  status: active
  interview: { step: 0, collected_count: 0, last_question: null }
  ak_gate:
    requirements:
      status: pending          # pending | in_review | approved | rejected | escalated
      retry_count: 0
      last_rejection_reasons: []
    planning:
      status: pending
      retry_count: 0
      last_rejection_reasons: []

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
👤 Owner: Misae
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 5. Execute Immediately: Parent-Orchestrated Interview

**CRITICAL: Sub-agents cannot reach the user via `AskUserQuestion`.** The main thread drives the interview; Misae designs each question. You MUST follow the full protocol in `skills/start/SKILL.md § 2A` — treat that section as the canonical spec and execute it step-by-step. The summary below is a reminder, NOT a replacement.

**5.1 Interview loop (turns 1-5, early-exit on `status: done`):**

```
answers = []
for turn in 1..5:
  result = Task(subagent_type="team-shinchan:misae", model="sonnet", prompt=
    "mode: DESIGN_NEXT_QUESTION
    DOC_ID: {DOC_ID} | WORKFLOW_STATE: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml
    turn: {turn}
    prior_answers: {answers}
    user_request: {args}
    Return the interview-question JSON block per agents/misae.md contract.")

  Parse the LAST ```interview-question ... ``` fenced block in result.

  GUARD — validate ALL before calling AskUserQuestion:
    (a) Fenced block exists and JSON parses.
    (b) status ∈ {"ask", "done"}.
    (c) If status == "ask":
        - question is a non-empty string (>= 5 chars)
        - options is an array with >= 2 entries
        - every option.label is non-empty (>= 2 chars, not whitespace, not just "A."/"B." alone)
        - header is a non-empty string

    On ANY failure: re-invoke Misae (same mode) with a corrective prompt
    citing the SPECIFIC reason (e.g., "options[1].label was empty"), up to
    2 retries. On 3rd failure, abort and print Misae's raw output verbatim
    — NEVER call AskUserQuestion with empty/blank options (the user sees a
    question with no choices and must guess).

  If status == "done": break
  If status == "ask" (guard passed):
    user_answer = AskUserQuestion(questions=[{
      question, header, options, multiSelect
    }])
    answers.push({turn, question, answer: user_answer})
```

**5.2 Finalize:** `Task(misae, mode: FINALIZE_DRAFT, answers)` → writes REQUESTS.md, runs mechanical check + AK review; returns `finalize-result` JSON.

**5.3 User approval (Phase E-2):** Main thread calls `AskUserQuestion` asking for approval. If user requests changes, call `Task(misae, mode: REVISE, user_feedback)` and loop. On approval, call `Task(misae, mode: TRANSITION)`.

See `agents/misae.md § "Parent-Orchestrated Interview Protocol"` for the complete JSON contract.

---

## ⛔ Prohibited

- ❌ Only describing the above steps
- ❌ Proceeding without creating WORKFLOW_STATE.yaml
- ❌ Calling `Task(misae)` and expecting the sub-agent to interview the user directly (sub-agent `AskUserQuestion` calls never reach the user — the options disappear)
- ❌ Batching multiple turns into a single Misae call

## Usage

```bash
/team-shinchan:start                    # Auto-generate ID
/team-shinchan:start ISSUE-123          # Use issue ID
/team-shinchan:start "Add user auth"    # Start with description
```
