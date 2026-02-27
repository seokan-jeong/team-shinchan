#!/bin/bash
# Team-Shinchan Budget Guard — Programmatic PreToolUse Hook
# Enforces turn budget limits: warns at 80%, blocks at 100% when hard_limit=true.
#
# Stdin: {"tool_name":"...","tool_input":{...}}
# Stdout: {"decision":"block","reason":"..."} or empty (allow)
set -euo pipefail

INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

# Find most recent active WORKFLOW_STATE.yaml
ACTIVE_YAML=""
for yaml in "$DOCS_DIR"/*/WORKFLOW_STATE.yaml; do
  [ -f "$yaml" ] || continue
  if grep -q "status: active" "$yaml" 2>/dev/null; then
    if [ -z "$ACTIVE_YAML" ]; then
      ACTIVE_YAML="$yaml"
    else
      if [ "$yaml" -nt "$ACTIVE_YAML" ]; then
        ACTIVE_YAML="$yaml"
      fi
    fi
  fi
done

if [ -z "$ACTIVE_YAML" ]; then
  exit 0
fi

TRACKER_FILE="${DOCS_DIR}/work-tracker.jsonl"
SESSION_ID_FILE="${DOCS_DIR}/.session-id"

RESULT=$(echo "$INPUT" | ACTIVE_YAML="$ACTIVE_YAML" TRACKER_FILE="$TRACKER_FILE" SESSION_ID_FILE="$SESSION_ID_FILE" node -e "
const fs = require('fs');
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(chunks.join('')); } catch(e) { process.exit(0); }

  const toolName = input.tool_name || '';
  const filePath = (input.tool_input || {}).file_path || '';

  // Exception: Read/Write to .shinchan-docs/ always allowed (state saving)
  if (filePath.includes('.shinchan-docs/')) {
    process.exit(0);
  }
  // Read/Glob/Grep always allowed (non-destructive)
  if (['Read', 'Glob', 'Grep'].includes(toolName)) {
    process.exit(0);
  }

  // Read WORKFLOW_STATE.yaml
  let yamlContent;
  try { yamlContent = fs.readFileSync(process.env.ACTIVE_YAML, 'utf-8'); } catch(e) { process.exit(0); }

  // Parse budget section
  const totalMatch = yamlContent.match(/budget:[\\s\\S]*?total:\\s*(\\d+)/);
  const phaseMatch = yamlContent.match(/budget:[\\s\\S]*?phase:\\s*(\\d+)/);
  const usedTotalMatch = yamlContent.match(/budget:[\\s\\S]*?used_total:\\s*(\\d+)/);
  const usedPhaseMatch = yamlContent.match(/budget:[\\s\\S]*?used_phase:\\s*(\\d+)/);
  const hardLimitMatch = yamlContent.match(/budget:[\\s\\S]*?hard_limit:\\s*(true|false)/);

  if (!totalMatch || !phaseMatch) {
    process.exit(0); // No budget configured
  }

  const budgetTotal = parseInt(totalMatch[1]);
  const budgetPhase = parseInt(phaseMatch[1]);
  const usedTotal = usedTotalMatch ? parseInt(usedTotalMatch[1]) : 0;
  const usedPhase = usedPhaseMatch ? parseInt(usedPhaseMatch[1]) : 0;
  const hardLimit = hardLimitMatch ? hardLimitMatch[1] === 'true' : false;

  if (budgetTotal <= 0 || budgetPhase <= 0) {
    process.exit(0); // Invalid budget values
  }

  // Count current session turns from work-tracker.jsonl
  let sessionTurns = 0;
  try {
    const sessionId = fs.readFileSync(process.env.SESSION_ID_FILE, 'utf-8').trim();
    const lines = fs.readFileSync(process.env.TRACKER_FILE, 'utf-8').trim().split('\\n').filter(Boolean);
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        if (ev.session === sessionId && ['tool_use', 'file_change', 'delegation'].includes(ev.type)) {
          sessionTurns++;
        }
      } catch(e) {}
    }
  } catch(e) {
    // Missing files — assume 0 turns
  }

  const effectiveTotal = usedTotal + sessionTurns;
  const effectivePhase = usedPhase + sessionTurns;
  const totalPct = Math.round((effectiveTotal / budgetTotal) * 100);
  const phasePct = Math.round((effectivePhase / budgetPhase) * 100);
  const maxPct = Math.max(totalPct, phasePct);

  // At 100%+ — check hard_limit
  if (maxPct >= 100) {
    if (hardLimit) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'BUDGET HARD STOP: Turn limit reached (hard_limit enabled). Total: ' + effectiveTotal + '/' + budgetTotal + ' (' + totalPct + '%), Phase: ' + effectivePhase + '/' + budgetPhase + ' (' + phasePct + '%). No further operations allowed. Save state and stop. Use /team-shinchan:budget --reset to continue.'
      }));
      return;
    }
    // Soft limit — emit warning (non-blocking)
    // Output to stderr so it shows in context but does not block
    process.stderr.write('BUDGET EXCEEDED: Total: ' + effectiveTotal + '/' + budgetTotal + ' (' + totalPct + '%), Phase: ' + effectivePhase + '/' + budgetPhase + ' (' + phasePct + '%). Save state and stop.\\n');
    process.exit(0);
  }

  // At 80%+ — warning
  if (maxPct >= 80) {
    const remaining = Math.min(budgetTotal - effectiveTotal, budgetPhase - effectivePhase);
    process.stderr.write('BUDGET WARNING: Approaching limit. Total: ' + effectiveTotal + '/' + budgetTotal + ' (' + totalPct + '%), Phase: ' + effectivePhase + '/' + budgetPhase + ' (' + phasePct + '%). ~' + remaining + ' turns remaining.\\n');
  }

  process.exit(0);
});
" 2>/dev/null || true)

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
