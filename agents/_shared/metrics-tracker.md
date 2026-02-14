# Workflow Metrics Tracker

Standardized metrics tracking for all Team-Shinchan workflows. Referenced by agents during stage transitions.

---

## WORKFLOW_STATE.yaml Metrics Section

Every workflow includes a `metrics:` section that tracks timing, agent usage, and quality data.

### Schema

```yaml
metrics:
  workflow:
    total_duration_minutes: null    # Set on completion
    stages_completed: 0             # 0-4

  stages:
    requirements:
      start: "{timestamp}"
      end: null
      duration_minutes: null
    planning:
      start: null
      end: null
      duration_minutes: null
    execution:
      start: null
      end: null
      duration_minutes: null
      phases_planned: 0
      phases_completed: 0
      review_pass_rate: null        # e.g., "6/6"
    completion:
      start: null
      end: null
      duration_minutes: null

  agents:
    # Populated as agents are invoked
    # agent_name: {invocations: N, phases: [1, 2, 3]}
```

---

## When to Update Metrics

| Event | Who Updates | What to Update |
|-------|-------------|----------------|
| Stage transition | Shinnosuke/Orchestrator | `stages.{stage}.end`, `stages.{next_stage}.start`, `stages_completed++` |
| Phase start | Executor agent | `stages.execution.phases_planned` if first phase |
| Phase complete | Action Kamen | `stages.execution.phases_completed++` |
| Agent invocation | Calling agent | `agents.{name}.invocations++` |
| Workflow complete | Masumi | `workflow.total_duration_minutes`, all final calculations |

---

## Stage Transition Protocol

When transitioning stages, the orchestrator updates WORKFLOW_STATE.yaml:

```yaml
# Example: requirements → planning transition
metrics:
  stages:
    requirements:
      end: "2026-02-07T12:30:00Z"
      duration_minutes: 30
    planning:
      start: "2026-02-07T12:30:00Z"
  workflow:
    stages_completed: 1
```

---

## Metrics Summary Format

At workflow completion, `/status` displays:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Workflow Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Total Duration: {N} minutes
📋 Stages Completed: {N}/4

Stage Breakdown:
  Requirements: {N} min
  Planning:     {N} min
  Execution:    {N} min ({phases} phases, {pass_rate} review pass)
  Completion:   {N} min

Agents Used: {agent_count}
  {agent1}: {N} invocations
  {agent2}: {N} invocations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Retrospective Auto-Metrics

Masumi generates a metrics section in RETROSPECTIVE.md from WORKFLOW_STATE.yaml:

```markdown
## Workflow Metrics (Auto-generated)

| Metric | Value |
|--------|-------|
| Total Duration | {N} minutes |
| Stages Completed | {N}/4 |
| Phases | {planned} planned, {completed} completed |
| Review Pass Rate | {pass}/{total} |
| Agents Invoked | {count} unique agents |
| Debates Triggered | {count} |
```

---

## Dogfooding Feedback

After workflow completion, prompt for optional feedback:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Workflow Complete - Quick Feedback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rate this workflow (optional):
1. Were any stages unnecessary? (Y/N)
2. Did the agent selection feel right? (Y/N)
3. Any friction points? (describe)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Feedback is appended to `.shinchan-docs/feedback.md` for future analysis.
