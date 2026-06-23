'use strict';

/**
 * benchmarks/scorer.js — Phase 4 (main-078)
 *
 * Deterministic, model-free scorer (DEC-M3, FR-4, NFR-2, HR-3, HR-10).
 * Given an arm's git diff applied to a pristine worktree, it:
 *   (a) applies the diff (empty OR non-applying => deterministic FAIL, never throw — HR-10)
 *   (b) runs the task's pinned test_cmd and takes the REAL exit code as pass/fail
 *       (NOT the count-as-pass heuristic in src/eval-metrics.js:95)
 *   (c) counts LOC via the diff (git numstat semantics)
 *   (d) records wall-clock time
 *
 * No language model is invoked anywhere in this path (NFR-2). Re-scoring the same stored diff
 * yields byte-identical deterministic fields (pass, loc_added, loc_deleted) — AC-6.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

/**
 * Count added/deleted lines from a unified diff (git numstat semantics:
 * '+'/'-' lines, excluding the +++/--- file headers).
 * @param {string} diff
 * @returns {{loc_added:number, loc_deleted:number}}
 */
function countLoc(diff) {
  let added = 0;
  let deleted = 0;
  if (!diff) return { loc_added: 0, loc_deleted: 0 };
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added++;
    else if (line.startsWith('-')) deleted++;
  }
  return { loc_added: added, loc_deleted: deleted };
}

/**
 * Apply a diff to the worktree and score the result.
 * @param {string} diff           unified diff produced by an arm
 * @param {{test_cmd:string}} task  task spec (pinned test command)
 * @param {string} worktreeDir     pristine fixture worktree to score against
 * @returns {{pass:boolean, loc_added:number, loc_deleted:number, wall_clock_ms:number, reason?:string}}
 */
function score(diff, task, worktreeDir) {
  const loc = countLoc(diff);

  // HR-10: empty diff => deterministic FAIL, never skip/crash.
  if (!diff || diff.trim() === '') {
    return { pass: false, loc_added: 0, loc_deleted: 0, wall_clock_ms: 0, reason: 'non-applying-or-empty' };
  }

  // Apply the diff via a temp patch file. Non-applying => deterministic FAIL (HR-10).
  const patchFile = path.join(os.tmpdir(), `arm-patch-${process.pid}-${Date.now()}.diff`);
  try {
    fs.writeFileSync(patchFile, diff.endsWith('\n') ? diff : diff + '\n');
  } catch (_e) {
    return { pass: false, loc_added: loc.loc_added, loc_deleted: loc.loc_deleted, wall_clock_ms: 0, reason: 'non-applying-or-empty' };
  }

  try {
    execFileSync('git', ['apply', '--whitespace=nowarn', patchFile], { cwd: worktreeDir, stdio: 'pipe' });
  } catch (_e) {
    safeUnlink(patchFile);
    return { pass: false, loc_added: loc.loc_added, loc_deleted: loc.loc_deleted, wall_clock_ms: 0, reason: 'non-applying-or-empty' };
  }
  safeUnlink(patchFile);

  // Run the pinned test command; REAL exit code is the grade.
  // Strip any NODE_TEST_* context from the environment: a parent `node --test`
  // process leaks NODE_TEST_CONTEXT into children, which makes a nested
  // `node --test` exit 0 regardless of its assertions — that would corrupt the
  // grade. A clean test env keeps the child's exit code honest and deterministic.
  const childEnv = {};
  for (const k of Object.keys(process.env)) {
    if (!k.startsWith('NODE_TEST')) childEnv[k] = process.env[k];
  }
  const start = Date.now();
  let pass = false;
  try {
    execSync(task.test_cmd, { cwd: worktreeDir, stdio: 'pipe', env: childEnv });
    pass = true; // exit code 0
  } catch (_e) {
    pass = false; // nonzero exit
  }
  const wall_clock_ms = Date.now() - start;

  return { pass, loc_added: loc.loc_added, loc_deleted: loc.loc_deleted, wall_clock_ms };
}

function safeUnlink(p) {
  try { fs.unlinkSync(p); } catch (_e) { /* ignore */ }
}

module.exports = { countLoc, score };
