---
name: team-shinchan:research
description: Use when you need web research, documentation lookup, or knowledge gathering.
user-invocable: false
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

## Step 1b: Detect Mode

Parse mode from args:
- If args starts with `youtube ` or `article ` or `auto `: extract mode as first word, remainder is the URL/query.
- If no mode keyword: mode = `auto` for URLs (args starts with `http`), else mode = `search` (standard web search).

Modes `youtube`, `article`, `auto` require a URL. If mode detected but no URL found, ask: "Please provide a URL for {mode} extraction."

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:masumi",
  model="sonnet",
  prompt=`/team-shinchan:research has been invoked.

## Research Request

Mode: ${mode}  <!-- youtube | article | auto | search -->
URL/Query: ${target}

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
