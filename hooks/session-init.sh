#!/bin/bash
# Team-Shinchan Session Init — Command Hook (SessionStart)
# Loads KB, learnings, detects interrupted workflows, checks regressions.
#
# This runs as a command hook so it ALWAYS executes.
# Output is injected into LLM context.
set -eo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

OUTPUT=""

# ── 1. KB Summary (tier-aware if node available) ──────────────────────
KB_FILE="${DOCS_DIR}/kb-summary.md"
if [ -f "$KB_FILE" ]; then
  PATTERNS=$(grep -c '^\- \*\*' "$KB_FILE" 2>/dev/null || true)
  PATTERNS="${PATTERNS:-0}"
  DECISIONS=$(grep -c 'Decision' "$KB_FILE" 2>/dev/null || true)
  DECISIONS="${DECISIONS:-0}"

  # Tier-aware excerpt: critical sections first, then procedural
  KB_EXCERPT=""
  if command -v node &>/dev/null; then
    KB_EXCERPT=$(KB_FILE="$KB_FILE" node -e "
const fs = require('fs');
const raw = fs.readFileSync(process.env.KB_FILE, 'utf-8');
// Split on tier markers: '## Tier: critical', '## Tier: procedural', etc.
const sections = raw.split(/^##\s+Tier:\s*/im).filter(Boolean);
if (sections.length <= 1) { process.exit(0); } // No tier structure — skip
const sorted = sections.sort((a, b) => {
  const tierA = a.match(/^(\w+)/)?.[1]?.toLowerCase() || 'procedural';
  const tierB = b.match(/^(\w+)/)?.[1]?.toLowerCase() || 'procedural';
  const order = { critical: 0, preference: 1, procedural: 2, tool: 3 };
  return (order[tierA] ?? 2) - (order[tierB] ?? 2);
});
// Output first 10 lines of each tier section (summary only)
const excerpt = sorted.map(s => s.trim().split('\n').slice(0, 10).join('\n')).join('\n---\n');
console.log(excerpt);
" 2>/dev/null || true)
  fi

  OUTPUT="${OUTPUT}📚 [Team-Shinchan] Knowledge Base loaded (${PATTERNS} patterns, ${DECISIONS} decisions)\n"
  if [ -n "$KB_EXCERPT" ]; then
    OUTPUT="${OUTPUT}${KB_EXCERPT}\n"
  fi
fi

# ── 2. Learnings (tier-aware + relevance scoring) ────────────────────
LEARN_FILE="${DOCS_DIR}/learnings.md"
if [ -f "$LEARN_FILE" ]; then
  COUNT=$(grep -c '^### \[' "$LEARN_FILE" 2>/dev/null || true)
  COUNT="${COUNT:-0}"
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    # Try relevance-scored loading via node; fall back to recency
    ITEMS=""
    if command -v node &>/dev/null; then
      ITEMS=$(LEARN_FILE="$LEARN_FILE" DOCS_DIR="$DOCS_DIR" node -e "
const fs = require('fs');
const path = require('path');
const learnFile = process.env.LEARN_FILE;
const docsDir = process.env.DOCS_DIR;

// Parse learnings: split on '---' separator
const raw = fs.readFileSync(learnFile, 'utf-8');
const blocks = raw.split(/\n---\n/).filter(b => /^### \[/.test(b.trim()));
if (blocks.length === 0) { process.exit(0); }

const entries = blocks.map((b, idx) => {
  const titleMatch = b.match(/^### \[(\w+)\]\s*(.+)/m);
  const tierMatch = b.match(/\*\*Tier\*\*:\s*(\w+)/);
  const confMatch = b.match(/\*\*Confidence\*\*:\s*(\w+)/);
  const tagsMatch = b.match(/\*\*Tags\*\*:\s*(.+)/);
  return {
    idx,
    category: titleMatch ? titleMatch[1] : '',
    title: titleMatch ? titleMatch[2].trim() : b.trim().slice(0, 60),
    tier: tierMatch ? tierMatch[1] : 'procedural',
    confidence: confMatch ? confMatch[1] : 'medium',
    tags: tagsMatch ? tagsMatch[1].toLowerCase().replace(/#/g,'').split(/[,\s]+/).filter(Boolean) : []
  };
});

// Find active workflow
let stage = '';
let contextKw = [];
let relevanceOff = false;
try {
  const dirs = fs.readdirSync(docsDir, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const yp = path.join(docsDir, d.name, 'WORKFLOW_STATE.yaml');
    try {
      const yc = fs.readFileSync(yp, 'utf-8');
      if (/status:\s*active/.test(yc)) {
        const sm = yc.match(/stage:\s*(\w+)/);
        if (sm) stage = sm[1];
        if (/load_kb_relevance:\s*false/.test(yc)) relevanceOff = true;
        // Read REQUESTS.md for context keywords
        const rp = path.join(docsDir, d.name, 'REQUESTS.md');
        try {
          const rc = fs.readFileSync(rp, 'utf-8').slice(0, 200).toLowerCase();
          contextKw = rc.split(/[\s,.:;()\[\]{}#*|]+/).filter(w => w.length > 3);
        } catch(e) {}
        break;
      }
    } catch(e) {}
  }
} catch(e) {}

// Fallback: recency-based loading
if (relevanceOff || !stage) {
  const top5 = entries.slice(-5).reverse();
  const out = top5.map(e => '• [' + e.tier + '] ' + e.title + ' [' + e.confidence + ']');
  console.log(out.join('\n'));
  process.exit(0);
}

// Stage category preferences
const stageCats = {
  requirements: ['convention','preference'],
  planning: ['pattern','convention'],
  execution: ['pattern','mistake'],
  completion: ['preference','pattern','convention','mistake','decision','insight']
};
const preferred = stageCats[stage] || [];

// Tier weights
const tierW = { preference: 3, procedural: 2, tool: (stage === 'execution' ? 1 : 0) };

// Score each entry
for (const e of entries) {
  const tw = tierW[e.tier] !== undefined ? tierW[e.tier] : 2;
  const cm = preferred.includes(e.category) ? 1 : 0;
  const to = e.tags.filter(t => contextKw.includes(t)).length;
  e.score = (tw * 3) + (cm * 2) + (to * 1);
}

// Sort: score desc, then index desc (recency)
entries.sort((a, b) => b.score - a.score || b.idx - a.idx);

// Filter: skip tool-tier in non-execution stages
const filtered = entries.filter(e => !(e.tier === 'tool' && stage !== 'execution'));
const top5 = filtered.slice(0, 5);
const out = top5.map(e => '• [' + e.tier + '] ' + e.title + ' [' + e.confidence + ']');
console.log(out.join('\n'));
" 2>/dev/null || true)
    fi
    # Fallback: if node failed or unavailable, use recency
    if [ -z "$ITEMS" ]; then
      ITEMS=$(grep "^### \[" "$LEARN_FILE" 2>/dev/null | tail -5 | sed 's/^### /• /')
    fi
    OUTPUT="${OUTPUT}📚 [Team-Shinchan] Loaded ${COUNT} learnings from memory\n${ITEMS}\n💡 Applying these learnings to this session.\n"
    if [ "$COUNT" -gt 50 ] 2>/dev/null; then
      echo "💡 Learnings count is ${COUNT}. Consider running /team-shinchan:forget to prune old entries."
    fi
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

# ── 5. Agent Context Cache ───────────────────────────────────────────
# Generates .shinchan-docs/agent-context-cache.json for runtime self-observation (FR-3.2).
# Uses --all-json flag for compact output. Runs with timeout to prevent session slowdown (R-3).
CONTEXT_CACHE="${DOCS_DIR}/agent-context-cache.json"
AGENT_CONTEXT_SCRIPT="${PLUGIN_ROOT}/src/agent-context.js"
if command -v node &>/dev/null && [ -f "$AGENT_CONTEXT_SCRIPT" ]; then
  # Run in background (async) to avoid blocking session start.
  # Write to temp file first, then atomically move to avoid partial reads.
  (
    CACHE_TMP="${CONTEXT_CACHE}.tmp.$$"
    if timeout 5 node "$AGENT_CONTEXT_SCRIPT" --all-json > "$CACHE_TMP" 2>/dev/null; then
      mv "$CACHE_TMP" "$CONTEXT_CACHE" 2>/dev/null || true
    else
      rm -f "$CACHE_TMP" 2>/dev/null || true
    fi
  ) &
fi

# ── 6. Hierarchical Context Files ──────────────────────────────────
# Generates .context.md for key directories (agents/, hooks/, skills/, src/).
# Runs in background to avoid blocking session start (NFR-3: < 3s).
CONTEXT_SCRIPT="${PLUGIN_ROOT}/src/gen-context-files.js"
if command -v node &>/dev/null && [ -f "$CONTEXT_SCRIPT" ]; then
  (
    timeout 5 node "$CONTEXT_SCRIPT" >/dev/null 2>&1 || true
  ) &
fi

# ── 7. Agent Failure Hints (FR-P1-2.2) ─────────────────────────────
if command -v node &>/dev/null && [ -f "${PLUGIN_ROOT}/src/agent-context.js" ]; then
  STAGE_AGENT_MAP='{"requirements":"misae","planning":"nene","execution":"bo","completion":"masumi"}'
  ACTIVE_AGENT=""
  for yaml in "$DOCS_DIR"/*/WORKFLOW_STATE.yaml; do
    [ -f "$yaml" ] || continue
    if grep -q "status: active" "$yaml" 2>/dev/null; then
      CURRENT_STAGE=$(grep "stage:" "$yaml" 2>/dev/null | head -1 | sed 's/.*stage: *//' | tr -d '"' | tr -d ' ')
      ACTIVE_AGENT=$(echo "$STAGE_AGENT_MAP" | node -e "
const map = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
const stage = '${CURRENT_STAGE}';
console.log(map[stage] || '');
" 2>/dev/null || echo "")
      break
    fi
  done

  if [ -n "$ACTIVE_AGENT" ]; then
    HINTS=$(timeout 5 node -e "
const { getFailureHints } = require('${PLUGIN_ROOT}/src/agent-context.js');
const hints = getFailureHints('${ACTIVE_AGENT}');
if (hints.length > 0) console.log(hints.join('\n'));
" 2>/dev/null || echo "")
    if [ -n "$HINTS" ]; then
      OUTPUT="${OUTPUT}${HINTS}\n"
    fi
  fi
fi

# ── Output ───────────────────────────────────────────────────────────
if [ -n "$OUTPUT" ]; then
  echo -e "$OUTPUT"
fi

exit 0
