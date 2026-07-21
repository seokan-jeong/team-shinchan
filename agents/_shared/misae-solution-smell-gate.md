# Misae — Solution-Smell Gate (background: precedence, lexicon, escape-hatch)

> Extracted from `agents/misae.md` (FR-1.3). The `needs_reframe` YAML history-event block and its
> `interview-question` JSON contract stay 100% inline in misae.md (AC-4); this file holds only the
> precedence rationale, detection-lexicon table, and `skip-brainstorm` escape-hatch prose.

#### Solution-Smell Gate (FR-1, FR-2, FR-5 — problem-framing gate, main-079)

> **Gated by `gate_live`** (injected by `skills/start` 2A.1). If the parent does not inject
> `gate_live` (legacy callers) OR injects `gate_live: false`, this gate is INERT — Step 0
> behaves byte-for-byte as before (NFR-4). Evaluated ONLY at `mode == DESIGN_NEXT_QUESTION`,
> `turn == 1`, `prior_answers == []`.

**Precedence (total order, DEC-3):** `skip-brainstorm` → `skip-interview` → **solution-smell
(this gate)** → WS-09 anchor-signal → pre_interview_clear/threshold. This gate runs strictly
BEFORE WS-09 (FR-2): an anchored request may STILL route to `needs_reframe` if solution-smell
fires — an anchor does not certify a well-framed problem.

**Detection (pure string rules, no extra LLM call — DEC-1):**
- `IMPL_VERB_LEXICON`   = {add, attach, create, build, implement, insert, wire, hook up, put, 추가, 붙여, 만들}
- `DELIVERABLE_LEXICON` = {button, dropdown, filter, modal, endpoint, field, column, toggle, banner, page, form, 버튼, 필터, 드롭다운}
- `problem_absent`  = NONE of the `problem` field patterns match (reuse the "5-field tie-breaker": "문제","issue","bug","broken", or describes what's wrong)
- `target_absent`   = NONE of the `target_user` field patterns match (reuse the "5-field tie-breaker": "사용자","user","logged-in","admin", role noun)

`solution_smell = has_impl_verb AND has_deliverable AND problem_absent AND target_absent`
(conservative AND — NFR-1 precision-over-recall; if ANY clause is false, pass through unchanged).

**Escape hatch — `skip-brainstorm` (FR-5):** if `user_request` (case-insensitive) contains the
literal `skip-brainstorm`, set `solution_smell_enabled = false` — this gate is skipped and the
REST of Step 0 runs unchanged (narrower than `skip-interview`, which opts out of the whole interview).

**On HIT** (`gate_live AND solution_smell_enabled AND solution_smell`): append a `needs_reframe`
history event, then return the new status. Do NOT compute or emit `clarity_score` — this returns
BEFORE scoring, so `clarity_score.history` stays untouched and no turn is consumed (HR-8). The
`needs_reframe` history-event YAML and the `needs_reframe` `interview-question` JSON both stay
inline in `agents/misae.md` (AC-4).

`needs_reframe` is a NEW status value (additive to `ask`/`done`), consumed ONLY by `skills/start`
2A.1's turn==1 interceptor (placed BEFORE the ask/done GUARD), which routes to `skills/brainstorm`.
