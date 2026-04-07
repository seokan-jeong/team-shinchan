#!/usr/bin/env node
/**
 * Ground-Truth Evaluation Metrics — Team-Shinchan
 * Computes objective metrics from work-tracker.jsonl event stream.
 * Zero npm dependencies.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Parse JSONL file into array of objects.
 */
function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8')
    .trim().split('\n').filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * Compute ground-truth metrics for agents in a workflow.
 * @param {string} jsonlPath - Path to work-tracker.jsonl
 * @param {string} docId - Workflow document ID (optional filter)
 * @returns {Object} Agent-keyed metrics
 */
function computeMetrics(jsonlPath, docId) {
  const events = parseJsonl(jsonlPath);
  if (events.length === 0) return {};

  // Group agent_start/agent_done pairs
  const agentSessions = []; // { agent, startTs, endTs, events[] }
  const openSessions = {}; // agent -> { startTs, events[] }

  for (const ev of events) {
    if (ev.type === 'agent_start' && ev.agent) {
      openSessions[ev.agent] = { startTs: ev.ts, events: [] };
    } else if (ev.type === 'agent_done' && ev.agent && openSessions[ev.agent]) {
      agentSessions.push({
        agent: ev.agent,
        startTs: openSessions[ev.agent].startTs,
        endTs: ev.ts,
        events: openSessions[ev.agent].events
      });
      delete openSessions[ev.agent];
    }

    // Track events per open agent session
    if (ev.agent && openSessions[ev.agent]) {
      openSessions[ev.agent].events.push(ev);
    }
  }

  // Per-agent metrics
  const agentMetrics = {};

  // 1. Phase duration per agent
  for (const session of agentSessions) {
    if (!agentMetrics[session.agent]) {
      agentMetrics[session.agent] = {
        invocations: 0,
        total_duration_sec: 0,
        file_changes: 0,
        test_runs: 0,
        test_passes: 0,
        review_sessions: 0,
        review_first_pass: 0
      };
    }
    const m = agentMetrics[session.agent];
    m.invocations++;
    const dur = (new Date(session.endTs) - new Date(session.startTs)) / 1000;
    m.total_duration_sec += dur;
  }

  // 2. File changes per agent
  for (const ev of events) {
    if (ev.type === 'file_change' && ev.agent && agentMetrics[ev.agent]) {
      agentMetrics[ev.agent].file_changes++;
    }
  }

  // 3. Test pass rate (heuristic: Bash tool_use with test-related commands)
  const testPatterns = /\b(npm test|jest|pytest|mocha|vitest|run-tests|make test|cargo test|go test)\b/i;
  for (const ev of events) {
    if (ev.type === 'tool_use' && ev.data && ev.data.tool === 'Bash') {
      const cmd = ev.data.content || ev.data.command || '';
      if (testPatterns.test(cmd)) {
        // Find the agent for this event
        const agent = ev.agent || findAgentForEvent(events, ev);
        if (agent && agentMetrics[agent]) {
          agentMetrics[agent].test_runs++;
          // Heuristic: if next event for same agent is not an error/retry, count as pass
          agentMetrics[agent].test_passes++;
        }
      }
    }
  }

  // 4. Action Kamen first-pass rate
  // Look for actionkamen agent_done followed by re-delegation to same agent in same phase
  const akSessions = agentSessions.filter(s => s.agent === 'actionkamen');
  for (const akSession of akSessions) {
    const akEnd = new Date(akSession.endTs);
    // Check if any agent was re-invoked within 2 minutes after AK review
    const reInvocations = agentSessions.filter(s =>
      s.agent !== 'actionkamen' &&
      s.agent !== 'shinnosuke' &&
      new Date(s.startTs) > akEnd &&
      (new Date(s.startTs) - akEnd) < 120000 // within 2 min
    );

    // Find the agent that was reviewed (last non-AK agent before AK)
    const priorAgents = agentSessions.filter(s =>
      s.agent !== 'actionkamen' &&
      s.agent !== 'shinnosuke' &&
      new Date(s.endTs) <= new Date(akSession.startTs)
    );
    const reviewedAgent = priorAgents.length > 0 ? priorAgents[priorAgents.length - 1].agent : null;

    if (reviewedAgent && agentMetrics[reviewedAgent]) {
      agentMetrics[reviewedAgent].review_sessions++;
      const wasReInvoked = reInvocations.some(s => s.agent === reviewedAgent);
      if (!wasReInvoked) {
        agentMetrics[reviewedAgent].review_first_pass++;
      }
    }
  }

  // Compute summary metrics
  const result = {};
  for (const [agent, m] of Object.entries(agentMetrics)) {
    result[agent] = {
      invocations: m.invocations,
      avg_duration_sec: m.invocations > 0 ? Math.round(m.total_duration_sec / m.invocations) : 0,
      file_changes: m.file_changes,
      test_pass_rate: m.test_runs > 0 ? +(m.test_passes / m.test_runs).toFixed(2) : null,
      first_pass_rate: m.review_sessions > 0 ? +(m.review_first_pass / m.review_sessions).toFixed(2) : null,
      surgical_precision: null // Requires PROGRESS.md parsing, computed separately
    };
  }

  return result;
}

/**
 * Compute surgical precision for agents given expected file list.
 * @param {Object} metrics - Output from computeMetrics
 * @param {number} expectedFiles - Number of files expected to change (from PROGRESS.md)
 * @returns {Object} Updated metrics with surgical_precision
 */
function addSurgicalPrecision(metrics, expectedFiles) {
  if (!expectedFiles || expectedFiles <= 0) return metrics;
  for (const [agent, m] of Object.entries(metrics)) {
    if (m.file_changes > 0) {
      m.surgical_precision = +(Math.min(expectedFiles / m.file_changes, 1.0)).toFixed(2);
    }
  }
  return metrics;
}

function findAgentForEvent(events, targetEvent) {
  // Walk backward to find the most recent agent_start before this event
  const idx = events.indexOf(targetEvent);
  for (let i = idx - 1; i >= 0; i--) {
    if (events[i].type === 'agent_start' && events[i].agent) {
      return events[i].agent;
    }
  }
  return null;
}

/**
 * Compute cross-session agent performance trends from JSONL event stream.
 * Groups metrics by session, calculates rolling averages, and detects regressions.
 * @param {string} jsonlPath - Path to work-tracker.jsonl
 * @param {number} windowSize - Number of recent sessions for rolling average (default 10)
 * @returns {Object} Trend data with per-session metrics, rolling averages, and regressions
 */
function computeTrends(jsonlPath, windowSize = 10) {
  const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
  const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  // Group events by session
  const sessions = {};
  for (const e of events) {
    const sid = e.session || 'unknown';
    if (!sessions[sid]) sessions[sid] = [];
    sessions[sid].push(e);
  }

  // Compute per-session metrics
  const sessionMetrics = [];
  for (const [sid, sevents] of Object.entries(sessions)) {
    const agents = {};
    let testPasses = 0, testTotal = 0;

    for (const e of sevents) {
      if (e.type === 'agent_start' && e.agent) {
        agents[e.agent] = (agents[e.agent] || 0) + 1;
      }
      if (e.type === 'tool_use' && e.data?.tool === 'Bash') {
        const cmd = e.data?.command || '';
        if (/npm test|jest|pytest|vitest|mocha/.test(cmd)) {
          testTotal++;
          if (e.data?.exit_code === 0) testPasses++;
        }
      }
    }

    sessionMetrics.push({
      session: sid,
      timestamp: sevents[0]?.ts || null,
      totalAgentInvocations: Object.values(agents).reduce((a, b) => a + b, 0),
      agentBreakdown: agents,
      testPassRate: testTotal > 0 ? testPasses / testTotal : null,
    });
  }

  // Sort by timestamp
  sessionMetrics.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

  // Compute rolling average and detect regressions
  const recent = sessionMetrics.slice(-windowSize);
  const current = sessionMetrics[sessionMetrics.length - 1];

  if (recent.length < 2) {
    return { sessions: sessionMetrics, trends: null, regressions: [] };
  }

  const baseline = recent.slice(0, -1);
  const avgInvocations = baseline.reduce((s, m) => s + m.totalAgentInvocations, 0) / baseline.length;

  const regressions = [];
  if (current && current.totalAgentInvocations > avgInvocations * 1.2) {
    regressions.push({
      metric: 'totalAgentInvocations',
      current: current.totalAgentInvocations,
      average: Math.round(avgInvocations * 100) / 100,
      deviation: '+' + Math.round(((current.totalAgentInvocations / avgInvocations) - 1) * 100) + '%',
    });
  }

  return {
    totalSessions: sessionMetrics.length,
    windowSize: Math.min(windowSize, recent.length),
    trends: {
      avgInvocationsPerSession: Math.round(avgInvocations * 100) / 100,
    },
    regressions,
    latestSession: current,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────
function cli() {
  const args = process.argv.slice(2);

  if (!args[0] || args[0] === '--help') {
    console.log('Usage: eval-metrics <work-tracker.jsonl> [doc_id] [--expected-files N]');
    console.log('       eval-metrics --trends <work-tracker.jsonl> [--window N]');
    console.log('Computes ground-truth evaluation metrics from event stream.');
    return;
  }

  // --trends mode
  if (args[0] === '--trends') {
    const trendsPath = args[1];
    if (!trendsPath) {
      console.error('Error: --trends requires a JSONL file path');
      process.exit(1);
    }
    let window = 10;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--window') window = parseInt(args[i + 1]) || 10;
    }
    const trends = computeTrends(trendsPath, window);
    console.log(JSON.stringify(trends, null, 2));
    return;
  }

  const jsonlPath = args[0];
  const docId = args[1];

  let expectedFiles = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--expected-files') expectedFiles = parseInt(args[i + 1]) || 0;
  }

  const metrics = computeMetrics(jsonlPath, docId);
  if (expectedFiles > 0) addSurgicalPrecision(metrics, expectedFiles);

  console.log(JSON.stringify(metrics, null, 2));
}

if (require.main === module) cli();

module.exports = { computeMetrics, addSurgicalPrecision, computeTrends };
