---
name: workflow-guard
description: Enforce workflow stage rules by checking WORKFLOW_STATE.yaml before tool use
event: PreToolUse
---

# Workflow Guard

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

*Stage 1 Write exception: ONLY `.shinchan-docs/*/WORKFLOW_STATE.yaml` allowed (interview state).
**Completion Write: ONLY `.shinchan-docs/**` or `*.md` files.

## Absolute Rule

In requirements/planning: Edit, Write, Bash, TodoWrite = **BLOCK. NO EXCEPTIONS.**
Even if user asks. Even if you think it's needed.

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
