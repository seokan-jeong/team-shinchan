---
name: team-shinchan:research
description: Research and documentation with Masumi (Librarian). Use for web research, documentation lookup, and knowledge gathering.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like to research?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:masumi",
  model="sonnet",
  prompt=`/team-shinchan:research has been invoked.

## Research Request

Conduct thorough research and provide:

| Section | Content |
|---------|---------|
| Key Findings | Main discoveries with sources |
| Documentation | Relevant docs and reference links |
| Best Practices | Recommended approaches |
| Caveats | Potential concerns or limitations |

User request: ${args || '(Please describe what to research)'}
`
)
```

**STOP HERE. The above Task handles everything.**
