#!/bin/bash
# Team-Shinchan Ontology Auto-Build — Command Hook (SessionStart)
# Automatically builds or updates the project ontology and displays a health report.
#
# This runs as a command hook so it ALWAYS executes — not dependent on LLM following instructions.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"
ONTO_DIR="${DOCS_DIR}/ontology"
ONTO_FILE="${ONTO_DIR}/ontology.json"
LAST_SCAN="${ONTO_DIR}/.last-scan"
ENGINE="${PLUGIN_ROOT}/src/ontology-engine.js"
SCANNER="${PLUGIN_ROOT}/src/ontology-scanner.js"
MIGRATOR="${PLUGIN_ROOT}/src/state-migrator.js"
TMP_SCAN="/tmp/ontology-scan-$$.json"

# Ensure .shinchan-docs exists
mkdir -p "$DOCS_DIR"

# ── State Migration ──────────────────────────────────────────────────
# Migrate any old WORKFLOW_STATE.yaml files
if command -v node &>/dev/null && [ -f "$MIGRATOR" ]; then
  for yaml in "$DOCS_DIR"/*/WORKFLOW_STATE.yaml; do
    [ -f "$yaml" ] || continue
    if grep -q "^version:" "$yaml" 2>/dev/null && ! grep -q "^schema_version:" "$yaml" 2>/dev/null; then
      node "$MIGRATOR" migrate "$yaml" >/dev/null 2>&1 || true
    fi
  done
fi

# ── Ontology Build ───────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  exit 0
fi

if [ ! -f "$ENGINE" ] || [ ! -f "$SCANNER" ]; then
  exit 0
fi

BUILD_TYPE="none"

if [ ! -f "$ONTO_FILE" ]; then
  # Full build
  BUILD_TYPE="full"
  node "$ENGINE" init >/dev/null 2>&1 || true
  node "$SCANNER" "$PROJECT_ROOT" --format json > "$TMP_SCAN" 2>/dev/null || true
  if [ -s "$TMP_SCAN" ]; then
    node "$ENGINE" merge "$TMP_SCAN" >/dev/null 2>&1 || true
  fi
  node "$ENGINE" gen-kb >/dev/null 2>&1 || true
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SCAN" 2>/dev/null || true
else
  # Check for changes since last scan
  CHANGES=0
  if [ -f "$LAST_SCAN" ] && command -v git &>/dev/null; then
    LAST_TS=$(cat "$LAST_SCAN" 2>/dev/null || echo "")
    if [ -n "$LAST_TS" ]; then
      CHANGES=$(git log --oneline --since="$LAST_TS" 2>/dev/null | wc -l | tr -d ' ')
    fi
  fi

  if [ "$CHANGES" -gt 0 ]; then
    BUILD_TYPE="incremental"
    node "$SCANNER" "$PROJECT_ROOT" --format json > "$TMP_SCAN" 2>/dev/null || true
    if [ -s "$TMP_SCAN" ]; then
      node "$ENGINE" merge "$TMP_SCAN" >/dev/null 2>&1 || true
    fi
    node "$ENGINE" gen-kb >/dev/null 2>&1 || true
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SCAN" 2>/dev/null || true
  else
    BUILD_TYPE="uptodate"
  fi
fi

# ── GC ───────────────────────────────────────────────────────────────
node "$ENGINE" gc >/dev/null 2>&1 || true

# ── Health Report ────────────────────────────────────────────────────
# Generate report that gets injected into LLM context via stdout
REPORT=$(node -e "
const engine = require('${ENGINE}');
const root = '${PROJECT_ROOT}';
const onto = engine.load(root);
if (!onto) { process.exit(0); }

const s = engine.summary(root);
const h = engine.healthScore(root);
if (!s || !h) { process.exit(0); }

const bar = (score) => {
  if (score >= 20) return '████████';
  if (score >= 15) return '██████░░';
  if (score >= 10) return '████░░░░';
  return '██░░░░░░';
};

const typeDist = s.typeDist || {};
const lines = [
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '🔬 Project Ontology Status',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '📊 ' + s.entityCount + ' entities | ' + s.relationCount + ' relations',
];

// Module names
const modules = onto.entities.filter(e => e.type === 'Module').map(e => e.name);
if (modules.length > 0) lines.push('   Modules: ' + modules.join(', '));

// Type breakdown
const types = [];
if (typeDist.Component) types.push('Components: ' + typeDist.Component);
if (typeDist.API) types.push('APIs: ' + typeDist.API);
if (typeDist.DataModel) types.push('DataModels: ' + typeDist.DataModel);
if (typeDist.TestSuite) types.push('Tests: ' + typeDist.TestSuite);
if (types.length > 0) lines.push('   ' + types.join(' | '));

lines.push('');
lines.push('🏥 Health: ' + h.total + '/100');
lines.push('   Connectivity:  ' + h.scores.connectivity + '/25 ' + bar(h.scores.connectivity));
lines.push('   Test Coverage: ' + h.scores.testCoverage + '/25 ' + bar(h.scores.testCoverage));
lines.push('   Documentation: ' + h.scores.documentation + '/25 ' + bar(h.scores.documentation));
lines.push('   Modularity:    ' + h.scores.modularity + '/25 ' + bar(h.scores.modularity));

if (h.total < 70 && h.suggestions.length > 0) {
  lines.push('');
  lines.push('💡 Suggestions:');
  h.suggestions.slice(0, 2).forEach(s => lines.push('   - ' + s));
}

const buildType = '${BUILD_TYPE}';
if (buildType === 'full') lines.push('✅ First build complete!');
else if (buildType === 'incremental') lines.push('🔄 Updated with recent changes');

// Integrity warnings
if (s.entityCount === 0) {
  lines.push('⚠️ Build produced 0 entities. This project may not have recognizable code patterns.');
} else if (s.relationCount === 0 && s.entityCount > 5) {
  lines.push('⚠️ No relations detected between ' + s.entityCount + ' entities.');
}

lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(lines.join('\\n'));
" 2>/dev/null || echo "")

# Clean up
rm -f "$TMP_SCAN"

if [ -n "$REPORT" ]; then
  echo "$REPORT"
fi

exit 0
