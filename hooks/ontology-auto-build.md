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
6. Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js summary`
7. Write current timestamp to `.shinchan-docs/ontology/.last-scan`
8. Display summary: `🔬 [Ontology] Built: {N} entities, {M} relations`

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
   - Display: `🔬 [Ontology] Updated: +{N} entities, +{M} relations`
4. If no changes:
   - Display: `🔬 [Ontology] Up to date ({N} entities, {M} relations)`

### 3. Load Summary to Context

After build or update, display a brief ontology context:
```
🔬 [Ontology] {entityCount} entities, {relationCount} relations
   Modules: {list of module names}
   Domains: {list of unique domains}
   Top components: {top 5 most connected}
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
