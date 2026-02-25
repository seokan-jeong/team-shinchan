#!/usr/bin/env node
/**
 * Team-Shinchan Analytics — JSONL Work Tracker Analyzer
 *
 * Usage:
 *   node src/analytics.js <jsonl-path>                     # Full JSON report
 *   node src/analytics.js <jsonl-path> --format table      # Text table
 *   node src/analytics.js <jsonl-path> --agent <name>      # Single agent detail
 *   node src/analytics.js <jsonl-path> --trace <trace-id>  # Trace timeline
 *   node src/analytics.js <jsonl-path> --period <N>d       # Filter by recent N days
 *
 * Only uses Node.js built-in modules (fs, readline, path).
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') {
  console.log(`Usage: node analytics.js <jsonl-path> [options]

Options:
  --format table     Output as text table instead of JSON
  --agent <name>     Show detail for a single agent
  --trace <id>       Show timeline for a specific trace ID
  --period <N>d      Filter events to the last N days`);
  process.exit(0);
}

const jsonlPath = args[0];
let format = 'json';
let filterAgent = null;
let filterTrace = null;
let periodDays = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--format' && args[i + 1]) {
    format = args[++i];
  } else if (args[i] === '--agent' && args[i + 1]) {
    filterAgent = args[++i];
  } else if (args[i] === '--trace' && args[i + 1]) {
    filterTrace = args[++i];
  } else if (args[i] === '--period' && args[i + 1]) {
    const m = args[++i].match(/^(\d+)d$/);
    if (m) periodDays = parseInt(m[1], 10);
  }
}

// ── Graceful file check ──────────────────────────────────────────────────────
if (!fs.existsSync(jsonlPath)) {
  console.error(`File not found: ${jsonlPath}`);
  process.exit(1);
}

const stat = fs.statSync(jsonlPath);
if (stat.size === 0) {
  console.error('File is empty.');
  process.exit(1);
}

// ── Read and parse JSONL ─────────────────────────────────────────────────────
async function parseLines() {
  const events = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(jsonlPath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch (_) {
      // skip malformed lines
    }
  }
  return events;
}

// ── Filter helpers ───────────────────────────────────────────────────────────
function applyFilters(events) {
  let filtered = events;
  if (periodDays) {
    const cutoff = new Date(Date.now() - periodDays * 86400000);
    filtered = filtered.filter(e => e.ts && new Date(e.ts) >= cutoff);
  }
  if (filterTrace) {
    filtered = filtered.filter(e => e.trace === filterTrace);
  }
  return filtered;
}

// ── Agent metrics ────────────────────────────────────────────────────────────
function computeAgentMetrics(events) {
  const agents = {};
  // Index agent_start/agent_done by agent+session for duration calc
  const starts = {}; // key: agent+session -> [timestamps]

  for (const e of events) {
    const agent = e.agent;
    if (!agent) continue;
    if (!agents[agent]) {
      agents[agent] = { calls: 0, done: 0, fail: 0, totalTurns: 0, turnPairs: 0 };
    }
    if (e.type === 'agent_start') {
      agents[agent].calls++;
      const key = `${agent}:${e.session || ''}`;
      if (!starts[key]) starts[key] = [];
      starts[key].push(new Date(e.ts).getTime());
    }
    if (e.type === 'agent_done') {
      agents[agent].done++;
      const key = `${agent}:${e.session || ''}`;
      if (starts[key] && starts[key].length > 0) {
        const startTs = starts[key].shift();
        const endTs = new Date(e.ts).getTime();
        const durationSec = (endTs - startTs) / 1000;
        agents[agent].totalTurns += durationSec;
        agents[agent].turnPairs++;
      }
    }
  }

  const result = {};
  for (const [name, m] of Object.entries(agents)) {
    result[name] = {
      calls: m.calls,
      completed: m.done,
      success_rate: m.calls > 0
        ? `${Math.round((m.done / m.calls) * 100)}%`
        : 'N/A',
      avg_duration_sec: m.turnPairs > 0
        ? Math.round(m.totalTurns / m.turnPairs)
        : null,
    };
  }
  return result;
}

// ── Session metrics ──────────────────────────────────────────────────────────
function computeSessionMetrics(events) {
  const sessions = {};
  for (const e of events) {
    const sid = e.session;
    if (!sid) continue;
    if (!sessions[sid]) {
      sessions[sid] = { events: 0, fileChanges: 0, delegations: 0, maxDepth: 0, firstTs: e.ts, lastTs: e.ts, delegationStack: 0 };
    }
    const s = sessions[sid];
    s.events++;
    s.lastTs = e.ts;
    if (e.type === 'file_change') s.fileChanges++;
    if (e.type === 'delegation') {
      s.delegations++;
      s.delegationStack++;
      if (s.delegationStack > s.maxDepth) s.maxDepth = s.delegationStack;
    }
    if (e.type === 'agent_done') {
      s.delegationStack = Math.max(0, s.delegationStack - 1);
    }
  }

  const result = {};
  for (const [sid, s] of Object.entries(sessions)) {
    const dur = (new Date(s.lastTs).getTime() - new Date(s.firstTs).getTime()) / 60000;
    result[sid] = {
      total_events: s.events,
      file_changes: s.fileChanges,
      delegations: s.delegations,
      delegation_depth_max: s.maxDepth,
      duration_min: Math.round(dur),
    };
  }
  return result;
}

// ── Event type distribution ──────────────────────────────────────────────────
function computeEventDistribution(events) {
  const counts = {};
  for (const e of events) {
    const t = e.type || 'unknown';
    counts[t] = (counts[t] || 0) + 1;
  }
  const total = events.length;
  const result = {};
  for (const [type, count] of Object.entries(counts)) {
    result[type] = {
      count,
      pct: total > 0 ? `${Math.round((count / total) * 1000) / 10}%` : '0%',
    };
  }
  return result;
}

// ── Delegation graph ─────────────────────────────────────────────────────────
function computeDelegationGraph(events) {
  const graph = {};
  for (const e of events) {
    if (e.type === 'delegation' && e.data) {
      const from = e.agent || e.data.from || 'shinnosuke';
      const to = e.data.to || 'unknown';
      const key = `${from} -> ${to}`;
      graph[key] = (graph[key] || 0) + 1;
    }
  }
  return graph;
}

// ── Single agent detail ──────────────────────────────────────────────────────
function agentDetail(events, agentName) {
  const agentEvents = events.filter(e => e.agent === agentName);
  if (agentEvents.length === 0) {
    return { error: `No events found for agent: ${agentName}` };
  }
  const types = {};
  for (const e of agentEvents) {
    types[e.type] = (types[e.type] || 0) + 1;
  }
  const sessions = [...new Set(agentEvents.map(e => e.session).filter(Boolean))];
  const first = agentEvents[0].ts;
  const last = agentEvents[agentEvents.length - 1].ts;

  return {
    agent: agentName,
    total_events: agentEvents.length,
    event_types: types,
    sessions,
    first_seen: first,
    last_seen: last,
    recent_events: agentEvents.slice(-10).map(e => ({
      ts: e.ts, type: e.type, data: e.data,
    })),
  };
}

// ── Trace timeline ───────────────────────────────────────────────────────────
function traceTimeline(events, traceId) {
  const traceEvents = events.filter(e => e.trace === traceId);
  if (traceEvents.length === 0) {
    return { error: `No events found for trace: ${traceId}` };
  }
  return {
    trace: traceId,
    total_events: traceEvents.length,
    timeline: traceEvents.map(e => ({
      ts: e.ts,
      type: e.type,
      agent: e.agent,
      session: e.session,
      data: e.data,
    })),
  };
}

// ── Table formatter ──────────────────────────────────────────────────────────
function pad(str, len) {
  const s = String(str);
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

function printTable(report) {
  const sep = '━'.repeat(60);
  console.log(sep);
  console.log('  Work Tracker Analytics Report');
  console.log(sep);

  // Event Distribution
  console.log('\n== Event Distribution ==');
  console.log(`${pad('Type', 20)} ${pad('Count', 8)} Pct`);
  console.log('-'.repeat(40));
  const dist = report.event_distribution || {};
  for (const [type, info] of Object.entries(dist)) {
    console.log(`${pad(type, 20)} ${pad(info.count, 8)} ${info.pct}`);
  }

  // Agent Metrics
  console.log('\n== Agent Metrics ==');
  console.log(`${pad('Agent', 16)} ${pad('Calls', 7)} ${pad('Done', 6)} ${pad('Rate', 7)} AvgDur(s)`);
  console.log('-'.repeat(55));
  const agents = report.agent_metrics || {};
  for (const [name, m] of Object.entries(agents)) {
    console.log(`${pad(name, 16)} ${pad(m.calls, 7)} ${pad(m.completed, 6)} ${pad(m.success_rate, 7)} ${m.avg_duration_sec !== null ? m.avg_duration_sec : '-'}`);
  }

  // Sessions
  console.log('\n== Sessions ==');
  console.log(`${pad('Session', 30)} ${pad('Events', 8)} ${pad('Files', 7)} ${pad('Deleg', 7)} Dur(min)`);
  console.log('-'.repeat(65));
  const sessions = report.session_metrics || {};
  for (const [sid, s] of Object.entries(sessions)) {
    const shortSid = sid.length > 28 ? sid.slice(0, 28) + '..' : sid;
    console.log(`${pad(shortSid, 30)} ${pad(s.total_events, 8)} ${pad(s.file_changes, 7)} ${pad(s.delegations, 7)} ${s.duration_min}`);
  }

  // Delegation Graph
  console.log('\n== Delegation Graph ==');
  const graph = report.delegation_graph || {};
  if (Object.keys(graph).length === 0) {
    console.log('  (no delegations)');
  } else {
    for (const [edge, count] of Object.entries(graph)) {
      console.log(`  ${edge}  (x${count})`);
    }
  }

  console.log('\n' + sep);
  console.log(`Total events: ${report.total_events}`);
  console.log(sep);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const allEvents = await parseLines();
  const events = applyFilters(allEvents);

  // Single agent detail mode
  if (filterAgent) {
    const detail = agentDetail(events, filterAgent);
    if (format === 'table') {
      if (detail.error) {
        console.log(detail.error);
      } else {
        console.log(`Agent: ${detail.agent}`);
        console.log(`Events: ${detail.total_events} | Sessions: ${detail.sessions.length}`);
        console.log(`First: ${detail.first_seen} | Last: ${detail.last_seen}`);
        console.log('\nEvent types:');
        for (const [t, c] of Object.entries(detail.event_types)) {
          console.log(`  ${t}: ${c}`);
        }
        console.log('\nRecent events:');
        for (const e of detail.recent_events) {
          console.log(`  ${e.ts} | ${e.type}`);
        }
      }
    } else {
      console.log(JSON.stringify(detail, null, 2));
    }
    return;
  }

  // Trace timeline mode
  if (filterTrace) {
    const tl = traceTimeline(events, filterTrace);
    if (format === 'table') {
      if (tl.error) {
        console.log(tl.error);
      } else {
        console.log(`Trace: ${tl.trace} (${tl.total_events} events)`);
        console.log('-'.repeat(60));
        for (const e of tl.timeline) {
          const agent = e.agent ? `[${e.agent}]` : '';
          console.log(`  ${e.ts} ${pad(e.type, 16)} ${agent}`);
        }
      }
    } else {
      console.log(JSON.stringify(tl, null, 2));
    }
    return;
  }

  // Full report
  const report = {
    generated_at: new Date().toISOString(),
    source: path.resolve(jsonlPath),
    total_events: events.length,
    period_filter: periodDays ? `${periodDays}d` : null,
    agent_metrics: computeAgentMetrics(events),
    session_metrics: computeSessionMetrics(events),
    event_distribution: computeEventDistribution(events),
    delegation_graph: computeDelegationGraph(events),
  };

  if (format === 'table') {
    printTable(report);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch(err => {
  console.error('Analytics error:', err.message);
  process.exit(1);
});
