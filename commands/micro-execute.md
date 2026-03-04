---
description: Micro-task execution with per-task two-stage review (spec compliance + code quality)
---

# Micro-Execute Command

Break implementation into 2-3 minute micro-tasks with fresh subagents and two-stage review per task.

See `skills/micro-execute/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:micro-execute [plan file path or task description]
```

## Examples

```
/team-shinchan:micro-execute                           # Use active workflow's PROGRESS.md
/team-shinchan:micro-execute .shinchan-docs/main-034/PROGRESS.md  # Execute specific plan
/team-shinchan:micro-execute "Add user authentication with JWT"   # Generate plan + execute
```

## How It Works

1. Breaks work into 2-3 minute micro-tasks
2. For each task: fresh implementer subagent executes
3. Spec compliance review: did it build exactly what was specified?
4. Code quality review: is the code well-built?
5. Fix loop if issues found (max 2 retries)
6. Final integration review after all tasks complete

ARGUMENTS: $ARGUMENTS
