---
name: team-shinchan:deepsearch
description: Deep codebase exploration with Shiro(Explorer) and Masumi(Librarian). Used for "find", "where is", "search" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

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
