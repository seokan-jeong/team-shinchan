---
name: team-shinchan:fierce-review
description: Deterministic adversarial code review for high-stakes scope — independent per-dimension review, a non-skippable per-finding refutation, completeness + interaction critics, and a deterministic 3-lens rubric judge panel. Opt-in main-loop Workflow tier.
user-invocable: false
---

# EXECUTE IMMEDIATELY

Fierce review is a main-loop **Workflow** that GUARANTEES thorough, adversarial review — dimensions fan out as independent agents, EVERY finding is challenged by a skeptic (false-positive unless it holds against the code), completeness + interaction critics hunt what nobody examined, and a 3-lens Action-Kamen judge panel scores against the shared rubric with schema-validated output. The Task path (`team-shinchan:review`) can only *request* thoroughness at the prompt level; this tier *enforces* it. Use ONLY for high-stakes scope (pre-release diff, security / payment / auth boundary, data-loss path) or when you need a structural coverage guarantee. The cheap default stays `team-shinchan:review`.

## Step 0: Validate + opt-in

- This skill calls the **Workflow tool**, which is main-loop only. Invoking `/team-shinchan:fierce-review` IS the explicit opt-in. **Never delegate this skill to a subagent** (Shinnosuke/Action Kamen) — `workflow()` throws inside a Task child.
- If args length > 2000 characters: truncate to 2000 and warn.

## Step 1: Resolve scope + rubric (main loop)

The script can't read files/git — resolve these here, pass them in `args`.

**Scope + files:**
- If args names explicit paths or a feature, use that as `scope` and resolve `files` accordingly (`git ls-files <path>` or `git diff --name-only` filtered to the feature).
- Otherwise default to the changed set:
  ```bash
  git diff --name-only HEAD; git diff --name-only --staged   # uncommitted + staged
  git diff --name-only main...HEAD                            # or branch scope (set baseRef)
  ```
- If the resolved file list is empty: ask the user what to review and **STOP**.

**Rubric (single source of truth):** read `${CLAUDE_PLUGIN_ROOT}/agents/_shared/eval-rubrics.json` and pick the rubric matching the scope — `default` for code, `documentation` for `.md` docs (REQUESTS/PROGRESS/IMPLEMENTATION/RETROSPECTIVE), `planning` for plan docs. Pass that rubric **object** in `args` so the judge reuses the exact items + `pass_threshold_pct` (never fork the rubric).

**Persona (DRY):** resolve Action Kamen's persona via `node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js actionkamen` and pass it as `args.persona` (runtime can't load plugin subagents; the script appends the review directives). Also resolve `node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js --learnings actionkamen` and pass it as `args.learnings` (distinct from `args.persona`, additive — FR-5/AC-8).

## Step 2: Run the fierce-review Workflow

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/fierce-review/fierce-review.workflow.js",
  args: {
    scope: "<one-line description of what's under review>",
    files: ["<path>", "..."],
    baseRef: "main",
    rubric: { /* the object loaded from eval-rubrics.json */ },
    persona: "<the string printed by workflow-personas.js actionkamen>",
    learnings: "<the string printed by workflow-personas.js --learnings actionkamen>",
    deepen: true           // default: also verifies the critics' own finds (set false for a lighter pass)
  }
})
```

The script runs **Review** (one agent per dimension) → **Verify** (per-finding refutation; `is_real` only if it holds) → **Critic** (completeness + cross-dimension interaction) → **Judge** (3-lens panel — correctness/security/maintainability, min score per item). Returns `{ scope, dimensions, confirmed, unverified, dismissed, gaps, verdict }`: `confirmed` survived the skeptic; `unverified` was retained but not confirmed (null verifier or single-pass critic) — never erased; `dismissed` = refuted false positives. The gate is **recomputed deterministically** from the rubric (`verdict.gate` keeps the LLM self-report); APPROVED needs the threshold AND no confirmed CRITICAL/HIGH.

## Step 3: Record the review artifact

Compute the next index `NNN` from existing `.shinchan-docs/reviews/REVIEW-*.json` (zero-padded, start at 001) and write the full return value plus an ISO timestamp to `.shinchan-docs/reviews/REVIEW-{NNN}.json`. If `.shinchan-docs/ontology/ontology.json` exists, run `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js health` and include the score.

## Step 4: Present + confirm

Present, in this order:
- **Verdict**: APPROVED ✅ / REJECTED ❌
- **Rubric score** table (item / score / max / rationale, total/max_total, PASS≥threshold)
- **must_fix** (CRITICAL/HIGH — block APPROVED) → **should_fix** (MEDIUM) → **could_fix** (LOW)
- **Confirmed findings** (`file:line`); **unverified** ones (null verifier / single-pass critic — flag so they aren't taken as confirmed); the **dismissed** count; **uncovered** areas

If REJECTED, list must_fix ordered by severity with the suggested fixes. An **APPROVED** `REVIEW-{NNN}.json` counts as code-review evidence for `team-shinchan:verification-before-completion` at the pre-commit / pre-PR checkpoint. **Never finalize without confirmation** — ask the user to accept, fix-and-re-run, or re-run with `deepen: false` for a lighter pass (deepen is on by default).
