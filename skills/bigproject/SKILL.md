---
name: team-shinchan:bigproject
description: Large-scale project orchestration with Himawari. Used for "big project", "multi-phase", "complex implementation" requests.
user-invocable: false
---

# EXECUTE IMMEDIATELY

**Output immediately before executing:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 [Himawari] Large-scale project mode engaged! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What large-scale project would you like to tackle?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Evaluate Scope

**This skill is for large projects meeting ANY of these criteria:**

| Criteria | Threshold |
|----------|-----------|
| Phases | 3+ phases |
| Files | 20+ files affected |
| Domains | 3+ domains (frontend + backend + infra) |
| Duration | Multi-session effort |

If the project doesn't meet these criteria, recommend using `/team-shinchan:start` instead.

## Step 3: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:himawari",
  model="opus",
  prompt=`/team-shinchan:bigproject has been invoked.

## Large-Scale Project Orchestration Request

Manage complex projects including:

| Responsibility | Actions |
|----------------|---------|
| Decomposition | Break into manageable phases |
| Dependencies | Identify cross-cutting concerns |
| Allocation | Assign right agents to tasks |
| Tracking | Monitor overall progress |
| Coordination | Manage specialist teams |

## Project Structure Requirements

1. **Scope Analysis**: Understand full project scope
2. **Phase Planning**: Create logical phases with dependencies
3. **Resource Mapping**: Assign specialists to each phase
4. **Risk Assessment**: Identify potential blockers
5. **Progress Tracking**: Set up monitoring

## Output Format

- Project overview and scope assessment
- Phased implementation plan
- Agent assignments per phase
- Risk mitigation strategy
- Success criteria per phase

User request: ${args || '(Please describe the large-scale project)'}
`
)
```

**STOP HERE. The above Task handles everything.**
