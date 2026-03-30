#!/usr/bin/env node
/**
 * Team-Shinchan Doctor — Project setup diagnostic tool.
 *
 * Usage:
 *   node src/doctor.js
 *
 * Output: one line per check (PASS/WARN/FAIL + remediation hint), then a summary line.
 * Exit 0 always — diagnostic only, never blocks workflow.
 *
 * Checks (deterministic order, hardcoded):
 *   1. WORKFLOW_STATE.yaml presence         → WARN if absent (phase-dependent)
 *   2. hooks/hooks.json presence + validity  → FAIL if absent or invalid JSON
 *   3. src/collaboration-score.js reachable → FAIL if absent
 *   4. src/agent-context.js reachable       → FAIL if absent
 *   5. .shinchan-docs/.current-agent presence → WARN if absent (created dynamically)
 *   6. tests/validate/ directory presence   → FAIL if absent
 *   7. .shinchan-docs/session-budget.json presence → WARN if absent (created on first session)
 *
 * Constraints:
 *   HR-1: No raw file contents printed — structural validity only.
 *   HR-4: Deterministic output order — hardcoded CHECKS array.
 *   Node.js built-ins only. No npm dependencies. Must complete < 3s.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOT = process.cwd();

/** @typedef {'PASS'|'WARN'|'FAIL'} Status */

/**
 * Each check descriptor:
 *   id       — short machine label
 *   label    — human-readable description
 *   run()    — returns { status: Status, hint: string }
 */
const CHECKS = [
  {
    id: 'workflow-state',
    label: 'WORKFLOW_STATE.yaml presence',
    run() {
      // Check for WORKFLOW_STATE.yaml in any doc folder (.shinchan-docs/*/WORKFLOW_STATE.yaml)
      const docsDir = path.join(ROOT, '.shinchan-docs');
      try {
        const entries = fs.readdirSync(docsDir);
        const found = entries.some(entry => {
          const candidate = path.join(docsDir, entry, 'WORKFLOW_STATE.yaml');
          return exists(candidate);
        });
        if (found) return pass();
      } catch (_) {
        // .shinchan-docs itself doesn't exist
      }
      return warn('Run /team-shinchan:start to initialise workflow state');
    },
  },
  {
    id: 'hooks-json',
    label: 'hooks/hooks.json presence + JSON validity',
    run() {
      const p = path.join(ROOT, 'hooks', 'hooks.json');
      if (!exists(p)) {
        return fail('File hooks/hooks.json is missing — re-install or restore from git');
      }
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        JSON.parse(raw);
        return pass();
      } catch (_) {
        return fail('hooks/hooks.json exists but is not valid JSON — restore from git history');
      }
    },
  },
  {
    id: 'collaboration-score',
    label: 'src/collaboration-score.js reachable',
    run() {
      const p = path.join(ROOT, 'src', 'collaboration-score.js');
      if (exists(p)) return pass();
      return fail('src/collaboration-score.js is missing — restore from git or re-install plugin');
    },
  },
  {
    id: 'agent-context',
    label: 'src/agent-context.js reachable',
    run() {
      const p = path.join(ROOT, 'src', 'agent-context.js');
      if (exists(p)) return pass();
      return fail('src/agent-context.js is missing — restore from git or re-install plugin');
    },
  },
  {
    id: 'current-agent',
    label: '.shinchan-docs/.current-agent presence',
    run() {
      const p = path.join(ROOT, '.shinchan-docs', '.current-agent');
      if (exists(p)) return pass();
      return warn('Created dynamically at session start; will appear after first agent invocation');
    },
  },
  {
    id: 'tests-validate',
    label: 'tests/validate/ directory presence',
    run() {
      const p = path.join(ROOT, 'tests', 'validate');
      if (existsDir(p)) return pass();
      return fail('tests/validate/ directory is missing — restore from git or re-install plugin');
    },
  },
  {
    id: 'session-budget',
    label: '.shinchan-docs/session-budget.json presence',
    run() {
      const p = path.join(ROOT, '.shinchan-docs', 'session-budget.json');
      if (exists(p)) return pass();
      return warn('Created on first session; will appear after /team-shinchan:start is run');
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if path exists and is a file (or symlink to file). */
function exists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
}

/** Returns true if path exists and is a directory. */
function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch (_) {
    return false;
  }
}

/** @returns {{ status: 'PASS', hint: string }} */
function pass() { return { status: 'PASS', hint: '' }; }

/** @returns {{ status: 'WARN', hint: string }} */
function warn(hint) { return { status: 'WARN', hint }; }

/** @returns {{ status: 'FAIL', hint: string }} */
function fail(hint) { return { status: 'FAIL', hint }; }

// ── Formatting ────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  PASS: '[PASS]',
  WARN: '[WARN]',
  FAIL: '[FAIL]',
};

/**
 * Format a single check result as one output line.
 * PASS lines omit the hint for brevity.
 */
function formatLine(index, check, result) {
  const num = String(index + 1).padStart(1, ' ');
  const status = STATUS_LABEL[result.status];
  const base = `  ${num}. ${status} ${check.label}`;
  if (result.status === 'PASS' || !result.hint) return base;
  return `${base}\n       Hint: ${result.hint}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const results = CHECKS.map(check => ({ check, result: check.run() }));

  const passed = results.filter(r => r.result.status === 'PASS').length;
  const warned = results.filter(r => r.result.status === 'WARN').length;
  const failed = results.filter(r => r.result.status === 'FAIL').length;

  const overallLabel = failed > 0 ? 'ERRORS' : warned > 0 ? 'WARNINGS' : 'OK';

  process.stdout.write('Team-Shinchan Doctor\n');
  process.stdout.write('─'.repeat(40) + '\n');

  results.forEach(({ check, result }, i) => {
    process.stdout.write(formatLine(i, check, result) + '\n');
  });

  process.stdout.write('─'.repeat(40) + '\n');
  process.stdout.write(`Doctor: ${passed}/7 checks passed — ${overallLabel}\n`);

  if (warned > 0) {
    process.stdout.write(`  Warnings: ${warned} (workflow can proceed)\n`);
  }
  if (failed > 0) {
    process.stdout.write(`  Errors:   ${failed} (action required)\n`);
  }

  // Exit 0 always — diagnostic only, never blocks.
  process.exit(0);
}

main();
