---
name: team-shinchan:start
description: Use when you want to start a new task with the integrated workflow.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Step 0: Expire, Archive, or Pause Active Workflows

Read `workflow_expiry_days` from:
1. `.shinchan-config.yaml` in the current project root (key: `workflow_expiry_days`) — takes priority
2. Otherwise use the plugin default: **7** (from `plugin.json` settings)
3. If `workflow_expiry_days` is `0` or cannot be read → skip expiry, use existing pause logic

For each `.shinchan-docs/*/WORKFLOW_STATE.yaml` where `status: active`:

**Expiry check** (skip if `workflow_expiry_days == 0`):

1. Read the `updated` timestamp from WORKFLOW_STATE.yaml
2. Parse the timestamp (ISO 8601). If parsing fails → skip expiry for this entry, fall through to pause
3. Calculate elapsed days: `(now - updated) / 86400000`
4. If `elapsed >= workflow_expiry_days`:
   a. Set `status: expired` in WORKFLOW_STATE.yaml
   b. Add event to history:
      ```yaml
      - timestamp: "{ISO now}"
        event: auto_expired
        agent: shinnosuke
        archived_at: "{ISO now}"
        archived_reason: auto_expiry
      ```
   c. Calculate archive path: `.shinchan-docs/archived/{YYYY-MM}/` where YYYY-MM
      comes from the current date
   d. Attempt: `mkdir -p .shinchan-docs/archived/{YYYY-MM}/ && mv .shinchan-docs/{DOC_ID}/ .shinchan-docs/archived/{YYYY-MM}/{DOC_ID}/`
   e. If `mv` fails: silently continue (status stays `expired`, folder stays in place)
   f. Do NOT output any paused/expired notification to the user
   g. Continue to next workflow (do not pause this one)

**Pause logic** (existing behavior — only reached if workflow is NOT expired):

If not expired (or expiry disabled): set `status: paused`, add paused event to history,
notify user. If none found, proceed silently.

## Step 1: Setup (Folder + State)

1. **DOC_ID**: If args contains ISSUE-xxx use it; else `{branch}-{next_index}` from git branch + ls. Truncate + warn if args > 2000 chars.
2. `mkdir -p .shinchan-docs/{DOC_ID}`
3. Create WORKFLOW_STATE.yaml:

```yaml
version: 1
doc_id: "{DOC_ID}"
created: "{timestamp}"
updated: "{timestamp}"
current:
  stage: requirements
  phase: null
  owner: misae
  status: active
  interview: { step: 0, collected_count: 0, last_question: null }
history:
  - timestamp: "{timestamp}"
    event: workflow_started
    agent: shinnosuke
```

> Stage rules and transition gates are defined in CLAUDE.md and hooks/workflow-guard.md.

## Step 2: Greeting + Agent Invocation

Output greeting (adapt to user's language):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Hey! Let's build something great~ 💪
📁 Project: {DOC_ID} | 🎯 Stage: Requirements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2A-pre: Visual Input Detection

**If args contain image/PDF paths (.png, .jpg, .jpeg, .gif, .svg, .pdf, .webp) or reference visual content:**

```typescript
Task(subagent_type="team-shinchan:ume", model="sonnet",
  prompt="Analyze visual content for requirements.\nDOC_ID: {DOC_ID}\nExtract: UI components, layout, design patterns, user flows, ambiguities.\nUser request: {args}")
```

Store result as `{vision_context}`. Skip if no visual input.

### Step 2A: Requirements - Invoke Misae DIRECTLY

**CRITICAL: Do NOT invoke Shinnosuke for Stage 1. Invoke Misae directly (1-level instead of 2-level).**

```typescript
Task(subagent_type="team-shinchan:misae", model="sonnet",
  prompt="Starting Stage 1: Requirements via /team-shinchan:start.
  DOC_ID: {DOC_ID} | WORKFLOW_STATE: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml
  Visual Analysis: {vision_context or 'None'}
  Mission: Interview user, collect requirements, analyze hidden risks, create REQUESTS.md (Problem, FR/NFR, Scope, Hidden Requirements, Risks, AC), get approval.
  If visual analysis provided, use as starting point and validate with user.
  On approval: set current.stage to 'planning', return summary.
  User request: {args}")
```

### Step 2A-post: Requirements Complete

Misae has already performed hidden requirements analysis as part of Stage 1. No separate analysis needed.
If Misae's REQUESTS.md is approved, proceed directly to Step 2B.

### Step 2B: Stage Transition Narration

**Shinnosuke 호출 전에 사용자에게 직접 알린다:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Stage 1 완료 ✅ 요구사항 확정됨
→ Stage 2: Planning 시작합니다. Nene가 Phase를 설계합니다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then invoke Shinnosuke:
```typescript
Task(subagent_type="team-shinchan:shinnosuke", model="opus",
  prompt="Continue from Stage 2 via /team-shinchan:start.
  DOC_ID: {DOC_ID} | REQUESTS.md: approved and complete.
  Stage 1 DONE. Start Stage 2 (Planning) via Nene, then Stage 3 (Execution), then Stage 4 (Completion).
  CRITICAL: After Stage 3, you MUST execute Stage 4 — write RETROSPECTIVE.md, IMPLEMENTATION.md, and run final Action Kamen review. See 'Stage 4: Completion' section in agents/shinnosuke.md.

  ## Micro-Task Execution (RULE 2.7)
  When invoking Nene for Stage 2 planning, request MICRO-TASK FORMAT for PROGRESS.md.
  Each phase should be broken into 2-3 minute tasks with exact file paths, complete code,
  and verification commands. See agents/nene.md 'Micro-Task Plan Format' section.

  In Stage 3, use the micro-execute pattern (RULE 2.7): for each micro-task,
  dispatch a fresh implementer subagent, then spec compliance review, then code quality review.
  See skills/micro-execute/SKILL.md for the full execution protocol.

  Nene's summary: {nene_result_summary}")
```

## Prohibited

- Only explaining without executing
- Skipping folder/YAML creation
- Invoking Shinnosuke for Stage 1 (must use Misae directly)
- Gathering requirements without invoking Misae
