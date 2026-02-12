---
name: team-shinchan:backend
description: Backend development with Bunta. Used for "API", "database", "server", "endpoint" requests.
user-invocable: true
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

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:bunta",
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

**STOP HERE. The above Task handles everything.**
