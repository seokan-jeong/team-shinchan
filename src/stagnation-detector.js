#!/usr/bin/env node
/**
 * Team-Shinchan Stagnation Detector — Detects repeated failure patterns in work-tracker JSONL
 *
 * Usage:
 *   node src/stagnation-detector.js --jsonl <path> [--window <N>] [--doc-id <id>]
 *
 * Output: JSON { stagnation: bool, patterns: [{name, count, evidence}] } to stdout
 * Exit: always 0 (fail-safe, NFR-2)
 *
 * Patterns detected:
 *   REPEAT_ERROR   — same error message appears >= 3 times in window
 *   OSCILLATION    — same file edited in alternating create/modify pattern >= 3 transitions
 *   AC_STALL       — agent_done event exists but no PROGRESS.md modify after it
 *
 * Only uses Node.js built-in modules. No external dependencies.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────

const TAIL_BYTES     = 64 * 1024; // 64 KB tail window (HR-4)
const DEFAULT_WINDOW = 20;

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    jsonlPath: '.shinchan-docs/work-tracker.jsonl',
    windowSize: DEFAULT_WINDOW,
    docId: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--jsonl' || arg === '-j') && args[i + 1] !== undefined) {
      result.jsonlPath = args[++i];
    } else if ((arg === '--window' || arg === '-w') && args[i + 1] !== undefined) {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val) && val > 0) result.windowSize = val;
    } else if ((arg === '--doc-id' || arg === '-d') && args[i + 1] !== undefined) {
      result.docId = args[++i];
    } else if (!arg.startsWith('-')) {
      // Positional argument — treat as jsonl path (CLI compat)
      result.jsonlPath = arg;
    }
  }

  return result;
}

// ── Tail-read (HR-4) ──────────────────────────────────────────────────────────

/**
 * Read the last `tailBytes` bytes from a file and return the content as a string.
 * For small files, reads the entire file.
 */
function tailRead(filePath, tailBytes) {
  const stat = fs.statSync(filePath);
  if (stat.size === 0) return '';

  const readSize = Math.min(stat.size, tailBytes);
  const offset   = stat.size - readSize;

  const buf = Buffer.alloc(readSize);
  const fd  = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, readSize, offset);
  } finally {
    fs.closeSync(fd);
  }

  return buf.toString('utf-8');
}

// ── JSONL parsing ─────────────────────────────────────────────────────────────

/**
 * Parse JSONL content into an array of event objects.
 * Skips malformed lines silently. Filters by docId if provided.
 * Returns the last `windowSize` valid events.
 */
function parseEvents(content, windowSize, docId) {
  const lines = content.split('\n');
  const events = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let evt;
    try {
      evt = JSON.parse(trimmed);
    } catch (_) {
      continue; // skip malformed lines
    }

    // Filter by doc_id if provided
    if (docId) {
      const evtDocId =
        (evt.data && evt.data.doc_id) ||
        (evt.trace && typeof evt.trace === 'string' && evt.trace.includes(docId) ? docId : null);
      if (evtDocId && evtDocId !== docId) continue;
    }

    events.push(evt);
  }

  // Take last windowSize events
  return events.slice(-windowSize);
}

// ── Pattern detection ─────────────────────────────────────────────────────────

/**
 * REPEAT_ERROR: count events where data.content or data.reason contains error/fail text.
 * If any normalized string appears >= repeatThreshold times → stagnated.
 */
function detectRepeatError(events, repeatThreshold) {
  const counts = new Map();

  for (const evt of events) {
    const data = evt.data || {};
    const candidates = [data.content, data.reason, data.error, data.message];

    for (const raw of candidates) {
      if (typeof raw !== 'string' || !raw.trim()) continue;

      const lower = raw.toLowerCase().trim();
      // Only count entries that look like errors or failures
      if (!lower.includes('error') && !lower.includes('fail') &&
          !lower.includes('exception') && !lower.includes('cannot') &&
          !lower.includes('undefined') && !lower.includes('traceback')) {
        continue;
      }

      // Normalize: first 100 chars, collapsed whitespace
      const key = lower.replace(/\s+/g, ' ').slice(0, 100);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  for (const [key, count] of counts) {
    if (count >= repeatThreshold) {
      return {
        name: 'REPEAT_ERROR',
        count,
        evidence: key,
      };
    }
  }

  return null;
}

/**
 * OSCILLATION: same file path appears in file_change events with alternating actions
 * (create/modify back-and-forth) >= oscillationThreshold transitions.
 */
function detectOscillation(events, oscillationThreshold) {
  // Group file_change events by file path
  const fileActions = new Map();

  for (const evt of events) {
    if (evt.type !== 'file_change') continue;
    const data = evt.data || {};
    const filePath = data.file || data.path;
    const action   = data.action;
    if (!filePath || !action) continue;

    if (!fileActions.has(filePath)) {
      fileActions.set(filePath, []);
    }
    fileActions.get(filePath).push(action);
  }

  for (const [filePath, actions] of fileActions) {
    if (actions.length < oscillationThreshold) continue;

    // Count alternating transitions (action differs from previous)
    let transitions = 0;
    for (let i = 1; i < actions.length; i++) {
      if (actions[i] !== actions[i - 1]) transitions++;
    }

    // Stagnation when the file has >= oscillationThreshold total events AND
    // shows alternating pattern (at least one transition). This covers the
    // case of 3 events like create→modify→create (2 transitions >= 1).
    const isAlternating = transitions > 0 && transitions >= actions.length - 1;
    if (actions.length >= oscillationThreshold && isAlternating) {
      const fileName = path.basename(filePath);
      return {
        name: 'OSCILLATION',
        count: actions.length,
        evidence: `${fileName}: ${actions.join(' → ')}`,
      };
    }
  }

  return null;
}

/**
 * AC_STALL: if agent_done events exist but no PROGRESS.md modify event occurred AFTER
 * the last agent_done — indicates work done but no AC progress recorded.
 */
function detectAcStall(events) {
  // Find last agent_done index
  let lastAgentDoneIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'agent_done') {
      lastAgentDoneIdx = i;
      break;
    }
  }

  if (lastAgentDoneIdx === -1) return null; // no agent_done in window

  const lastAgentDoneTs = events[lastAgentDoneIdx].ts || 'unknown';

  // Check if any file_change for PROGRESS.md with action=modify exists AFTER lastAgentDoneIdx
  for (let i = lastAgentDoneIdx + 1; i < events.length; i++) {
    const evt = events[i];
    if (evt.type !== 'file_change') continue;
    const data    = evt.data || {};
    const file    = data.file || data.path || '';
    const action  = data.action || '';
    if (file.includes('PROGRESS.md') && action === 'modify') {
      return null; // PROGRESS.md was updated after agent_done — no stall
    }
  }

  return {
    name: 'AC_STALL',
    count: 1,
    evidence: `agent_done at ${lastAgentDoneTs}, no PROGRESS.md modify after`,
  };
}

// ── Observability (NFR-6) ─────────────────────────────────────────────────────

function emitStagnationEvent(jsonlPath, patterns) {
  try {
    const event = JSON.stringify({
      ts:      new Date().toISOString(),
      type:    'stagnation_detected',
      agent:   'stagnation-detector',
      data:    { patterns },
    });
    fs.appendFileSync(jsonlPath, event + '\n');
  } catch (_) {
    // Silent fail — observability must not break the detector (NFR-2)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SAFE_OUTPUT = '{"stagnation":false,"patterns":[]}\n';

function main() {
  // Wrap entire execution in fail-safe (NFR-2)
  try {
    const params = parseArgs(process.argv);

    // Handle missing file gracefully
    if (!fs.existsSync(params.jsonlPath)) {
      process.stdout.write(SAFE_OUTPUT);
      return;
    }

    const content = tailRead(params.jsonlPath, TAIL_BYTES);
    if (!content.trim()) {
      process.stdout.write(SAFE_OUTPUT);
      return;
    }

    const events = parseEvents(content, params.windowSize, params.docId);
    if (events.length === 0) {
      process.stdout.write(SAFE_OUTPUT);
      return;
    }

    const patterns = [];

    const repeatError   = detectRepeatError(events, 3);
    const oscillation   = detectOscillation(events, 3);
    const acStall       = detectAcStall(events);

    if (repeatError)  patterns.push(repeatError);
    if (oscillation)  patterns.push(oscillation);
    if (acStall)      patterns.push(acStall);

    const stagnation = patterns.length > 0;

    const output = { stagnation, patterns };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');

    // Emit observability event if stagnated (NFR-6)
    if (stagnation) {
      emitStagnationEvent(params.jsonlPath, patterns);
    }
  } catch (_) {
    // Fail-safe: any uncaught error → safe output, exit 0 (NFR-2)
    process.stdout.write(SAFE_OUTPUT);
  }
}

main();
