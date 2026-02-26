---
name: team-shinchan:session-summary
description: Generate or view session summary from Work Tracker logs on demand.
user-invocable: false
---

# Session Summary Skill

**Generate a quantitative session summary from work tracker data.**

## Usage

```bash
/team-shinchan:session-summary                          # Current session
/team-shinchan:session-summary --session session-xxx    # Specific session
```

## Arguments

| Arg | Default | Description |
|-----|---------|-------------|
| `--session {id}` | current | Session ID to summarize (defaults to `.shinchan-docs/.session-id`) |

## Process

### Step 1: Resolve Session ID

- If `--session` provided, use that ID
- Otherwise, read `.shinchan-docs/.session-id` for the current session ID
- If no session ID found:
  ```
  No active session found. Use --session {id} to specify one.
  Available sessions can be found via: /team-shinchan:work-log
  ```

### Step 2: Read and Filter Events

1. Read `.shinchan-docs/work-tracker.jsonl`
   - If file does not exist:
     ```
     No work tracker log found.
     Events will be recorded automatically during Claude Code sessions.
     ```
2. Parse each line as JSON: `{"ts", "type", "agent", "session", "data"}`
3. Filter events where `event.session` matches the target session ID
4. If zero events match:
   ```
   No events found for session {id}.
   ```

### Step 3: Compute Metrics

From the filtered session events, calculate:

| Metric | How |
|--------|-----|
| **Duration** | First event `ts` to last event `ts`. Format as `{start} - {end} ({N} minutes)` |
| **Agents invoked** | Count unique non-null `agent` values from `agent_start` events. Build `{agent: count}` map. |
| **Files changed** | Count events where `type === "file_change"`. Deduplicate by `data.file` path. |
| **Delegations** | Count events where `type === "delegation"`. |
| **Events total** | Total count of all filtered events. |

### Step 4: Build and Display Summary

Display the summary in console AND save to file.

**Console output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session: {session_id}
Duration: {start_time} - {end_time} ({N} minutes)
Agents invoked: {count} ({agent: count, ...})
Files changed: {count}
Delegations: {count}
Events total: {count}

Agent Activity:
| Agent | Invocations | Last Action |
|-------|-------------|-------------|
| {agent} | {count} | {last event summary} |

Key Events:
- {HH:MM}: {type} - {description}
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Save to File

Determine output path:
- If active workflow exists (`.shinchan-docs/*/PROGRESS.md` with `status: active`): `.shinchan-docs/{doc_id}/SESSION_SUMMARY.md`
- Otherwise: `.shinchan-docs/SESSION_SUMMARY.md`

Write the summary using the same markdown template as `hooks/session-wrap.md`:

```markdown
# Session Summary
- **Session**: {session_id}
- **Duration**: {start_time} - {end_time} ({N} minutes)
- **Agents invoked**: {count} ({agent: count, ...})
- **Files changed**: {count}
- **Delegations**: {count}
- **Events total**: {count}

## Agent Activity
| Agent | Invocations | Last Action |
|-------|-------------|-------------|
| {agent} | {count} | {last event summary} |

## Key Events
- {HH:MM}: {type} - {description}
```

Confirm:
```
Summary saved to {output_path}
```

## Important

- This skill uses the same logic as the `session-wrap` Stop hook but is user-triggered
- Log file: `.shinchan-docs/work-tracker.jsonl`
- Session IDs tracked via `.shinchan-docs/.session-id`
