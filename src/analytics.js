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
const { execSync } = require('child_process');

// ── Read and parse JSONL ─────────────────────────────────────────────────────
async function parseLines(jsonlPath) {
  // Graceful file check
  if (!fs.existsSync(jsonlPath)) {
    throw new Error(`File not found: ${jsonlPath}`);
  }
  const stat = fs.statSync(jsonlPath);
  if (stat.size === 0) {
    throw new Error('File is empty.');
  }
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
function applyFilters(events, options = {}) {
  const { periodDays, filterTrace } = options;
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

// ── Git helpers ─────────────────────────────────────────────────────────
function safeExec(cmd, cwd) {
  try { return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 5000 }).trim(); } catch { return ''; }
}

// ── Git metrics ─────────────────────────────────────────────────────────
function computeGitMetrics(cwd) {
  const safe = (cmd) => safeExec(cmd, cwd);

  const commitsToday = safe('git log --oneline --since="midnight"').split('\n').filter(Boolean).length;
  const commitsWeek = safe('git log --oneline --since="7 days ago"').split('\n').filter(Boolean).length;

  // Lines added/deleted from today's commits (sum per-commit stats)
  let linesAdded = 0, linesDeleted = 0;
  const logStat = safe('git log --shortstat --since="midnight"');
  for (const line of logStat.split('\n')) {
    const insMatch = line.match(/(\d+) insertion/);
    const delMatch = line.match(/(\d+) deletion/);
    if (insMatch) linesAdded += parseInt(insMatch[1]);
    if (delMatch) linesDeleted += parseInt(delMatch[1]);
  }

  // Files changed today
  const changedFiles = safe('git log --pretty=format: --name-only --since="midnight"')
    .split('\n').filter(Boolean);
  const uniqueFiles = [...new Set(changedFiles)];

  // Hotspot files (top 5 most-changed in last 50 commits)
  const allFiles = safe('git log --pretty=format: --name-only -50')
    .split('\n').filter(Boolean);
  const fileCounts = {};
  for (const f of allFiles) fileCounts[f] = (fileCounts[f] || 0) + 1;
  const hotspots = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, changes]) => ({ file, changes }));

  // Test ratio
  const testPattern = /test|spec|__test__|validate/i;
  const testFiles = uniqueFiles.filter(f => testPattern.test(f));
  const testRatio = uniqueFiles.length > 0
    ? Math.round((testFiles.length / uniqueFiles.length) * 100) + '%'
    : 'N/A';

  // Active hours today
  const hours = safe('git log --format="%aI" --since="midnight"')
    .split('\n').filter(Boolean)
    .map(ts => new Date(ts).getHours());
  const activeHours = new Set(hours).size;

  return { commits_today: commitsToday, commits_week: commitsWeek, lines_added: linesAdded, lines_deleted: linesDeleted, files_changed: uniqueFiles.length, hotspot_files: hotspots, test_ratio: testRatio, active_hours: activeHours };
}

// ── Git retro (week-over-week) ──────────────────────────────────────────
function computeGitRetro(cwd, days = 7) {
  const safe = (cmd) => safeExec(cmd, cwd);

  function periodStats(since, until) {
    const untilArg = until ? ` --until="${until}"` : '';
    const commits = safe(`git log --oneline --since="${since}"${untilArg}`).split('\n').filter(Boolean).length;
    const files = new Set(safe(`git log --pretty=format: --name-only --since="${since}"${untilArg}`).split('\n').filter(Boolean)).size;
    const stat = safe(`git log --shortstat --since="${since}"${untilArg}`);
    let added = 0, deleted = 0;
    for (const line of stat.split('\n')) {
      const m = line.match(/(\d+) insertion/); if (m) added += parseInt(m[1]);
      const d = line.match(/(\d+) deletion/); if (d) deleted += parseInt(d[1]);
    }
    return { commits, files, lines_added: added, lines_deleted: deleted };
  }

  const current = periodStats(`${days} days ago`);
  const previous = periodStats(`${days * 2} days ago`, `${days} days ago`);

  const pctDelta = (cur, prev) => prev === 0 ? (cur > 0 ? '+∞' : '0%') : `${cur >= prev ? '+' : ''}${Math.round(((cur - prev) / prev) * 100)}%`;

  return {
    current_period: current,
    previous_period: previous,
    delta: {
      commits: pctDelta(current.commits, previous.commits),
      files: pctDelta(current.files, previous.files),
      lines: pctDelta(current.lines_added + current.lines_deleted, previous.lines_added + previous.lines_deleted),
    }
  };
}

// ── Exports ─────────────────────────────────────────────────────────────
module.exports = {
  parseLines,
  applyFilters,
  computeAgentMetrics,
  computeSessionMetrics,
  computeEventDistribution,
  computeDelegationGraph,
  agentDetail,
  traceTimeline,
  computeGitMetrics,
  computeGitRetro,
};

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

// ── Git table formatter ─────────────────────────────────────────────────────
function printGitTable(metrics, retro) {
  const sep = '━'.repeat(50);
  console.log(sep);
  console.log('  Git Activity Report');
  console.log(sep);
  console.log(`  Commits today:   ${metrics.commits_today}`);
  console.log(`  Commits (7d):    ${metrics.commits_week}`);
  console.log(`  Lines:           +${metrics.lines_added} / -${metrics.lines_deleted}`);
  console.log(`  Files changed:   ${metrics.files_changed}`);
  console.log(`  Test ratio:      ${metrics.test_ratio}`);
  console.log(`  Active hours:    ${metrics.active_hours}`);
  if (metrics.hotspot_files.length > 0) {
    console.log('\n  Hotspot files:');
    for (const h of metrics.hotspot_files) {
      console.log(`    ${pad(h.file, 40)} (${h.changes}x)`);
    }
  }
  if (retro) {
    console.log('\n  Week-over-Week:');
    console.log(`    Commits: ${retro.current_period.commits} vs ${retro.previous_period.commits} (${retro.delta.commits})`);
    console.log(`    Files:   ${retro.current_period.files} vs ${retro.previous_period.files} (${retro.delta.files})`);
    console.log(`    Lines:   ${retro.delta.lines}`);
  }
  console.log(sep);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main(options = {}) {
  const { jsonlPath, format = 'json', filterAgent, filterTrace, periodDays } = options;

  const allEvents = await parseLines(jsonlPath);
  const events = applyFilters(allEvents, { periodDays, filterTrace });

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

if (require.main === module) {
  // ── Parse CLI args ─────────────────────────────────────────────────────────
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`Usage: node analytics.js <jsonl-path> [options]
       node analytics.js --git [--retro <N>d] [--format table]

Options:
  --format table     Output as text table instead of JSON
  --agent <name>     Show detail for a single agent
  --trace <id>       Show timeline for a specific trace ID
  --period <N>d      Filter events to the last N days
  --git              Show git activity metrics (no jsonl-path needed)
  --retro <N>d       Week-over-week comparison for N days (use with --git)`);
    process.exit(0);
  }

  let format = 'json';
  let filterAgent = null;
  let filterTrace = null;
  let periodDays = null;
  let gitMode = false;
  let retroDays = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      format = args[++i];
    } else if (args[i] === '--agent' && args[i + 1]) {
      filterAgent = args[++i];
    } else if (args[i] === '--trace' && args[i + 1]) {
      filterTrace = args[++i];
    } else if (args[i] === '--period' && args[i + 1]) {
      const m = args[++i].match(/^(\d+)d$/);
      if (m) periodDays = parseInt(m[1], 10);
    } else if (args[i] === '--git') {
      gitMode = true;
    } else if (args[i] === '--retro' && args[i + 1]) {
      const rm = args[++i].match(/^(\d+)d$/);
      if (rm) retroDays = parseInt(rm[1], 10);
    }
  }

  if (gitMode) {
    const cwd = process.cwd();
    const metrics = computeGitMetrics(cwd);
    if (retroDays) {
      const retro = computeGitRetro(cwd, retroDays);
      if (format === 'table') {
        printGitTable(metrics, retro);
      } else {
        console.log(JSON.stringify({ git_metrics: metrics, retro }, null, 2));
      }
    } else {
      if (format === 'table') {
        printGitTable(metrics);
      } else {
        console.log(JSON.stringify({ git_metrics: metrics }, null, 2));
      }
    }
    process.exit(0);
  }

  const jsonlPath = args[0];
  main({ jsonlPath, format, filterAgent, filterTrace, periodDays }).catch(err => {
    console.error('Analytics error:', err.message);
    process.exit(1);
  });
}
