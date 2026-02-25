---
name: team-shinchan:budget
description: View and manage workflow turn budgets. Show status, set limits, or reset counters.
user-invocable: true
---

# Budget Skill

**View and manage turn budget for the active workflow.**

## Usage

```bash
/team-shinchan:budget                    # Show current budget status
/team-shinchan:budget --set total=200    # Set total turn budget
/team-shinchan:budget --set phase=50     # Set phase turn budget
/team-shinchan:budget --reset            # Reset used counters to 0
/team-shinchan:budget --reset phase      # Reset only phase counter
```

## Arguments

| Arg | Default | Description |
|-----|---------|-------------|
| (none) | — | Show current budget status table |
| `--set total=N` | — | Set total turn budget to N |
| `--set phase=N` | — | Set phase turn budget to N |
| `--reset` | — | Reset both used_total and used_phase to 0 |
| `--reset phase` | — | Reset only used_phase to 0 |

## Process

### Step 1: Find Active Workflow

Look for `.shinchan-docs/*/WORKFLOW_STATE.yaml` files. Use the most recently modified one.

If no workflow state found:
```
No active workflow found.
Start a workflow with /team-shinchan:start to enable budget tracking.
```

### Step 2: Handle --set

If `--set total=N` or `--set phase=N` is provided:

1. Read the WORKFLOW_STATE.yaml
2. Ensure `budget` section exists; create if missing:
   ```yaml
   budget:
     total: 200
     phase: 50
     used_total: 0
     used_phase: 0
   ```
3. Update the specified field (`total` or `phase`) with the given value N
4. Write back to WORKFLOW_STATE.yaml
5. Display confirmation:
   ```
   Budget updated: {field} set to {N}
   ```

### Step 3: Handle --reset

If `--reset` is provided:

1. Read the WORKFLOW_STATE.yaml
2. If `--reset phase`: set `budget.used_phase` to 0
3. If `--reset` (no qualifier): set both `budget.used_total` and `budget.used_phase` to 0
4. Write back to WORKFLOW_STATE.yaml
5. Display confirmation:
   ```
   Budget counters reset.
   ```

### Step 4: Display Status (default)

1. Read the WORKFLOW_STATE.yaml
2. If no `budget` section:
   ```
   No budget configured for this workflow.
   Use /team-shinchan:budget --set total=200 to configure.
   ```
3. Read current session ID from `.shinchan-docs/.session-id`
4. Count current session turns from `.shinchan-docs/work-tracker.jsonl`
   - Filter events by current session ID
   - Count events where type is: `tool_use`, `file_change`, `delegation`
5. Calculate effective usage:
   ```
   effective_total = budget.used_total + session_turns
   effective_phase = budget.used_phase + session_turns
   ```
6. Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Budget Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Metric       | Used | Max | Pct   | Status  |
|--------------|------|-----|-------|---------|
| Total turns  | {effective_total} | {total} | {pct}% | {status} |
| Phase turns  | {effective_phase} | {phase} | {pct}% | {status} |

Session turns (current): {session_turns}
Accumulated (previous):  total={used_total}, phase={used_phase}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Status values:
- `On Track` — under 80%
- `WARNING` — 80% to 99%
- `EXCEEDED` — 100% or above

## Important

- Budget is per-workflow, stored in WORKFLOW_STATE.yaml
- Turn counting uses work-tracker.jsonl events as proxy
- The budget-guard hook enforces limits automatically during execution
- Phase budget resets are manual (use `--reset phase` when advancing phases)
