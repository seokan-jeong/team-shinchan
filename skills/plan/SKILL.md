---
name: team-shinchan:plan
description: Create systematic work plans with Nene(Planner). Used for "plan", "design" requests.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What would you like to plan?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

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

## Output Format

Create PROGRESS.md containing:
- Phased plan with numbered phases (Phase 1, Phase 2, ...)
- Each phase: goals, file changes, acceptance criteria (checkboxes), assigned agent
- Dependencies between phases
- Risk assessment with mitigations

User request: ${args || '(Please describe what to plan)'}
`
)
```

**STOP HERE. The above Task handles everything.**
