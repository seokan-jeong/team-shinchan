---
name: budget-guard
description: Track turn usage against budget limits and warn at 80%, block at 100%
event: PreToolUse
---

# Budget Guard

**Runs BEFORE every tool use. Enforces budget limits when configured.**

## Logic

1. Find `.shinchan-docs/*/WORKFLOW_STATE.yaml` (use most recent if multiple)
2. If NOT found → ALLOW (no active workflow)
3. Parse the `budget` section from the workflow state
4. If NO `budget` section exists → ALLOW (budget not configured, backward compatible)
5. Read `.shinchan-docs/work-tracker.jsonl` and count events for current session
6. Read current session ID from `.shinchan-docs/.session-id`
7. Compare turn count against budget limits

## Budget Section Format

The `budget` section in WORKFLOW_STATE.yaml:

```yaml
budget:
  total: 200        # Max turns for entire workflow
  phase: 50         # Max turns for current phase
  used_total: 0     # Accumulated total (updated by session-wrap)
  used_phase: 0     # Accumulated for current phase (updated by session-wrap)
```

## Turn Counting

A "turn" is approximated by counting events in `.shinchan-docs/work-tracker.jsonl` where:
- `session` matches the current session ID (from `.shinchan-docs/.session-id`)
- `type` is one of: `tool_use`, `file_change`, `delegation`

Current session turns are added to `used_total` and `used_phase` from the YAML.

## Thresholds

Calculate effective usage:

```
effective_total = budget.used_total + current_session_turns
effective_phase = budget.used_phase + current_session_turns
total_pct = (effective_total / budget.total) * 100
phase_pct = (effective_phase / budget.phase) * 100
```

Use the HIGHER of `total_pct` and `phase_pct` for threshold checks.

### At 80% (WARNING)

If either `total_pct >= 80` or `phase_pct >= 80` (but neither >= 100):

**Action**: WARN with message:
```
BUDGET WARNING: Approaching limit.
  Total: {effective_total}/{budget.total} turns ({total_pct}%)
  Phase: {effective_phase}/{budget.phase} turns ({phase_pct}%)
  Remaining: ~{remaining} turns before limit.
Prioritize completing current task. Consider saving progress.
```

Where `remaining` = minimum of `(budget.total - effective_total)` and `(budget.phase - effective_phase)`.

### At 100% (EXCEEDED)

If either `total_pct >= 100` or `phase_pct >= 100`:

**Action**: WARN with message:
```
BUDGET EXCEEDED: Turn limit reached.
  Total: {effective_total}/{budget.total} turns ({total_pct}%)
  Phase: {effective_phase}/{budget.phase} turns ({phase_pct}%)
ACTION REQUIRED: Save current state to WORKFLOW_STATE.yaml and PROGRESS.md, then stop.
Use /team-shinchan:budget --reset to start a new budget cycle if needed.
```

## Priority

Budget guard runs AFTER security-check and deny-check (security takes precedence). Budget warnings are advisory — they do NOT block tool calls, but strongly urge the agent to wrap up.

## Error Handling

- Missing `.session-id` file → assume 0 current session turns, ALLOW
- Missing `work-tracker.jsonl` → assume 0 current session turns, ALLOW
- Malformed budget section → skip budget check, ALLOW
- Budget values of 0 or negative → skip budget check, ALLOW
