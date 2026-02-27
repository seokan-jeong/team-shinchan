---
name: ontology-auto-build
description: Auto-build or update project ontology at session start
event: SessionStart
---

# Ontology Auto-Build Hook

At session start, automatically build or update the project's ontology for enhanced context.

## Process

### 1. Check Ontology Existence

Check if `.shinchan-docs/ontology/ontology.json` exists in the current project (CWD).

### 2A. No Ontology — Full Build

If ontology.json does NOT exist:

1. Display: `🔬 [Ontology] No ontology found. Auto-building...`
2. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js init`
3. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-scanner.js ${PWD} --format json > /tmp/ontology-scan.json`
4. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js merge /tmp/ontology-scan.json`
5. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js gen-kb`
6. Write current timestamp to `.shinchan-docs/ontology/.last-scan`
7. Proceed to **Step 3: Health Check & Report**.

### 2B. Ontology Exists — Incremental Update

If ontology.json EXISTS:

1. Read `.shinchan-docs/ontology/.last-scan` for last scan timestamp
2. Check git status for changes since last scan:
   - Run: `git log --oneline --since="$(cat .shinchan-docs/ontology/.last-scan)" 2>/dev/null | wc -l`
3. If changes detected (count > 0):
   - Display: `🔬 [Ontology] Updating with recent changes...`
   - Get last scan commit: `git log -1 --format=%H --before="$(cat .shinchan-docs/ontology/.last-scan)" 2>/dev/null`
   - Run incremental scan: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-scanner.js ${PWD} --incremental <commit> --format json > /tmp/ontology-scan.json`
   - Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js merge /tmp/ontology-scan.json`
   - Update `.shinchan-docs/ontology/.last-scan`
   - Proceed to **Step 3: Health Check & Report**.
4. If no changes:
   - Display: `🔬 [Ontology] Up to date`
   - Proceed to **Step 3: Health Check & Report** (show summary only, skip health details).

### 3. Health Check & Report (ALWAYS)

Run health check and display a user-friendly status report.

1. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js summary`
2. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js health`
3. Display the following report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 Project Ontology Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 {entityCount} entities | {relationCount} relations
   Modules: {module names}
   Components: {N} | APIs: {N} | DataModels: {N} | Tests: {N}

🏥 Health: {total}/100
   Connectivity:  {score}/25 {bar}
   Test Coverage: {score}/25 {bar}
   Documentation: {score}/25 {bar}
   Modularity:    {score}/25 {bar}
{suggestions if health < 70}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Where `{bar}` is a visual bar using block characters:
- 20-25: `████████` (excellent)
- 15-19: `██████░░` (good)
- 10-14: `████░░░░` (fair)
- 0-9:   `██░░░░░░` (needs attention)

4. **If health < 70**: Display top 2 suggestions from health check.
5. **If health >= 70**: Display nothing extra (clean report).
6. **If this was a full build (2A)**: Append `✅ First build complete!` to the report.
7. **If this was an incremental update (2B with changes)**: Append `🔄 Updated with {N} new commits` to the report.

### 4. Verify Build Integrity

After build or update (NOT on "up to date"), verify:

1. **Entity check**: `entityCount > 0` — if zero entities after a build, display:
   ```
   ⚠️ [Ontology] Build produced 0 entities. This project may not have recognizable code patterns.
   ```
2. **Relation check**: if `relationCount == 0` but `entityCount > 5`, display:
   ```
   ⚠️ [Ontology] No relations detected between {N} entities. Dependency analysis will be limited.
   ```
3. **Scanner error check**: if the scan output file is empty or invalid JSON, display:
   ```
   ⚠️ [Ontology] Scanner produced invalid output. Ontology may be incomplete.
   ```

## Graceful Degradation

- If Node.js scripts fail, skip silently — never block session start
- If git commands fail (not a git repo), skip incremental, do full scan
- If `.shinchan-docs/` doesn't exist yet, create it
- Display errors as warnings, never as errors that interrupt flow

## Execution Notes

- This hook runs AFTER load-kb in the SessionStart sequence
- Total execution should be fast: < 5 seconds for incremental, < 15 seconds for full build
- All paths use `${CLAUDE_PLUGIN_ROOT}` for plugin scripts, `${PWD}` for project root
