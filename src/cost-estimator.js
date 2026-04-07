#!/usr/bin/env node
'use strict';

// cost-estimator.js — Estimate API costs from work-tracker events
// Usage: node cost-estimator.js <work-tracker.jsonl> [session-id]

const fs = require('fs');
const path = require('path');

// Model pricing per 1M tokens (USD)
const MODEL_PRICING = {
  opus:   { input: 15.00, output: 75.00 },
  sonnet: { input: 3.00,  output: 15.00 },
  haiku:  { input: 0.80,  output: 4.00  },
};

// Agent → model mapping (from agent frontmatter)
const AGENT_MODEL = {
  shinnosuke: 'opus', himawari: 'opus', midori: 'sonnet',
  bo: 'sonnet', kazama: 'opus',
  aichan: 'sonnet', bunta: 'sonnet', masao: 'sonnet',
  hiroshi: 'opus', nene: 'opus', misae: 'sonnet', actionkamen: 'opus',
  shiro: 'sonnet', masumi: 'sonnet', ume: 'sonnet',
};

// Average tokens per agent invocation (heuristic)
const AVG_TOKENS = { opus: 8000, sonnet: 4000, haiku: 2000 };

function estimateCost(events, sessionId) {
  const filtered = sessionId
    ? events.filter(e => e.session === sessionId)
    : events;

  const agentInvocations = {};
  for (const e of filtered) {
    if (e.type === 'agent_start' && e.agent) {
      agentInvocations[e.agent] = (agentInvocations[e.agent] || 0) + 1;
    }
  }

  const agentCosts = {};
  let totalCost = 0;

  for (const [agent, count] of Object.entries(agentInvocations)) {
    const model = AGENT_MODEL[agent] || 'sonnet';
    const pricing = MODEL_PRICING[model];
    const tokens = AVG_TOKENS[model] * count;
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    const cost = (inputTokens / 1e6) * pricing.input + (outputTokens / 1e6) * pricing.output;

    agentCosts[agent] = {
      model, invocations: count,
      estimatedTokens: tokens,
      estimatedCost: Math.round(cost * 10000) / 10000,
    };
    totalCost += cost;
  }

  return {
    sessionId: sessionId || 'all',
    agentCosts,
    totalEstimatedCost: Math.round(totalCost * 10000) / 10000,
    currency: 'USD',
  };
}

function estimatePerTurnCost(agent) {
  const model = AGENT_MODEL[agent] || 'sonnet';
  const pricing = MODEL_PRICING[model];
  const tokens = AVG_TOKENS[model];
  const cost = (tokens * 0.7 / 1e6) * pricing.input + (tokens * 0.3 / 1e6) * pricing.output;
  return { agent, model, estimatedCostPerTurn: Math.round(cost * 10000) / 10000 };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--per-turn')) {
    const agent = args[args.indexOf('--per-turn') + 1] || 'bo';
    console.log(JSON.stringify(estimatePerTurnCost(agent), null, 2));
  } else {
    const [jsonlPath, sessionId] = args;
    if (!jsonlPath) {
      console.error('Usage: node cost-estimator.js <work-tracker.jsonl> [session-id]');
      console.error('       node cost-estimator.js --per-turn <agent-name>');
      process.exit(1);
    }
    const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
    const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    console.log(JSON.stringify(estimateCost(events, sessionId), null, 2));
  }
}

module.exports = { estimateCost, estimatePerTurnCost, MODEL_PRICING, AGENT_MODEL };
