---
name: team-shinchan:requirements
description: Hidden requirements analysis with Misae. Used for "what am I missing", "risks", "edge cases", "before I start" requests.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What feature or task would you like me to analyze for hidden requirements?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:misae",
  model="sonnet",
  prompt=`/team-shinchan:requirements has been invoked.

## Hidden Requirements Analysis Request

Analyze the request to discover:

| Category | Analysis Focus |
|----------|----------------|
| Hidden Requirements | Unstated needs, implicit expectations |
| Edge Cases | Boundary conditions, unusual inputs |
| Risks | Potential problems, failure scenarios |
| Dependencies | Prerequisites, blocking items |
| Scope | Clarifications needed, ambiguities |

## Analysis Areas

- Error handling scenarios
- Performance implications
- Security considerations
- User experience impacts
- Maintenance burden
- Integration points

## Output Requirements

- Show analysis process in real-time
- List all hidden requirements found
- Prioritize risks by impact
- Provide specific recommendations
- Note any clarifications needed from user

User request: ${args || '(Please describe what to analyze)'}
`
)
```

**STOP HERE. The above Task handles everything.**
