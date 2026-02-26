---
name: session-wrap
description: Generate session summary from Work Tracker logs
event: Stop
---

# Session Wrap

**Automatically generate a quantitative session summary at session end.**

## When to Trigger

- The work tracker log (`.shinchan-docs/work-tracker.jsonl`) exists and has entries for the current session
- Skip if no tracker file exists or the file is empty

## Process

### 1. Read Session Data

1. Read the current session ID from `.shinchan-docs/.session-id`
   - If file does not exist, skip summary generation (no active session tracked)
2. Read `.shinchan-docs/work-tracker.jsonl`
   - Parse each line as JSON: `{"ts", "type", "agent", "session", "data"}`
3. Filter events where `event.session` matches the current session ID
   - If zero events match, skip summary generation

### 2. Compute Metrics

From the filtered session events, calculate:

| Metric | How |
|--------|-----|
| **Duration** | First event `ts` to last event `ts`. Format as `{start} - {end} ({N} minutes)` |
| **Agents invoked** | Count unique non-null `agent` values from `agent_start` events. Build `{agent: count}` map. |
| **Files changed** | Count events where `type === "file_change"`. Deduplicate by `data.file` path. |
| **Delegations** | Count events where `type === "delegation"`. |
| **Events total** | Total count of all filtered events. |

### 3. Build Agent Activity Table

For each unique agent seen in `agent_start` events:

| Agent | Invocations | Last Action |
|-------|-------------|-------------|
| {agent} | {count of agent_start for this agent} | {summary of last event involving this agent} |

### 4. Build Key Events List

Select up to 15 notable events (prioritize `agent_start`, `delegation`, `file_change`, `stop`; skip repetitive `tool_use`).

Format each as:
```
- {HH:MM}: {type} — {brief description from data}
```

### 5. Determine Output Path

- Check if an active workflow document exists: look for `.shinchan-docs/*/PROGRESS.md` files with `status: active` in frontmatter
  - If found, extract the `doc_id` from the directory name. Output path: `.shinchan-docs/{doc_id}/SESSION_SUMMARY.md`
- If no active workflow: Output path: `.shinchan-docs/SESSION_SUMMARY.md`

### 6. Write Summary File

Write the summary to the determined output path using this template:

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

### 6b. Budget Status (conditional)

If the active workflow has a `budget` section in WORKFLOW_STATE.yaml, add a Budget Status section to the summary. If no budget section exists, skip this entirely.

1. Read `budget.total`, `budget.phase`, `budget.used_total`, `budget.used_phase` from WORKFLOW_STATE.yaml
2. Calculate session turns (same count as step 2 — events where type is `tool_use`, `file_change`, or `delegation`)
3. Calculate effective totals:
   ```
   effective_total = budget.used_total + session_turns
   effective_phase = budget.used_phase + session_turns
   ```
4. Determine status for each: `On Track` (<80%), `WARNING` (80-99%), `EXCEEDED` (>=100%)
5. Append to the summary template:

```markdown
## Budget Status
| Metric | Used | Max | Pct | Status |
|--------|------|-----|-----|--------|
| Total turns | {effective_total} | {budget.total} | {pct}% | {status} |
| Phase turns | {effective_phase} | {budget.phase} | {pct}% | {status} |

Session turns: {session_turns}
```

6. Update WORKFLOW_STATE.yaml: set `budget.used_total = effective_total` and `budget.used_phase = effective_phase` to persist accumulated counts for the next session.

### 7. Ontology Refresh

If file_change events exist AND `.shinchan-docs/ontology/ontology.json` exists, run:
```bash
node ${CLAUDE_PLUGIN_ROOT}/src/ontology-scanner.js "${PWD}" --format json > /tmp/ont-rescan.json && \
node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js merge /tmp/ont-rescan.json && \
node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js gen-kb
```
Append `Ontology: refreshed` to confirmation. Skip silently if either condition unmet.

### 8. Confirm

Output a brief confirmation:
```
[Session Wrap] Summary saved to {output_path}
  Duration: {N} minutes | Agents: {count} | Files: {count} | Events: {count}
```

## Rules

- Do NOT fail if work-tracker.jsonl is missing or empty; silently skip
- Do NOT modify the work-tracker.jsonl file
- Overwrite any existing SESSION_SUMMARY.md (each session produces a fresh summary)
- Keep the summary concise; the auto-retrospective hook will consume it next
