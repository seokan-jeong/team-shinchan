#!/bin/bash
# Team-Shinchan Session Init — Command Hook (SessionStart)
# Loads KB, learnings, detects interrupted workflows, checks regressions.
#
# This runs as a command hook so it ALWAYS executes.
# Output is injected into LLM context.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

OUTPUT=""

# ── 1. KB Summary ────────────────────────────────────────────────────
KB_FILE="${DOCS_DIR}/kb-summary.md"
if [ -f "$KB_FILE" ]; then
  PATTERNS=$(grep -c '^\- \*\*' "$KB_FILE" 2>/dev/null || true)
  PATTERNS="${PATTERNS:-0}"
  DECISIONS=$(grep -c 'Decision' "$KB_FILE" 2>/dev/null || true)
  DECISIONS="${DECISIONS:-0}"
  OUTPUT="${OUTPUT}📚 [Team-Shinchan] Knowledge Base loaded (${PATTERNS} patterns, ${DECISIONS} decisions)\n"
fi

# ── 2. Learnings ─────────────────────────────────────────────────────
LEARN_FILE="${DOCS_DIR}/learnings.md"
if [ -f "$LEARN_FILE" ]; then
  COUNT=$(grep -c '^### \[' "$LEARN_FILE" 2>/dev/null || true)
  COUNT="${COUNT:-0}"
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    # Extract last 5 learning titles
    ITEMS=$(grep "^### \[" "$LEARN_FILE" 2>/dev/null | tail -5 | sed 's/^### /• /')
    OUTPUT="${OUTPUT}📚 [Team-Shinchan] Loaded ${COUNT} learnings from memory\n${ITEMS}\n💡 Applying these learnings to this session.\n"
  fi
fi

# ── 3. Interrupted Workflows ─────────────────────────────────────────
for yaml in "$DOCS_DIR"/*/WORKFLOW_STATE.yaml; do
  [ -f "$yaml" ] || continue
  if grep -q "status: active" "$yaml" 2>/dev/null; then
    DOC_ID=$(basename "$(dirname "$yaml")")
    STAGE=$(grep "stage:" "$yaml" 2>/dev/null | head -1 | sed 's/.*stage: *//' | tr -d '"')
    PHASE=$(grep "phase:" "$yaml" 2>/dev/null | head -1 | sed 's/.*phase: *//' | tr -d '"')
    OUTPUT="${OUTPUT}⚠️ [Team-Shinchan] Interrupted workflow detected!\n📁 ${DOC_ID}: Stage ${STAGE}, Phase ${PHASE}\n▶️ Resume with: /team-shinchan:resume ${DOC_ID}\n"
  fi
done

# ── 4. Regression Alert ──────────────────────────────────────────────
EVAL_FILE="${DOCS_DIR}/eval-history.jsonl"
if [ -f "$EVAL_FILE" ] && command -v node &>/dev/null; then
  REGRESSION_CHECK=$(node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('${EVAL_FILE}', 'utf-8').trim().split('\n').filter(Boolean);
    const records = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const agents = {};
    for (const r of records) {
      if (!r.agent || !r.scores) continue;
      if (!agents[r.agent]) agents[r.agent] = [];
      agents[r.agent].push(r.scores);
    }
    const alerts = [];
    for (const [agent, scores] of Object.entries(agents)) {
      if (scores.length < 5) continue;
      const last5 = scores.slice(-5);
      const latest = scores[scores.length - 1];
      for (const dim of ['correctness','efficiency','compliance','quality']) {
        const avg = last5.reduce((s, sc) => s + (sc[dim] || 0), 0) / last5.length;
        if (latest[dim] < avg - 1) alerts.push(agent + ': ' + dim + ' dropped to ' + latest[dim] + ' (avg: ' + avg.toFixed(1) + ')');
      }
    }
    if (alerts.length > 0) console.log(alerts.join('\n'));
  " 2>/dev/null || echo "")

  if [ -n "$REGRESSION_CHECK" ]; then
    OUTPUT="${OUTPUT}⚠️ [Team-Shinchan] Performance regression detected:\n${REGRESSION_CHECK}\n"
  fi
fi

# ── Output ───────────────────────────────────────────────────────────
if [ -n "$OUTPUT" ]; then
  echo -e "$OUTPUT"
fi

exit 0
