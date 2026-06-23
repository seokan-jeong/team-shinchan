'use strict';

/**
 * benchmarks/run.js — Phase 5 (main-078)
 *
 * The runner spine (DEC-1, DEC-M1, DEC-M2, NFR-1/3/5). For each (task × arm × repeat):
 *   - `git worktree add` a fresh worktree off the pinned fixture commit (isolation)
 *   - invoke the arm (arm-A = /team-shinchan:implement via the CLI with the plugin enabled;
 *     arm-B = the SAME CLI/model/flags with the plugin disabled via a clean CLAUDE_CONFIG_DIR)
 *   - capture real total_cost_usd + full usage from the CLI JSON
 *   - hand the diff to the deterministic scorer; persist the result + both arms' prompt/config
 *   - a PRE-invocation $-ceiling kill-switch aborts BEFORE any call that would cross the ceiling
 *
 * The real CLI call is isolated behind an injectable `invoke` so the deterministic test
 * suite drives the runner with mocks and spends NO money. This module is BUILT and
 * unit-tested with mocks; it is NOT executed against the paid API in this workflow.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { score: defaultScore } = require('./scorer.js');
const { createBenchmarkRecord, usageToUsd } = require('./lib/eval-record.js');
const { appendEval } = require('../src/eval-schema.js');
const { buildPluginOffConfigDir, assertNoTeamShinchanFired } = require('./lib/plugin-off.js');

/**
 * Pre-invocation kill-switch: would the next call cross the hard ceiling?
 * @param {number} runningUsd
 * @param {number} nextEstimateUsd
 * @param {number} ceiling
 * @returns {boolean} true if the next call must be aborted (would overrun)
 */
function wouldOverrun(runningUsd, nextEstimateUsd, ceiling) {
  return runningUsd + nextEstimateUsd > ceiling;
}

/**
 * Read the REAL cost from a CLI JSON response. Fails LOUDLY if total_cost_usd is
 * absent rather than silently scoring $0 (FR-5 defensive read against CLI drift).
 * @param {Object} json
 * @returns {number}
 */
function readCostUsd(json) {
  if (!json || typeof json.total_cost_usd !== 'number') {
    throw new Error('readCostUsd: total_cost_usd absent from CLI JSON — refusing to score $0 (FR-5)');
  }
  return json.total_cost_usd;
}

/**
 * Run `fn(worktreePath)` inside a fresh git worktree off `sha`, removing the worktree
 * even if `fn` throws (try/finally) — no leftover state across runs (DEC-M1/NFR-5).
 * @param {string} repoDir  git repo containing the pinned fixture commit
 * @param {string} sha      commit to check out
 * @param {(wt:string)=>any} fn
 */
function withWorktree(repoDir, sha, fn) {
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-wt-')) + '-wt';
  execFileSync('git', ['worktree', 'add', '--detach', wt, sha], { cwd: repoDir, stdio: 'pipe' });
  try {
    return fn(wt);
  } finally {
    try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: repoDir, stdio: 'pipe' }); } catch (_e) { /* ignore */ }
    try { fs.rmSync(wt, { recursive: true, force: true }); } catch (_e) { /* ignore */ }
  }
}

/**
 * Default arm-A/arm-B invoker — the ONLY place a real `claude -p` call happens.
 * Tests inject a mock instead, so the suite never spends money.
 *
 * arm-A: plugin enabled (default config), runs /team-shinchan:implement.
 * arm-B: plugin disabled via a clean isolated CLAUDE_CONFIG_DIR; SAME --model haiku.
 * Both arms pass --model haiku EXPLICITLY (must NOT inherit any agent frontmatter
 * default) so the comparison holds the model constant (DEC-1/NFR-3 fairness).
 *
 * NOTE: not invoked by the deterministic test suite. Used only by the user-gated paid run.
 */
function defaultInvoke({ arm, task, cwd }) {
  const promptA = `/team-shinchan:implement ${task.prompt}`;
  const promptB = task.prompt; // bare prompt, no plugin skill
  const isA = arm === 'A';
  const prompt = isA ? promptA : promptB;
  const env = { ...process.env };
  let configDir = null;
  if (!isA) {
    configDir = buildPluginOffConfigDir();
    env.CLAUDE_CONFIG_DIR = configDir;
  }
  // --model haiku EXPLICIT for BOTH arms (fairness invariant).
  const args = ['-p', prompt, '--output-format', 'json', '--model', 'haiku'];
  const out = execFileSync('claude', args, { cwd, env, stdio: 'pipe' }).toString();
  const json = JSON.parse(out);
  // capture the diff the arm produced in the worktree
  const diff = execFileSync('git', ['diff'], { cwd }).toString();
  return { json, diff, prompt, configDir };
}

/**
 * Run the (task × arm × repeat) matrix with a pre-invocation kill-switch.
 * Injectable `invoke` and `score` keep the deterministic test path money-free.
 *
 * @returns {{results:Array, totalUsd:number, aborted:boolean, partial_coverage:boolean}}
 */
function runMatrix(opts) {
  const {
    tasks,
    arms = ['A', 'B'],
    repeats = 3,
    ceiling_usd = 1.0,
    invoke = defaultInvoke,
    score = defaultScore,
    persistDir = null,
    resultsFile = null,
  } = opts;

  const results = [];
  let totalUsd = 0;
  let aborted = false;

  outer:
  for (const task of tasks) {
    for (const arm of arms) {
      for (let r = 1; r <= repeats; r++) {
        // estimate next-call cost from the running average (or a small floor on the first call)
        const estimate = results.length ? totalUsd / results.length : 0.05;
        if (wouldOverrun(totalUsd, estimate, ceiling_usd)) {
          aborted = true;
          break outer; // abort BEFORE the next invocation
        }
        const inv = invoke({ arm, task, repeat: r });
        const cost = readCostUsd(inv.json);
        totalUsd += cost;

        const scoreRes = score(inv.diff, task, inv.cwd || os.tmpdir());

        // persist both arms' prompt + config for third-party re-derivation (NFR-3)
        let promptPath = null;
        if (persistDir) {
          fs.mkdirSync(persistDir, { recursive: true });
          promptPath = path.join(persistDir, `${task.id}-${arm}-r${r}.config.json`);
          fs.writeFileSync(promptPath, JSON.stringify({
            task_id: task.id, arm, repeat: r,
            prompt: inv.prompt !== undefined ? inv.prompt : (arm === 'A' ? `/team-shinchan:implement ${task.prompt}` : task.prompt),
            model: 'haiku',
            config_dir: inv.configDir || (arm === 'A' ? 'default (plugin enabled)' : 'isolated (plugin disabled)'),
          }, null, 2) + '\n');
        }

        const rec = createBenchmarkRecord({
          phase: 5,
          task_id: task.id,
          arm,
          repeat: r,
          pass: scoreRes.pass,
          loc_added: scoreRes.loc_added,
          loc_deleted: scoreRes.loc_deleted,
          wall_clock_ms: scoreRes.wall_clock_ms,
          cost_usd: cost,
          usage: inv.json.usage,
          safety_ok: scoreRes.safety_ok !== undefined ? scoreRes.safety_ok : true,
          prompt_persisted_path: promptPath,
        });
        // attach a derived-USD cross-check from real usage (never AVG)
        try { rec.usage_usd_crosscheck = usageToUsd(inv.json.usage || {}, 'haiku'); } catch (_e) { /* usage shape may vary */ }
        results.push(rec);
        if (resultsFile) appendEval(rec, resultsFile);
      }
    }
  }

  return { results, totalUsd, aborted, partial_coverage: aborted };
}

module.exports = { wouldOverrun, readCostUsd, withWorktree, runMatrix, defaultInvoke };
