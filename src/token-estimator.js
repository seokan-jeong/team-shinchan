#!/usr/bin/env node
/**
 * Team-Shinchan Token Estimator — Approximate token consumption from work-tracker JSONL
 *
 * Usage:
 *   node src/token-estimator.js --jsonl <path> [--threshold <N>] [--doc-id <id>]
 *   node src/token-estimator.js --jsonl .shinchan-docs/work-tracker.jsonl --threshold 50000
 *
 * Output: JSON to stdout
 *   {
 *     estimated_tokens: number,
 *     threshold: number,
 *     exceeds_threshold: boolean,
 *     event_count: number,
 *     recommendation: string | null
 *   }
 *
 * Exit: always 0 (fail-safe, NFR-2)
 *
 * Token estimation heuristic:
 *   - Each JSONL event byte count / 4 ≈ token count (conservative 4 bytes/token)
 *   - file_change events with large diffs get weighted higher (×1.5)
 *   - UserPromptSubmit events count actual content length
 *   - SubagentStart/Stop events are lightweight (×0.5)
 *
 * When threshold is exceeded, outputs recommendation for preemptive state save.
 * Inspired by claw-code should_compact() pattern.
 *
 * Only uses Node.js built-in modules. No external dependencies.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────

const TAIL_BYTES        = 128 * 1024; // 128 KB tail window
const DEFAULT_THRESHOLD = 80000;      // ~80K tokens before recommending save
const BYTES_PER_TOKEN   = 4;         // Conservative estimate

// ── Weight multipliers by event type ──────────────────────────────────────────

const EVENT_WEIGHTS = {
  file_change:       1.5,
  UserPromptSubmit:  1.2,
  SubagentStart:     0.5,
  SubagentStop:      0.5,
  SessionStart:      0.3,
  SessionEnd:        0.3,
  Stop:              0.3,
  PostToolUse:       1.0,
  stagnation_detected: 0.5,
};

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    jsonlPath: '.shinchan-docs/work-tracker.jsonl',
    threshold: DEFAULT_THRESHOLD,
    docId: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--jsonl' || arg === '-j') && args[i + 1] !== undefined) {
      result.jsonlPath = args[++i];
    } else if ((arg === '--threshold' || arg === '-t') && args[i + 1] !== undefined) {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val) && val > 0) result.threshold = val;
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
 */
function parseEvents(content, docId) {
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

    // Store original line length for byte-based estimation
    evt._lineBytes = Buffer.byteLength(trimmed, 'utf-8');
    events.push(evt);
  }

  return events;
}

// ── Token estimation ──────────────────────────────────────────────────────────

/**
 * Estimate token consumption from parsed events.
 *
 * Uses a weighted byte-to-token heuristic:
 *   base_tokens = line_bytes / BYTES_PER_TOKEN
 *   weighted_tokens = base_tokens * EVENT_WEIGHTS[type]
 *
 * Additionally accounts for content size in data fields.
 */
function estimateTokens(events) {
  let totalTokens = 0;
  const breakdown = {};

  for (const evt of events) {
    const type = evt.type || evt.event || 'unknown';
    const weight = EVENT_WEIGHTS[type] || 1.0;

    // Base estimation from serialized line size
    const baseTokens = (evt._lineBytes || 100) / BYTES_PER_TOKEN;
    const weighted = baseTokens * weight;
    totalTokens += weighted;

    // Track breakdown by type
    breakdown[type] = (breakdown[type] || 0) + weighted;

    // Bonus for large content payloads
    if (evt.data) {
      const content = evt.data.content || evt.data.reason || '';
      if (typeof content === 'string' && content.length > 200) {
        totalTokens += (content.length / BYTES_PER_TOKEN) * 0.5;
      }
    }
  }

  return { totalTokens: Math.round(totalTokens), breakdown };
}

// ── Preemptive state save trigger ─────────────────────────────────────────────

/**
 * Check if preemptive state save should be triggered.
 * Writes a trigger file if threshold is exceeded.
 */
function checkAndTriggerSave(jsonlPath, estimatedTokens, threshold) {
  if (estimatedTokens < threshold) return null;

  const docsDir = path.dirname(jsonlPath);
  const triggerPath = path.join(docsDir, '.token-threshold-exceeded');

  try {
    const triggerData = JSON.stringify({
      ts: new Date().toISOString(),
      estimated_tokens: estimatedTokens,
      threshold: threshold,
      action: 'preemptive_state_save'
    }, null, 2);
    fs.writeFileSync(triggerPath, triggerData);
  } catch (_) {
    // Non-fatal — trigger file is advisory only
  }

  return 'Token threshold exceeded (' + estimatedTokens + ' >= ' + threshold +
    '). Recommend preemptive state save via pre-compact hook.';
}

// ── Observability (NFR-6) ─────────────────────────────────────────────────────

function emitEstimationEvent(jsonlPath, estimatedTokens, threshold, exceeds) {
  try {
    const event = JSON.stringify({
      ts:    new Date().toISOString(),
      type:  'token_estimation',
      agent: 'token-estimator',
      data:  { estimated_tokens: estimatedTokens, threshold, exceeds_threshold: exceeds },
    });
    fs.appendFileSync(jsonlPath, event + '\n');
  } catch (_) {
    // Silent fail — observability must not break the estimator (NFR-2)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SAFE_OUTPUT = JSON.stringify({
  estimated_tokens: 0,
  threshold: DEFAULT_THRESHOLD,
  exceeds_threshold: false,
  event_count: 0,
  recommendation: null
}) + '\n';

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

    const events = parseEvents(content, params.docId);
    if (events.length === 0) {
      process.stdout.write(SAFE_OUTPUT);
      return;
    }

    const { totalTokens, breakdown } = estimateTokens(events);
    const exceeds = totalTokens >= params.threshold;
    const recommendation = checkAndTriggerSave(params.jsonlPath, totalTokens, params.threshold);

    const output = {
      estimated_tokens: totalTokens,
      threshold: params.threshold,
      exceeds_threshold: exceeds,
      event_count: events.length,
      breakdown: breakdown,
      recommendation: recommendation
    };

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');

    // Emit observability event only when threshold is exceeded (NFR-6)
    if (exceeds) {
      emitEstimationEvent(params.jsonlPath, totalTokens, params.threshold, exceeds);
    }
  } catch (_) {
    // Fail-safe: any uncaught error → safe output, exit 0 (NFR-2)
    process.stdout.write(SAFE_OUTPUT);
  }
}

// Export for testing
module.exports = { parseArgs, tailRead, parseEvents, estimateTokens, checkAndTriggerSave };

if (require.main === module) {
  main();
}
