---
name: team-shinchan:fierce-compete
description: Deterministic competitive code tournament — N builders independently solve one task and return patches, an Action-Kamen judge scores them head-to-head, the winner is picked by score and applied. Opt-in main-loop Workflow tier.
user-invocable: false
---

# EXECUTE IMMEDIATELY

Fierce compete is a main-loop **Workflow** that runs a guaranteed competitive tournament: N builder agents independently solve the SAME task (read-only, each returning an apply-ready patch — no working-tree collisions, nothing to merge), an Action-Kamen judge scores them head-to-head on a rubric, and the winner is selected **deterministically by total score**. The Task path (`/team-shinchan:debate` competitive-code mode, Midori + worktrees) does this at the prompt level; this tier enforces the fan-out + scored judge with schema-validated output. Use for high-value, genuinely contested implementations where the best of N is worth the cost.

## Step 0: Validate + opt-in

- This skill calls the **Workflow tool** (main-loop only). Invoking `/team-shinchan:fierce-compete` IS the opt-in. **Never delegate to a subagent** — `workflow()` throws inside a Task child.
- If args lack a clear implementation task: ask for it and **STOP**. Parse `N` (number of implementations, default 2, max 4) from "best of N"/"N개" if present. If > 2000 chars: truncate + warn.

## Step 1: Resolve task + personas (main loop — the script can't read files)

- **Task + context**: the implementation request; pass the relevant `files` (so builders read the right code).
- **Personas (DRY)**: resolve builder + judge personas from the agent files and pass them in `args`:
  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js bo actionkamen
  ```

## Step 2: Run the fierce-compete Workflow

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/fierce-compete/fierce-compete.workflow.js",
  args: {
    task: "<the implementation request>",
    n: 2,                                  // 2..4
    files: ["<path>", "..."],              // context the builders should read
    builderPersona: "<workflow-personas.js bo>",
    judgePersona: "<workflow-personas.js actionkamen>"
  }
})
```

**Implement** (N builders each emit a unified-diff patch, read-only) → **Judge** (Action Kamen scores each on correctness/completeness/quality, 1-5). Returns `{ task, n, implementations, scores, winner, rationale, dissent }`. `winner` is chosen **deterministically** (max total, tie → higher correctness) and carries the winning `patch`. Note: builders are read-only, so patches are **untested** until applied — Step 4 is where the winner is applied and verified.

## Step 3: Record the tournament artifact

Compute the next index `NNN` from `.shinchan-docs/tournaments/COMPETE-*.json` (zero-padded, start 001) and write the full return value plus an ISO timestamp to `.shinchan-docs/tournaments/COMPETE-{NNN}.json`. Also append a decision entry to `.shinchan-docs/debate-decisions.md` (same ledger competitive-code uses), recording the winner and the dissent.

## Step 4: Present, apply the winner, confirm

Present the score table (per impl: correctness/completeness/quality/total), the **winner**, the rationale, and the surviving **dissent**. Then apply the winner:
```bash
git apply <winner.patch>     # write winner.patch to a temp file first
```
If `git apply` fails (LLM diffs can drift), re-create the change from the winner's `approach` + `patch` as a precise spec (a normal edit), then **run the tests/build to verify** (the patch was untested at generation time). **Never finalize without confirmation** — ask the user to accept the winner, pick a different implementation, or re-run. Surface the test result as evidence.
