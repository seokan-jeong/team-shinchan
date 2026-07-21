# Misae — Mechanical Pre-Check + AK Review Loop (pseudocode)

> Extracted from `agents/misae.md` (FR-1.5). The outer contract (MAX_RETRIES = 2, when it runs,
> that it gates before user approval) stays inline in misae.md as a condensed step list; this file
> holds the mechanical pre-check invocation and the full retry-loop pseudocode.

##### Mechanical Pre-Check (FR-2.4)

Before invoking AK review, run the mechanical pre-check to catch structural defects at $0 cost. The checker auto-detects mode from file extension (`.html` → HTML mode, otherwise markdown mode — main-068 Phase 1):

```bash
# markdown 산출 (output_format: markdown, default)
node src/mechanical-check.js --file .shinchan-docs/{DOC_ID}/REQUESTS.md

# html 산출 (output_format: html, main-068 Phase 1 이후)
node src/mechanical-check.js --file .shinchan-docs/{DOC_ID}/REQUESTS.html
```

Parse stdout as JSON `{pass: bool, errors: string[], mode: "markdown"|"html"}`:
- If `pass: true`: proceed to AK review loop.
- If `pass: false`: fix ALL listed errors in REQUESTS and re-run the check until `pass: true`.
  Do NOT call AK with a document that fails the mechanical pre-check.

```
MAX_RETRIES = 2
retry_count = read from WORKFLOW_STATE.yaml current.ak_gate.requirements.retry_count (default 0)
all_rejection_reasons = []  # accumulate across retries

LOOP:
  1. Read current REQUESTS.md content
  2. Invoke AK review:
     Task(
       subagent_type="team-shinchan:actionkamen",
       model="opus",
       prompt="DOCUMENT REVIEW — REQUESTS.md for {DOC_ID}.
       Review file: .shinchan-docs/{DOC_ID}/REQUESTS.md

       rubric:
         Problem Statement (max 5): Is problem clearly stated with context, impact, measurable
           success criteria, and WHY it matters?
         FR/NFR Coverage (max 5): Are all functional requirements complete, non-overlapping,
           and testable? Are NFRs present and quantified?
         Scope & AC Testability (max 5): Is scope delineated? Are all six STRIDE threats addressed or justified N/A?
           Are ACs phrased as testable checkboxes?
       pass_threshold: 9/15 (60%)

       Prior rejection feedback to check against (if retry): {last_rejection_reasons}

       Output: APPROVED or REJECTED verdict with rubric scores and specific rejection reasons."
     )

  3. Parse AK verdict from Task result:
     - Append history entry to WORKFLOW_STATE.yaml:
         event: ak_review
         agent: action_kamen
         stage: requirements
         verdict: {APPROVED or REJECTED}
         retry_count: {retry_count}
         rejection_reasons: {reasons list or []}

  4. If APPROVED:
     - Update WORKFLOW_STATE.yaml current.ak_gate.requirements.status = approved
     - Proceed to Step E-2 (user approval)
     - EXIT LOOP

  5. If REJECTED:
     - Append rejection reasons to all_rejection_reasons
     - Write WORKFLOW_STATE.yaml:
         current.ak_gate.requirements.retry_count = retry_count + 1
         current.ak_gate.requirements.status = rejected
         current.ak_gate.requirements.last_rejection_reasons = {reasons}
     - If retry_count >= MAX_RETRIES:
       - Update status = escalated
       - Proceed to Step E-4 (escalation)
       - EXIT LOOP
     - Else:
       - Tell user: "AK review rejected (retry {retry_count+1}/{MAX_RETRIES}). Revising REQUESTS.md..."
       - Revise REQUESTS.md: address EACH rejection reason explicitly
         (CRITICAL: do not resubmit unchanged document — address every AK complaint)
       - retry_count += 1
       - CONTINUE LOOP
```
