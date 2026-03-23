#!/usr/bin/env node
/**
 * Team-Shinchan Collaboration Score — Task complexity scorer for routing decisions
 *
 * Usage:
 *   node src/collaboration-score.js --task "description" [--files N] [--domains N] [--arch-change]
 *
 * Output: JSON { score, mode, description, breakdown: { files_score, domains_score, arch_score, keyword_score } }
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

const COMPLEX_KEYWORDS = ['redesign', 'refactor', 'migrate', 'auth', 'security', 'encrypt'];
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
      '  --arch-change    Flag: architecture change (default: false)\n'
    );
    process.exit(1);
  }

  const { score, breakdown } = computeScore(params);
  const { mode, model_tier, description } = classify(score);

  const output = { score, mode, model_tier, description, breakdown };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main();
