---
name: team-shinchan:frontend
description: Frontend development with Aichan. Used for "UI", "component", "React", "CSS", "styling" requests.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What frontend work would you like me to do?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:aichan",
  model="sonnet",
  prompt=`/team-shinchan:frontend has been invoked.

## Frontend Development Request

Handle frontend tasks including:

| Area | Capabilities |
|------|-------------|
| Components | React, Vue, Angular components |
| Styling | CSS, Tailwind, styled-components |
| Accessibility | WCAG compliance, a11y best practices |
| Responsive | Mobile-first, breakpoints, layouts |
| Performance | Bundle size, lazy loading, optimization |

## Implementation Requirements

- Follow existing project conventions
- Ensure responsive design
- Include accessibility attributes
- Write clean, reusable components
- Add appropriate comments for complex logic

User request: ${args || '(Please describe the frontend task)'}
`
)
```

**STOP HERE. The above Task handles everything.**
