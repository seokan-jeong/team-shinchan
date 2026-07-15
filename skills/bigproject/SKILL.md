---
name: team-shinchan:bigproject
description: Use when you have a large-scale, multi-phase project requiring orchestrated execution.
user-invocable: false
---

# EXECUTE IMMEDIATELY

**Output immediately before executing:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 [Himawari] Large-scale project mode engaged! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## How this works (read once)

A big project is **decomposed into phases**, and **each phase runs the full `start`
workflow** — Stage 1 Requirements (full Misae interview) → Stage 2 Planning (Nene) →
Stage 3 micro-execute → Stage 4 Completion (RETROSPECTIVE + final AK).

**This skill runs on the main thread and drives the phase loop itself.** That is required:
each phase's Stage-1 interview uses `AskUserQuestion`, which only the main thread can call —
a sub-agent cannot. So Himawari is used *only to decompose* (it returns a phase plan); the
main thread then runs each phase. Expect **one full requirements interview per phase** — this
is intentional and carries real token/latency cost on large projects.

**Layout** (flat siblings — parent dir holds only `PROJECT.yaml`, which the
`*/WORKFLOW_STATE.yaml` globs ignore):
```
.shinchan-docs/{PROJECT_ID}/PROJECT.yaml
.shinchan-docs/{PROJECT_ID}-phase-1/WORKFLOW_STATE.yaml   (+ REQUESTS/PROGRESS/RETROSPECTIVE…)
.shinchan-docs/{PROJECT_ID}-phase-2/...
```

---

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What large-scale project would you like to tackle?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Evaluate Scope

This skill is for large projects meeting **ANY** of these criteria:

| Criteria | Threshold |
|----------|-----------|
| Phases | 3+ phases |
| Files | 20+ files affected |
| Domains | 3+ domains (frontend + backend + infra) |
| Duration | Multi-session effort |

If the project clearly doesn't meet these criteria, recommend `/team-shinchan:start` instead and STOP.

## Step 3: Decompose (Himawari, DECOMPOSE_ONLY)

1. Compute `PROJECT_ID`: if args contains `ISSUE-xxx` use it; else `{branch}-{next_index}`
   from git branch + `ls .shinchan-docs/` (ignore `*-phase-*` and `archived/`).
2. Invoke Himawari for decomposition **only** (no execution, no file writes):

```typescript
Task(subagent_type="team-shinchan:himawari", model="opus",
  prompt=`mode: DECOMPOSE_ONLY
  PROJECT_ID: ${PROJECT_ID}
  user_request: ${args}
  Return EXACTLY ONE fenced \`phase-plan\` JSON block per agents/himawari.md contract.
  Do NOT assign or execute agents. Do NOT write any .shinchan-docs/ files.`)
```

3. Parse the last ` ```phase-plan ``` ` fenced JSON block. **Validate** the contract:
   - `phases` length **≥ 2** (if it collapses to 1, recommend `/team-shinchan:start` and STOP).
   - Each phase: unique positive integer `n`; non-empty `title`; `domain` ∈
     {frontend, backend, devops, fullstack, infra}; non-empty `acceptance_criteria[]`;
     `suggested_agent` ∈ {aichan, buriburi, masao, bo, kazama}.
   - `depends_on` references only existing phase numbers; **no cycles**.
   - `execution_order` is a topological sort covering every phase exactly once.

   On any validation failure: re-invoke Himawari with the specific reason appended
   ("CRITICAL: your previous phase-plan failed validation: {reason}. Re-emit one valid
   `phase-plan` block."). Retry up to **2** times. On 3rd failure: print the raw Himawari
   output verbatim and STOP.

## Step 4: Write PROJECT.yaml + Approve

1. `mkdir -p .shinchan-docs/{PROJECT_ID}`
2. Write `.shinchan-docs/{PROJECT_ID}/PROJECT.yaml` from the phase-plan
   (validate against `schemas/project-state.schema.json`):

```yaml
schema_version: 1
kind: project
project_id: "{PROJECT_ID}"
title: "{title}"
output_format: markdown        # or html if the user/project prefers; inherited by phases
created: "{ISO timestamp}"
updated: "{ISO timestamp}"
current:
  status: active
  active_phase: null
phases:
  - n: 1
    title: "{phase 1 title}"
    domain: backend
    depends_on: []
    child_doc_id: "{PROJECT_ID}-phase-1"
    status: pending
    suggested_agent: buriburi
    acceptance_criteria:
      - "{criterion}"
  # …one entry per phase…
history:
  - timestamp: "{ISO timestamp}"
    event: project_started
    agent: himawari
```

3. Render the plan to the user as a table:
   `Phase | Title | Domain | Depends-on | Agent | Acceptance`, plus any `cross_phase_risks`.
4. Ask approval:

```
user_decision = AskUserQuestion(questions=[{
  question: "이 phase 계획으로 진행할까요? (각 phase는 요구사항 인터뷰부터 풀 워크플로우로 실행됩니다)",
  header: "프로젝트 계획 승인",
  options: [
    {label: "A. 승인 — phase 1부터 시작", description: "PROJECT.yaml 확정 후 phase 루프 시작"},
    {label: "B. 계획 수정", description: "phase 분해를 어떻게 바꿀지 알려주세요"},
    {label: "C. 취소", description: "프로젝트를 시작하지 않습니다"}
  ],
  multiSelect: false
}])
```
- **B** → re-invoke Himawari (Step 3) with the feedback; rewrite PROJECT.yaml; repeat Step 4.
- **C** → STOP.
- **A** → continue to Step 5.

5. **Linear Sync — START (In Progress).** Once the plan is approved, run the **START →
   In Progress** transition per `agents/_shared/linear-sync.md`, keyed to the
   **project** issue: detect a Linear issue in `args`/PROJECT_ID/branch, confirm it
   with `get_issue`, and if real move it to In Progress and persist it to
   `current.linear_issue` in PROJECT.yaml. This fires **once for the whole project** —
   individual phases must NOT transition it (their WORKFLOW_STATE carries
   `parent_doc_id`, so both `start`'s START seam and `shinnosuke.md`'s FINISH seam skip
   Linear Sync). No-op if no Linear issue / Linear MCP unavailable.

## Step 5: Phase Loop (main thread, dependency order)

Iterate phases in `execution_order`. On resume, skip any phase whose `status == complete`.

> **Why phases run sequentially (not parallel), even when `depends_on` is empty.** Two things
> block safe parallelism here: (1) each phase's Stage-1 interview uses `AskUserQuestion`, which only
> the main thread can call — interviews are inherently serial; (2) phases implement code into the
> **same working tree**, so dispatching independent phases' Stage 2–4 concurrently would race on
> files (undeclared overlaps, git-index contention) and corrupt the tree. Safe parallel execution
> requires per-phase **worktree isolation**, which only a Workflow script provides
> (`parallel()` + `isolation: worktree`) — this prose+`Task` loop cannot. If a large project genuinely
> needs parallel phase execution, drive those phases through the Workflow tier (a `fierce-*`-style
> script with worktree isolation) rather than parallelizing this loop. Keep this loop serial.

For each phase **P**:

1. **Dependency gate**: if any phase in `P.depends_on` is not `complete` → mark P `blocked`
   in PROJECT.yaml, report, and escalate to the user.
2. In PROJECT.yaml set `phases[P].status = in_progress`, `current.active_phase = P.n`,
   refresh `updated`, append a `phase_started` history event.
3. **Run the `start` workflow for this phase** — execute the steps documented in
   `skills/start/SKILL.md` **Steps 1 → 2B** on the main thread, treating these as the
   skill's "Injected Context":
   - `DOC_ID = {PROJECT_ID}-phase-{P.n}` (use verbatim; do NOT regenerate)
   - `parent_doc_id = {PROJECT_ID}`, `phase_number = P.n`
   - `PHASE_CONTEXT` = project title + P's title/domain/acceptance_criteria +
     one-line summaries of all completed phases (so Misae scopes the interview to P)
   - **Skip start Step 0** (expiry/archive — already handled at the project level).

   start Step 1 creates `.shinchan-docs/{PROJECT_ID}-phase-{P.n}/WORKFLOW_STATE.yaml`
   (with `parent_doc_id`/`phase_number`); Step 2A runs the full main-thread Misae interview;
   Step 2B fires `Task(team-shinchan:shinnosuke)` for Stages 2–4 of this phase, ending in
   `RETROSPECTIVE.md` + `IMPLEMENTATION.md` + a final Action Kamen review for the phase.

4. **Checkpoint** (after the phase's Shinnosuke Task returns):
   - Read the child `WORKFLOW_STATE.yaml`; confirm `status: completed` and the final AK
     verdict is APPROVED. If not → mark `phases[P].status = blocked`, report, escalate.
   - Cross-phase regression: if P touched files listed in any completed phase's
     `shared_resources`, run
     `Task(subagent_type="team-shinchan:actionkamen")` to review for regressions across the
     affected child docs. On regression → set PROJECT `current.status = blocked`, escalate.
   - Set `phases[P].status = complete`, refresh `updated`, append a `phase_completed` event.
   - Report a progress table (Phase | Status) to the user, then continue the loop.

## Step 6: Project Completion

When every phase is `complete`:
1. Aggregate each phase's `RETROSPECTIVE.md` into
   `.shinchan-docs/{PROJECT_ID}/PROJECT_RETROSPECTIVE.md` (per-phase summary + cross-phase
   learnings + risks that materialized).
2. Optional holistic review: `Task(subagent_type="team-shinchan:actionkamen")` across phases.
3. In PROJECT.yaml set `current.status = completed`, `current.active_phase = null`, refresh
   `updated`, append a `project_completed` event.
4. **Linear Sync — FINISH (In Review).** Now that **every** phase is complete, run the
   **FINISH → In Review** transition per `agents/_shared/linear-sync.md` using
   `current.linear_issue` from PROJECT.yaml (or re-detect). This is the single point
   where the project's issue moves to In Review — never per phase. No-op if no Linear
   issue / Linear MCP unavailable.
5. Final report to the user: phases delivered, links to each phase's IMPLEMENTATION.md, and
   the project retrospective.

## Prohibited

- Letting Himawari (a sub-agent) run phases or interviews — it only decomposes.
- Regenerating a phase's DOC_ID inside the loop, or running start Step 0 per phase.
- Marking a phase `complete` without a child `status: completed` + AK APPROVED.
- Nesting child workflows under `.shinchan-docs/{PROJECT_ID}/` (must be flat siblings
  `{PROJECT_ID}-phase-N/`, or the workflow guard and `/team-shinchan:resume` can't see them).
