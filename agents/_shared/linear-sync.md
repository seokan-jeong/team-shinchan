# Linear Sync — auto status transitions for Linear-based work

> Used by every **work skill** in this plugin (`start`, `autopilot`, `bigproject`,
> `orchestrate`, `implement`, `backend`, `frontend`, `devops`, `micro-execute`,
> `ralph`, `ultrawork`). When the task the user handed us is **backed by a Linear
> issue**, the issue's status is advanced automatically:
>
> - **START** of the work → move the issue to **In Progress**
> - **FINISH** of the work (done + verified) → move the issue to **In Review**
>
> The skill/agent that owns a seam calls the transition defined here. All the
> matching/validation/idempotency logic lives in this one file so the ~11 call
> sites stay thin and never drift.

---

## When a task is "Linear-based" (detection)

A task is Linear-based when the user's request (`args`), the DOC_ID, or the git
branch name contains **a reference to a real Linear issue**. Detect it like this:

1. **Scan for an issue identifier or URL** in `args` first, then DOC_ID, then branch:
   - Issue ID: regex `\b[A-Z][A-Z0-9]*-\d+\b` (e.g. `ENG-123`, `TS-7`, `ABC1-42`).
   - Issue URL: `https?://linear\.app/[^/]+/issue/([A-Z0-9]+-\d+)` → capture group 1.
   - Take the **first** match. Call it `{ISSUE}`.
2. **Confirm it is a real Linear issue** — do NOT trust the regex alone (prose like
   "US-1 citizens" or "COVID-19" can match). Call:
   ```
   mcp__claude_ai_Linear__get_issue(id="{ISSUE}", includeRelations=false)
   ```
   - If it returns an issue → it is Linear-based. Remember its `team` and current
     `state` for the transition below.
   - If it errors / not found → **not** Linear-based. Skip Linear Sync entirely and
     say nothing to the user about Linear.
3. If no identifier/URL matched at all → not Linear-based, skip silently.

> The Linear MCP tools are only present when the user has the Linear integration
> connected (e.g. this is a claude.ai-authenticated session). If the
> `mcp__claude_ai_Linear__*` tools are unavailable, Linear Sync is a **no-op** — do
> not error, do not block the work, do not mention it.

---

## Configuration (`.shinchan-config.yaml`, project root — all optional)

```yaml
linear:
  auto_transition: true            # master switch — default ON. false disables Linear Sync.
  in_progress_status: "In Progress"  # status name used for the START transition
  in_review_status: "In Review"      # status name used for the FINISH transition
```

Read these if the file exists; otherwise use the defaults shown. If
`auto_transition: false`, Linear Sync is a no-op.

---

## Resolving the target status name

Team workflows can rename or omit these states. Before transitioning, resolve the
concrete status name for `{ISSUE}`'s team:

```
statuses = mcp__claude_ai_Linear__list_issue_statuses(team="{team of ISSUE}")
```

- **START (In Progress):** pick the status whose name equals `in_progress_status`
  case-insensitively; if none, pick the first status of `type: started`; if still
  none, warn (`⚠️ [Linear] no In-Progress status on team {team}`) and skip.
- **FINISH (In Review):** pick the status whose name equals `in_review_status`
  case-insensitively; if none, pick a `type: started` status whose name contains
  "review"; if still none, warn and skip.

---

## The transitions

Both transitions are **idempotent and forward-only** — never move an issue backward.

### START → In Progress

Call at the moment the work begins (workflow state created / just before dispatch).

```
Skip if: auto_transition is false, OR not Linear-based, OR
         current state is already the In-Progress status, OR
         current state.type is completed/canceled (work already closed — don't reopen).
Otherwise:
  mcp__claude_ai_Linear__save_issue(id="{ISSUE}", state="{resolved In-Progress name}")
  Narrate one line: "🔗 [Linear] {ISSUE} → In Progress"
```

### FINISH → In Review

Call when the work is **done and verified** (see per-caller seam below).

```
Skip if: auto_transition is false, OR not Linear-based, OR
         current state is already the In-Review status, OR further along
         (a completed/canceled state — don't drag it back to review).
Otherwise:
  mcp__claude_ai_Linear__save_issue(id="{ISSUE}", state="{resolved In-Review name}")
  Narrate one line: "🔗 [Linear] {ISSUE} → In Review"
```

**Never fail the user's task because of a Linear error.** If `save_issue` throws,
warn (`⚠️ [Linear] status update failed: {reason}`) and continue — the code work is
the deliverable, the status update is best-effort.

---

## Where each caller fires the seams

Full-workflow skills persist the resolved `{ISSUE}` into `WORKFLOW_STATE.yaml`
`current.linear_issue` at START so the FINISH seam can recover it without re-detecting.

| Caller | START (In Progress) | FINISH (In Review) |
|--------|---------------------|--------------------|
| `start` | Step 1, right after WORKFLOW_STATE.yaml is created — **standalone only** (skip when invoked with injected bigproject phase context; the parent project owns the issue) | via `shinnosuke.md` Stage 4 Step 5 |
| `autopilot` | Step 2, right after WORKFLOW_STATE.yaml is created | via `shinnosuke.md` Stage 4 Step 5 |
| `orchestrate` | inherits `start` — it executes `start`'s steps verbatim, so start's Step 1 seam fires | inherits `start` (via `shinnosuke.md` Stage 4 Step 5) |
| `shinnosuke.md` Stage 4 | — | Step 5 (Mark Complete). **Skip if `current.parent_doc_id` is set** — a bigproject phase must not flip the project's issue; bigproject handles it. |
| `bigproject` | at project creation (after PROJECT.yaml written), keyed to the **project** issue; child phases never transition | after the **last** phase in `execution_order` completes |
| `implement` / `backend` / `frontend` / `devops` | just before dispatching the implementer Task | right after that Task returns successfully |
| `micro-execute` / `ralph` / `ultrawork` | at Step 1, before execution begins | after the task is complete and verified |

### The bigproject rule (why phases don't transition)

One Linear issue represents the **whole** big project. The project moves to In
Progress once when the project is created, and to In Review once when **every** phase
in `execution_order` is done — never per phase. Because each phase runs the full
`start` → `shinnosuke` Stage 4 flow, the phase's WORKFLOW_STATE carries
`parent_doc_id`; both the `start` START seam and the `shinnosuke` FINISH seam check
for `parent_doc_id` and **skip** when it is present, leaving the project-level
issue lifecycle entirely to `bigproject`.
