---
name: team-shinchan:start
description: Use when you want to start a new task with the integrated workflow.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Step 0: Expire and Archive Stale Workflows

Read `workflow_expiry_days` from:
1. `.shinchan-config.yaml` in the current project root (key: `workflow_expiry_days`) — takes priority
2. Otherwise use the plugin default: **7** (from `plugin.json` settings)
3. If `workflow_expiry_days` is `0` or cannot be read → skip expiry entirely

For each `.shinchan-docs/*/WORKFLOW_STATE.yaml` where `status: active`:

**Expiry check** (skip if `workflow_expiry_days == 0`):

1. Read the `updated` timestamp from WORKFLOW_STATE.yaml
2. Parse the timestamp (ISO 8601). If parsing fails → skip this entry
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
   g. Continue to next workflow

**Non-expired active workflows are left as-is.** Multiple workflows can be `active` simultaneously.
The workflow guard (`workflow-guard.sh`) protects the most recently updated active workflow.
Use `/team-shinchan:resume` to switch the guard target to a different workflow.

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
  ak_gate:
    requirements:
      status: pending          # pending | in_review | approved | rejected | escalated
      retry_count: 0           # 0, 1, or 2 (max)
      last_rejection_reasons: []  # list of strings — most recent rejection points
    planning:
      status: pending
      retry_count: 0
      last_rejection_reasons: []
history:
  - timestamp: "{timestamp}"
    event: workflow_started
    agent: shinnosuke
```

History entry format for AK review (appended after each AK review):

```yaml
- timestamp: "{ISO timestamp}"
  event: ak_review
  agent: action_kamen
  stage: requirements          # or planning
  verdict: REJECTED            # or APPROVED
  retry_count: 0               # which attempt this was (0 = first, 1 = first retry, 2 = second retry)
  rejection_reasons:
    - "Problem Statement lacks quantified success metrics"
    - "FR coverage missing error-handling scenarios"
```

> **ak_gate schema notes**:
> - `status` values: `pending` (not yet reviewed) | `in_review` (AK review in progress) | `approved` (AK approved) | `rejected` (AK rejected, retries remaining) | `escalated` (max retries reached, waiting for user)
> - `retry_count` persists across session restarts (NFR-2: session-restart safe)
> - Existing workflows without `ak_gate` field continue to function (backwards-compatible)

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

### Step 2A: Requirements — Parent-Orchestrated Interview Loop

**CRITICAL: Sub-agents cannot call `AskUserQuestion` for the user.** The main thread (this skill) drives the interview; Misae designs each question. See `agents/misae.md` § "Parent-Orchestrated Interview Protocol".

**2A.0 — Read interview config (FR-6):**

```
# Read .shinchan-config.yaml if present (project root), else use defaults.
config = read_yaml(".shinchan-config.yaml") if file_exists else {}
skip_threshold = config.get("interview.skip_threshold", 0.85)
done_threshold = config.get("interview.done_threshold", 0.75)
hard_cap       = config.get("interview.hard_cap", 10)

# Sanity check (FR-6): if invalid, silently fall back to defaults
if not (0 < done_threshold < skip_threshold <= 1.0) or not (1 <= hard_cap <= 50):
  print("⚠️ [start] invalid interview thresholds in .shinchan-config.yaml — using defaults (0.85 / 0.75 / 10)")
  skip_threshold = 0.85
  done_threshold = 0.75
  hard_cap       = 10
```

**2A.1 — Interview loop (clarity-gated, hard_cap is the only ceiling):**

```
answers       = []
exit_reason   = null   # populated by Misae's status:done payload
for turn in 1..hard_cap:
  result = Task(subagent_type="team-shinchan:misae", model="sonnet", prompt=
    "mode: DESIGN_NEXT_QUESTION
    DOC_ID: {DOC_ID} | WORKFLOW_STATE: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml
    turn: {turn}
    prior_answers: {answers}
    user_request: {args}
    vision_context: {vision_context or 'None'}
    skip_threshold: {skip_threshold}
    done_threshold: {done_threshold}
    hard_cap: {hard_cap}
    Return the interview-question JSON block per agents/misae.md contract.")

  Parse the last ```interview-question ... ``` fenced block in result.

  # FR-1 / AC1: zero-turn fast path on first invocation
  if turn == 1 and parsed.status == "done" and parsed.reason in {"pre_interview_clear", "user_skip_override"}:
    exit_reason = parsed.reason
    break  # skip the loop entirely; jump to FINALIZE_DRAFT with answers == []

  GUARD (parsing / options integrity / FR-4 contract):
    Validate ALL of the following before calling AskUserQuestion:
    (a) An `interview-question` fenced JSON block exists and parses.
    (b) `status` is "ask" or "done".
    (c) If status == "ask":
        - `question` is a non-empty string (>= 5 chars).
        - `options` is an array with >= 2 entries (no upper bound).
        - Every option has a `label` that is a non-empty string
          (>= 2 chars, NOT whitespace-only, NOT just "A." / "B." prefix).
        - `header` is a non-empty string.
        - **(FR-4)** `targets_subscore` is one of {"goal_clarity", "constraint_clarity", "success_criteria"}.
        - **(FR-4)** `closes_unknown` is a non-empty string ≤ 80 chars.
    (d) If status == "done":
        - `reason` is one of {"pre_interview_clear", "clarity_threshold_met",
          "hard_cap_reached", "no_more_actionable_gaps", "user_skip_override"}.

    On ANY validation failure:
      Re-invoke Misae with mode=DESIGN_NEXT_QUESTION, appending to the prompt:
      "CRITICAL: Your previous response failed validation: {specific reason,
       e.g. 'targets_subscore missing or not in {goal_clarity|constraint_clarity|success_criteria}',
       'closes_unknown empty or > 80 chars', 'options[1].label was empty',
       'no interview-question block found', 'question string too short'}.
       Re-read agents/misae.md § Parent-Orchestrated Interview Protocol.
       Emit EXACTLY ONE fenced block tagged `interview-question` containing:
       non-empty question (>=5 chars), non-empty header, 2 이상 options each
       with substantive label, AND (FR-4) `targets_subscore` in
       {goal_clarity|constraint_clarity|success_criteria} AND `closes_unknown`
       string ≤ 80 chars."
      Retry up to 2 times.
      On 3rd failure: abort the interview, print the raw Misae output
      verbatim to the user, and STOP.

  If status == "done":
    exit_reason = parsed.reason  # propagated to FINALIZE_DRAFT
    break
  If status == "ask" (and guard passed):
    // OPTIONS OVERFLOW HANDLING:
    // AskUserQuestion tool allows max 4 options per call.
    // When Misae returns > 4 options, paginate:
    if options.length <= 4:
      user_answer = AskUserQuestion(questions=[{
        question, header, options, multiSelect
      }])
    else:
      // Split: first 3 options + "더 많은 선택지 보기"
      page1 = options.slice(0, 3)
      page1.push({label: "더 많은 선택지 보기", description: "추가 옵션을 확인합니다"})
      user_answer = AskUserQuestion(questions=[{
        question, header, options: page1, multiSelect: false
      }])
      if user_answer == "더 많은 선택지 보기":
        // Show remaining options (up to 4 per page, repeat if needed)
        remaining = options.slice(3)
        while remaining.length > 0:
          page = remaining.slice(0, 4)
          remaining = remaining.slice(4)
          if remaining.length > 0:
            page = page.slice(0, 3)
            page.push({label: "더 많은 선택지 보기", description: "추가 옵션을 확인합니다"})
            remaining = options.slice(3 + (pageNum * 3))  // adjust offset
          user_answer = AskUserQuestion(questions=[{
            question, header, options: page, multiSelect: false
          }])
          if user_answer != "더 많은 선택지 보기": break
    answers.push({turn, question, answer: user_answer})
```

**2A.2 — Finalize draft (Misae writes REQUESTS.md + runs AK review):**

```typescript
Task(subagent_type="team-shinchan:misae", model="sonnet",
  prompt=`mode: FINALIZE_DRAFT
  DOC_ID: ${DOC_ID} | WORKFLOW_STATE: .shinchan-docs/${DOC_ID}/WORKFLOW_STATE.yaml
  answers: ${JSON.stringify(answers)}
  user_request: ${args}
  vision_context: ${vision_context or 'None'}
  exit_reason: ${exit_reason || 'clarity_threshold_met'}
  Per agents/misae.md: write REQUESTS.md (include ## Open Questions if exit_reason in {hard_cap_reached, no_more_actionable_gaps}), run mechanical check, run AK review loop (max 2 retries). Return finalize-result JSON block.`)
```

Parse the `finalize-result` JSON block.
- If `ak_verdict == "APPROVED"` → continue to 2A.3.
- If `ak_verdict == "ESCALATED"` → show rejection_reasons to user and stop (user decides next step per Misae Phase E-4).

**2A.3 — Phase E-2 user approval (parent drives AskUserQuestion):**

```
user_decision = AskUserQuestion(questions=[{
  question: "REQUESTS.md을 승인하시겠어요?",
  header: "최종 승인",
  options: [
    {label: "A. 승인 — Stage 2 (Planning)로 진행", description: "현재 REQUESTS.md 내용 그대로 확정"},
    {label: "B. 수정 필요 — 피드백 제공", description: "어떤 부분을 바꿔야 하는지 알려주세요"}
  ],
  multiSelect: false
}])

If user picked B:
  feedback = AskUserQuestion free-form or prompt user to describe changes
  Task(misae, mode: REVISE, user_feedback: feedback)  // loops back through AK
  Repeat 2A.3.

If user picked A (or equivalent):
  Task(subagent_type="team-shinchan:misae", model="sonnet",
    prompt=`mode: TRANSITION
    DOC_ID: ${DOC_ID}
    User approved REQUESTS.md. Transition WORKFLOW_STATE to planning.`)
```

### Step 2A-post: Requirements Complete

Misae has performed hidden requirements analysis as part of FINALIZE_DRAFT. Once TRANSITION returns, proceed to Step 2B.

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
