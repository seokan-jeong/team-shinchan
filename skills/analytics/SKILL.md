---
name: team-shinchan:analytics
description: Analyze work tracker JSONL data. Compute agent metrics, session stats, event distribution, and delegation graphs.
user-invocable: true
---

# Analytics Skill

**Analyze work tracker events for observability insights.**

## Usage

```bash
/team-shinchan:analytics                        # Current session summary
/team-shinchan:analytics --report full          # Full analytics report
/team-shinchan:analytics --agent bo             # Single agent detail
/team-shinchan:analytics --trace trace-xxx      # Trace timeline
/team-shinchan:analytics --period 7d            # Last 7 days only
```

## Arguments

| Arg | Default | Description |
|-----|---------|-------------|
| `--report full` | (session) | Generate full analytics report |
| `--agent {name}` | (all) | Detail for a single agent |
| `--trace {id}` | (none) | Timeline for a specific trace ID |
| `--period {N}d` | (all) | Filter events to the last N days |
| `--format table` | json | Output as text table instead of JSON |

## Process

### Step 1: Locate Tracker File

Use `.shinchan-docs/work-tracker.jsonl` as the data source.

If file does not exist:
```
No work tracker log found.
Events will be recorded automatically during Claude Code sessions.
```

### Step 2: Run Analytics Script

Execute the analytics script via Bash:

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/analytics.js" .shinchan-docs/work-tracker.jsonl [options]
```

Map user arguments to script flags:
- `--report full` → no extra flags (full report is default)
- `--agent <name>` → `--agent <name>`
- `--trace <id>` → `--trace <id>`
- `--period <N>d` → `--period <N>d`
- Default (no args) → `--format table`

### Step 3: Display Results

- For `--format table` or default: display the text table output directly
- For JSON output: format and display key sections with headers

### Step 4: Interpret Results

After displaying raw output, provide a brief interpretation:
- Highlight busiest agents
- Note any agents with low success rates
- Summarize delegation patterns
- Flag anomalies (e.g. agents with 0 completions)

## Metrics Computed

| Metric | Description |
|--------|-------------|
| **Agent call count** | How many times each agent was invoked |
| **Avg duration** | Average time from agent_start to agent_done |
| **Success rate** | Ratio of agent_done to agent_start |
| **Session stats** | Events, file changes, delegations per session |
| **Event distribution** | Percentage breakdown of event types |
| **Delegation graph** | Which agent delegated to which, with counts |

## Important

- Analytics script: `src/analytics.js` (Node.js, built-in modules only)
- Data source: `.shinchan-docs/work-tracker.jsonl`
- Trace IDs: generated per user prompt via `trace-init` hook
