---
name: team-shinchan:analyze
description: Deep analysis of code, bugs, performance, architecture with Hiroshi(Oracle). Used for "analyze", "debug", "why isn't it working" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:hiroshi",
  model="opus",
  prompt=`/team-shinchan:analyze has been invoked.

## Deep Analysis Request

Perform the following types of analysis:

| Type | Analysis Content |
|------|----------|
| Code Analysis | Structure, dependencies, complexity |
| Bug Analysis | Error cause, stack trace, reproduction conditions |
| Performance Analysis | Bottlenecks, memory, optimization strategies |
| Architecture Analysis | Overall structure, improvements, tradeoffs |

## Result Requirements

- Current state summary
- Issues discovered
- Recommended solutions
- Related file and line references

User request: ${args || '(Please describe what to analyze)'}
`
)
```

**STOP HERE. The above Task handles everything.**
