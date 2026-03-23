#!/bin/bash
# Team-Shinchan Pre-Compact Hook — Command Hook (PreCompact)
# Saves active workflow state snapshot before context compaction.
# Writes .shinchan-docs/pre-compact-state.json with { doc_id, stage, phase, ts }.
#
# NFR-7 / HR-4: exits 0 silently when .shinchan-docs/ is absent or no active workflow.
# NFR-6: synchronous file I/O only — must complete in <200ms.
set -eo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

# HR-4 / NFR-7: no .shinchan-docs/ → exit silently
if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

# Read stdin (PreCompact payload — may be empty JSON `{}`)
INPUT=$(cat)

# Find active WORKFLOW_STATE.yaml and write pre-compact-state.json
DOCS_DIR="$DOCS_DIR" PROJECT_ROOT="$PROJECT_ROOT" node -e "
const fs = require('fs');
const path = require('path');

const docsDir = process.env.DOCS_DIR;

// Scan for active workflow
let activeYaml = null;
let docId = null;
try {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true });
  for (const d of entries) {
    if (!d.isDirectory()) continue;
    if (d.name === 'archived') continue;
    const yamlPath = path.join(docsDir, d.name, 'WORKFLOW_STATE.yaml');
    try {
      const content = fs.readFileSync(yamlPath, 'utf-8');
      if (/status:\s*active/.test(content)) {
        // Prefer most recently modified when multiple active workflows exist
        if (!activeYaml || fs.statSync(yamlPath).mtimeMs > fs.statSync(activeYaml).mtimeMs) {
          activeYaml = yamlPath;
          docId = d.name;
        }
      }
    } catch(e) {}
  }
} catch(e) {
  process.exit(0);
}

// NFR-7: no active workflow → exit silently
if (!activeYaml) {
  process.exit(0);
}

// Parse stage and phase from WORKFLOW_STATE.yaml (strip comments first — MEMORY lesson)
let stage = 'unknown';
let phase = 'none';
try {
  const yamlContent = fs.readFileSync(activeYaml, 'utf-8');
  const yamlNoComments = yamlContent.replace(/#.*/g, '');
  const stageMatch = yamlNoComments.match(/^\s*stage:\s*(.+)$/m);
  const phaseMatch = yamlNoComments.match(/^\s*phase:\s*(.+)$/m);
  if (stageMatch) stage = stageMatch[1].trim().replace(/[\"']/g, '');
  if (phaseMatch) {
    const raw = phaseMatch[1].trim().replace(/[\"']/g, '');
    if (raw) phase = raw;
  }
} catch(e) {}

// Write pre-compact-state.json
const state = {
  doc_id: docId,
  stage: stage,
  phase: phase,
  ts: new Date().toISOString()
};

const outPath = path.join(docsDir, 'pre-compact-state.json');
try {
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
  console.log('[Pre-Compact] State saved: doc_id=' + docId + ' stage=' + stage + ' phase=' + phase);
} catch(e) {
  // Write failure is non-fatal — exit 0 per NFR-7
  process.exit(0);
}
" 2>/dev/null || true

exit 0
