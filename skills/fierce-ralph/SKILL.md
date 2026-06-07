---
name: team-shinchan:fierce-ralph
description: Deterministic loop-until-done for high-stakes long-running tasks — a worker/verifier loop the script bounds by iteration cap, token budget, and stagnation, closed by an Action-Kamen gate. Opt-in main-loop Workflow tier.
user-invocable: false
---

# EXECUTE IMMEDIATELY

Fierce ralph is a main-loop **Workflow** whose loop condition is owned by the SCRIPT, not narrated by an agent: a worker does the next unit of work, a verifier independently checks progress + completion against the real repo, and it repeats until done — bounded by a hard iteration cap, a token budget, and a stagnation limit, then closed by an Action-Kamen final gate. The Task path (`team-shinchan:ralph`, Kazama's narrated boulder loop) can *describe* "don't stop until done"; this tier *enforces* it deterministically. Use ONLY for high-stakes, genuinely long-running work where a stalled or prematurely-stopped loop is costly. The cheap default stays `team-shinchan:ralph`.

## Step 0: Validate + opt-in

- This skill calls the **Workflow tool** (main-loop only). Invoking `/team-shinchan:fierce-ralph` IS the opt-in. **Never delegate to a subagent** — `workflow()` throws inside a Task child.
- If args lack a clear goal: ask the user for the goal (and success criteria) and **STOP**. If > 2000 chars: truncate + warn.
- The loop spawns file-editing agents and is token-heavy — recommend the user set a budget (e.g. append a `+500k`-style target) so the loop is bounded.

## Step 1: Resolve goal + personas (main loop — the script can't read files)

- **Goal**: the task to drive to completion (from args). If a workflow doc exists, pass its path as `progressDoc` so the verifier checks ACs there (e.g. `.shinchan-docs/{DOC_ID}/PROGRESS.md`).
- **Personas (DRY)**: resolve worker + verifier personas from the agent files and pass them in `args` (the runtime can't load plugin subagents):
  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js kazama actionkamen
  ```

## Step 2: Run the fierce-ralph Workflow

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/fierce-ralph/fierce-ralph.workflow.js",
  args: {
    goal: "<the task to complete, with success criteria>",
    progressDoc: ".shinchan-docs/{DOC_ID}/PROGRESS.md",   // optional
    maxIterations: 20,                                     // capped at 20 (default 20 when the user did not specify)
    workerPersona: "<workflow-personas.js kazama>",
    judgePersona: "<workflow-personas.js actionkamen>"
  }
})
```

Each iteration: **Loop** (worker edits files toward the goal) → **Verify** (verifier runs tests/checks ACs, reports `done` + `progressed`). The script stops on done, the iteration cap, `budget.remaining()` hitting the reserve, or `STAGN_LIMIT` (3) consecutive no-progress iterations — then a **Gate** (Action Kamen) runs the final check. Returns `{ goal, iterations, loop_done, stop_reason, stagnated, budget_exhausted, completed, gate, history }`. `completed` is **deterministic**: true only if the loop reached `done` AND the gate shows `verdict APPROVED && tests_pass && goal_met && no blockers`.

## Step 3: Record the run artifact

Compute the next index `NNN` from `.shinchan-docs/ralph-runs/RALPH-*.json` (zero-padded, start 001) and write the full return value plus an ISO timestamp to `.shinchan-docs/ralph-runs/RALPH-{NNN}.json`.

## Step 4: Present + confirm

Present: **completed** ✅/❌, **stop_reason** (completed / max_iterations / stagnation / budget_exhausted), **iterations** run, the **gate** verdict + evidence + blockers, and a one-line-per-iteration **history** (progressed?/summary). If not completed, surface the blockers and the last `next` step. **Never claim done without confirmation** — ask the user to accept, continue (re-run with a higher `maxIterations`/budget), or hand back to `/team-shinchan:ralph`. An **APPROVED** gate counts as completion evidence for `team-shinchan:verification-before-completion`.
