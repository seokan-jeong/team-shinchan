---
name: workflow-guard
description: Enforce workflow stage rules by checking WORKFLOW_STATE.yaml before tool use
event: PreToolUse
---

# Workflow Guard
<!-- Hard Guardrail Matrix — Architectural Constraint -->

**Runs BEFORE every tool use. Enforces stage restrictions.**

## Logic

1. Find `.shinchan-docs/*/WORKFLOW_STATE.yaml` (use most recent if multiple)
2. If NOT found → ALLOW (no active workflow)
3. Parse `current.stage` → check matrix below → BLOCK or ALLOW

## Stage-Tool Matrix

| Tool | requirements | planning | execution | completion |
|------|:---:|:---:|:---:|:---:|
| Read/Glob/Grep/Task | OK | OK | OK | OK |
| AskUserQuestion | OK | OK | OK | BLOCK |
| Edit | BLOCK | BLOCK | OK | BLOCK |
| Write | BLOCK* | BLOCK | OK | docs only** |
| TodoWrite | BLOCK | BLOCK | OK | BLOCK |
| Bash | BLOCK | BLOCK | OK | BLOCK |

## Exceptions (ALWAYS ALLOWED regardless of stage)

- **Write/Edit to `.shinchan-docs/`** — workflow state, interview docs, REQUESTS.md, PROGRESS.md, WORKFLOW_STATE.yaml
- **Bash `mkdir -p .shinchan-docs/`** — creating workflow folders

These exceptions exist because `.shinchan-docs/` is workflow infrastructure, not project code.

## Absolute Rule

In requirements/planning: Edit, Write, Bash, TodoWrite targeting **project code** = **BLOCK.**
`.shinchan-docs/` writes are exempt (see Exceptions above).

## Stage 1 Interpretation Guard

User requests like "do X", "add feature" → add to REQUESTS.md, never implement.

## Block Message

`BLOCKED. Stage: {stage}. Tool: {tool} FORBIDDEN. Return to {stage}-appropriate action.`

## Advancement Conditions

- **requirements**: REQUESTS.md + Problem Statement + AC + User approval
- **planning**: PROGRESS.md + Phase breakdown + per-phase AC
- **completion**: RETROSPECTIVE.md + IMPLEMENTATION.md + Final review

## Error Handling

State file missing/corrupt/invalid → default to "requirements" stage, warn user.
Suggest: `/team-shinchan:resume` or `/team-shinchan:start`
