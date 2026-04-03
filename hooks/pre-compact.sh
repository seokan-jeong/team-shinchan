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

// -- HANDOFF ARTIFACT (FR-1) --
// Parse PROGRESS.md for phase completion status
let completedPhases = [];
let pendingPhases = [];
let lastDecision = null;
let blockingIssues = null;

try {
  // Locate PROGRESS.md
  const progressPath = path.join(process.env.PROJECT_ROOT, '.shinchan-docs', docId, 'PROGRESS.md');

  // HR-2: size guard — skip parsing if > 100KB
  let progressContent = null;
  try {
    const stat = fs.statSync(progressPath);
    if (stat.size > 100 * 1024) {
      completedPhases = 'parse_skipped_large_file';
      pendingPhases = 'parse_skipped_large_file';
    } else {
      progressContent = fs.readFileSync(progressPath, 'utf-8');
    }
  } catch(e) { /* PROGRESS.md absent — use defaults */ }

  if (progressContent !== null && typeof completedPhases !== 'string') {
    // Extract phase numbers from ### Phase N headings
    const phasePattern = /^### Phase (\d+)/gm;
    let match;
    const allPhaseNums = [];
    while ((match = phasePattern.exec(progressContent)) !== null) {
      allPhaseNums.push(parseInt(match[1], 10));
    }

    // Determine completed vs pending by checkbox state
    // A phase is complete if ALL its checkboxes are checked (no unchecked remain)
    for (const num of allPhaseNums) {
      // Extract block between this phase heading and the next
      const blockRe = new RegExp(
        '### Phase ' + num + '[\\s\\S]*?(?=### Phase \\d+|$)'
      );
      const blockMatch = progressContent.match(blockRe);
      if (!blockMatch) continue;
      const block = blockMatch[0];
      const hasUnchecked = /- \[ \]/.test(block);
      const hasChecked   = /- \[x\]/i.test(block);
      if (hasChecked && !hasUnchecked) {
        completedPhases.push(num);
      } else if (hasUnchecked) {
        pendingPhases.push(num);
      }
    }

    // Extract last_decision: last ## Decision block first line (256 char limit)
    const decisionBlocks = [...progressContent.matchAll(/^## Decision\s*\n([^\n]+)/gm)];
    if (decisionBlocks.length > 0) {
      lastDecision = decisionBlocks[decisionBlocks.length - 1][1].slice(0, 256);
      // HR-1: sensitive pattern masking
      lastDecision = lastDecision.replace(
        /\b(key|password|secret|token)\s*=\s*\S+/gi,
        '$1=[REDACTED]'
      );
    }
  }
} catch(e) { /* FR-1 is best-effort — never block pre-compact */ }

// Read blocking_issues from WORKFLOW_STATE.yaml
try {
  const yamlContent2 = fs.readFileSync(activeYaml, 'utf-8');
  const noComments2 = yamlContent2.replace(/#.*/g, '');
  const biMatch = noComments2.match(/^\s*blocked_reason:\s*(.+)$/m);
  if (biMatch) blockingIssues = biMatch[1].trim().replace(/[\x22\x27]/g, '');
} catch(e) {}

// Build handoff_summary
const completedStr = Array.isArray(completedPhases)
  ? (completedPhases.length > 0 ? completedPhases.join(',') : 'none')
  : completedPhases;
const pendingStr = Array.isArray(pendingPhases)
  ? (pendingPhases.length > 0 ? pendingPhases.join(',') : 'none')
  : pendingPhases;
const handoffSummary =
  'Stage: ' + stage + '. Completed phases: ' + completedStr +
  '. Pending: ' + pendingStr +
  (lastDecision ? '. Last decision: ' + lastDecision.slice(0, 80) : '') +
  (blockingIssues ? '. BLOCKED: ' + blockingIssues.slice(0, 80) : '');
// -- END HANDOFF ARTIFACT --

// -- SEMANTIC CONTEXT PRESERVATION (FR-2) --
// Extract file references, recent user requests, and pending task keywords
// from work-tracker.jsonl to preserve semantic information across compaction.
// Inspired by claw-code compact.rs pattern.
let referencedFiles = [];
let recentUserRequests = [];
let pendingTaskKeywords = [];

try {
  const trackerPath = path.join(process.env.PROJECT_ROOT, '.shinchan-docs', 'work-tracker.jsonl');
  const trackerStat = (() => { try { return fs.statSync(trackerPath); } catch(e) { return null; } })();

  if (trackerStat && trackerStat.size > 0) {
    // HR-2: tail-read last 64KB to stay within NFR-6 timing budget
    const TAIL_BYTES = 64 * 1024;
    const readSize = Math.min(trackerStat.size, TAIL_BYTES);
    const offset = trackerStat.size - readSize;
    const buf = Buffer.alloc(readSize);
    const fd = fs.openSync(trackerPath, 'r');
    try {
      fs.readSync(fd, buf, 0, readSize, offset);
    } finally {
      fs.closeSync(fd);
    }
    const trackerContent = buf.toString('utf-8');
    const trackerLines = trackerContent.split('\\n');

    // Collect from last 30 events (window)
    const trackerEvents = [];
    for (const tl of trackerLines) {
      const trimmed = tl.trim();
      if (!trimmed) continue;
      try { trackerEvents.push(JSON.parse(trimmed)); } catch(_) {}
    }
    const recentEvents = trackerEvents.slice(-30);

    // Extract referenced files from file_change events and tool_input
    const fileSet = new Set();
    for (const evt of recentEvents) {
      if (evt.type === 'file_change') {
        const fp = (evt.data && (evt.data.file || evt.data.path)) || '';
        if (fp) fileSet.add(fp);
      }
      if (evt.data && evt.data.tool_input) {
        const fp = evt.data.tool_input.file_path || evt.data.tool_input.path || '';
        if (fp) fileSet.add(fp);
      }
    }
    // HR-1: convert absolute paths to relative, limit to 20 files
    referencedFiles = [...fileSet]
      .map(function(f) { return f.replace(process.env.PROJECT_ROOT + '/', '').replace(process.env.PROJECT_ROOT, ''); })
      .slice(-20);

    // Extract recent user requests from UserPromptSubmit events
    const requestSet = [];
    for (const evt of recentEvents) {
      if (evt.type === 'UserPromptSubmit' || (evt.data && evt.data.hook_event === 'UserPromptSubmit')) {
        const content = (evt.data && evt.data.content) || '';
        if (content && content.length > 5) {
          // HR-1: mask sensitive patterns, truncate to 120 chars
          const cleaned = content
            .replace(/\\b(key|password|secret|token)\\s*=\\s*\\S+/gi, '$1=[REDACTED]')
            .slice(0, 120);
          requestSet.push(cleaned);
        }
      }
    }
    recentUserRequests = requestSet.slice(-5);

    // Extract pending task keywords from unchecked checkboxes in PROGRESS.md
    if (progressContent !== null && typeof completedPhases !== 'string') {
      const uncheckedRe = /- \\[ \\]\\s*(.+)/g;
      let kwMatch;
      const kwList = [];
      while ((kwMatch = uncheckedRe.exec(progressContent)) !== null) {
        kwList.push(kwMatch[1].trim().slice(0, 60));
      }
      pendingTaskKeywords = kwList.slice(0, 10);
    }
  }
} catch(e) { /* FR-2 is best-effort — never block pre-compact */ }
// -- END SEMANTIC CONTEXT PRESERVATION --

// Write pre-compact-state.json
const state = {
  doc_id: docId,
  stage: stage,
  phase: phase,
  ts: new Date().toISOString(),
  completed_phases: completedPhases,
  pending_phases: pendingPhases,
  last_decision: lastDecision,
  blocking_issues: blockingIssues,
  referenced_files: referencedFiles,
  recent_user_requests: recentUserRequests,
  pending_task_keywords: pendingTaskKeywords,
  handoff_summary: handoffSummary
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
