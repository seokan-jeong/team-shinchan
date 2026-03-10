#!/usr/bin/env node
/**
 * Agent Context — Runtime self-observation summary for a specific agent.
 * Reads eval-history.jsonl and work-tracker.jsonl to produce a performance snapshot.
 *
 * Usage:
 *   node src/agent-context.js <agent-name>
 *   node src/agent-context.js --all          (all known agents as JSON object)
 *
 * Output: JSON summary written to stdout.
 * Exit 0 always — graceful degradation if files are absent (FR-3.4).
 *
 * Performance: reads only the last MAX_LINES lines of each JSONL file (HR-5).
 * Zero npm dependencies — Node.js built-in only.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MAX_LINES = 1000; // HR-5: parse only recent N lines for performance
const DOCS_DIR = path.join(process.cwd(), '.shinchan-docs');
const EVAL_FILE = path.join(DOCS_DIR, 'eval-history.jsonl');
const TRACKER_FILE = path.join(DOCS_DIR, 'work-tracker.jsonl');

const KNOWN_AGENTS = ['bo', 'aichan', 'bunta', 'masao', 'kazama', 'shinnosuke', 'nene', 'misae', 'actionkamen', 'hiroshi', 'midori', 'shiro', 'masumi', 'ume', 'himawari'];

// ─── File Helpers ────────────────────────────────────────────────────

/**
 * Read last N lines of a file efficiently.
 * Uses reverse-scan to avoid loading entire file into memory for large files.
 */
function readLastLines(filePath, n) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return [];

    // For small files, read all at once
    if (stat.size < 512 * 1024) { // < 512KB
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter(l => l.trim());
      return lines.slice(-n);
    }

    // For large files: read from end in chunks
    const CHUNK = 64 * 1024; // 64KB chunks
    const fd = fs.openSync(filePath, 'r');
    let pos = stat.size;
    let collected = '';
    let lines = [];

    while (pos > 0 && lines.length < n + 1) {
      const size = Math.min(CHUNK, pos);
      pos -= size;
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, pos);
      collected = buf.toString('utf-8') + collected;
      lines = collected.split('\n').filter(l => l.trim());
    }

    fs.closeSync(fd);
    return lines.slice(-n);
  } catch {
    return [];
  }
}

function parseJsonLines(lines) {
  const results = [];
  for (const line of lines) {
    try { results.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return results;
}

// ─── Data Extraction ─────────────────────────────────────────────────

/**
 * Get last 3 eval records for a given agent.
 * eval-history.jsonl schema: { agent, date, scores: { correctness, efficiency, compliance, quality }, ... }
 */
function getEvalHistory(agentName) {
  if (!fs.existsSync(EVAL_FILE)) return [];
  const lines = readLastLines(EVAL_FILE, MAX_LINES);
  const records = parseJsonLines(lines);
  return records
    .filter(r => r && r.agent && r.agent.toLowerCase() === agentName.toLowerCase() && r.scores)
    .slice(-3)
    .map(r => ({
      date: r.date || r.ts || null,
      scores: r.scores
    }));
}

/**
 * Get work stats for a given agent from work-tracker.jsonl.
 * Extracts: average duration (agent_start → agent_done pairs), top error patterns.
 */
function getWorkStats(agentName) {
  if (!fs.existsSync(TRACKER_FILE)) return { avgDuration: null, errorPatterns: [], sessionCount: 0 };

  const lines = readLastLines(TRACKER_FILE, MAX_LINES);
  const records = parseJsonLines(lines);

  // Normalize agent name matching (tracker uses different casing sometimes)
  const agentLower = agentName.toLowerCase();
  const agentRecords = records.filter(r => r.agent && r.agent.toLowerCase() === agentLower);

  // Duration: pair agent_start with agent_done by session+trace
  const starts = {};
  const durations = [];
  const errors = [];

  for (const r of agentRecords) {
    const key = `${r.session || ''}-${r.trace || ''}`;
    if (r.type === 'agent_start') {
      starts[key] = r.ts;
    } else if (r.type === 'agent_done' && starts[key]) {
      const startMs = new Date(starts[key]).getTime();
      const endMs = new Date(r.ts).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        durations.push(endMs - startMs);
      }
      delete starts[key];
    } else if (r.type === 'error' && r.data && r.data.message) {
      errors.push(r.data.message);
    }
  }

  // Average duration in seconds
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000)
    : null;

  // Top error patterns: count occurrences, return top 3
  const errorCounts = {};
  for (const msg of errors) {
    // Normalize: take first 60 chars as pattern key
    const key = msg.slice(0, 60);
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  }
  const topErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([msg, count]) => ({ pattern: msg, count }));

  // Delegation count (how many times this agent was delegated to)
  const delegationCount = agentRecords.filter(r => r.type === 'delegation').length;
  const sessionCount = new Set(agentRecords.filter(r => r.session).map(r => r.session)).size;

  return { avgDuration, errorPatterns: topErrors, sessionCount, delegationCount };
}

// ─── Baseline / Regression Detection ────────────────────────────────

/**
 * Load per-agent performance thresholds from agent-metrics-baseline.json.
 * Returns parsed JSON object or null on any error (R-1, NFR-2).
 */
function loadBaseline() {
  try {
    const baselinePath = path.join(__dirname, 'agent-metrics-baseline.json');
    const raw = fs.readFileSync(baselinePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Main Summary Builder ────────────────────────────────────────────

function buildAgentContext(agentName) {
  const t0 = Date.now();

  const evalHistory = getEvalHistory(agentName);
  const workStats = getWorkStats(agentName);

  // Graceful: no data at all (FR-3.4)
  const hasData = evalHistory.length > 0 || workStats.avgDuration !== null || workStats.sessionCount > 0;
  if (!hasData) {
    return null; // caller handles graceful output
  }

  // Compute average scores across recent evals
  let avgScores = null;
  if (evalHistory.length > 0) {
    const dims = ['correctness', 'efficiency', 'compliance', 'quality'];
    avgScores = {};
    for (const dim of dims) {
      const vals = evalHistory.map(e => e.scores[dim]).filter(v => typeof v === 'number');
      avgScores[dim] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    }
  }

  // Flag weak dimensions (score <= 3.5)
  const weakDimensions = avgScores
    ? Object.entries(avgScores).filter(([, v]) => v !== null && v <= 3.5).map(([k]) => k)
    : [];

  // Regression detection against baseline thresholds (NFR-2, R-1)
  let regression = null;
  try {
    const baseline = loadBaseline();
    const agentKey = agentName.toLowerCase();
    if (baseline && baseline[agentKey] && avgScores) {
      const dims = ['correctness', 'efficiency', 'compliance', 'quality'];
      let anyBelow = false;
      for (const dim of dims) {
        const score = avgScores[dim];
        const threshold = baseline[agentKey][dim];
        if (typeof score === 'number' && typeof threshold === 'number' && score < threshold) {
          anyBelow = true;
          break;
        }
      }
      regression = anyBelow;
    }
  } catch {
    regression = null;
  }

  const elapsed = Date.now() - t0;

  return {
    agent: agentName,
    generatedAt: new Date().toISOString(),
    elapsedMs: elapsed,
    recentEvals: evalHistory,
    avgScores,
    weakDimensions,
    regression,
    workStats: {
      avgDurationSec: workStats.avgDuration,
      sessionCount: workStats.sessionCount,
      delegationCount: workStats.delegationCount,
      topErrors: workStats.errorPatterns
    }
  };
}

// ── Exports ─────────────────────────────────────────────────────────
module.exports = {
  buildAgentContext,
  KNOWN_AGENTS,
};

// ─── CLI ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const agentArg = args[0];

  if (!agentArg || agentArg === '--help') {
    console.error('Usage: node src/agent-context.js <agent-name>');
    console.error('       node src/agent-context.js --all');
    console.error('       node src/agent-context.js --all-json  (compact for cache file)');
    console.error('Known agents: ' + KNOWN_AGENTS.join(', '));
    process.exit(0); // graceful
  }

  // --all-json mode: build full cache object for all agents
  if (agentArg === '--all' || agentArg === '--all-json') {
    const cache = { generatedAt: new Date().toISOString(), agents: {} };
    for (const name of KNOWN_AGENTS) {
      const ctx = buildAgentContext(name);
      cache.agents[name] = ctx; // null if no data — graceful
    }
    console.log(JSON.stringify(cache, null, agentArg === '--all-json' ? 0 : 2));
    return;
  }

  // Single agent mode
  const ctx = buildAgentContext(agentArg);

  if (!ctx) {
    // FR-3.4: graceful — no data, no error
    console.log('No evaluation history.');
    process.exit(0);
  }

  console.log(JSON.stringify(ctx, null, 2));
}

if (require.main === module) {
  main();
}
