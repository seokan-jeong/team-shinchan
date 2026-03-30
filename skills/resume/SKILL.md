---
name: team-shinchan:resume
description: Use when you need to resume an interrupted workflow from where it left off.
user-invocable: true
---

# team-shinchan:resume

Resume a paused/interrupted workflow by loading saved state and delegating to the appropriate agent.

## Step 0: Input Validation

If DOC_ID not provided:

**Active/Paused workflows:**
Scan `.shinchan-docs/*/WORKFLOW_STATE.yaml` (exclude `archived/` subfolder), filter
`status: active|paused`, display list.

**Archived workflows:**
Scan `.shinchan-docs/archived/*/*/WORKFLOW_STATE.yaml`, collect all entries.

Display combined output:
```
Active/Paused:
  1. {DOC_ID} ({status}, {stage})
  ...

Archived:
  A1. {DOC_ID} (expired, {stage}, archived {YYYY-MM})
  ...
```

If both lists empty: suggest `/team-shinchan:start`.

**If user selects an archived entry:**
1. Move `.shinchan-docs/archived/{YYYY-MM}/{DOC_ID}/` → `.shinchan-docs/{DOC_ID}/`
2. In WORKFLOW_STATE.yaml: set `status: paused`
3. Add history event:
   ```yaml
   - timestamp: "{ISO now}"
     event: unarchived
     agent: shinnosuke
     unarchived_at: "{ISO now}"
   ```
4. Proceed to Step 1 with the unarchived DOC_ID

**If DOC_ID provided directly:**
- Check `.shinchan-docs/{DOC_ID}/` first, then `.shinchan-docs/archived/*/{DOC_ID}/`
- If found in archived: unarchive (steps 1-3 above) before proceeding
- Error if not found anywhere: list available workflows

## Step 1: Load Context

1. Read `.shinchan-docs/{DOC_ID}/WORKFLOW_STATE.yaml`
   - Not found: error with list of available DOC_IDs
   - `status: completed`: inform user, suggest `/team-shinchan:start`
   - `status: blocked`: show blocker reason
2. Extract: `current_stage`, `current_phase`, `current_owner`

## Step 1.5: Load Handoff State (Conditional)

Check if `.shinchan-docs/pre-compact-state.json` exists (using Read tool).

**If file exists and readable**:
Parse the JSON and prepend the following block to the context header output in Step 4:

```
[Handoff] Completed: {completed_phases} | Pending: {pending_phases}
Last Decision: {last_decision|none}
Blocking Issues: {blocking_issues|none}
```

- `completed_phases`: array → join with `,`; string → display as-is
- `last_decision`: null → display `none`
- `blocking_issues`: null → display `none`

**If file does not exist or Read fails**: skip silently. Proceed to Step 2 without error.

**If JSON parse fails** (malformed content): skip silently. Proceed to Step 2 without error.

## Step 1.6: Load JSONL Checkpoint (Conditional)

Check if `.shinchan-docs/{DOC_ID}/work-tracker.jsonl` exists (using Read tool). If not found, also check `.shinchan-docs/work-tracker.jsonl` as fallback.

**If file exists**:

Read the last 32KB of the file (tail approach — do NOT read the full file to avoid memory issues on large JSONL logs). Scan lines in reverse order (last line first) for the first entry matching:
- `"event": "phase_complete"` or `"event": "task_complete"`

If a matching entry is found, parse it and store as `{jsonl_checkpoint}`.

Prepend the following block to the Step 4 output header (before the separator line):

```
[Checkpoint] Last: {jsonl_checkpoint.event} | Phase: {jsonl_checkpoint.phase|N/A} | Task: {jsonl_checkpoint.task|N/A} | At: {jsonl_checkpoint.timestamp|unknown}
```

**If file does not exist**: skip silently. Proceed to Step 2 without error.

**If Read fails or no matching event found**: skip silently. Proceed to Step 2 without error.

**If JSON parse fails on a line**: skip that line, continue scanning backward.

## Step 1.7: Backfill Missing ak_gate Block (Conditional)

Check if `current.ak_gate` is present in the loaded WORKFLOW_STATE.yaml.

**Do NOT overwrite existing ak_gate values.** This step only fills in absent fields.

**If `ak_gate` is entirely absent**: write the following default block under `current`:

```yaml
ak_gate:
  requirements:
    status: pending
    retry_count: 0
    last_rejection_reasons: []
  planning:
    status: pending
    retry_count: 0
    last_rejection_reasons: []
```

**If `ak_gate` is present but missing sub-fields** (e.g., `requirements` exists but `planning` is absent, or vice versa): add only the missing sub-fields using the same defaults above. Do NOT modify any sub-fields that already exist.

**If `ak_gate` is fully present with both `requirements` and `planning`**: skip silently. No changes needed.

After any write, proceed to Step 2 without error.

## Step 2: Load Documents

- **Always**: Read `.shinchan-docs/{DOC_ID}/REQUESTS.md` (warn if missing)
- **If stage >= planning**: Read `.shinchan-docs/{DOC_ID}/PROGRESS.md`
- **If requirements stage** with `current.interview`: extract step/collected_count/last_question for Nene handoff

## Step 3: Update State

Add `resumed` event to history, set `status: active`.

## Step 4: Output Status

If handoff state was loaded in Step 1.5, prepend the `[Handoff]` block before the separator:

```
[Handoff] Completed: 1,2 | Pending: 3
Last Decision: Use regex-only parser for PROGRESS.md
Blocking Issues: none
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ Workflow Resumed: {DOC_ID}
Stage: {current_stage} ({n}/4) | Phase: {current_phase|N/A} | Owner: {current_owner}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no handoff state (file absent or parse failed):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ Workflow Resumed: {DOC_ID}
Stage: {current_stage} ({n}/4) | Phase: {current_phase|N/A} | Owner: {current_owner}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 5: Delegate to Agent

| Stage | Agent | Model | Context |
|-------|-------|-------|---------|
| requirements | Nene | Opus | REQUESTS.md + interview state |
| planning | Nene | Opus | REQUESTS.md + PROGRESS.md |
| execution | Bo/Specialist | Sonnet | REQUESTS.md + PROGRESS.md + phase tasks |
| completion | Bo + Action Kamen | Sonnet + Opus | All docs |

**Execution routing**: frontend -> Aichan, backend -> Bunta, infra -> Masao, default -> Bo.

```typescript
Task(subagent_type="team-shinchan:{agent}", model="{model}",
  prompt="Resume {DOC_ID}. Stage: {stage}, Phase: {phase}.\n{context}\nContinue from: {last_action}")
```

## Error Recovery

| Error | Recovery |
|-------|----------|
| Missing folder | List available workflows |
| Corrupted YAML | Default: execution, owner: bo, phase: 1 |
| Missing REQUESTS.md | Suggest `/team-shinchan:start` |

## Rules

- Always execute, always read WORKFLOW_STATE.yaml first
- Never skip state update, never invoke agent without context, never continue if completed
