---
name: team-shinchan:plan
description: Create systematic work plans with Nene(Planner). Used for "plan", "design" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:nene",
  model="opus",
  prompt=`/team-shinchan:plan has been invoked.

## Planning Request

Create a systematic work plan:

1. Requirements interview (goals, constraints, priorities)
2. Hidden requirements and risk analysis
3. Phase breakdown and acceptance criteria definition
4. Planning document creation

## Quality Standards

- 80%+ of claims include file/line references
- 90%+ of acceptance criteria are testable
- No ambiguous terms allowed
- All risks include mitigation plans

User request: ${args || '(Please describe what to plan)'}
`
)
```

**STOP HERE. The above Task handles everything.**
