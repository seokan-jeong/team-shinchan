'use strict';

// Phase 9 (main-078): the DESIGN S5 delivery trace (5 rows) as executable assertions.
// Each produced value is followed to its consumer. NO paid calls — synthetic diffs,
// the captured/scrubbed sample usage JSON, throwaway git repos, synthetic result sets.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const { wouldOverrun, readCostUsd, runMatrix } = require('../benchmarks/run.js');
const { score } = require('../benchmarks/scorer.js');
const { evaluate } = require('../benchmarks/verdict.js');
const { usageToUsd, createBenchmarkRecord } = require('../benchmarks/lib/eval-record.js');
const { appendEval } = require('../src/eval-schema.js');
const { assertNoTeamShinchanFired } = require('../benchmarks/lib/plugin-off.js');
const bar = require('../benchmarks/bar.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const SAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-cli-usage.json'), 'utf8'));

// ---- Row 1: real usage JSON → (a) $-ceiling check, (b) verdict tokens/$ term ----
test('S5 row 1: real usage JSON reaches the ceiling check AND the tokens/$ term (not $0, not AVG)', () => {
  const cost = readCostUsd(SAMPLE); // the SAME real number, read from the captured JSON
  assert.equal(cost, SAMPLE.total_cost_usd);
  assert.ok(cost > 0, 'real cost is non-zero (not silently $0)');

  // (a) ceiling check would abort at the boundary using this real cost
  assert.equal(wouldOverrun(1.0 - cost / 2, cost, 1.0), true, 'aborts when the next real-cost call crosses the ceiling');

  // (b) the tokens/$ term derives from the SAME real usage via MODEL_PRICING (never AVG_TOKENS)
  const usd = usageToUsd(SAMPLE.usage, 'haiku');
  assert.ok(usd > 0, 'usage→USD uses the real usage object');

  // loud failure when total_cost_usd is absent
  const noCost = { ...SAMPLE };
  delete noCost.total_cost_usd;
  assert.throws(() => readCostUsd(noCost), /total_cost_usd/);
});

// ---- Row 2: bar.json → verdict evaluator (+ git-history ordering) ----
test('S5 row 2: bar.json reaches the verdict evaluator; verdict flips at the bar', () => {
  const winRows = [
    { arm: 'A', pass: true, tokens_per_dollar: 100, safety_ok: true },
    { arm: 'A', pass: true, tokens_per_dollar: 100, safety_ok: true },
    { arm: 'B', pass: false, tokens_per_dollar: 100, safety_ok: true },
    { arm: 'B', pass: true, tokens_per_dollar: 100, safety_ok: true },
  ];
  assert.equal(evaluate(winRows, bar).verdict, 'win');
  const tieRows = winRows.map((r) => ({ ...r, pass: true }));
  assert.equal(evaluate(tieRows, bar).verdict, 'no-win');
});

test('S5 row 2 (AC-10/HR-1): no results commit predates the bar.json commit', () => {
  // git-history tamper-evidence: bar.json MUST be committed before any results/ file.
  // During this build stage commits are deferred (Stage 4), so there are 0 results/
  // add-commits; the invariant "no results commit predates bar" holds. If/when both
  // are committed, this same assertion enforces ordering.
  const barCommits = execSync('git log --diff-filter=A --format=%H -- benchmarks/bar.json', { cwd: REPO_ROOT }).toString().trim();
  const resultsCommits = execSync('git log --diff-filter=A --format=%H -- benchmarks/results/', { cwd: REPO_ROOT }).toString().trim();
  const barAdds = barCommits ? barCommits.split('\n') : [];
  const resultAdds = resultsCommits ? resultsCommits.split('\n') : [];
  if (resultAdds.length === 0) {
    assert.ok(true, 'no results committed yet — bar-before-results invariant trivially holds');
    return;
  }
  // both committed: assert bar's add-commit timestamp predates the earliest results add-commit
  const ts = (sha) => Number(execSync(`git show -s --format=%ct ${sha}`, { cwd: REPO_ROOT }).toString().trim());
  const barTs = Math.min(...barAdds.map(ts));
  const firstResultTs = Math.min(...resultAdds.map(ts));
  assert.ok(barTs <= firstResultTs, 'bar.json committed before any results/ file');
});

// ---- Row 3: results JSONL → REPORT/verdict + re-score determinism ----
test('S5 row 3: scorer result persists as JSONL via the wrapper; re-score is byte-identical; verdict consumes it', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-results-'));
  const file = path.join(tmp, 'run.jsonl');

  // two scorer runs on the SAME synthetic diff against equivalent repos → identical deterministic fields
  const mk = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-repo-'));
    const git = (c) => execSync('git ' + c, { cwd: dir, stdio: 'pipe' });
    git('init -q'); git('config user.email t@t.t'); git('config user.name t');
    fs.writeFileSync(path.join(dir, 'v.js'), 'module.exports=1;\n');
    fs.writeFileSync(path.join(dir, 'v.test.js'), "const a=require('node:assert');const{test}=require('node:test');test('x',()=>{a.equal(require('./v.js'),2)});\n");
    git('add -A'); git('commit -qm b');
    return dir;
  };
  const diff = ['diff --git a/v.js b/v.js', '--- a/v.js', '+++ b/v.js', '@@ -1 +1 @@', '-module.exports=1;', '+module.exports=2;', ''].join('\n');
  const d1 = mk(); const d2 = mk();
  const s1 = score(diff, { test_cmd: 'node --test v.test.js' }, d1);
  const s2 = score(diff, { test_cmd: 'node --test v.test.js' }, d2);
  const det = (s) => JSON.stringify({ pass: s.pass, loc_added: s.loc_added, loc_deleted: s.loc_deleted });
  assert.equal(det(s1), det(s2), 're-score byte-identical (determinism)');

  // persist via the reused wrapper, then the verdict consumes the same lines
  const rec = createBenchmarkRecord({ phase: 9, task_id: 't', arm: 'A', repeat: 1, pass: s1.pass, loc_added: s1.loc_added, loc_deleted: s1.loc_deleted, wall_clock_ms: s1.wall_clock_ms, cost_usd: 0.01, usage: SAMPLE.usage, safety_ok: true, prompt_persisted_path: 'p' });
  rec.tokens_per_dollar = 100;
  appendEval(rec, file);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 1);
  const v = evaluate([...lines, { arm: 'B', pass: false, tokens_per_dollar: 100, safety_ok: true }], bar);
  assert.ok(['win', 'no-win'].includes(v.verdict), 'verdict consumes the persisted results lines');

  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(d1, { recursive: true, force: true });
  fs.rmSync(d2, { recursive: true, force: true });
});

// ---- Row 4: plugin-off assertion → fairness audit (hook fired = hard fail) ----
test('S5 row 4: arm-B no-hook → fairness ok; injected hook-fired line → hard fail', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-armb-'));
  assert.equal(assertNoTeamShinchanFired(proj).ok, true);
  fs.mkdirSync(path.join(proj, '.shinchan-docs'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.shinchan-docs', 'work-tracker.jsonl'), '{"e":"fired"}\n');
  assert.equal(assertNoTeamShinchanFired(proj).ok, false, 'hook fired = unfair baseline hard fail');
  fs.rmSync(proj, { recursive: true, force: true });
});

// ---- Row 5: scorer pass/fail → verdict pass-rate term ----
test('S5 row 5: exit-0 diff → recorded pass feeds pass-rate; non-applying diff → recorded FAIL', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-row5-'));
  const git = (c) => execSync('git ' + c, { cwd: dir, stdio: 'pipe' });
  git('init -q'); git('config user.email t@t.t'); git('config user.name t');
  fs.writeFileSync(path.join(dir, 'v.js'), 'module.exports=1;\n');
  fs.writeFileSync(path.join(dir, 'v.test.js'), "const a=require('node:assert');const{test}=require('node:test');test('x',()=>{a.equal(require('./v.js'),2)});\n");
  git('add -A'); git('commit -qm b');

  const passDiff = ['diff --git a/v.js b/v.js', '--- a/v.js', '+++ b/v.js', '@@ -1 +1 @@', '-module.exports=1;', '+module.exports=2;', ''].join('\n');
  const passRes = score(passDiff, { test_cmd: 'node --test v.test.js' }, dir);
  assert.equal(passRes.pass, true);

  const failRes = score('', { test_cmd: 'node --test v.test.js' }, dir); // empty → FAIL
  assert.equal(failRes.pass, false);

  // these pass/fail flags are exactly what the verdict's pass-rate term consumes
  const v = evaluate([
    { arm: 'A', pass: passRes.pass, tokens_per_dollar: 100, safety_ok: true },
    { arm: 'B', pass: failRes.pass, tokens_per_dollar: 100, safety_ok: true },
  ], bar);
  assert.equal(v.per_term.pass_rate.a, 1);
  assert.equal(v.per_term.pass_rate.b, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});
