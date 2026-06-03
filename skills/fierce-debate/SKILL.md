---
name: team-shinchan:fierce-debate
description: Deterministic adversarial debate for high-stakes or irreversible decisions — mandatory refutation plus a scored judge panel. Opt-in main-loop Workflow tier.
user-invocable: false
---

# EXECUTE IMMEDIATELY

Fierce debate is a main-loop **Workflow** that GUARANTEES adversarial stress-testing — a non-skippable refutation round and schema-validated output that rejects empty dissent. The Midori/Task path (`team-shinchan:debate`) can only *request* this at the prompt level; this tier *enforces* it. Use ONLY for irreversible / high-stakes decisions (schema migration, public API contract, security boundary, data-loss risk). The cheap consensus default stays `team-shinchan:debate`.

## Step 0: Validate + opt-in

- If args lack a topic or fewer than 2 competing options: ask the user for the decision and the options, then STOP.
- This skill calls the **Workflow tool**, which is main-loop only. Invoking `/team-shinchan:fierce-debate` IS the explicit opt-in. **Never delegate this skill to a subagent** (Midori/Shinnosuke) — `workflow()` throws inside a Task child.

## Step 1: Check past decisions

Read `.shinchan-docs/debate-decisions.md`. If an Active decision matches the topic, ask the user to reuse it or re-debate (carry the prior decision as context). This is the SAME ledger Midori uses.

## Step 2: Run the fierce-debate Workflow

Give each option a `persona` — a ROLE/EXPERTISE descriptor drawn from the matching team-shinchan agent. (The Workflow runtime cannot load plugin subagents, so the persona is **injected into the prompt**, not passed as `agentType`.) Map each option to a lens — Backend/API → Bunta; Frontend/UI → Aichan; DevOps/Infra → Masao; Architecture/general → Hiroshi; hidden requirements → Misae — then resolve that agent's persona string from its definition (DRY) with `node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js <agent>` and pass it as the option's `persona`. Then call the Workflow tool with the shipped script:

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/fierce-debate/fierce-debate.workflow.js",
  args: {
    topic: "<the decision>",
    category: "<architecture|security|performance|tech-selection>",
    options: [
      // persona = the string printed by `workflow-personas.js <agent>` for the option's lens
      { label: "<Option A>", persona: "<output of workflow-personas.js hiroshi>" },
      { label: "<Option B>", persona: "<output of workflow-personas.js misae>" }
    ]
  }
})
```

The script runs: advocates (max case per option) → **mandatory** cross-refutation (every advocate attacks every other option, never skipped) → an Action-Kamen-prompted rubric judge. It returns `{ verdict: { scores, winner, rationale, dissenting_views }, advocates, refutations }`.

## Step 3: Record to the unified ledger

Append a `[DECISION-NNN]` entry to `.shinchan-docs/debate-decisions.md` using the shared format in `${CLAUDE_PLUGIN_ROOT}/agents/_shared/debate-decisions.md` — with **Tier: fierce** plus Refutations, Judge Scores, Winner, and a non-empty Dissent. Write the transcript to `.shinchan-docs/debates/DECISION-{NNN}.json`. If `.shinchan-docs/ontology/ontology.json` exists, suggest a Decision entity (same as Midori). **Never fork the ledger or schema.**

## Step 4: Confirm

Present the winner, the score table, and the surviving dissent. Ask the user to accept. **Never finalize without confirmation** — on disagreement, re-run or revise reflecting their concern.
