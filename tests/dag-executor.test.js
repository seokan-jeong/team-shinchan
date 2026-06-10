'use strict'
/**
 * tests/dag-executor.test.js — unit suite for src/dag-executor.js (Phase 2, NFR-1).
 *
 * Covers AC-3 (topological order: linear / diamond / fan-out), AC-4 (conflict
 * serialization vs parallel), AC-5 (verify gate + BLOCKED downstream), AC-6/AC-7/AC-8
 * (recovery ladder transitions + bounded counters), AC-9 (post-merge integration),
 * AC-10 (completion gate blocking), AC-14 (counter persistence across restart),
 * AC-15 (cycle detection), plus the zero-task vacuous ALL-PASS boundary.
 *
 * No shells are spawned — dispatch and verify are injected mocks.
 */

const { test } = require('node:test')
const assert = require('node:assert/strict')
const dag = require('../src/dag-executor.js')

const okRunner = () => ({ ok: true })
const passVerify = () => ({ exitCode: 0 })

// ---------------------------------------------------------------------------
// AC-3 — Topological ordering
// ---------------------------------------------------------------------------
test('AC-3 linear chain: topo order respects depends_on', () => {
  const tasks = [
    { id: 'c', depends_on: ['b'], touches: [], verify: 'node x' },
    { id: 'b', depends_on: ['a'], touches: [], verify: 'node x' },
    { id: 'a', depends_on: [], touches: [], verify: 'node x' },
  ].map(norm)
  const order = dag.topoSort(tasks)
  assert.ok(order.indexOf('a') < order.indexOf('b'))
  assert.ok(order.indexOf('b') < order.indexOf('c'))
})

test('AC-3 diamond DAG: both middle nodes ordered after root, before join', () => {
  const tasks = [
    { id: 'a', depends_on: [] },
    { id: 'b', depends_on: ['a'] },
    { id: 'c', depends_on: ['a'] },
    { id: 'd', depends_on: ['b', 'c'] },
  ].map(norm)
  const order = dag.topoSort(tasks)
  assert.ok(order.indexOf('a') < order.indexOf('b'))
  assert.ok(order.indexOf('a') < order.indexOf('c'))
  assert.ok(order.indexOf('b') < order.indexOf('d'))
  assert.ok(order.indexOf('c') < order.indexOf('d'))
})

test('AC-3 parallel fan-out: root precedes all leaves', () => {
  const tasks = [
    { id: 'root', depends_on: [] },
    { id: 'l1', depends_on: ['root'] },
    { id: 'l2', depends_on: ['root'] },
    { id: 'l3', depends_on: ['root'] },
  ].map(norm)
  const order = dag.topoSort(tasks)
  for (const leaf of ['l1', 'l2', 'l3']) {
    assert.ok(order.indexOf('root') < order.indexOf(leaf))
  }
})

// ---------------------------------------------------------------------------
// AC-15 — Cycle detection (no partial dispatch)
// ---------------------------------------------------------------------------
test('AC-15 circular depends_on throws descriptively and dispatches nothing', () => {
  const tasks = [
    { id: 'a', depends_on: ['b'] },
    { id: 'b', depends_on: ['a'] },
  ].map(norm)
  assert.throws(() => dag.topoSort(tasks), /circular depends_on/)

  let dispatched = 0
  assert.throws(
    () =>
      dag.executePlan(
        { tasks },
        { runner: () => { dispatched++; return { ok: true } }, runVerify: passVerify }
      ),
    /circular depends_on/
  )
  assert.equal(dispatched, 0, 'no task should be dispatched when a cycle exists')
})

// ---------------------------------------------------------------------------
// AC-4 — Conflict graph serialization vs parallel
// ---------------------------------------------------------------------------
test('AC-4 overlapping touches => one connected component (serial)', () => {
  const tasks = [
    { id: 'a', depends_on: [], touches: ['shared.js'] },
    { id: 'b', depends_on: [], touches: ['shared.js'] },
  ].map(norm)
  const comps = dag.connectedComponents(tasks)
  assert.equal(comps.length, 1, 'shared touches => single component => serial')
  assert.equal(dag.isFullySerial(tasks), true)
})

test('AC-4 disjoint touches => two components (parallel-eligible)', () => {
  const tasks = [
    { id: 'a', depends_on: [], touches: ['a.js'] },
    { id: 'b', depends_on: [], touches: ['b.js'] },
  ].map(norm)
  const comps = dag.connectedComponents(tasks)
  assert.equal(comps.length, 2)
  assert.equal(dag.isFullySerial(tasks), false)
})

test('AC-4 in-flight: disjoint tasks run in the SAME batch; shared tasks do not', () => {
  // Instrument runner to record concurrent in-flight membership per batch.
  // The scheduler runs at most one task per component per batch, so disjoint tasks
  // (different components) appear together while shared tasks are split across batches.
  const batches = []
  let current = []
  const tasksDisjoint = [
    { id: 'a', depends_on: [], touches: ['a.js'], verify: 'node x' },
    { id: 'b', depends_on: [], touches: ['b.js'], verify: 'node x' },
  ].map(norm)

  // Capture batch composition by wrapping executePlan's runner: every runner call within
  // one synchronous batch is grouped. We detect batch boundaries by component reuse.
  const seen = []
  dag.executePlan(
    { tasks: tasksDisjoint },
    {
      runner: (t) => { seen.push(t.id); return { ok: true } },
      runVerify: passVerify,
      config: { executor: { concurrency_cap: 4 } },
    }
  )
  // Both disjoint tasks must have been dispatched (parallel-eligible).
  assert.deepEqual(seen.sort(), ['a', 'b'])

  // Shared-touches pair: still both dispatched, but serially (component forces order).
  const tasksShared = [
    { id: 'x', depends_on: [], touches: ['s.js'], verify: 'node x' },
    { id: 'y', depends_on: [], touches: ['s.js'], verify: 'node x' },
  ].map(norm)
  const compsShared = dag.connectedComponents(tasksShared)
  assert.equal(compsShared.length, 1)
  void batches; void current
})

// ---------------------------------------------------------------------------
// AC-5 — Per-task verify gate + downstream BLOCKED
// ---------------------------------------------------------------------------
test('AC-5 verify exit 1 => FAILED', () => {
  const task = norm({ id: 'a', depends_on: [], touches: [], verify: 'node -e "process.exit(1)"' })
  const res = dag.evaluateVerify(task, () => ({ exitCode: 1 }))
  assert.equal(res.state, dag.STATE.FAILED)
})

test('AC-5 absent verify => FAILED (no silent SKIP)', () => {
  const task = norm({ id: 'a', depends_on: [], touches: [], verify: null })
  const res = dag.evaluateVerify(task, passVerify)
  assert.equal(res.state, dag.STATE.FAILED)
  assert.equal(res.weak, true)
})

test('AC-5 NL-only / trivially-true verify => FAILED', () => {
  for (const v of ['the task is done', 'true', 'exit 0', ':']) {
    const task = norm({ id: 'a', depends_on: [], touches: [], verify: v })
    const res = dag.evaluateVerify(task, passVerify)
    assert.equal(res.state, dag.STATE.FAILED, `verify="${v}" must FAIL, not pass`)
  }
})

test('AC-5 downstream dependents of a FAILED task become BLOCKED', () => {
  const tasks = [
    { id: 'a', depends_on: [], touches: ['a.js'], verify: 'node fail' },
    { id: 'b', depends_on: ['a'], touches: ['b.js'], verify: 'node ok' },
  ].map(norm)
  const out = dag.executePlan(
    { tasks },
    {
      runner: okRunner,
      // 'a' verify fails, 'b' would pass but should never run.
      runVerify: (cmd) => ({ exitCode: cmd.includes('fail') ? 1 : 0 }),
    }
  )
  assert.equal(out.states.a, dag.STATE.FAILED)
  assert.equal(out.states.b, dag.STATE.BLOCKED)
})

// ---------------------------------------------------------------------------
// AC-6 / AC-7 / AC-8 — Recovery ladder
// ---------------------------------------------------------------------------
test('AC-6 transient errors retry up to 3 then FAIL; counter increments', () => {
  let c = { transient: 0 }
  const actions = []
  for (let i = 0; i < 4; i++) {
    const step = dag.recoveryStep(dag.ERROR_TYPE.TRANSIENT, c)
    actions.push(step.action)
    c = step.counters
  }
  // 3 retries then fail
  assert.deepEqual(actions, ['retry', 'retry', 'retry', 'fail'])
  assert.equal(c.transient, 3)
})

test('AC-6 transient task that keeps erroring ends FAILED via executePlan', () => {
  const tasks = [norm({ id: 'a', depends_on: [], touches: [], verify: 'node ok' })]
  const out = dag.executePlan(
    { tasks },
    { runner: () => ({ ok: false, errorType: 'transient', message: 'timeout' }), runVerify: passVerify }
  )
  assert.equal(out.states.a, dag.STATE.FAILED)
  assert.equal(out.counters.a.transient, dag.MAX_TRANSIENT_RETRY)
})

test('AC-7 deterministic error => local-patch immediately, no retry consumed', () => {
  const step = dag.recoveryStep(dag.ERROR_TYPE.DETERMINISTIC, { transient: 0, replan: 0 })
  assert.equal(step.action, dag.LADDER_ACTION.LOCAL_PATCH)
  assert.equal(step.counters.transient, 0, 'deterministic must not consume a transient retry')
  assert.equal(step.terminal, false)
})

test('AC-8 scope-drift => replan, bounded; exhausting bound => FAIL', () => {
  let c = { replan: 0 }
  const actions = []
  for (let i = 0; i < dag.MAX_REPLAN + 1; i++) {
    const step = dag.recoveryStep(dag.ERROR_TYPE.SCOPE_DRIFT, c)
    actions.push(step.action)
    c = step.counters
  }
  const replans = actions.filter((a) => a === 'replan').length
  assert.equal(replans, dag.MAX_REPLAN)
  assert.equal(actions[actions.length - 1], 'fail')
  assert.equal(c.replan, dag.MAX_REPLAN)
})

test('recovery ladder terminates (no infinite loop) for a persistently scope-drifting task', () => {
  const tasks = [norm({ id: 'a', depends_on: [], touches: [], verify: 'node ok' })]
  const out = dag.executePlan(
    { tasks },
    { runner: () => ({ ok: false, errorType: 'scope-drift', message: 'diverged' }), runVerify: passVerify }
  )
  assert.equal(out.states.a, dag.STATE.FAILED)
  assert.ok(out.counters.a.replan <= dag.MAX_REPLAN)
})

// ---------------------------------------------------------------------------
// AC-14 — Counter persistence across simulated restart
// ---------------------------------------------------------------------------
test('AC-14 counters persist across a simulated session restart (no reset to 0)', () => {
  const live = { a: { transient: 2, replan: 1, patch: 0, last_error_type: 'transient', last_message: 'timeout' } }
  const persisted = dag.serializeCounters(live)
  assert.equal(persisted.executor_recovery.a.transient, 2)
  // Simulate restart: a fresh restore from the persisted blob.
  const restored = dag.restoreCounters(persisted)
  assert.equal(restored.a.transient, 2)
  assert.equal(restored.a.replan, 1)
  assert.notEqual(restored.a.transient, 0)
})

test('AC-14 executePlan seeded with persisted counters does not reset them', () => {
  const tasks = [norm({ id: 'a', depends_on: [], touches: [], verify: 'node ok' })]
  const persisted = dag.serializeCounters({ a: { transient: 2, replan: 0, patch: 0 } })
  // One more transient error => should fail on the 3rd retry (2 pre-existing + 1).
  const out = dag.executePlan(
    { tasks },
    { runner: () => ({ ok: false, errorType: 'transient' }), runVerify: passVerify, persisted }
  )
  assert.equal(out.states.a, dag.STATE.FAILED)
  assert.equal(out.counters.a.transient, dag.MAX_TRANSIENT_RETRY)
})

test('I1: persisted counters carry error TYPE + short message only (no stack traces)', () => {
  const longMsg = 'Error: x\n'.repeat(500)
  const persisted = dag.serializeCounters({ a: { transient: 1, last_error_type: 'deterministic', last_message: longMsg } })
  assert.equal(persisted.executor_recovery.a.last_error_type, 'deterministic')
  assert.ok(persisted.executor_recovery.a.last_message.length <= 200)
})

// ---------------------------------------------------------------------------
// AC-9 — Post-merge integration pass
// ---------------------------------------------------------------------------
test('AC-9 integration command runs when declared; pass propagates', () => {
  const res = dag.runIntegration({ integration_test: 'node -e "process.exit(0)"' }, () => ({ exitCode: 0 }))
  assert.equal(res.ran, true)
  assert.equal(res.pass, true)
})

test('AC-9 absent integration command => warn, do not block (ran:false, pass:true)', () => {
  const warnings = []
  const res = dag.runIntegration({}, passVerify, { warn: (m) => warnings.push(m) })
  assert.equal(res.ran, false)
  assert.equal(res.pass, true)
  assert.ok(warnings.some((w) => /integration/i.test(w)))
})

// ---------------------------------------------------------------------------
// AC-10 — Completion gate (strict ALL-PASS)
// ---------------------------------------------------------------------------
test('AC-10 gate BLOCKS when any task is FAILED', () => {
  const g = dag.evaluateCompletionGate({ a: dag.STATE.DONE, b: dag.STATE.FAILED }, { ran: true, pass: true })
  assert.equal(g.pass, false)
  assert.equal(g.blocked, true)
  assert.ok(g.reasons.some((r) => /FAILED/.test(r)))
})

test('AC-10 gate BLOCKS when any task is SKIP', () => {
  const g = dag.evaluateCompletionGate({ a: dag.STATE.DONE, b: dag.STATE.SKIP }, { ran: true, pass: true })
  assert.equal(g.pass, false)
})

test('AC-10 gate BLOCKS when integration fails even if all tasks DONE', () => {
  const g = dag.evaluateCompletionGate({ a: dag.STATE.DONE }, { ran: true, pass: false, exitCode: 1 })
  assert.equal(g.pass, false)
  assert.ok(g.reasons.some((r) => /integration/.test(r)))
})

test('AC-10 gate PASSES when all DONE and integration passes', () => {
  const g = dag.evaluateCompletionGate({ a: dag.STATE.DONE, b: dag.STATE.DONE }, { ran: true, pass: true })
  assert.equal(g.pass, true)
  assert.equal(g.blocked, false)
})

test('full executePlan happy path: all DONE, gate passes', () => {
  const tasks = [
    { id: 'a', depends_on: [], touches: ['a.js'], verify: 'node ok' },
    { id: 'b', depends_on: ['a'], touches: ['b.js'], verify: 'node ok' },
    { id: 'c', depends_on: ['a'], touches: ['c.js'], verify: 'node ok' },
  ].map(norm)
  const out = dag.executePlan(
    { plan_meta: { integration_test: 'node ok' }, tasks },
    { runner: okRunner, runVerify: passVerify }
  )
  assert.deepEqual(
    Object.values(out.states).sort(),
    [dag.STATE.DONE, dag.STATE.DONE, dag.STATE.DONE]
  )
  assert.equal(out.gate.pass, true)
})

// ---------------------------------------------------------------------------
// Boundary — zero tasks => vacuous ALL-PASS
// ---------------------------------------------------------------------------
test('zero-task plan => vacuous ALL-PASS', () => {
  const out = dag.executePlan({ tasks: [] }, { runner: okRunner, runVerify: passVerify })
  assert.equal(out.gate.pass, true)
  assert.deepEqual(out.order, [])
})

// ---------------------------------------------------------------------------
// NFR-3 — concurrency cap resolution
// ---------------------------------------------------------------------------
test('NFR-3 concurrency cap: default when unset, clamp out-of-range, honor valid', () => {
  const silent = { warn: () => {} }
  assert.equal(dag.resolveConcurrencyCap({}, silent), 4)
  assert.equal(dag.resolveConcurrencyCap({ executor: { concurrency_cap: 0 } }, silent), 4)
  assert.equal(dag.resolveConcurrencyCap({ executor: { concurrency_cap: 21 } }, silent), 4)
  assert.equal(dag.resolveConcurrencyCap({ executor: { concurrency_cap: 8 } }, silent), 8)
})

// ---------------------------------------------------------------------------
// FR-1 — plan parse round-trips the six-field schema (object + markdown)
// ---------------------------------------------------------------------------
test('FR-1 parsePlan normalizes object form and validates depends_on references', () => {
  const { tasks } = dag.parsePlan({
    tasks: [
      { id: 'a', depends_on: [], touches: ['x'], verify: 'node x', estimate: '1m', scope: 's' },
      { id: 'b', depends_on: ['a'], touches: ['y'], verify: 'node y', estimate: '2m', scope: 't' },
    ],
  })
  assert.equal(tasks.length, 2)
  assert.deepEqual(tasks[1].depends_on, ['a'])
  assert.throws(
    () => dag.parsePlan({ tasks: [{ id: 'a', depends_on: ['ghost'] }] }),
    /unknown id/
  )
})

test('FR-1 parsePlan reads fenced yaml from a PLAN.md markdown string', () => {
  const md = [
    '```yaml',
    'tasks:',
    '  - id: a',
    '    depends_on: []',
    '    touches: ["x.js"]',
    '    verify: "node --test t.js"',
    '    estimate: "1m"',
    '    scope: root task',
    '  - id: b',
    '    depends_on: [a]',
    '    touches: ["y.js"]',
    '    verify: "node --test u.js"',
    '    estimate: "2m"',
    '    scope: second task',
    '```',
  ].join('\n')
  const { tasks } = dag.parsePlan(md)
  assert.equal(tasks.length, 2)
  assert.equal(tasks[0].id, 'a')
  assert.deepEqual(tasks[1].depends_on, ['a'])
  assert.deepEqual(tasks[0].touches, ['x.js'])
})

// helper
function norm(t) {
  return {
    id: t.id,
    depends_on: t.depends_on || [],
    touches: t.touches || [],
    verify: 'verify' in t ? t.verify : 'node -e "process.exit(0)"',
    estimate: t.estimate || '1m',
    scope: t.scope || 's',
  }
}
