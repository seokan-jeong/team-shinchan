# Proxy-User Panel — "Best Answer On Behalf Of The User"

> Used by `/team-shinchan:autopilot` (and any workflow that sets
> `current.answer_mode: proxy` in WORKFLOW_STATE.yaml). At every seam where the
> **human** would normally answer an `AskUserQuestion` — a requirements interview
> question, a design decision, or a REQUESTS/DESIGN approval — this panel answers
> **instead of the user**. It does NOT design the question (Misae/Hiroshi still do
> that); it only *selects the best option* among the options they produced.
>
> The panel is deliberately **separate from the question designer** (Misae/Hiroshi)
> so the answer is independent from the agent that framed the choice — the same
> reason micro-execute keeps an independent skeptic apart from the implementer.

---

## When it fires

The parent skill (`skills/start/SKILL.md`) reads `current.answer_mode`:

- `human` (default; absent ⇒ `human`) → the parent calls `AskUserQuestion` as before.
- `proxy` → the parent calls this panel and uses its selected option as if the user
  had picked it. **No `AskUserQuestion` is ever shown to the user.**

Autopilot sets `answer_mode: proxy` in Step 3 and otherwise reuses the entire
`/start` flow (requirements interview, design interview, both approval gates,
Stage 4 entry). Autopilot does **not** cover branch completion (merge/PR/keep/
discard) — that is out of scope and left to a human or another tool.

---

## Inputs (parent → panel)

The parent passes, per seam:

| Field | Source |
|-------|--------|
| `user_request` | original `{args}` |
| `prior_answers` / `prior_decisions` | answers accumulated so far this stage |
| `question` | the question string Misae/Hiroshi emitted |
| `options[]` | the option list (`label` + `description`) Misae/Hiroshi emitted |
| `context_hint` | `targets_subscore` (requirements) or `closes_decision` (design), or the approval prompt text |
| `vision_context` | Ume's analysis, if any |
| `seam` | one of `interview_question` \| `design_decision` \| `requests_approval` \| `design_approval` \| `escalation` \| `stage4_entry` |

For **approval seams** (`requests_approval` / `design_approval`), `options` is the
A=승인 / B=수정 pair. The panel selects **A (approve)** unless it finds a concrete,
material defect in the drafted document — in which case it selects **B** and its
consensus `rationale` becomes the revision feedback fed back to Misae/Hiroshi.

---

## Panel protocol

**1 — Fan out K diverse voters (default K = 3).** Spawn K independent panelists in
parallel, each a fresh sub-agent with a distinct lens. Each receives the SAME inputs
but a different charter:

| Lens | Charter |
|------|---------|
| `user_intent` | "You represent the user's most likely underlying goal. Pick the option that best serves what they actually want, reading `user_request` literally and charitably." |
| `risk_averse` | "You are the cautious product owner. Pick the option with the lowest blast radius, the fewest hidden assumptions, and the easiest reversal if wrong." |
| `pragmatist` | "You are the shipping-minded engineer. Pick the option that reaches a correct, maintainable result with the least incidental scope and rework." |

Each panelist returns a strict block:

```panel-vote
{
  "choice_index": <0-based index into options[]>,
  "confidence": <0.0-1.0>,
  "rationale": "<= 200 chars — why THIS option beats the others"
}
```

**2 — Aggregate by majority.** Tally `choice_index`.

- **Clear majority** (a single option has the most votes) → that option wins.
- **Tie** → a **cautious judge** (one more fresh sub-agent) breaks it. The judge is
  given the tied options + all panelist rationales and is told: *"When genuinely
  torn, prefer the lower-risk / more-reversible / narrower-scope option — the same
  bias a careful user would apply."* The judge returns one `choice_index` from the
  tied set.
- **Every panelist returned a different index** (K-way split, no majority) → treat as
  a tie across all voted options and run the same cautious judge.

**3 — Never invent an option.** The winning `choice_index` MUST be a real index into
`options[]`. If the panel cannot justify any option, it selects the **safest present
option** (for approval seams: **B=수정** with the objection as feedback; for
multiple-choice seams: the option the `risk_averse` lens picked) rather than
fabricating a new answer.

---

## Auditability (mandatory)

Every proxy selection is recorded so a human can review what the panel decided in
their place. Append to `WORKFLOW_STATE.history`:

```yaml
- timestamp: "{ISO now}"
  event: proxy_answer
  agent: proxy_panel
  seam: interview_question          # or design_decision | requests_approval | design_approval | escalation | stage4_entry
  question: "{question}"
  chosen_label: "{options[choice_index].label}"
  vote_tally: { "0": 2, "1": 1 }    # choice_index → count
  tie_broken_by_judge: false
  rationale: "{winning consensus rationale}"
```

The chosen option is then handed back to the parent exactly as an `AskUserQuestion`
answer would be, so the rest of the `/start` flow is unchanged.

---

## Key principle: replace the human at the seam, not the reasoning before it

The panel does not shortcut the interview. Misae still gates on clarity, Hiroshi
still gates on design-completeness, the materiality/closure re-entry loops still run,
Action Kamen still reviews. The ONLY thing that changes under `answer_mode: proxy`
is *who clicks the button* — a diverse, majority-voting, cautiously-judged panel
that leaves an audit trail, instead of the user. This keeps autopilot genuinely
hands-off while preserving every quality gate `/start` already enforces.
