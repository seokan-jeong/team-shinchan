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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 1: Validate Input

```
If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Expire and Archive Stale Workflows

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
   c. Calculate archive path: `.shinchan-docs/archived/{YYYY-MM}/` where YYYY-MM comes from the current date
   d. Attempt: `mkdir -p .shinchan-docs/archived/{YYYY-MM}/ && mv .shinchan-docs/{DOC_ID}/ .shinchan-docs/archived/{YYYY-MM}/{DOC_ID}/`
   e. If `mv` fails: silently continue (status stays `expired`, folder stays in place)
   f. Do NOT output any paused/expired notification to the user
   g. Continue to next workflow

**Non-expired active workflows are left as-is.** Multiple workflows can be `active` simultaneously.
The workflow guard protects the most recently updated active workflow.
Use `/team-shinchan:resume` to switch the guard target to a different workflow.

## Step 3: Setup (Folder + State)

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

## Step 4: Visual Input Detection

**If args contain image/PDF paths (.png, .jpg, .jpeg, .gif, .svg, .pdf, .webp) or reference visual content:**

```typescript
Task(subagent_type="team-shinchan:ume", model="sonnet",
  prompt="Analyze visual content for requirements.\nDOC_ID: {DOC_ID}\nExtract: UI components, layout, design patterns, user flows, ambiguities.\nUser request: {args}")
```

Store result as `{vision_context}`. Skip if no visual input.

## Step 5: Requirements - Invoke Misae DIRECTLY (Auto-Analyze Mode)

**CRITICAL: Do NOT invoke Shinnosuke for Stage 1. Invoke Misae directly (1-level instead of 2-level).**

In autopilot mode, Misae performs **autonomous analysis** — no user interview. She analyzes the request, infers requirements, identifies risks, and produces REQUESTS.md directly.

```typescript
Task(subagent_type="team-shinchan:misae", model="sonnet",
  prompt="mode: AUTONOMOUS (autopilot — no user interview)
  DOC_ID: {DOC_ID} | WORKFLOW_STATE: .shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml
  Visual Analysis: {vision_context or 'None'}

  ## AUTOPILOT MODE — No User Interview
  CRITICAL: Do NOT emit any `interview-question` JSON block. Do NOT ask the user anything. Do NOT wait for user input. You are a sub-agent and cannot reach the user anyway — the parent will NOT call AskUserQuestion. Any question you write will be silently dropped.

  Instead:
  1. Analyze the user request and infer all requirements autonomously
  2. Identify hidden requirements, risks, and edge cases from the request context
  3. **Persist a clarity_score.history entry** in WORKFLOW_STATE.yaml BEFORE writing
     REQUESTS.md. This makes the rubric the single shared quality signal across
     interview and autopilot modes (AC9, NFR-1):
     ```yaml
     clarity_score:
       goal_clarity: <0.0-1.0>
       constraint_clarity: <0.0-1.0>
       success_criteria: <0.0-1.0>
       overall: <mean rounded to 2 decimals>
       history:
         - turn: 0
           source: autopilot_inferred   # NEW enum value — required for autopilot path
           goal_clarity: <0.0-1.0>
           constraint_clarity: <0.0-1.0>
           success_criteria: <0.0-1.0>
           overall: <mean>
     unresolved_unknowns: []           # autopilot infers everything → empty list
     ```
     Do NOT emit any interview-question JSON block. Do NOT increment
     `current.interview.collected_count` — keep it at 0 (AC9 requirement).
  4. Produce REQUESTS.md (Problem, FR/NFR, Scope, Hidden Requirements, Risks, AC)
  5. Run mechanical check + AK review per agents/misae.md Phase E (max 2 retries on AK rejection):
     - On AK APPROVED: ak_gate.requirements.status becomes 'approved' via the recorded Task verdict (NOT by string-injection — IMMUTABLE rule in agents/misae.md)
     - On AK ESCALATED (max retries reached): STOP autopilot, report rejection reasons to user, do NOT advance to Stage 2
  6. On approval, set current.stage to 'planning', return summary

  If visual analysis provided, use as starting point.
  User request: {args}")
```

## Step 6: Stages 2-4 via Shinnosuke

Output transition narration:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Stage 1 complete — Requirements locked
→ Stage 2: Planning starts. Nene designs phases.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then invoke Shinnosuke:

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`/team-shinchan:autopilot — Continue from Stage 2.
  DOC_ID: {DOC_ID} | REQUESTS.md: approved and complete.

## Autonomous Execution Mode

Complete autonomously, except for the **required user gates** below (project memory + IMMUTABLE rules):

1. Start Stage 2 (Planning) via Nene, then Stage 3 (Execution), then Stage 4 (Completion)
2. Run S2→S3 AK Gate per agents/shinnosuke.md (DO NOT auto-approve — IMMUTABLE rule):
   - Sprint-Contract AC Testability Review (FR-3) — extract AC, AK reviews testability
   - Mechanical Pre-Check: `node src/mechanical-check.js --file .shinchan-docs/{DOC_ID}/PROGRESS.md`
   - AK Review Loop (max 2 retries; on max retries → escalate to user, STOP autopilot)
   - Skip Step 3 user-approval (autopilot proceeds directly on AK APPROVED for Stage 2)
3. Execute using micro-execute pattern (RULE 2.7 in agents/shinnosuke.md):
   - For each micro-task: fresh implementer subagent → spec compliance review → code quality review
   - Run Drift Gate after each phase: `node src/drift-check.js --requests .shinchan-docs/{DOC_ID}/REQUESTS.md --progress .shinchan-docs/{DOC_ID}/PROGRESS.md`
   - See skills/micro-execute/SKILL.md for full protocol
4. After all execution phases complete:
   a. **Required user gate** (project memory `feedback_completion_stage`): ask "All execution phases done. Proceed to Stage 4 (Completion)?" — autopilot mode honors this gate, never skips silently
   b. On user approval, run Stage 4 (Completion) per shinnosuke.md Stage 4:
      - Write RETROSPECTIVE.md via **Masumi** — `Task(subagent_type="team-shinchan:masumi", model="sonnet", ...)` (NOT Bo — see agents/masumi.md)
      - Write IMPLEMENTATION.md via **Masumi**
      - Extract learnings to `.shinchan-docs/learnings.md` (per docs/workflow-guide.md Stage 4)
      - Action Kamen final verification of entire workflow
      - Branch Completion Options (Step 4.5 in shinnosuke.md): A=merge / B=PR / C=keep / D=discard — required user input even in autopilot
      - Parking Lot Triage (Step 6 in shinnosuke.md): process `discovered_issues` if any
5. Auto-fix issues when discovered (within retry caps)

## Micro-Task Execution (RULE 2.7)

When invoking Nene for Stage 2 planning, request MICRO-TASK FORMAT for PROGRESS.md.
Each phase should be broken into 2-3 minute tasks with exact file paths, complete code,
and verification commands. See agents/nene.md 'Micro-Task Plan Format' section.

## Stage Rule Compliance

- planning Stage: Only planning (no code modification)
- execution Stage: Implementation proceeds
- completion Stage: Documentation and verification

## Safety Limits

- **Max iterations**: 15 (pause and report if reached)
- **Progress check**: If no measurable progress in 3 consecutive iterations, pause and report to user
- **Scope escalation**: If requirements analysis reveals 20+ files or 3+ domains, recommend switching to /team-shinchan:bigproject

## On Max Iterations Reached

If the 15-iteration limit is reached, output:
- Current stage and phase
- What was completed
- What remains incomplete
- Specific blocker (if any)
- Recommended next step for user

User request: ${args || '(Request content analysis needed)'}
`
)
```

**STOP HERE. The above Tasks handle everything.**
