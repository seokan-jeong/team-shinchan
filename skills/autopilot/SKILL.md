---
name: autopilot
description: Autonomously completes from requirements analysis to verification without user intervention. Used for "auto", "automatically", "autopilot" requests.
user-invocable: true
---

# Autopilot Skill

## Features

- Misae(Metis) auto-analyzes requirements
- Nene(Planner) creates work plan
- Shinnosuke(Orchestrator) distributes tasks to agents
- Multiple agents execute in parallel
- Action Kamen(Reviewer) verifies results
- Auto-fixes on issues found

## Agent Collaboration Flow

1. **Misae** → Requirements analysis
2. **Nene** → Plan creation
3. **Shinnosuke** → Task distribution
4. **Bo/Aichan/Bunta** → Parallel execution
5. **Action Kamen** → Verification

## Workflow Checklist

```
[ ] Requirements analysis (Misae)
[ ] Work plan creation (Nene)
[ ] Task distribution (Shinnosuke)
[ ] Parallel execution (Specialists)
[ ] Quality verification (Action Kamen)
[ ] Auto-fix (if needed)
```

## Completion Notification

When all tasks complete:
- Show completed task list
- Show modified files list
- Suggest next steps
