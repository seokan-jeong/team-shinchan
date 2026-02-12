---
name: team-shinchan:review
description: Code review and verification with Action Kamen. Used for "review", "check my code", "verify" requests.
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
- List all issues found with severity (CRITICAL/HIGH/MEDIUM/LOW)
- Provide specific file:line references
- Give actionable fix recommendations
- Final verdict: APPROVED ✅ or REJECTED ❌

User request: ${args || '(Please describe what to review)'}
`
)
```

**STOP HERE. The above Task handles everything.**
