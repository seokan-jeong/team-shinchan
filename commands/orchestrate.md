---
description: Explicitly invoke Shinnosuke to orchestrate a complex task
---

# Orchestrate Command

Explicitly calls Shinnosuke (Main Orchestrator) to coordinate a complex task across multiple specialist agents.

## When to Use

- Complex tasks requiring multiple agents
- When you want explicit orchestration control
- Large features or refactoring projects

## Usage

```
/team-shinchan:orchestrate [task description]
```

## What Happens

1. **Shinnosuke** analyzes the task
2. Creates a TODO breakdown
3. Delegates to specialist agents:
   - **Bo** (Executor) - Code writing
   - **Aichan** (Frontend) - UI/UX
   - **Bunta** (Backend) - API/DB
   - **Masao** (DevOps) - Infrastructure
   - **Hiroshi** (Oracle) - Deep analysis
   - **Nene** (Planner) - Planning
4. Runs tasks in parallel when possible
5. **Action Kamen** (Reviewer) verifies completion

## Example

```
/team-shinchan:orchestrate Build a user authentication system with login, signup, and password reset
```

Shinnosuke will:
1. Break down into phases (DB schema, API endpoints, UI components)
2. Delegate DB work to Bunta
3. Delegate UI work to Aichan
4. Delegate API work to Bunta
5. Have Action Kamen review everything
