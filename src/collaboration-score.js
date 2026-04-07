#!/usr/bin/env node
/**
 * Team-Shinchan Collaboration Score — Task complexity scorer for routing decisions
 *
 * Usage:
 *   node src/collaboration-score.js --task "description" [--files N] [--domains N] [--arch-change] [--recommend-model]
 *
 * Output: JSON { score, mode, description, breakdown: { files_score, domains_score, arch_score, keyword_score }, recommendedModel? }
 *
 * Modes:
 *   solo    (0-30)   — Bo handles directly
 *   delegate (31-60) — route to domain specialist
 *   debate  (61-100) — debate pass required first
 *
 * Only uses Node.js built-in modules. No external dependencies.
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPLEX_KEYWORDS = [
  'redesign', 'refactor', 'migrate', 'auth', 'security', 'encrypt',
  'accessibility', 'a11y', 'aria', 'wcag',
  'graphql',
  'docker', 'container',
  'migration', 'schema', 'orm',
  'jwt', 'oauth', 'csrf',
];
const MODEL_TIERS = ['haiku', 'sonnet', 'opus'];

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    task: null,
    files: 1,
    domains: 1,
    archChange: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--task' && args[i + 1] !== undefined) {
      result.task = args[++i];
    } else if (arg === '--files' && args[i + 1] !== undefined) {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val) && val >= 0) result.files = val;
    } else if (arg === '--domains' && args[i + 1] !== undefined) {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val) && val >= 0) result.domains = val;
    } else if (arg === '--arch-change') {
      result.archChange = true;
    }
  }

  return result;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function computeKeywordScore(task) {
  const lower = task.toLowerCase();
  let hits = 0;
  for (const kw of COMPLEX_KEYWORDS) {
    if (lower.includes(kw)) hits++;
  }
  return Math.min(hits * 5, 10);
}

function computeScore({ task, files, domains, archChange }) {
  const files_score    = Math.min(files * 5, 40);
  const domains_score  = Math.min((domains - 1) * 15, 30);
  const arch_score     = archChange ? 25 : 0;
  const keyword_score  = computeKeywordScore(task);
  const total          = Math.min(files_score + domains_score + arch_score + keyword_score, 100);

  return {
    score: total,
    breakdown: { files_score, domains_score, arch_score, keyword_score },
  };
}

function classify(score) {
  if (score <= 30) return { mode: 'solo',     model_tier: MODEL_TIERS[0], description: 'Bo handles directly — low complexity task' };
  if (score <= 60) return { mode: 'delegate', model_tier: MODEL_TIERS[1], description: 'Route to domain specialist — moderate complexity' };
  return              { mode: 'debate',    model_tier: MODEL_TIERS[2], description: 'Debate pass required — high complexity task' };
}

// ── Model Escalation ──────────────────────────────────────────────────────────

/**
 * Escalate to the next model tier when a task requires more capacity.
 *
 * @param {string} currentTier - Current model tier ('haiku', 'sonnet', 'opus', or unknown)
 * @returns {string} Next model tier
 */
function escalateModel(currentTier) {
  switch (currentTier) {
    case 'haiku':  return 'sonnet';
    case 'sonnet': return 'opus';
    case 'opus':   return 'opus';   // already at ceiling
    default:       return 'sonnet'; // safe default for unknown values
  }
}

// ── Per-Turn Model Routing ───────────────────────────────────────────────────

/**
 * Recommend the optimal model tier for a given task description.
 *
 * @param {string} task - The task description text
 * @param {object} [opts] - Optional context hints
 * @param {number} [opts.files] - Number of files involved
 * @param {number} [opts.domains] - Number of domains involved
 * @param {boolean} [opts.archChange] - Whether an architecture change is involved
 * @returns {{ model: string, reason: string }}
 */
function recommendModel(task, opts = {}) {
  const words = task.split(/\s+/).length;
  const chars = task.length;
  const lower = task.toLowerCase();

  // Simple task → haiku
  const simplePatterns = [
    /^(read|list|show|find|search|check|get|count)\s/i,
    /^what (is|are)\s/i,
    /^how many\s/i,
    /^where (is|are)\s/i,
  ];
  if (chars < 160 && words < 28 && !/```/.test(task) && !/https?:\/\//.test(task)) {
    for (const p of simplePatterns) {
      if (p.test(task)) return { model: 'haiku', reason: 'simple-query' };
    }
  }

  // Complex task → opus
  const complexKw = ['debug','implement','refactor','redesign','migrate','architect',
    'security','performance','optimize','breaking change','cross-domain'];
  const hits = complexKw.filter(k => lower.includes(k));
  if (hits.length >= 2 || opts.archChange || (opts.files && opts.files > 10)) {
    return { model: 'opus', reason: 'complex(' + (hits.join(',') || 'high-complexity') + ')' };
  }

  // Default → sonnet
  return { model: 'sonnet', reason: 'standard-task' };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const params = parseArgs(process.argv);

  if (!params.task) {
    process.stderr.write(
      'Usage: node src/collaboration-score.js --task "description" [--files N] [--domains N] [--arch-change]\n' +
      '\n' +
      'Options:\n' +
      '  --task "string"  Task description (required)\n' +
      '  --files N        Number of files involved (default: 1)\n' +
      '  --domains N      Number of domains involved (default: 1)\n' +
      '  --arch-change    Flag: architecture change (default: false)\n' +
      '  --recommend-model Include per-turn model recommendation in output\n'
    );
    process.exit(1);
  }

  const { score, breakdown } = computeScore(params);
  const { mode, model_tier, description } = classify(score);

  const output = { score, mode, model_tier, description, breakdown };

  const args = process.argv.slice(2);
  if (args.includes('--recommend-model') && params.task) {
    const rec = recommendModel(params.task, {
      files: params.files,
      domains: params.domains,
      archChange: params.archChange,
    });
    output.recommendedModel = rec;
  }

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

if (require.main === module) { main(); }

module.exports = { escalateModel, recommendModel };
