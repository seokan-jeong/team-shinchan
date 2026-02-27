#!/bin/bash
# Team-Shinchan Session Wrap — Command Hook (Stop)
# Computes session metrics from work-tracker.jsonl and updates budget counters.
# The summary file and ontology refresh are handled; LLM retrospective remains prompt-based.
#
# This is the CRITICAL part: budget accumulation MUST happen deterministically.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="${PWD}"
DOCS_DIR="${PROJECT_ROOT}/.shinchan-docs"

if [ ! -d "$DOCS_DIR" ]; then
  exit 0
fi

TRACKER_FILE="${DOCS_DIR}/work-tracker.jsonl"
SESSION_ID_FILE="${DOCS_DIR}/.session-id"

if [ ! -f "$TRACKER_FILE" ] || [ ! -f "$SESSION_ID_FILE" ]; then
  exit 0
fi

# Use node for JSON processing
OUTPUT=$(TRACKER_FILE="$TRACKER_FILE" SESSION_ID_FILE="$SESSION_ID_FILE" DOCS_DIR="$DOCS_DIR" PLUGIN_ROOT="$PLUGIN_ROOT" node -e "
const fs = require('fs');
const path = require('path');

const trackerFile = process.env.TRACKER_FILE;
const sessionIdFile = process.env.SESSION_ID_FILE;
const docsDir = process.env.DOCS_DIR;

let sessionId;
try { sessionId = fs.readFileSync(sessionIdFile, 'utf-8').trim(); } catch(e) { process.exit(0); }
if (!sessionId) process.exit(0);

let lines;
try { lines = fs.readFileSync(trackerFile, 'utf-8').trim().split('\n').filter(Boolean); } catch(e) { process.exit(0); }

// Filter session events
const events = [];
for (const line of lines) {
  try {
    const ev = JSON.parse(line);
    if (ev.session === sessionId) events.push(ev);
  } catch(e) {}
}

if (events.length === 0) { process.exit(0); }

// Compute metrics
const firstTs = events[0].ts;
const lastTs = events[events.length - 1].ts;
const durationMin = Math.round((new Date(lastTs) - new Date(firstTs)) / 60000);

const agents = {};
const files = new Set();
let delegations = 0;
let turnEvents = 0;

for (const ev of events) {
  if (ev.type === 'agent_start' && ev.agent) {
    agents[ev.agent] = (agents[ev.agent] || 0) + 1;
  }
  if (ev.type === 'file_change' && ev.data && ev.data.file) {
    files.add(ev.data.file);
  }
  if (ev.type === 'delegation') delegations++;
  if (['tool_use', 'file_change', 'delegation'].includes(ev.type)) turnEvents++;
}

const agentCount = Object.keys(agents).length;
const agentSummary = Object.entries(agents).map(([a,c]) => a + ':' + c).join(', ');

// ── Find active workflow ──
let activeYaml = null;
let docDir = null;
let docId = null;
try {
  const dirs = fs.readdirSync(docsDir, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const yamlPath = path.join(docsDir, d.name, 'WORKFLOW_STATE.yaml');
    try {
      const content = fs.readFileSync(yamlPath, 'utf-8');
      if (/status:\s*active/.test(content)) {
        if (!activeYaml || fs.statSync(yamlPath).mtimeMs > fs.statSync(activeYaml).mtimeMs) {
          activeYaml = yamlPath;
          docDir = path.join(docsDir, d.name);
          docId = d.name;
        }
      }
    } catch(e) {}
  }
} catch(e) {}

// ── Write SESSION_SUMMARY.md ──
const summaryPath = docDir
  ? path.join(docDir, 'SESSION_SUMMARY.md')
  : path.join(docsDir, 'SESSION_SUMMARY.md');

let summary = '# Session Summary\\n';
summary += '- **Session**: ' + sessionId + '\\n';
summary += '- **Duration**: ' + durationMin + ' minutes\\n';
summary += '- **Agents invoked**: ' + agentCount + ' (' + agentSummary + ')\\n';
summary += '- **Files changed**: ' + files.size + '\\n';
summary += '- **Delegations**: ' + delegations + '\\n';
summary += '- **Events total**: ' + events.length + '\\n';

try { fs.writeFileSync(summaryPath, summary); } catch(e) {}

// ── Budget Counter Update (CRITICAL) ──
if (activeYaml) {
  try {
    let yaml = fs.readFileSync(activeYaml, 'utf-8');
    const budgetMatch = yaml.match(/budget:/);
    if (budgetMatch) {
      const usedTotalMatch = yaml.match(/used_total:\\s*(\\d+)/);
      const usedPhaseMatch = yaml.match(/used_phase:\\s*(\\d+)/);

      if (usedTotalMatch) {
        const oldTotal = parseInt(usedTotalMatch[1]);
        const newTotal = oldTotal + turnEvents;
        yaml = yaml.replace(/used_total:\\s*\\d+/, 'used_total: ' + newTotal);
      }
      if (usedPhaseMatch) {
        const oldPhase = parseInt(usedPhaseMatch[1]);
        const newPhase = oldPhase + turnEvents;
        yaml = yaml.replace(/used_phase:\\s*\\d+/, 'used_phase: ' + newPhase);
      }
      fs.writeFileSync(activeYaml, yaml);
    }
  } catch(e) {}
}

// ── Output ──
console.log('[Session Wrap] Summary saved to ' + summaryPath);
console.log('  Duration: ' + durationMin + 'min | Agents: ' + agentCount + ' | Files: ' + files.size + ' | Events: ' + events.length + ' | Turns: ' + turnEvents);
if (activeYaml) {
  console.log('  Budget counters updated (+' + turnEvents + ' turns)');
}
" 2>/dev/null || true)

if [ -n "$OUTPUT" ]; then
  echo "$OUTPUT"
fi

exit 0
