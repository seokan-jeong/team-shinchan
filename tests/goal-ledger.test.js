'use strict';

/**
 * Unit tests for src/goal-ledger.js (TICKET DUR-01).
 *
 * Proves the durable goal ledger's core invariants: frozen aggregate, no hard-delete,
 * typed-only steering, and an audit entry for EVERY attempt (accepted or rejected).
 *
 * Run: node --test tests/goal-ledger.test.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/goal-ledger.js');

function scratch() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'goal-ledger-'));
}

function freshInit(dir) {
  return ledger.initLedger(dir, {
    objective: 'Ship the durable execution ledger',
    constraints: ['MIT-licensed', 'zero npm deps'],
    goals: [
      { id: 'g1', wording: 'design schema' },
      { id: 'g2', wording: 'implement module' },
      { id: 'g3', wording: 'write tests' },
    ],
  });
}

test('initLedger creates files, frozen:true, and an init ledger entry', () => {
  const dir = scratch();
  const doc = freshInit(dir);

  assert.ok(fs.existsSync(path.join(dir, 'goals.json')));
  assert.ok(fs.existsSync(path.join(dir, 'ledger.jsonl')));

  assert.equal(doc.frozen, true);
  assert.equal(doc.objective, 'Ship the durable execution ledger');
  assert.deepEqual(doc.constraints, ['MIT-licensed', 'zero npm deps']);
  assert.equal(doc.goals.length, 3);
  assert.ok(doc.goals.every((g) => g.status === 'pending'));

  const onDisk = ledger.readGoals(dir);
  assert.equal(onDisk.frozen, true);

  const entries = ledger.readLedger(dir);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, 'init');
  assert.deepEqual(entries[0].goalIds, ['g1', 'g2', 'g3']);
});

test('double-init throws', () => {
  const dir = scratch();
  freshInit(dir);
  assert.throws(() => freshInit(dir), /already initialized/);
});

test('add_subgoal appends goal + audit entry', () => {
  const dir = scratch();
  freshInit(dir);

  const res = ledger.applySteering(dir, { kind: 'add_subgoal', id: 'g4', wording: 'release' });
  assert.equal(res.accepted, true);

  const doc = ledger.readGoals(dir);
  assert.equal(doc.goals.length, 4);
  assert.equal(doc.goals[3].id, 'g4');
  assert.equal(doc.goals[3].status, 'pending');

  const entries = ledger.readLedger(dir);
  assert.equal(entries.length, 2); // init + add_subgoal
  assert.equal(entries[1].kind, 'add_subgoal');
  assert.equal(entries[1].id, 'g4');
});

test('reorder_pending reorders goals and appends audit', () => {
  const dir = scratch();
  freshInit(dir);

  const res = ledger.applySteering(dir, { kind: 'reorder_pending', order: ['g3', 'g1', 'g2'] });
  assert.equal(res.accepted, true);

  const doc = ledger.readGoals(dir);
  assert.deepEqual(doc.goals.map((g) => g.id), ['g3', 'g1', 'g2']);

  const entries = ledger.readLedger(dir);
  assert.equal(entries[entries.length - 1].kind, 'reorder_pending');
});

test('revise_pending_wording changes wording and appends audit', () => {
  const dir = scratch();
  freshInit(dir);

  const res = ledger.applySteering(dir, { kind: 'revise_pending_wording', id: 'g2', wording: 'implement core module' });
  assert.equal(res.accepted, true);

  const doc = ledger.readGoals(dir);
  const g2 = doc.goals.find((g) => g.id === 'g2');
  assert.equal(g2.wording, 'implement core module');

  const last = ledger.readLedger(dir).at(-1);
  assert.equal(last.kind, 'revise_pending_wording');
  assert.equal(last.from, 'implement module');
  assert.equal(last.to, 'implement core module');
});

test('mark_blocked_superseded keeps the goal (length unchanged, status changed)', () => {
  const dir = scratch();
  freshInit(dir);
  const before = ledger.readGoals(dir).goals.length;

  const res = ledger.applySteering(dir, { kind: 'mark_blocked_superseded', id: 'g2', reason: 'dependency missing' });
  assert.equal(res.accepted, true);

  const doc = ledger.readGoals(dir);
  assert.equal(doc.goals.length, before); // NOT removed
  assert.equal(doc.goals.find((g) => g.id === 'g2').status, 'blocked');
});

test('attempt to edit objective is rejected', () => {
  const dir = scratch();
  freshInit(dir);

  const res = ledger.applySteering(dir, { kind: 'add_subgoal', objective: 'hijacked', wording: 'x' });
  assert.equal(res.rejected, true);
  assert.match(res.reason, /frozen/);

  // objective on disk is unchanged
  assert.equal(ledger.readGoals(dir).objective, 'Ship the durable execution ledger');
});

test('unknown / free-form mutation kind is rejected', () => {
  const dir = scratch();
  freshInit(dir);

  const res = ledger.applySteering(dir, { kind: 'just_make_it_better_somehow' });
  assert.equal(res.rejected, true);
  assert.match(res.reason, /unknown or free-form/);
});

test('hard-delete attempt is rejected and goal survives', () => {
  const dir = scratch();
  freshInit(dir);

  const res = ledger.applySteering(dir, { kind: 'delete_subgoal', id: 'g1' });
  assert.equal(res.rejected, true);
  assert.match(res.reason, /never hard-deleted/);
  assert.ok(ledger.readGoals(dir).goals.find((g) => g.id === 'g1'));
});

test('every mutation (including rejected) appends a ledger audit entry', () => {
  const dir = scratch();
  freshInit(dir);
  const start = ledger.readLedger(dir).length; // 1 (init)

  ledger.applySteering(dir, { kind: 'add_subgoal', id: 'g4', wording: 'a' }); // accepted
  ledger.applySteering(dir, { kind: 'edit_objective', objective: 'no' });     // rejected
  ledger.applySteering(dir, { kind: 'bogus_kind' });                          // rejected
  ledger.applySteering(dir, { kind: 'annotate_ledger', note: 'fyi' });        // accepted

  const entries = ledger.readLedger(dir);
  assert.equal(entries.length, start + 4);

  const rejected = entries.filter((e) => e.kind === 'steering_rejected');
  assert.equal(rejected.length, 2);
});

test('ledger.jsonl lines are all valid JSON', () => {
  const dir = scratch();
  freshInit(dir);
  ledger.applySteering(dir, { kind: 'add_subgoal', id: 'g4', wording: 'a' });
  ledger.applySteering(dir, { kind: 'bogus' });
  ledger.applySteering(dir, { kind: 'annotate_ledger', note: 'hi' });

  const raw = fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  assert.ok(lines.length >= 4);
  for (const line of lines) {
    assert.doesNotThrow(() => JSON.parse(line), `invalid JSON line: ${line}`);
  }
});

test('appendLedger preserves a caller-supplied ts verbatim and never invents one', () => {
  const dir = scratch();
  freshInit(dir);

  ledger.appendLedger(dir, { kind: 'annotate_ledger', note: 'x', ts: '2026-06-16T00:00:00Z' });
  const last = ledger.readLedger(dir).at(-1);
  assert.equal(last.ts, '2026-06-16T00:00:00Z');

  // init entry carries no ts (function is pure w.r.t. time)
  const init = ledger.readLedger(dir)[0];
  assert.equal('ts' in init, false);
});
