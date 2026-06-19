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

## Step 2: Review — default to the fierce-review Workflow (main loop)

Quality-first: a single agent juggling all five dimensions in one context under-attends the later ones and never re-checks its own findings. When `/team-shinchan:review` runs in the **main loop**, the adversarial multi-dimension Workflow is the **default** — independent per-dimension agents, a non-skippable per-finding refutation, completeness + interaction critics, and a deterministic 3-lens judge panel.

1. Resolve `scope` + `files` (git diff), pick the rubric from `${CLAUDE_PLUGIN_ROOT}/agents/_shared/eval-rubrics.json`, and resolve Action Kamen's persona via `node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js actionkamen` — exactly as `team-shinchan:fierce-review` Step 1 specifies. Also resolve `node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js --learnings actionkamen` and inject it as `args.learnings` (mirror fierce-review; distinct from `args.persona` — FR-5/AC-8).
2. Launch the Workflow (`deepen` defaults to true):
   ```
   Workflow({
     scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/fierce-review/fierce-review.workflow.js",
     args: { scope: "<one-line scope>", files: ["<path>", "..."], baseRef: "main",
             rubric: { /* object from eval-rubrics.json */ },
             persona: "<string from workflow-personas.js actionkamen>",
             learnings: "<string from workflow-personas.js --learnings actionkamen>" }
   })
   ```
3. Record + present per `team-shinchan:fierce-review` Steps 3–4 (write `.shinchan-docs/reviews/REVIEW-{NNN}.json`; an APPROVED artifact counts as code-review evidence for `team-shinchan:verification-before-completion`). Never finalize without user confirmation.

## Fallback: single-pass Task (ONLY where the Workflow legally can't run)

`workflow()` throws inside a Task child, and a Workflow can't be fired from a hook (HARD INVARIANT). So **only** when this skill is reached by **delegation into a subagent** (e.g. Shinnosuke/Action Kamen invoked it) or from a **hook**, skip the Workflow and run the single Action-Kamen Task below — the one remaining cheap single-pass path.

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

**STOP HERE.**
