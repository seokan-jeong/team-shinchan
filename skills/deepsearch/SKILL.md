---
name: team-shinchan:deepsearch
description: Deep codebase exploration with Shiro(Explorer) and Masumi(Librarian). Used for "find", "where is", "search" requests.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like to search for?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Tasks

**Do not read further. Execute these Tasks NOW:**

```typescript
// Step 1: Fast Search (Shiro)
Task(
  subagent_type="team-shinchan:shiro",
  model="haiku",
  prompt=`/team-shinchan:deepsearch has been invoked.

## Codebase Exploration Request

Perform fast search:
- File name pattern matching
- Keyword search
- Directory structure analysis

Search target: ${args || '(What to search)'}
`
)

// Step 2: Deep Search if needed (Masumi)
// Call additionally if Shiro results are insufficient
Task(
  subagent_type="team-shinchan:masumi",
  model="sonnet",
  prompt=`Perform deep analysis based on Shiro search results:
- Code content analysis
- Related documentation search
- Dependency tracking

Search target: ${args || '(What to search)'}
`
)
```

**STOP HERE. The above Tasks handle everything.**
