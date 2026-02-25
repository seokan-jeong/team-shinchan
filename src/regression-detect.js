#!/usr/bin/env node
// Regression Detection — Team-Shinchan
// CLI: node src/regression-detect.js <path> [--format table] [--agent <name>]
'use strict';
const fs = require('fs');
const readline = require('readline');

const DIMS = ['correctness', 'efficiency', 'compliance', 'quality'];
const WIN = 5;

async function parseRecords(fp) {
  if (!fs.existsSync(fp)) return [];
  const out = [];
  const rl = readline.createInterface({ input: fs.createReadStream(fp, 'utf-8'), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch (_) {}
  }
  return out;
}

function groupByAgent(records) {
  const m = {};
  for (const r of records) { if (r.agent) { (m[r.agent] = m[r.agent] || []).push(r); } }
  return m;
}

function movingAvg(vals) {
  const s = vals.slice(-WIN);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
}

function hasSustainedDecline(evals, dim) {
  let drops = 0;
  for (let i = 1; i < evals.length; i++) {
    const p = evals[i - 1].scores?.[dim], c = evals[i].scores?.[dim];
    if (p != null && c != null && c < p) { if (++drops >= 3) return true; } else { drops = 0; }
  }
  return false;
}

function analyzeAgent(name, evals) {
  if (!evals?.length) return { agent: name, eval_count: 0, regressions: [], sustained_declines: [], latest: null, moving_avg: {} };
  const latest = evals[evals.length - 1];
  const regressions = [], sustained = [], avgMap = {};
  for (const d of DIMS) {
    const vals = evals.map(e => e.scores?.[d]).filter(v => v != null);
    const avg = movingAvg(vals);
    avgMap[d] = Math.round(avg * 100) / 100;
    const lv = latest.scores?.[d];
    if (lv != null && avg > 0 && lv < avg - 1)
      regressions.push({ dimension: d, latest_score: lv, moving_avg: avgMap[d], delta: Math.round((lv - avg) * 100) / 100 });
    if (hasSustainedDecline(evals, d)) sustained.push(d);
  }
  return { agent: name, eval_count: evals.length, regressions, sustained_declines: sustained, latest: latest.scores || {}, moving_avg: avgMap };
}

function buildReport(grouped, filter) {
  const names = filter ? [filter] : Object.keys(grouped).sort();
  const agents = names.map(n => analyzeAgent(n, grouped[n] || []));
  const has = agents.some(a => a.regressions.length > 0 || a.sustained_declines.length > 0);
  return { generated: new Date().toISOString(), agent_count: agents.length, has_regression: has, agents };
}

function formatTable(report) {
  if (!report.agents.length) return 'No evaluation data found.\n';
  const L = [];
  L.push('='.repeat(72), '  Regression Detection Report', '='.repeat(72), '');
  for (const a of report.agents) {
    L.push(`Agent: ${a.agent} (${a.eval_count} evaluations)`, '-'.repeat(40));
    if (!a.eval_count) { L.push('  No evaluations recorded.', ''); continue; }
    L.push('  Dimension     | Latest | Avg(5) | Status', '  ' + '-'.repeat(50));
    for (const d of DIMS) {
      const lv = a.latest[d] != null ? String(a.latest[d]) : '-';
      const av = a.moving_avg[d] != null ? String(a.moving_avg[d]) : '-';
      const rg = a.regressions.find(r => r.dimension === d);
      const sd = a.sustained_declines.includes(d);
      let st = 'OK';
      if (rg) st = `REGRESSION (${rg.delta})`;
      if (sd) st = st === 'OK' ? 'DECLINING' : st + ' + DECLINING';
      L.push(`  ${d.padEnd(14)}| ${lv.padEnd(7)}| ${av.padEnd(7)}| ${st}`);
    }
    L.push('');
  }
  L.push(report.has_regression ? '!! Regressions detected. Review agent performance.' : 'All agents within normal range.', '');
  return L.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const fp = args[0] || '.shinchan-docs/eval-history.jsonl';
  let fmt = 'json', agent = null;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) { fmt = args[++i]; }
    else if (args[i] === '--agent' && args[i + 1]) { agent = args[++i]; }
  }
  const records = await parseRecords(fp);
  if (!records.length) {
    const empty = { generated: new Date().toISOString(), agent_count: 0, has_regression: false, agents: [] };
    process.stdout.write(fmt === 'table' ? 'No evaluation data found.\n' : JSON.stringify(empty, null, 2) + '\n');
    return;
  }
  const report = buildReport(groupByAgent(records), agent);
  process.stdout.write(fmt === 'table' ? formatTable(report) : JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) { main().catch(e => { console.error('Error:', e.message); process.exit(1); }); }
module.exports = { parseRecords, groupByAgent, analyzeAgent, buildReport, formatTable };
