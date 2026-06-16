---
name: team-shinchan:start
description: Use when you want to start a new task with the integrated workflow.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Injected Context (bigproject phase mode)

This skill is normally invoked standalone. It can also be **driven by the `bigproject`
phase loop** (`skills/bigproject/SKILL.md` Step 5), which executes these same steps on the
main thread with the following inputs **already resolved**:

- `DOC_ID` — pre-set to `{PROJECT_ID}-phase-{N}`. **Use it verbatim; do NOT generate one.**
- `parent_doc_id` — the owning `{PROJECT_ID}`.
- `phase_number` — the 1-based phase index.
- `PHASE_CONTEXT` — project title + this phase's title/domain/acceptance criteria +
  summaries of completed phases.

**When invoked with injected context:**
- **Skip Step 0 entirely** (expiry/archive is the project's concern, run once by bigproject).
- In Step 1, use the injected `DOC_ID` and write `parent_doc_id` / `phase_number` into the
  state (see Step 1).
- In Step 2A, pass `PHASE_CONTEXT` to Misae so the interview is scoped to this phase.

When invoked standalone (no injected context), behave exactly as before.

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

1. **DOC_ID**: If a `DOC_ID` was **injected** (bigproject phase mode), use it verbatim and skip generation. Otherwise: if args contains ISSUE-xxx use it; else `{branch}-{next_index}` from git branch + ls. When computing `{next_index}`, **ignore directories matching `*-phase-*`** — those belong to a bigproject and are not standalone workflows. Truncate + warn if args > 2000 chars.
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
  execution_mode: micro-execute   # /start default — pins Stage 3 to the per-task (spec→quality→skeptic) review chain. Set to `dag` ONLY when explicitly opting into parallel dag-executor dispatch.
  # parent_doc_id / phase_number: ONLY when injected by bigproject phase mode; omit standalone.
  # parent_doc_id: "{parent_doc_id}"
  # phase_number: {phase_number}
  interview: { step: 0, collected_count: 0, last_question: null }
  ak_gate:
    requirements:
      status: pending          # pending | in_review | approved | rejected | escalated
      retry_count: 0           # 0, 1, or 2 (max)
      last_rejection_reasons: []  # list of strings — most recent rejection points
    design:
      status: pending
      retry_count: 0
      last_rejection_reasons: []
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
skip_threshold    = config.get("interview.skip_threshold",    0.85)
done_threshold    = config.get("interview.done_threshold",    0.75)
hard_cap          = config.get("interview.hard_cap",          10)
gate_loop_enabled = config.get("interview.gate_loop_enabled", True)        # NEW
gate_threshold    = config.get("interview.gate_threshold",    0.8)         # NEW
stagnation_delta  = config.get("interview.stagnation_delta",  0.05)        # NEW
stagnation_window = config.get("interview.stagnation_window", 2)           # NEW
soft_cap          = config.get("interview.soft_cap",          6)           # NEW
ak_double_check   = config.get("interview.ak_double_check",   False)       # NEW
project_type      = config.get("interview.project_type",      "greenfield")# NEW

# Sanity check (FR-6, HR-2, HR-3): invalid values → fall back to defaults + warn
warnings = []
if not (0 < done_threshold < skip_threshold <= 1.0) or not (1 <= hard_cap <= 50):
  warnings.append("skip/done/hard_cap out of range"); skip_threshold = 0.85; done_threshold = 0.75; hard_cap = 10
if gate_threshold <= done_threshold:
  warnings.append("gate_threshold must be > done_threshold"); gate_threshold = 0.8
if soft_cap >= hard_cap:
  warnings.append("soft_cap must be < hard_cap"); soft_cap = 6
if stagnation_window < 2:
  warnings.append("stagnation_window must be >= 2 (HR-3 DoS protection)"); stagnation_window = 2
if stagnation_delta <= 0:
  warnings.append("stagnation_delta must be > 0"); stagnation_delta = 0.05
if project_type not in ("brownfield", "greenfield"):
  warnings.append("project_type must be brownfield|greenfield"); project_type = "greenfield"
if warnings:
  print("⚠️ [start] .shinchan-config.yaml validation errors — using defaults: " + "; ".join(warnings))

# Write resolved gate_loop_enabled + gate_threshold into WORKFLOW_STATE.current so
# mechanical-check Check D can enforce the gate without reading .shinchan-config.yaml.
write_to_state({"current.gate_loop_enabled": gate_loop_enabled, "current.gate_threshold": gate_threshold})
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
    phase_context: {PHASE_CONTEXT or 'None'}   # bigproject phase mode: scope questions to this phase
    skip_threshold: {skip_threshold}
    done_threshold: {done_threshold}
    hard_cap: {hard_cap}
    gate_loop_enabled: {gate_loop_enabled}
    gate_threshold: {gate_threshold}
    stagnation_delta: {stagnation_delta}
    stagnation_window: {stagnation_window}
    soft_cap: {soft_cap}
    ak_double_check: {ak_double_check}
    project_type: {project_type}
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
          "user_skip_override",
          "stagnation_escalate", "soft_cap_escalate",
          "no_more_actionable_gaps_escalate", "hard_cap_escalate",   # gate_loop_enabled: true
          "hard_cap_reached", "no_more_actionable_gaps"}.            # legacy (gate_loop_enabled: false)

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

**2A.1b — ESCALATE 3-way prompt (FR-3, `gate_loop_enabled: true`):**

When the loop exits with an ESCALATE reason, do NOT silently proceed and do NOT loop
forever — hand the user a 3-way choice. (`clarity_threshold_met` / `pre_interview_clear`
/ `user_skip_override` skip this block and go straight to 2A.2.)

```
ESCALATE_REASONS = {"stagnation_escalate", "soft_cap_escalate",
                    "no_more_actionable_gaps_escalate", "hard_cap_escalate"}

while gate_loop_enabled and exit_reason in ESCALATE_REASONS:
  current_score = parsed.clarity_score.get("weighted_overall") or parsed.clarity_score.get("overall", "?")
  unresolved    = parsed.get("remaining_unknowns") or []
  choice = AskUserQuestion(questions=[{
    "question": "인터뷰가 [{exit_reason}]로 종료 기준({gate_threshold})을 충족하지 못했습니다.\n"
                "현재 weighted_overall: {current_score} (목표 {gate_threshold})\n미해결: {unresolved}",
    "header": "인터뷰 에스컬레이션",
    "options": [
      {"label": "A. 인터뷰 계속 진행", "description": "추가 질문으로 명확도를 더 끌어올립니다 (hard_cap까지)"},
      {"label": "B. Open Questions로 기록 후 진행", "description": "미해결 항목을 REQUESTS.md에 남기고 다음 스테이지로"},
      {"label": "C. 인터뷰 처음부터 다시", "description": "이전 답변을 초기화하고 재시작"}
    ],
    "multiSelect": false
  }])
  # HR-1 audit: persist choice + score
  write_to_state({"current.interview.escalation_choice": choice})
  append_history({"event": "escalation_prompt", "agent": "shinnosuke",
                  "exit_reason": exit_reason, "weighted_overall": current_score, "escalation_choice": choice})

  if choice == "A":      # continue — re-enter the interview loop up to hard_cap (NFR-3)
    exit_reason = null
    resume the 2A.1 loop from turn+1 (do NOT reset answers); re-evaluate on next done
  elif choice == "C":    # restart
    answers = []; exit_reason = null; turn = 0; restart the 2A.1 loop
  else:                  # B — fall through to 2A.2 with exit_reason intact (Open Questions written)
    break
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
  gate_loop_enabled: ${gate_loop_enabled} | ak_double_check: ${ak_double_check}
  Per agents/misae.md: run the materiality audit (step 0, only when exit_reason == clarity_threshold_met and gate_loop_enabled), write REQUESTS.md (include ## Open Questions if exit_reason in the ESCALATE/legacy-gap set), run mechanical check, run AK review loop (max 2 retries). Return finalize-result JSON block.`)
```

Parse the `finalize-result` JSON block.
- If `next == "materiality_reject"` (gate-loop materiality audit failed) → re-enter the
  2A.1 interview loop from turn+1 with `failed_item` re-added to `unresolved_unknowns`
  (do NOT reset prior answers), then re-run 2A.2. This keeps the gate honest: a PASS score
  is necessary but not sufficient — material ambiguity sends it back.
- If `next == "closure_reject"` (WS-03 4a — Misae withheld analyst-acceptance with a new
  actionable gap, main-075 benchmark adoption) → treat exactly like `materiality_reject`:
  re-enter the 2A.1 loop from turn+1 with `failed_item` re-added to `unresolved_unknowns`
  (do NOT reset answers), then re-run 2A.2. The 2-loop cap in Misae's WS-03 guarantees this
  cannot loop forever — after 2 closure loops Misae proceeds and logs the residual gap to
  `## Open Questions` instead of rejecting.
- If `restated_goal` is present on the result (WS-03 4b — OPTIONAL additive field) → carry it
  into the Phase E-2 approval prompt below so the user confirms the one-sentence goal.
- If `ak_verdict == "APPROVED"` → continue to 2A.3.
- If `ak_verdict == "ESCALATED"` → show rejection_reasons to user and stop (user decides next step per Misae Phase E-4).

**2A.3 — Phase E-2 user approval (parent drives AskUserQuestion):**

```
# WS-03 4b: if finalize-result carried restated_goal, prepend it so the user confirms the
# one-sentence goal alongside approval (main-075 benchmark adoption). Optional — omit if absent.
restate_line = ("목표 확인: " + restated_goal + "\n\n") if restated_goal else ""
user_decision = AskUserQuestion(questions=[{
  question: restate_line + "REQUESTS.md을 승인하시겠어요?",
  header: "최종 승인",
  options: [
    {label: "A. 승인 — Stage 1.5 (Design)로 진행", description: "요구사항 확정 → Hiroshi와 설계를 진행합니다"},
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
    User approved REQUESTS.md. Apply your TRANSITION mode.`)
```

> **Single source of truth for the destination stage = the agent's `Mode: TRANSITION` block.**
> Do NOT name a destination stage in this prompt and do NOT write `current.stage` from the skill —
> Misae's TRANSITION already targets the **design** stage. (Naming "planning" here was the
> v4.45.0 bug that skipped Stage 1.5.) The next step is the design stage (Step 2B); design is only
> skipped via the explicit Step 2B skip conditions, evaluated in Step 2B.

### Step 2A-post: Requirements Complete

Misae has performed hidden requirements analysis as part of FINALIZE_DRAFT. Misae's TRANSITION
moves the workflow to `stage: design` (owner: hiroshi). Once TRANSITION returns, proceed to
**Step 2B (Design Stage)**.

### Step 2B: Design Stage — Parent-Orchestrated Design Interview

**CRITICAL: Sub-agents cannot call `AskUserQuestion`.** Exactly like the requirements interview
(2A), the main thread drives the design interview; **Hiroshi** designs each decision. See
`agents/hiroshi.md` § "Design Stage Interview Protocol".

**Skip conditions — design is DEFAULT-ON; skip is the narrow exception.** Skip ONLY when one of
these is unambiguously true (when in doubt, do NOT skip — run the loop):
- `user_request`/args contains the literal token `skip-design`, OR
- the workflow entered via the **Quick Fix Path** (Shinnosuke classified it Lite: ≤3 files,
  no design decisions), OR
- REQUESTS.md has **zero** architecture/design choices: no competing approaches, no new
  component/interface/schema/data-flow/layout decision, and an explicit
  `Design decisions: none — {reason}` style waiver is warranted.

A multi-FR feature, anything with `## Open Questions` that are design-shaped (layouts, ranges,
contracts, new keys), or any "approach A vs B" is NOT skippable — run the design loop.

When (and only when) a skip condition holds: narrate "Design stage skipped ({which condition})"
and run `Task(subagent_type="team-shinchan:hiroshi", prompt="mode: TRANSITION\nDOC_ID: {DOC_ID}\nDesign skipped ({reason}). Apply your TRANSITION mode.")` to advance to the next stage — do
NOT write `current.stage` from the skill (the destination lives in hiroshi.md's TRANSITION). Then
go to Step 2C. Otherwise run the loop below.

**2B.0 — Read design interview config** (`.shinchan-config.yaml`, else defaults):
`design.soft_cap` (default 5), `design.hard_cap` (default 8).

**2B.1 — Design decision loop (design-completeness-gated, hard_cap is the ceiling):**

```
decisions    = []
exit_reason  = null
for turn in 1..design_hard_cap:
  result = Task(subagent_type="team-shinchan:hiroshi", model="opus", prompt=
    "mode: DESIGN_NEXT_DECISION
    DOC_ID: {DOC_ID} | WORKFLOW_STATE: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml
    REQUESTS.md: .shinchan-docs/{DOC_ID}/REQUESTS.md
    turn: {turn}
    prior_decisions: {decisions}
    user_request: {args}
    vision_context: {vision_context or 'None'}
    soft_cap: {design_soft_cap} | hard_cap: {design_hard_cap}
    Return the design-question JSON block per agents/hiroshi.md contract.")

  Parse the last ```design-question ... ``` fenced block in result.

  GUARD (mirror 2A.1): a `design-question` block must parse; `status` ∈ {ask, done};
    if status == "ask": `question` ≥ 5 chars, `header` non-empty, `options` ≥ 2 each with a
    substantive `label`, `decision_id` present, `closes_decision` ≤ 80 chars.
    On failure: re-invoke Hiroshi with the specific reason appended, max 2 retries; on 3rd
    failure print raw output and STOP.

  if status == "done":
    exit_reason = parsed.reason; break
  if status == "ask" (guard passed):
    // Same options-overflow pagination as 2A.1 (>4 options → "더 많은 선택지 보기").
    user_answer = AskUserQuestion(questions=[{question, header, options, multiSelect}])
    decisions.push({turn, decision: parsed.closes_decision, choice: user_answer})
```

**2B.1b — ESCALATE 3-way prompt** (when `exit_reason` ∈ {`soft_cap_escalate`, `hard_cap_escalate`}):
hand the user a choice exactly like 2A.1b — A. 설계 계속 (hard_cap까지), B. Open Questions로 기록 후
진행, C. 처음부터. (`design_complete` / `user_skip_override` skip this and go to 2B.2.)

**2B.2 — Finalize design (Hiroshi writes DESIGN.md + runs AK review):**

```typescript
Task(subagent_type="team-shinchan:hiroshi", model="opus",
  prompt=`mode: FINALIZE_DESIGN
  DOC_ID: ${DOC_ID} | REQUESTS.md: .shinchan-docs/${DOC_ID}/REQUESTS.md
  decisions: ${JSON.stringify(decisions)}
  exit_reason: ${exit_reason || 'design_complete'}
  Per agents/hiroshi.md: write DESIGN.md (## Open Questions only if escalated), run the
  design-stage AK review loop (max 2 retries). Return finalize-design-result JSON block.`)
```

Parse the `finalize-design-result` block.
- If `ak_verdict == "APPROVED"` → continue to 2B.3.
- If `ak_verdict == "ESCALATED"` → show rejection_reasons to user and stop.

**2B.3 — User approval of DESIGN.md (parent drives AskUserQuestion):**

```
user_decision = AskUserQuestion(questions=[{
  question: "DESIGN.md(설계)를 승인하시겠어요?",
  header: "설계 승인",
  options: [
    {label: "A. 승인 — Stage 2 (Planning)로 진행", description: "이 설계대로 Nene가 계획 수립"},
    {label: "B. 수정 필요 — 피드백 제공", description: "어떤 설계를 바꿔야 하는지 알려주세요"}
  ],
  multiSelect: false
}])

If B: Task(hiroshi, mode: REVISE, user_feedback: feedback) → repeat 2B.3.
If A: Task(subagent_type="team-shinchan:hiroshi", model="opus",
        prompt="mode: TRANSITION\nDOC_ID: {DOC_ID}\nUser approved DESIGN.md. Apply your TRANSITION mode.")
```

> Destination stage is defined by hiroshi.md's `Mode: TRANSITION` (→ planning) — do not restate
> it here or write `current.stage` from the skill.

Once TRANSITION returns, proceed to Step 2C.

### Step 2C: Stage Transition Narration

**Shinnosuke 호출 전에 사용자에게 직접 알린다:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Stage 1.5 완료 ✅ 설계 확정됨 (DESIGN.md)
→ Stage 2: Planning 시작합니다. Nene가 설계대로 Phase를 구성합니다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then invoke Shinnosuke:
```typescript
Task(subagent_type="team-shinchan:shinnosuke", model="opus",
  prompt="Continue from Stage 2 via /team-shinchan:start.
  DOC_ID: {DOC_ID} | REQUESTS.md: approved | DESIGN.md: approved (architecture settled in Stage 1.5).
  Stages 1 + 1.5 DONE. Start Stage 2 (Planning) via Nene, then Stage 3 (Execution), then Stage 4 (Completion).
  CRITICAL: After Stage 3, you MUST execute Stage 4 — write RETROSPECTIVE.md, IMPLEMENTATION.md, and run final Action Kamen review. See 'Stage 4: Completion' section in agents/shinnosuke.md.

  ## Micro-Task Execution (RULE 2.7) — MANDATORY, this is the /start default
  WORKFLOW_STATE.current.execution_mode is `micro-execute`. Stage 3 MUST run via the
  micro-execute path — do NOT fall back to the standard Phase Loop and do NOT use the
  dag-executor (that path skips the per-task review chain and is opt-in only).

  When invoking Nene for Stage 2 planning, request MICRO-TASK FORMAT for PROGRESS.md
  (agents/nene.md 'Micro-Task Plan Format' — NOT the DAG Plan Schema). Nene plans AGAINST the
  approved DESIGN.md (architecture is already decided — do NOT re-decide it). Each phase should be
  broken into 2-3 minute tasks with exact file paths, complete code, and verification commands.

  In Stage 3, use the micro-execute pattern (RULE 2.7): for EACH micro-task, dispatch a fresh
  implementer subagent → spec-compliance review → code-quality review → independent skeptic
  refutation. Never skip any of these four steps. See skills/micro-execute/SKILL.md for the
  full execution protocol.

  Nene's summary: {nene_result_summary}")
```

## Stage 3 (Executing): Dispatch Mode

The executing stage has two dispatch modes, selected by `current.execution_mode` in
WORKFLOW_STATE.yaml (set in Step 1):

- **`micro-execute` (DEFAULT for `/start`)** — each task runs through the full per-task review
  chain: implementer → spec-compliance review → code-quality review → independent skeptic
  refutation (`skills/micro-execute/SKILL.md`). This is the accuracy backbone; do NOT bypass it.
  Stage 2B already requests MICRO-TASK FORMAT from Nene so PROGRESS.md feeds this mode directly.
- **`dag` (OPT-IN ONLY)** — the DAG-driven dispatch below. Faster via parallelism, but its only
  per-task gate is the `verify` shell command exit code — it does NOT run the spec/quality/skeptic
  review chain. Use ONLY when the user explicitly opts in (sets `execution_mode: dag`) and accepts
  the weaker per-task verification. **Never the silent default.**

> ⚠️ Routing rule: if `execution_mode` is `micro-execute` or absent → use micro-execute (RULE 2.7).
> Only when `execution_mode: dag` is explicitly set do you follow the DAG protocol below.

### DAG-Driven Dispatch via dag-executor (`execution_mode: dag` only)

When opted in, the `executing` stage drives implementation as a topologically-ordered task DAG
using `src/dag-executor.js` instead of an ad-hoc sequential loop (FR-9). The
`requirements → planning → executing → done` stage machine is preserved; only the executing
stage's dispatch logic changes.

Protocol for the executing stage:

1. Parse the plan's task DAG (`src/dag-executor.js` `parsePlan()` reads the six-field schema —
   `id / depends_on / touches / verify / estimate / scope` — from PLAN.md or a structured object).
2. `topoSort()` orders tasks by `depends_on` and **throws on a circular dependency before any
   task is dispatched** (no partial execution).
3. `buildConflictGraph()` + `connectedComponents()` compute the static conflict graph from
   `touches[]`: tasks in the same component serialize; disjoint components dispatch in parallel
   up to `executor.concurrency_cap` (`.shinchan-config.yaml`, default 4) — mapped onto the
   Workflow `parallel()` primitive.
4. Each task runs through the per-task **verify gate**: its `verify` command must exit 0 to be
   marked `DONE`; an absent/NL-only `verify` is `FAILED` (never a silent `SKIP`), and downstream
   dependents become `BLOCKED`.
5. On task error the **recovery ladder** branches by error type (transient → retry ≤ 3;
   deterministic → local-patch; scope-drift → replan, bounded) with counters persisted to
   WORKFLOW_STATE (no infinite loops, survives restart).
6. After all per-task gates pass, the **post-merge integration test** (`plan_meta.integration_test`)
   runs; if absent it warns but does not block.
7. The **completion gate** (`evaluateCompletionGate()`) enforces strict ALL-PASS — zero
   `FAILED`/`SKIP`, all `DONE`, integration passing — and **blocks the executing → done stage
   transition** otherwise.

**Serial-fallback / escape hatch (high coupling)**: when the conflict graph collapses to a
single connected component (every task shares a resource), execution is fully serial and the
executor logs an NFR-5 warning (`serial_fallback: true` in `.shinchan-config.yaml`). This mirrors
the `gate_loop_enabled`-style escape so operators can inspect plan granularity rather than chase
phantom parallelism.

See `src/dag-executor.js` and `docs/dag-executor.md` for the module contract.

## Prohibited

- Only explaining without executing
- Skipping folder/YAML creation
- Invoking Shinnosuke for Stage 1 (must use Misae directly)
- Gathering requirements without invoking Misae
