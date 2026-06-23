'use strict';

/**
 * tests/benchmark-integration.test.js — money-free end-to-end pipeline proof.
 *
 * This is the test that would have caught all THREE v4.54.0 real-path gaps:
 *   (1) no CLI entrypoint (`node benchmarks/run.js --all` was a no-op),
 *   (2) runMatrix never provisioned a fixture copy / passed cwd,
 *   (3) the fixture was vendored plain files but tasks referenced an upstream
 *       `fixture_sha` not in any local git, so the old worktree-by-sha checkout
 *       could never materialise the fixture.
 *
 * It exercises the REAL pipeline minus the paid `claude` call:
 *   - a STUB invoke (NO claude) returns a real applies-cleanly arm-A diff + an
 *     empty arm-B diff, each with a fake `{total_cost_usd:0, usage:{}}` json;
 *   - the REAL score (withFixtureCopy + scorer.score + safety) and REAL verdict;
 *   - driven through the REAL `cli(...)` (parse → load tasks → runMatrix →
 *     persist JSONL → verdict → summary).
 *
 * It proves copy → git-apply → `node --test` → score → verdict → CLI all wire
 * together WITHOUT money. The only remaining real-money step is swapping the stub
 * invoker for the real `claude` invoker (realInvoke / defaultInvoke).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const run = require('../benchmarks/run.js');
const { cli, realScore, withFixtureCopy, fixtureDirFor } = run;

const LEVEN = path.join(__dirname, 'fixtures', 'leven');

/**
 * Produce a REAL unified diff that applies cleanly to the leven fixture and keeps
 * `node --test test.test.js` passing: prepend a harmless comment line to index.js.
 * Generated against the SAME committed baseline withFixtureCopy creates, so the
 * scorer's `git apply` against a fresh copy succeeds byte-for-byte.
 */
function harmlessArmADiff() {
  return withFixtureCopy(LEVEN, (cwd) => {
    const idx = path.join(cwd, 'index.js');
    fs.writeFileSync(idx, '// harmless benchmark stub comment\n' + fs.readFileSync(idx, 'utf8'));
    return execFileSync('git', ['diff'], { cwd, stdio: 'pipe' }).toString();
  });
}

// A STUB invoke — NO claude. arm-A → real applies-cleanly diff; arm-B → empty diff.
function makeStubInvoke(armADiff) {
  return ({ arm }) => ({
    json: { total_cost_usd: 0, usage: {} },
    diff: arm === 'A' ? armADiff : '',
    prompt: arm === 'A' ? '(stub plugin prompt)' : '(stub bare prompt)',
    configDir: arm === 'A' ? 'default (plugin enabled)' : 'isolated (plugin disabled)',
  });
}

test('integration: stub invoke + REAL score + REAL verdict through the REAL cli (money-free)', () => {
  const armADiff = harmlessArmADiff();
  assert.match(armADiff, /index\.js/, 'arm-A diff touches index.js');
  assert.match(armADiff, /harmless benchmark stub comment/, 'arm-A diff carries the harmless line');

  const captured = [];
  const out = cli(['--all', '--repeat', '1'], {
    invoke: makeStubInvoke(armADiff),
    score: realScore, // REAL score: withFixtureCopy → scorer.score → node --test → safety
    log: (m) => captured.push(m),
  });

  // 3 tasks × 2 arms × 1 repeat = 6 records, all under fixture 'leven'.
  assert.equal(out.results.length, 6, 'full matrix ran (3 tasks × 2 arms × 1)');

  const aRows = out.results.filter((r) => r.arm === 'A');
  const bRows = out.results.filter((r) => r.arm === 'B');

  // GAP 2/3 proof: arm-A pass:true means the fixture was COPIED, the diff
  // git-APPLIED to it, and the REAL `node --test test.test.js` ran and exited 0.
  assert.ok(aRows.length === 3 && aRows.every((r) => r.pass === true),
    'arm-A (applies-cleanly diff) → pass:true on every task (copy→apply→test→exit0)');

  // arm-B empty diff → deterministic FAIL (HR-10), never a vacuous pass.
  assert.ok(bRows.length === 3 && bRows.every((r) => r.pass === false),
    'arm-B (empty diff) → pass:false on every task');

  // A results JSONL file was actually written (GAP 1: cli persists results).
  assert.ok(fs.existsSync(out.resultsFile), 'results JSONL written');
  const lines = fs.readFileSync(out.resultsFile, 'utf8').trim().split('\n').filter(Boolean);
  assert.equal(lines.length, 6, 'one JSONL record per matrix cell');
  for (const l of lines) JSON.parse(l); // each line is valid JSON

  // REAL verdict returns a structured win/no-win.
  assert.ok(out.verdict && ['win', 'no-win'].includes(out.verdict.verdict), 'verdict is structured win/no-win');
  assert.ok(out.verdict.per_term && out.verdict.per_term.pass_rate, 'verdict carries per-term breakdown');
  // arm-A 100% vs arm-B 0% → strictly greater pass-rate (the team-shinchan-better direction).
  assert.equal(out.verdict.per_term.pass_rate.a, 1, 'arm-A pass-rate 1.0');
  assert.equal(out.verdict.per_term.pass_rate.b, 0, 'arm-B pass-rate 0.0');

  // summary was printed.
  assert.ok(captured.some((l) => /verdict:/.test(l)), 'cli printed a summary line');

  fs.rmSync(out.resultsFile, { force: true });
});

test('integration: --ceiling 0 aborts BEFORE any invoke (cli → runMatrix kill-switch)', () => {
  let invokeCalls = 0;
  const captured = [];
  const out = cli(['--all', '--repeat', '1', '--ceiling', '0'], {
    invoke: () => { invokeCalls++; return { json: { total_cost_usd: 0, usage: {} }, diff: '' }; },
    score: () => ({ pass: false, loc_added: 0, loc_deleted: 0, wall_clock_ms: 0, safety_ok: true }),
    log: (m) => captured.push(m),
  });
  assert.equal(invokeCalls, 0, 'ceiling 0 aborts BEFORE the first invocation (no money would be spent)');
  assert.equal(out.aborted, true, 'matrix reports aborted');
  assert.equal(out.results.length, 0, 'no records produced');
  assert.equal(out.verdict.partial_coverage, true, 'verdict flags partial_coverage');
  fs.rmSync(out.resultsFile, { force: true });
});

test('integration: realScore gives a non-applying diff a deterministic FAIL (no throw)', () => {
  // a corrupt diff that cannot apply to the leven fixture → pass:false, no crash.
  const corrupt = 'diff --git a/index.js b/index.js\n--- a/index.js\n+++ b/index.js\n@@ -999,2 +999,2 @@\n-nonexistent context\n+garbage\n';
  const task = { id: 'bugfix-01', fixture: 'leven', test_cmd: 'node --test test.test.js' };
  const r = realScore(corrupt, task);
  assert.equal(r.pass, false, 'non-applying diff → deterministic FAIL');
});
