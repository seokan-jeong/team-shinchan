---
name: load-kb
description: Load knowledge base, learnings, and detect interrupted workflows at session start
event: SessionStart
---

# Load Knowledge Base Hook

At session start, load KB summary, past learnings, and detect any interrupted workflows.
Loading is **phase-aware**: when an active workflow exists, only relevant context is loaded.

## Process

### 0. Detect Active Workflow and Phase

1. **Scan**: Check `.shinchan-docs/*/WORKFLOW_STATE.yaml` files.
2. **Find**: The most recent file with `status: active`.
3. **Extract**: `current.stage` and `current.phase` from the active workflow.
4. If no active workflow → load everything (full mode, backward compatible).

### 1. Load KB Summary

- **Skip if**: Stage is `execution` (not needed during coding).
- Read `.shinchan-docs/kb-summary.md` if it exists.
- Display: `📚 [Team-Shinchan] Knowledge Base loaded ({N} patterns, {M} decisions)`

### 2. Load Learnings

- Read `.shinchan-docs/learnings.md` if it exists.
- **Stage-aware filtering**:
  - `requirements`: Load only `convention` and `preference` categories
  - `planning`: Load `pattern` and `convention` categories
  - `execution`: Load `pattern` and `mistake` categories (most relevant to coding)
  - `completion`: Load all categories
  - No active workflow: Load all (last 20, high-confidence first)
- Display top 5 items.

### 3. Ontology Summary + GC

1. Read `.shinchan-docs/ontology/ontology.json` if it exists.
2. Run GC: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js gc` (cleans stale entities).
3. The ontology status report is displayed by `ontology-auto-build.md` (runs after this hook). Do not duplicate it here.
4. **KB Freshness**: If `kb-summary.md` is older than `ontology.json`, regenerate it:
   - Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js gen-kb`

### 4. Regression Alert

- **Skip if**: Stage is `requirements` or `planning`.
- Read `.shinchan-docs/eval-history.jsonl` if it exists.
- Scan for regressions (moving average method).
- Display if found: `!! [Team-Shinchan] Performance regression detected: Agent: {agent}`

### 5. Detect Interrupted Workflows

1. Check `.shinchan-docs/*/WORKFLOW_STATE.yaml` files.
2. Filter: `status: active` (not the current one if resuming).
3. Display if found:
```
⚠️ [Team-Shinchan] Interrupted workflow detected!
📁 {doc_id}: Stage {stage}, Phase {phase}
▶️ Resume with: /team-shinchan:resume {doc_id}
```

### 6. Phase-Specific Context (Execution Only)

If stage is `execution` and a phase number is known:
1. Read `.shinchan-docs/{doc_id}/PROGRESS.md`
2. Extract only the `## Phase {N}` section's acceptance criteria
3. Display: `🎯 Phase {N} AC: {brief summary}`
4. This replaces loading the full KB during execution.

## State Migration Check

If a WORKFLOW_STATE.yaml with `version:` (not `schema_version:`) is found:
- Run: `node ${CLAUDE_PLUGIN_ROOT}/src/state-migrator.js migrate <path>`
- Display: `🔄 [State] Migrated workflow state to schema v2`

## Execution Order

1. Detect Active Workflow (first — determines loading strategy)
2. State Migration (if needed)
3. KB Summary (conditional)
4. Learnings (stage-filtered)
5. Ontology Summary + GC (conditional)
6. Regression Alert (conditional)
7. Interrupted Workflows (last — highest priority alert)
8. Phase-Specific Context (execution only)

## Graceful Degradation

- All files are optional. Each step is independent.
- If no active workflow → full load (backward compatible).
- Missing files → skip silently.
