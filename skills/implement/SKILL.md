---
name: team-shinchan:implement
description: Quick code implementation with Bo. Used for "implement", "code this", "write code", "fix" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like me to implement?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:bo",
  model="sonnet",
  prompt=`/team-shinchan:implement has been invoked.

## Implementation Request

Handle coding tasks including:

| Area | Capabilities |
|------|-------------|
| Feature Implementation | New features, functions, classes |
| Bug Fixes | Debugging, error correction |
| Code Modification | Refactoring, updates, changes |
| Utilities | Helper functions, utilities |
| Tests | Unit tests, integration tests |

## Implementation Requirements

- Read existing code first to understand patterns
- Follow project conventions
- Write clean, maintainable code
- Handle errors gracefully
- Keep functions small and focused
- Add comments only for complex logic

## Output Format

After implementation:
- Summary of changes made
- Files modified with line references
- Any follow-up recommendations

User request: ${args || '(Please describe what to implement)'}
`
)
```

**STOP HERE. The above Task handles everything.**
