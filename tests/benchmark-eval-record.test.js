'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { usageToUsd, createBenchmarkRecord } = require('../benchmarks/lib/eval-record.js');
const { appendEval } = require('../src/eval-schema.js');

test('usageToUsd: haiku 1M input + 1M output = 4.80 via MODEL_PRICING (no AVG_TOKENS)', () => {
  const usd = usageToUsd(
    { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    'haiku'
  );
  // MODEL_PRICING haiku: input 0.80 / output 4.00 per 1M → 0.80 + 4.00 = 4.80
  assert.equal(Number(usd.toFixed(6)), 4.8);
});

test('usageToUsd: counts cache tokens honestly (non-zero adds cost)', () => {
  const noCache = usageToUsd(
    { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    'haiku'
  );
  const withCache = usageToUsd(
    { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 },
    'haiku'
  );
  assert.equal(noCache, 0);
  assert.ok(withCache > 0, 'cache tokens must contribute to cost (FR-5 honesty)');
});

test('createBenchmarkRecord: extended record carries base + extended fields', () => {
  const rec = createBenchmarkRecord({
    phase: 1,
    task_id: 't1',
    arm: 'A',
    repeat: 1,
    pass: true,
    loc_added: 3,
    loc_deleted: 0,
    wall_clock_ms: 42,
    cost_usd: 0.01,
    usage: { input_tokens: 5, output_tokens: 6 },
    safety_ok: true,
    prompt_persisted_path: 'p',
  });
  // base fields from createEvalRecord
  assert.ok(typeof rec.ts === 'string', 'has ts');
  assert.equal(rec.doc_id, 'main-078', 'has doc_id');
  // extended fields
  assert.equal(rec.task_id, 't1');
  assert.equal(rec.arm, 'A');
  assert.equal(rec.repeat, 1);
  assert.equal(rec.pass, true);
  assert.equal(rec.cost_usd, 0.01);
  assert.deepEqual(rec.usage, { input_tokens: 5, output_tokens: 6 });
  assert.equal(rec.safety_ok, true);
});

test('createBenchmarkRecord: appended JSONL line round-trips via reused appendEval', () => {
  const rec = createBenchmarkRecord({
    phase: 2, task_id: 't2', arm: 'B', repeat: 3, pass: false,
    loc_added: 0, loc_deleted: 0, wall_clock_ms: 7, cost_usd: 0.02,
    usage: { input_tokens: 1, output_tokens: 2 }, safety_ok: false, prompt_persisted_path: 'q',
  });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-record-'));
  const file = path.join(tmp, 'results.jsonl');
  appendEval(rec, file);
  const firstLine = fs.readFileSync(file, 'utf8').split('\n')[0];
  const parsed = JSON.parse(firstLine);
  assert.deepEqual(parsed, rec, 'JSONL line deep-equals the record');
  fs.rmSync(tmp, { recursive: true, force: true });
});
