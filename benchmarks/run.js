'use strict';

/**
 * benchmarks/run.js — Phase 5 (main-078)
 *
 * The runner spine (DEC-1, DEC-M1, DEC-M2, NFR-1/3/5). For each (task × arm × repeat):
 *   - copy the vendored fixture into a fresh git-initialised temp dir (isolation)
 *   - invoke the arm (arm-A = /team-shinchan:implement via the CLI with the plugin enabled;
 *     arm-B = the SAME CLI/model/flags with the plugin disabled via a clean CLAUDE_CONFIG_DIR)
 *   - capture real total_cost_usd + full usage from the CLI JSON
 *   - hand the diff to the deterministic scorer; persist the result + both arms' prompt/config
 *   - a PRE-invocation $-ceiling kill-switch aborts BEFORE any call that would cross the ceiling
 *
 * The real CLI call is isolated behind an injectable `invoke` so the deterministic test
 * suite drives the runner with mocks and spends NO money. `runMatrix` itself is
 * invoke-agnostic; the CLI wires the real fixture-copy isolation + scorer around it.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const scorer = require('./scorer.js');
const { score: defaultScore } = scorer;
const verdict = require('./verdict.js');
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
 * Total tokens / real $ — the verdict's efficiency term. All input-side token
 * flavors (fresh input + cache read + cache creation) plus output are summed; a
 * zero cost yields 0 (no division), keeping the field finite for the test path.
 * @param {Object} usage
 * @param {number} costUsd
 * @returns {number}
 */
function computeTokensPerDollar(usage, costUsd) {
  const u = usage || {};
  const total = (u.input_tokens || 0) + (u.output_tokens || 0) +
    (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  return costUsd > 0 ? total / costUsd : 0;
}

/**
 * Recursively copy a directory's contents, EXCLUDING any nested `.git` and the
 * gitignored `.shinchan-docs/` run-state dir. The fixture is vendored as plain files;
 * we never want to drag a stale `.git` or a leaked write-tracker into the clean copy
 * (a leaked `.shinchan-docs` would also trip the arm-B fairness assertion — HR-1).
 * @param {string} src
 * @param {string} dest
 */
function copyFixtureTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.shinchan-docs') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFixtureTree(s, d);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(s), d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Run `fn(copyDir)` against a fresh, git-initialised COPY of the vendored fixture.
 *
 * Isolation is by vendored-copy, NOT by checking out an upstream sha (the task's
 * `fixture_sha` is PROVENANCE only — that commit is not in any local git, so
 * `git worktree add <sha>` could never check it out). We instead:
 *   - mkdtemp a scratch dir,
 *   - recursively copy the vendored fixtureDir into it,
 *   - `git init` + an initial commit (a clean baseline so the arm's `git diff` and
 *     the scorer's `git apply` both work against a committed tree),
 *   - run fn(copyDir),
 *   - remove the copy in a finally (no leftover state across runs — DEC-M1/NFR-5).
 *
 * @param {string} fixtureDir  the vendored fixture (e.g. tests/fixtures/leven)
 * @param {(copyDir:string)=>any} fn
 */
function withFixtureCopy(fixtureDir, fn) {
  const copyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-fix-'));
  copyFixtureTree(fixtureDir, copyDir);
  const git = (args) => execFileSync('git', args, { cwd: copyDir, stdio: 'pipe' });
  git(['init', '-q']);
  git(['add', '-A']);
  git(['-c', 'user.email=b@b', '-c', 'user.name=b', 'commit', '-q', '-m', 'base']);
  try {
    return fn(copyDir);
  } finally {
    try { fs.rmSync(copyDir, { recursive: true, force: true }); } catch (_e) { /* ignore */ }
  }
}

/**
 * Map a task's `fixture` field (e.g. 'leven') to its vendored directory under
 * tests/fixtures/. The fixture is referenced by NAME, never by `fixture_sha`.
 * @param {{fixture:string}} task
 * @returns {string} absolute path to the vendored fixture dir
 */
function fixtureDirFor(task) {
  const name = task && task.fixture;
  if (!name) throw new Error(`fixtureDirFor: task has no "fixture" field (id=${task && task.id})`);
  return path.join(__dirname, '..', 'tests', 'fixtures', name);
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

        // The injected `score` owns isolation (the CLI wraps scorer.score in a
        // fresh fixture copy). runMatrix stays invoke/score-agnostic and never
        // assumes the arm's working dir survives the invoke (it does not).
        const scoreRes = score(inv.diff, task);

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
        // tokens/$ — the verdict's efficiency term. Total tokens (input+output, both
        // cache flavors counted) over real cost. 0 when cost is 0 (no division).
        rec.tokens_per_dollar = computeTokensPerDollar(inv.json.usage || {}, cost);
        results.push(rec);
        if (resultsFile) appendEval(rec, resultsFile);
      }
    }
  }

  return { results, totalUsd, aborted, partial_coverage: aborted };
}

const { safetyCheck } = require('./lib/safety-check.js');

/**
 * The REAL score: run the deterministic scorer (apply-diff → run test_cmd) inside a
 * fresh fixture copy, and fold in the deterministic safety term. Isolation lives here
 * so runMatrix stays score-agnostic.
 * @param {string} diff
 * @param {Object} task
 * @returns {{pass:boolean, loc_added:number, loc_deleted:number, wall_clock_ms:number, safety_ok:boolean, reason?:string}}
 */
function realScore(diff, task) {
  const scoreRes = withFixtureCopy(fixtureDirFor(task), (cwd) => scorer.score(diff, task, cwd));
  const safety = safetyCheck(diff, task);
  return { ...scoreRes, safety_ok: safety.safetyOk };
}

/**
 * The REAL invoke: run the arm inside a fresh fixture copy (the ONLY place a paid
 * `claude` call happens, via defaultInvoke). defaultInvoke uses `cwd` for BOTH the
 * `claude` call and the `git diff` capture, so the produced diff is relative to the
 * clean baseline committed by withFixtureCopy.
 * @param {{arm:string, task:Object}} o
 */
function realInvoke({ arm, task }) {
  return withFixtureCopy(fixtureDirFor(task), (cwd) => defaultInvoke({ arm, task, cwd }));
}

/**
 * Parse argv into CLI options. Recognised flags:
 *   --all                run every task (default if no --tasks)
 *   --repeat N           repeats per (task×arm)   (default 3)
 *   --ceiling U          hard $-ceiling            (default 1.0)
 *   --tasks a,b          comma-separated task ids  (default all)
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const opts = { all: false, repeat: 3, ceiling: 1.0, tasks: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') opts.all = true;
    else if (a === '--repeat') opts.repeat = parseInt(argv[++i], 10);
    else if (a === '--ceiling') opts.ceiling = parseFloat(argv[++i]);
    else if (a === '--tasks') opts.tasks = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return opts;
}

/** Load every benchmarks/tasks/*.json. */
function loadTasks() {
  const dir = path.join(__dirname, 'tasks');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

/**
 * CLI entrypoint — testable. `deps` lets tests inject {invoke, score} so the whole
 * pipeline (parse → load → runMatrix → persist → verdict → summary) runs WITHOUT
 * money. With no deps it uses realInvoke (paid) + realScore.
 *
 * @param {string[]} argv  process.argv.slice(2)
 * @param {{invoke?:Function, score?:Function, log?:Function}} [deps]
 * @returns {{results:Array, totalUsd:number, aborted:boolean, verdict:Object, resultsFile:string}}
 */
function cli(argv, deps = {}) {
  const log = deps.log || console.log;
  const opts = parseArgs(argv);

  const bar = JSON.parse(fs.readFileSync(path.join(__dirname, 'bar.json'), 'utf8'));
  let tasks = loadTasks();
  if (opts.tasks && opts.tasks.length) {
    const wanted = new Set(opts.tasks);
    tasks = tasks.filter((t) => wanted.has(t.id));
  }

  const resultsDir = path.join(__dirname, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(resultsDir, `${stamp}.jsonl`);

  const invoke = deps.invoke || realInvoke;
  const score = deps.score || realScore;

  const matrix = runMatrix({
    tasks,
    repeats: opts.repeat,
    ceiling_usd: opts.ceiling,
    invoke,
    score,
    resultsFile,
  });

  const v = verdict.evaluate(matrix.results, bar, { aborted: matrix.aborted });

  // --- concise summary ---
  const passRate = (arm) => {
    const rows = matrix.results.filter((r) => r.arm === arm);
    return rows.length ? (rows.filter((r) => r.pass).length / rows.length) : 0;
  };
  log(`benchmark: ${tasks.length} task(s) × 2 arms × ${opts.repeat} repeat(s), ceiling $${opts.ceiling}`);
  log(`arm-A pass-rate: ${(passRate('A') * 100).toFixed(0)}%   arm-B pass-rate: ${(passRate('B') * 100).toFixed(0)}%`);
  log(`total spend: $${matrix.totalUsd.toFixed(4)}   aborted(ceiling): ${matrix.aborted}`);
  log(`verdict: ${v.verdict}${v.partial_coverage ? ' (partial_coverage)' : ''}`);
  log(`results: ${resultsFile}`);

  return { ...matrix, verdict: v, resultsFile };
}

module.exports = {
  wouldOverrun,
  readCostUsd,
  withFixtureCopy,
  fixtureDirFor,
  computeTokensPerDollar,
  runMatrix,
  defaultInvoke,
  realInvoke,
  realScore,
  parseArgs,
  loadTasks,
  cli,
};

if (require.main === module) {
  cli(process.argv.slice(2));
}
