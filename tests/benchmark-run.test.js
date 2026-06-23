'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const {
  wouldOverrun,
  readCostUsd,
  runMatrix,
} = require('../benchmarks/run.js');
const {
  buildPluginOffConfigDir,
  assertNoTeamShinchanFired,
} = require('../benchmarks/lib/plugin-off.js');

const SAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-cli-usage.json'), 'utf8'));

// ---- kill-switch ----
test('wouldOverrun: boundary logic', () => {
  assert.equal(wouldOverrun(0.95, 0.10, 1.0), true);
  assert.equal(wouldOverrun(0.50, 0.10, 1.0), false);
});

test('runMatrix: kill-switch aborts BEFORE the invocation that would cross the ceiling', () => {
  // Each mock invocation "costs" the sample cost; ceiling tiny so it aborts before the 2nd call.
  const perCall = SAMPLE.total_cost_usd; // ~0.0388
  const ceiling = perCall * 1.5; // room for exactly one call, not two
  let calls = 0;
  const invoke = () => { calls++; return { json: SAMPLE, diff: '' }; };
  const res = runMatrix({
    tasks: [{ id: 't', test_cmd: 'true' }],
    arms: ['A', 'B'],
    repeats: 3,
    ceiling_usd: ceiling,
    invoke,
    score: () => ({ pass: false, loc_added: 0, loc_deleted: 0, wall_clock_ms: 1 }),
  });
  assert.equal(calls, 1, 'aborted before the second (over-ceiling) invocation');
  assert.equal(res.aborted, true);
  assert.equal(res.partial_coverage, true);
});

test('readCostUsd: reads real total_cost_usd, fails loudly when absent', () => {
  assert.equal(readCostUsd(SAMPLE), SAMPLE.total_cost_usd);
  const noCost = { ...SAMPLE };
  delete noCost.total_cost_usd;
  assert.throws(() => readCostUsd(noCost), /total_cost_usd/, 'must throw, not silently return $0');
});

// ---- fixture-copy isolation (replaces the broken upstream-sha worktree) ----
function makeVendoredFixture() {
  // a plain vendored fixture dir (NO .git), like tests/fixtures/leven
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-fixture-'));
  fs.writeFileSync(path.join(dir, 'f.txt'), 'base\n');
  // include a leaked .shinchan-docs to prove the copy excludes it (fairness)
  fs.mkdirSync(path.join(dir, '.shinchan-docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.shinchan-docs', 'work-tracker.jsonl'), '{"event":"leak"}\n');
  return dir;
}

test('withFixtureCopy: copies the vendored fixture into a fresh git baseline, then removes it', () => {
  const { withFixtureCopy } = require('../benchmarks/run.js');
  const fixture = makeVendoredFixture();
  let copyDir = null;
  const seen = withFixtureCopy(fixture, (cwd) => {
    copyDir = cwd;
    assert.ok(fs.existsSync(path.join(cwd, 'f.txt')), 'fixture file copied');
    assert.ok(fs.existsSync(path.join(cwd, '.git')), 'copy is a git repo (baseline committed)');
    assert.ok(!fs.existsSync(path.join(cwd, '.shinchan-docs')), '.shinchan-docs excluded from copy (fairness)');
    // a clean baseline: git diff is empty against the committed tree
    const diff = execSync('git diff', { cwd, stdio: 'pipe' }).toString();
    assert.equal(diff.trim(), '', 'baseline committed → clean git diff');
    return 'ok';
  });
  assert.equal(seen, 'ok', 'fn ran and returned');
  assert.ok(copyDir, 'fn received a copy dir');
  assert.ok(!fs.existsSync(copyDir), 'copy removed after fn (no leftover state)');
  fs.rmSync(fixture, { recursive: true, force: true });
});

test('withFixtureCopy: removes the copy even when fn throws (try/finally)', () => {
  const { withFixtureCopy } = require('../benchmarks/run.js');
  const fixture = makeVendoredFixture();
  let copyDir = null;
  assert.throws(() => {
    withFixtureCopy(fixture, (cwd) => {
      copyDir = cwd;
      assert.ok(fs.existsSync(cwd), 'copy exists inside fn');
      throw new Error('boom');
    });
  }, /boom/);
  assert.ok(copyDir, 'fn ran');
  assert.ok(!fs.existsSync(copyDir), 'copy removed after throwing fn (no leftover)');
  fs.rmSync(fixture, { recursive: true, force: true });
});

// ---- arm-B plugin-off + no-hook-fired assertion ----
test('buildPluginOffConfigDir: produces an isolated empty CLAUDE_CONFIG_DIR with no team-shinchan plugin', () => {
  const cfg = buildPluginOffConfigDir();
  assert.ok(fs.existsSync(cfg), 'config dir created');
  // no team-shinchan anywhere on the isolated plugin path
  const hits = execSync(`grep -rl "team-shinchan" "${cfg}" || true`).toString().trim();
  assert.equal(hits, '', 'no team-shinchan on the isolated plugin path');
  fs.rmSync(cfg, { recursive: true, force: true });
});

test('assertNoTeamShinchanFired: ok when clean, HARD FAIL when a write-tracker line appears', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'armb-proj-'));
  // clean: no .shinchan-docs, no write-tracker jsonl
  const before = assertNoTeamShinchanFired(proj);
  assert.equal(before.ok, true, 'clean arm-B run passes the fairness assertion');

  // inject a write-tracker JSONL line (hook fired) => must hard-fail
  const trackerDir = path.join(proj, '.shinchan-docs');
  fs.mkdirSync(trackerDir, { recursive: true });
  fs.writeFileSync(path.join(trackerDir, 'work-tracker.jsonl'), '{"event":"hook_fired"}\n');
  const after = assertNoTeamShinchanFired(proj);
  assert.equal(after.ok, false, 'a fired hook is an unfair-baseline HARD FAIL');
  fs.rmSync(proj, { recursive: true, force: true });
});

test('runMatrix: persists both arms prompt+config to disk (third-party re-derivation)', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-out-'));
  const invoke = ({ arm }) => ({ json: SAMPLE, diff: '', _arm: arm });
  runMatrix({
    tasks: [{ id: 't', test_cmd: 'true', prompt: 'do the thing' }],
    arms: ['A', 'B'],
    repeats: 1,
    ceiling_usd: 100,
    invoke,
    score: () => ({ pass: true, loc_added: 1, loc_deleted: 0, wall_clock_ms: 1 }),
    persistDir: outDir,
  });
  const files = fs.readdirSync(outDir);
  const armA = files.some((f) => /A.*\.config\.json$/.test(f));
  const armB = files.some((f) => /B.*\.config\.json$/.test(f));
  assert.ok(armA, 'arm-A prompt+config persisted');
  assert.ok(armB, 'arm-B prompt+config persisted');
  fs.rmSync(outDir, { recursive: true, force: true });
});
