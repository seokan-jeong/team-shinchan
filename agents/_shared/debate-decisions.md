# Debate Decision Log (Template)

> **Note**: This file is a **reference template** shipped with the plugin.
> Both debate tiers write actual decisions to `.shinchan-docs/debate-decisions.md` in the host project:
> - **Tier 1 — Midori** (consensus-seeking, auto-triggered via Task) — see `agents/midori.md`.
> - **Tier 2 — fierce-debate** (deterministic adversarial Workflow, opt-in) — see `skills/fierce-debate/SKILL.md`.
>
> Both tiers use the SINGLE format below and the SAME log file — **never fork the ledger or the schema.**
> If the file does not exist, the active tier copies this template to create it.

This file defines the format for tracking key decisions made through the Team-Shinchan debate process.
Both tiers check the project-local log before initiating new debates to avoid re-debating resolved topics.

## Format

Each decision entry follows this format:

### [DECISION-{NNN}] {Topic Title}
- **Date**: YYYY-MM-DD
- **Doc ID**: {workflow doc_id}
- **Tier**: consensus (Midori) | fierce (Workflow)
- **Panel**: {participating agents / personas}
- **Category**: {architecture|security|performance|tech-selection}
- **Decision**: {one-line summary}
- **Rationale**: {brief rationale}
- **Dissent**: {surviving objection, or `"none — survived rebuttal: {what was challenged}"`} — **may not be silently empty**
- **Status**: Active | Superseded by DECISION-{NNN}

### Fierce-tier extra fields (Tier: fierce only)
- **Refutations**: {attacks raised, each marked SURVIVED / BROKEN}
- **Judge Scores**: {Action Kamen rubric — Correctness/Completeness/Quality per option, /15}
- **Winner**: {chosen option + score}

## Rotation Policy
Keep the 20 most recent decisions. Archive older decisions to `debate-decisions-archive.md`.

---

## Active Decisions

_No decisions recorded yet. Entries will be added as debates are conducted._
