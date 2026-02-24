---
name: team-shinchan:work-log
description: Query work tracker JSONL events. Filter by recency, agent, event type, or session ID.
user-invocable: true
---

# Work Log Skill

**View and query events from the work tracker log.**

## Usage

```bash
/team-shinchan:work-log                     # Last 20 events
/team-shinchan:work-log --last 50           # Last 50 events
/team-shinchan:work-log --agent bo          # Events for agent bo
/team-shinchan:work-log --type file_change  # Only file_change events
/team-shinchan:work-log --session session-1234-abcd  # Events for session
```

## Arguments

| Arg | Default | Description |
|-----|---------|-------------|
| `--last N` | 20 | Number of recent events to show |
| `--agent {name}` | (all) | Filter by agent name |
| `--type {event_type}` | (all) | Filter by event type |
| `--session {id}` | (all) | Filter by session ID |

## Process

### Step 1: Read Tracker File

Read `.shinchan-docs/work-tracker.jsonl`

If file doesn't exist:
```
No work tracker log found.
Events will be recorded automatically during Claude Code sessions.
```

### Step 2: Parse and Filter

1. Read all lines from the JSONL file
2. Parse each line as JSON: `{"ts","type","agent","session","data"}`
3. Apply filters (--agent, --type, --session) if specified
4. Take the last N entries (default 20)

### Step 3: Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Work Log ({N} events)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{ts} | {type} | agent:{agent} | {data summary}
{ts} | {type} | agent:{agent} | {data summary}
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: {total} events in log
Showing: last {N} (filtered: {filters applied})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Event Types

| Type | Source | Description |
|------|--------|-------------|
| `session_start` | SessionStart hook | New Claude Code session |
| `session_end` | SessionEnd hook | Session ended |
| `agent_start` | SubagentStart hook | Agent invoked |
| `agent_done` | SubagentStop hook | Agent completed |
| `delegation` | PostToolUse (Task) | Agent delegated to another |
| `file_change` | PostToolUse (Edit/Write) | File created or modified |
| `tool_use` | PostToolUse (other) | Other tool used |
| `user_prompt` | UserPromptSubmit | User sent a prompt |
| `stop` | Stop hook | Execution stopped |

## Important

- Log file: `.shinchan-docs/work-tracker.jsonl`
- Auto-rotated at 10,000 lines (archived to `.jsonl.gz`)
- One JSON object per line
- Session IDs tracked via `.shinchan-docs/.session-id`
