---
name: team-shinchan:autopilot
description: Use when you want autonomous completion from requirements to verification without intervention.
user-invocable: true
---

# EXECUTE IMMEDIATELY

**Output immediately before executing:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Autopilot mode engaged~ 🤖
   (same workflow as /start — a proxy panel answers on your behalf)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## What autopilot IS (and is not)

Autopilot runs the **exact same workflow as `/team-shinchan:start`** — requirements
interview → design → planning → micro-execute execution → completion — with **one
substitution**: at every point where `/start` would call `AskUserQuestion` and wait
for the human, a **proxy-user panel answers instead** (`agents/_shared/proxy-user-panel.md`).
A K=3 diverse panel votes on the best option, a cautious judge breaks ties, and the
winning choice is used as if the user had picked it. Every quality gate `/start`
enforces — Misae's clarity gate, Hiroshi's design gate, the materiality/closure
re-entry loops, every Action Kamen review — runs **unchanged**.

**Autopilot's job is to DO THE WORK and stop when it is done and verified.** It does
**NOT** perform branch completion (merge / open PR / keep / discard) — that is out of
scope and is left to a human or another tool. Autopilot ends with a handoff report.

## Step 1: Validate Input

```
If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Setup (Folder + State) — with answer_mode: proxy

1. **DOC_ID**: if args contains ISSUE-xxx use it; else `{branch}-{next_index}` from git
   branch + ls (ignore `*-phase-*` dirs, same as `/start`).
2. `mkdir -p .shinchan-docs/{DOC_ID}`
3. Create WORKFLOW_STATE.yaml **using the `/start` Step 1 template verbatim, with one
   override: `answer_mode: proxy`** (this is what routes every seam through the panel):

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
  answer_mode: proxy              # AUTOPILOT override — proxy panel answers every AskUserQuestion
  execution_mode: micro-execute   # per-task spec→quality→skeptic review chain (same as /start)
  interview: { step: 0, collected_count: 0, last_question: null }
  ak_gate:
    requirements:
      status: pending
      retry_count: 0
      last_rejection_reasons: []
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
    answer_mode: proxy
```

4. **Linear Sync — START (In Progress).** Run the **START → In Progress** transition
   per `agents/_shared/linear-sync.md`: detect a Linear issue in `args`/DOC_ID/branch,
   confirm it with `get_issue`, and if real move it to In Progress and persist it to
   `current.linear_issue` in WORKFLOW_STATE.yaml. No-op if no Linear issue / Linear
   MCP unavailable. (The FINISH → In Review transition fires later in `shinnosuke.md`
   Stage 4 Step 5 — autopilot reaches Stage 4 completion before stopping.)

## Step 3: Run the `/start` flow (Stages 1 + 1.5) in proxy mode

Execute **`skills/start/SKILL.md`** exactly, with these bindings:

- **Skip `/start` Step 1** (state already created above). Run everything else:
  Step 0 (expiry/archive), Step 2A-pre (Ume visual input detection), Step 2A
  (requirements interview loop + approval), Step 2B (design interview loop + approval),
  Step 2C (transition narration).
- Because `current.answer_mode == proxy`, `/start`'s **"Answer Mode" ROUTING RULE**
  applies automatically: every `AskUserQuestion` (2A.1 interview questions, 2A.3
  REQUESTS approval, 2B.1 design decisions, 2B.3 DESIGN approval) resolves via the
  proxy-user panel, and the 3-way ESCALATE prompts (2A.1b / 2B.1b) auto-select
  **B (Open Questions로 기록 후 진행)**. No `AskUserQuestion` is ever shown to the user.
- Design is DEFAULT-ON exactly as in `/start` — it is skipped only via `/start`'s own
  narrow Step 2B skip conditions (`skip-design` token, Quick-Fix Lite path, or a
  genuine zero-design-decision REQUESTS.md). Autopilot does not force-skip design.

The proxy panel's selections are logged as `proxy_answer` history entries so a human
can later audit every decision made on their behalf.

## Step 4: Stages 2–4 via Shinnosuke (stop before branch completion)

`/start` Step 2C hands off to Shinnosuke for Stages 2–4. Autopilot uses the same
handoff, with the **branch-completion gate removed** and Safety Limits added:

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`/team-shinchan:autopilot — Continue from Stage 2 (proxy/autonomous).
  DOC_ID: {DOC_ID} | REQUESTS.md: approved | DESIGN.md: approved (or skipped per Step 2B conditions).
  Stages 1 + 1.5 DONE. answer_mode: proxy, execution_mode: micro-execute.

  ## Autonomous execution — no human gates
  Every decision that would normally prompt the user is resolved by the proxy-user
  panel (agents/_shared/proxy-user-panel.md), logged as a proxy_answer history entry.
  Do NOT call AskUserQuestion. The Stage 4 completion-entry decision is also proxy-
  resolved (it is non-destructive: it only writes docs and runs review).

  1. Stage 2 (Planning) via Nene — request MICRO-TASK FORMAT for PROGRESS.md
     (agents/nene.md 'Micro-Task Plan Format'). Nene plans AGAINST the approved
     DESIGN.md — architecture is already decided, do NOT re-decide it.
  2. S2→S3 AK Gate per agents/shinnosuke.md (DO NOT auto-approve — IMMUTABLE rule):
     - Sprint-Contract AC Testability Review (FR-3)
     - Mechanical Pre-Check: node src/mechanical-check.js --file .shinchan-docs/{DOC_ID}/PROGRESS.md
     - AK Review Loop (max 2 retries; on max retries → STOP autopilot, report reasons)
  3. Stage 3 execution — micro-execute pattern (RULE 2.7): for EACH micro-task, fresh
     implementer → spec-compliance review → code-quality review → independent skeptic
     refutation. Never skip any of the four. See skills/micro-execute/SKILL.md.
     - Drift Gate after each phase: node src/drift-check.js --requests .shinchan-docs/{DOC_ID}/REQUESTS.md --progress .shinchan-docs/{DOC_ID}/PROGRESS.md
  4. Stage 4 (Completion) per shinnosuke.md — this is the definition of "work done":
     - Write RETROSPECTIVE.md via Masumi (Task subagent_type="team-shinchan:masumi")
     - Write IMPLEMENTATION.md via Masumi
     - Extract learnings to .shinchan-docs/learnings.md
     - Action Kamen final verification of the entire workflow
     - **STOP HERE.** Do NOT run Branch Completion Options (merge/PR/keep/discard) and
       do NOT run Parking Lot Triage as an interactive gate — those are OUT OF SCOPE for
       autopilot. Leave the branch as-is for a human or another tool to finish.

  ## Safety limits
  - Max iterations: 15 — if reached, pause and report (stage/phase, done, remaining, blocker, next step).
  - No measurable progress in 3 consecutive iterations → pause and report.
  - Scope escalation: if requirements reveal 20+ files or 3+ domains → recommend
    /team-shinchan:bigproject and pause.
  - Auto-fix issues when discovered, within the retry caps above.

  ## Handoff report (on completion)
  When Stage 4 verification passes, output:
    ✅ 작업 완료 — DOC_ID: {DOC_ID}
    브랜치 {branch} 준비됨. PR/merge는 범위 밖 — 사람 또는 다른 도구가 처리하세요.
    (요약: 무엇을 구현했는지, 검증 결과, 미해결 Open Questions 있으면 명시)

  User request: ${args || '(Request content analysis needed)'}
`
)
```

**STOP HERE. The above handles requirements → design → planning → execution →
completion, all with the proxy panel standing in for the user, and stops before any
branch/PR operation.**

## Prohibited

- Calling `AskUserQuestion` (autopilot is hands-off — the proxy panel answers)
- Skipping the design stage except via `/start`'s own Step 2B skip conditions
- Auto-approving any AK gate (IMMUTABLE — AK verdicts come from recorded Task reviews)
- Performing branch completion (merge / PR / keep / discard) — out of scope
