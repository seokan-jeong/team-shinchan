---
name: team-shinchan:backend
description: Use when you need backend development for APIs, databases, servers, or endpoints.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What backend work would you like me to do?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 1.5: Linear Sync — START (In Progress)

Before dispatching, run the **START → In Progress** transition per
`agents/_shared/linear-sync.md`: detect a Linear issue in `args`/branch, confirm it
with `get_issue`, and if real move it to In Progress. No-op if no Linear issue / Linear
MCP unavailable — never block the work.

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:buriburi",
  model="sonnet",
  prompt=`/team-shinchan:backend has been invoked.

## Backend Development Request

Handle backend tasks including:

| Area | Capabilities |
|------|-------------|
| API Design | REST, GraphQL endpoints |
| Database | Schema design, migrations, queries |
| Server Logic | Business logic, validation, processing |
| Security | Authentication, authorization, input sanitization |
| Integration | Third-party APIs, webhooks, services |

## Implementation Requirements

- Follow RESTful conventions
- Implement proper error handling
- Validate all inputs
- Use parameterized queries (prevent SQL injection)
- Add appropriate logging
- Follow existing project patterns

User request: ${args || '(Please describe the backend task)'}
`
)
```

**After the Task returns successfully**, run the **FINISH → In Review** transition per
`agents/_shared/linear-sync.md` for the same issue (no-op if not Linear-based), then STOP.

**STOP HERE. The above Task handles everything.**
