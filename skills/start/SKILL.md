---
name: team-shinchan:start
description: Start a new task with the integrated workflow. Creates documentation folder and begins requirements gathering.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Step 0: Pause Active Workflows

Scan `.shinchan-docs/*/WORKFLOW_STATE.yaml`. For each with `status: active`, set to "paused", add paused event to history, notify user. If none found, proceed silently.

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
  owner: nene
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

### Step 2A: Requirements - Invoke Nene DIRECTLY

**CRITICAL: Do NOT invoke Shinnosuke for Stage 1. Invoke Nene directly (1-level instead of 2-level).**

```typescript
Task(subagent_type="team-shinchan:nene", model="opus",
  prompt="Starting Stage 1: Requirements via /team-shinchan:start.
  DOC_ID: {DOC_ID} | WORKFLOW_STATE: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml
  Visual Analysis: {vision_context or 'None'}
  Mission: Interview user, create REQUESTS.md (Problem, FR/NFR, Scope, AC), get approval.
  If visual analysis provided, use as starting point and validate with user.
  On approval: set current.stage to 'planning', return summary.
  User request: {args}")
```

### Step 2A-post: Hidden Requirements (Misae)

**After Nene returns REQUESTS.md draft, before user approval:**

```typescript
Task(subagent_type="team-shinchan:misae", model="sonnet",
  prompt="Analyze .shinchan-docs/{DOC_ID}/REQUESTS.md for hidden requirements.
  Check: STRIDE threats, edge cases, scalability, implicit deps, 80/20 simplification.
  Output: Hidden Requirements (max 5), Risks (with severity), Recommendations.
  If well-covered, say so briefly.
  Nene's summary: {nene_result_summary}")
```

If Misae finds gaps: show to user, ask "Add these to requirements?". If yes, update REQUESTS.md. If no, proceed.

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
  Stage 1 DONE. Start Stage 2 (Planning) via Nene, then Stages 3-4 per agents/shinnosuke.md.
  Nene's summary: {nene_result_summary}")
```

## Prohibited

- Only explaining without executing
- Skipping folder/YAML creation
- Invoking Shinnosuke for Stage 1 (must use Nene directly)
- Gathering requirements without invoking Nene
