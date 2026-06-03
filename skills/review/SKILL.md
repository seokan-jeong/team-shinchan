---
name: team-shinchan:review
description: Use when you need code review, verification, or quality checks on your work.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like me to review? (code changes, file paths, or describe what to check)"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Escalation: Tier 1 (this skill) vs Tier 2 (fierce-review)

This skill (Action Kamen via Task — thorough, cheap, auto-triggerable, delegatable) is **Tier 1** and the default. For **high-stakes scope**, escalate to **Tier 2 — `team-shinchan:fierce-review`** (a deterministic main-loop Workflow with independent per-dimension agents, a non-skippable per-finding refutation, a completeness critic, and a schema-validated rubric judge that reuses `eval-rubrics.json`).

| Stay on Tier 1 (this skill) | Escalate to fierce-review |
|---|---|
| Routine change, single file, quick check | Pre-release diff, security / payment / auth boundary, data-loss path |
| One thorough pass is acceptable | You want guaranteed per-dimension coverage + adversarial per-finding verification |
| Auto-triggered or delegated, cheap | Explicit user opt-in only (Workflow can't fire silently or from a subagent) |

**Never silently jump to Tier 2** — on a high-stakes scope, finish this review, then offer the opt-in; the user launches `/team-shinchan:fierce-review`.

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:actionkamen",
  model="opus",
  prompt=`/team-shinchan:review has been invoked.

## Code Review Request

Perform thorough review covering:

| Category | Check Items |
|----------|-------------|
| Correctness | Logic errors, edge cases, expected behavior |
| Security | Vulnerabilities, input validation, auth issues |
| Performance | N+1 queries, memory leaks, bottlenecks |
| Code Quality | Readability, maintainability, conventions |
| Tests | Coverage, test quality, missing tests |

## Review Output Requirements

- Show review process in real-time
- List all issues found with severity (CRITICAL/HIGH -> MUST fix; MEDIUM -> SHOULD fix; LOW -> COULD fix)
- Provide specific file:line references
- Give actionable fix recommendations
- Final verdict: APPROVED ✅ or REJECTED ❌
- If REJECTED: list specific issues that must be fixed, ordered by severity

User request: ${args || '(Please describe what to review)'}
`
)
```

**STOP HERE. The above Task handles everything.**
