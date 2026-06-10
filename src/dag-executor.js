#!/usr/bin/env node
'use strict'
/**
 * dag-executor.js — Team-Shinchan executing-stage DAG dispatcher
 * (interview-metrics-researc-002 Phase 2 — DAG Executor + Completion Gate)
 *
 * Drives the executing stage as a topologically-ordered task DAG with:
 *   - static conflict-graph serialization (tasks whose touches[] intersect run serial;
 *     disjoint connected components run in parallel up to a concurrency cap),
 *   - a per-task verify gate (verify command must exit 0; absent/NL-only verify => FAILED,
 *     never a silent SKIP),
 *   - a recovery ladder keyed on error type (transient=>retry<=3, deterministic=>local-patch,
 *     scope-drift=>replan with a bounded counter; independent per-step counters; no infinite
 *     replan),
 *   - a post-merge integration pass, and
 *   - a strict ALL-PASS completion gate that BLOCKS the executing->done stage transition.
 *
 * DESIGN: this module is built ON TOP of the existing Workflow pipeline/parallel mental model
 * (sequential pipeline phases + a parallel fan-out primitive) but is a STANDALONE, testable
 * Node module. The graph logic (topo sort, conflict graph / connected components, gate
 * evaluation, recovery-ladder transitions, counter persistence) is exposed as PURE functions
 * for unit testing (NFR-1). Side-effectful dispatch is injected via a `runner` callback so
 * tests use mock dispatch.
 *
 * CROSS-PHASE SAFETY: this module never imports from src/option-metrics.js (dependency
 * inversion ban, REQUESTS.md Elicitation). Phase 1 contracts are read-only.
 *
 * SERIAL-FALLBACK (FR-4 boundary, NFR-5): if every ready task shares a resource, the conflict
 * graph is a single connected component and execution is fully serial — expected; a warning is
 * logged so operators can inspect plan granularity.
 *
 * SECURITY (REQUESTS.md STRIDE): touches[] is parsed once and treated read-only (S1). Only
 * error TYPE + a short message are persisted to WORKFLOW_STATE, never raw stack traces (I1).
 */

const fs = require('node:fs')

// ---------------------------------------------------------------------------
// Task states
// ---------------------------------------------------------------------------
const STATE = Object.freeze({
  PENDING: 'PENDING',
  INFLIGHT: 'INFLIGHT',
  DONE: 'DONE',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  SKIP: 'SKIP',
})

const ERROR_TYPE = Object.freeze({
  TRANSIENT: 'transient',
  DETERMINISTIC: 'deterministic',
  SCOPE_DRIFT: 'scope-drift',
})

const LADDER_ACTION = Object.freeze({
  RETRY: 'retry',
  LOCAL_PATCH: 'local-patch',
  REPLAN: 'replan',
  FAIL: 'fail',
})

// Recovery upper bounds (REQUESTS.md FR-6, H-D1). Independent per-step counters.
const MAX_TRANSIENT_RETRY = 3
const MAX_REPLAN = 2

const DEFAULT_CONCURRENCY = 4

// ===========================================================================
// FR-1 / FR-3 — Plan parsing
// ===========================================================================

/**
 * Parse a plan into a normalized task list + plan metadata.
 * Accepts either an already-parsed object ({ tasks, plan_meta }) or a PLAN.md
 * markdown string containing ```yaml fenced `tasks:` / `plan_meta:` blocks.
 *
 * To keep this module dependency-free (no YAML lib in the harness), the markdown
 * path extracts the fenced yaml blocks and parses the constrained subset we emit
 * (a flow/list of task objects). Callers that already hold structured data SHOULD
 * pass the object form (the executing-stage wiring does).
 */
function parsePlan(input) {
  if (input && typeof input === 'object' && Array.isArray(input.tasks)) {
    return normalizePlan(input)
  }
  if (typeof input !== 'string') {
    throw new TypeError('parsePlan: expected a plan object {tasks,...} or a markdown string')
  }
  const meta = extractYamlBlock(input, 'plan_meta')
  const tasksBlock = extractYamlBlock(input, 'tasks')
  return normalizePlan({
    plan_meta: meta || {},
    tasks: tasksBlock || [],
  })
}

function normalizePlan(plan) {
  const tasks = (plan.tasks || []).map((t) => ({
    id: String(t.id),
    depends_on: Array.isArray(t.depends_on) ? t.depends_on.map(String) : [],
    touches: Array.isArray(t.touches) ? t.touches.map(String) : [],
    verify: t.verify == null ? null : String(t.verify),
    estimate: t.estimate == null ? null : String(t.estimate),
    scope: t.scope == null ? '' : String(t.scope),
  }))
  const ids = new Set()
  for (const t of tasks) {
    if (!t.id) throw new Error('parsePlan: a task is missing an id')
    if (ids.has(t.id)) throw new Error(`parsePlan: duplicate task id "${t.id}"`)
    ids.add(t.id)
  }
  for (const t of tasks) {
    for (const dep of t.depends_on) {
      if (!ids.has(dep)) throw new Error(`parsePlan: task "${t.id}" depends_on unknown id "${dep}"`)
    }
  }
  return { plan_meta: plan.plan_meta || {}, tasks }
}

/**
 * Minimal extractor for the constrained yaml we emit in PLAN.md. Not a general YAML
 * parser — it handles the `tasks:`/`plan_meta:` shapes this project produces. Returns
 * the parsed JS value, or null if the block is not present.
 */
function extractYamlBlock(markdown, topKey) {
  const fenceRe = /```ya?ml\s*\n([\s\S]*?)```/g
  let m
  while ((m = fenceRe.exec(markdown)) !== null) {
    const body = m[1]
    if (new RegExp(`^${topKey}\\s*:`, 'm').test(body)) {
      return parseConstrainedYaml(body, topKey)
    }
  }
  return null
}

// A deliberately small YAML subset parser (block lists of maps, scalars, flow lists).
function parseConstrainedYaml(body, topKey) {
  const lines = body.split('\n')
  // Find the top key line.
  let i = 0
  while (i < lines.length && !new RegExp(`^${topKey}\\s*:`).test(lines[i])) i++
  if (i >= lines.length) return null
  const headerInline = lines[i].slice(lines[i].indexOf(':') + 1).trim()
  i++
  if (headerInline && headerInline !== '') return scalar(headerInline)

  // Collect indented children.
  const child = []
  const baseIndent = lines[i] ? lines[i].match(/^\s*/)[0].length : 0
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const indent = line.match(/^\s*/)[0].length
    if (indent < baseIndent && line.trim() !== '') break
    child.push(line)
  }
  // List of maps?  (lines starting with "- ")
  if (child.some((l) => /^\s*-\s/.test(l))) {
    return parseListOfMaps(child)
  }
  return parseMap(child)
}

function parseListOfMaps(lines) {
  const items = []
  let cur = null
  let pendingKey = null
  let pendingIndent = 0
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (line.trim() === '') continue
    const indent = line.match(/^\s*/)[0].length
    const dashMatch = line.match(/^\s*-\s+(.*)$/)
    if (dashMatch) {
      cur = {}
      items.push(cur)
      pendingKey = null
      const rest = dashMatch[1]
      const kv = rest.match(/^([\w.]+)\s*:\s*(.*)$/)
      if (kv) assignKV(cur, kv[1], kv[2])
      continue
    }
    if (!cur) continue
    const kv = line.match(/^\s*([\w.]+)\s*:\s*(.*)$/)
    if (kv) {
      if (kv[2] === '>' || kv[2] === '|' || kv[2] === '') {
        pendingKey = kv[1]
        pendingIndent = indent
        cur[kv[1]] = kv[2] === '' ? '' : ''
      } else {
        assignKV(cur, kv[1], kv[2])
        pendingKey = null
      }
      continue
    }
    // continuation of a block scalar (> or |)
    if (pendingKey && indent > pendingIndent) {
      cur[pendingKey] = (cur[pendingKey] ? cur[pendingKey] + ' ' : '') + line.trim()
    }
  }
  return items
}

function parseMap(lines) {
  const map = {}
  for (const raw of lines) {
    const kv = raw.match(/^\s*([\w.]+)\s*:\s*(.*)$/)
    if (kv && kv[2] !== '') assignKV(map, kv[1], kv[2])
  }
  return map
}

function assignKV(obj, key, rawVal) {
  obj[key] = scalar(rawVal)
}

function scalar(v) {
  const s = String(v).trim()
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map((x) => stripQuotes(x.trim()))
  }
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+$/.test(s)) return Number(s)
  return stripQuotes(s)
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

// ===========================================================================
// FR-3 — Topological sort with cycle detection (AC-3, AC-15, H-D1)
// ===========================================================================

/**
 * Return task ids in a dependency-respecting order (Kahn's algorithm).
 * Throws a descriptive error if a cycle exists (AC-15) — BEFORE any dispatch.
 * Stable: ready tasks are emitted in original plan order (deterministic tests).
 */
function topoSort(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const indeg = new Map(tasks.map((t) => [t.id, 0]))
  const dependents = new Map(tasks.map((t) => [t.id, []]))
  for (const t of tasks) {
    for (const dep of t.depends_on) {
      indeg.set(t.id, indeg.get(t.id) + 1)
      dependents.get(dep).push(t.id)
    }
  }
  // Ready queue in original order for determinism.
  const order = []
  const ready = tasks.filter((t) => indeg.get(t.id) === 0).map((t) => t.id)
  while (ready.length) {
    const id = ready.shift()
    order.push(id)
    for (const d of dependents.get(id)) {
      indeg.set(d, indeg.get(d) - 1)
      if (indeg.get(d) === 0) ready.push(d)
    }
  }
  if (order.length !== tasks.length) {
    const stuck = tasks.filter((t) => !order.includes(t.id)).map((t) => t.id)
    throw new Error(
      `topoSort: circular depends_on detected — cannot order tasks [${stuck.join(', ')}]. ` +
        'No tasks were dispatched.'
    )
  }
  // touch byId to satisfy linters that the map is intentional context
  void byId
  return order
}

// ===========================================================================
// FR-4 — Conflict graph + connected components (AC-4, NFR-5)
// ===========================================================================

/** Edge between A,B iff touches(A) ∩ touches(B) ≠ ∅. Returns adjacency map. */
function buildConflictGraph(tasks) {
  const adj = new Map(tasks.map((t) => [t.id, new Set()]))
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      if (intersects(tasks[i].touches, tasks[j].touches)) {
        adj.get(tasks[i].id).add(tasks[j].id)
        adj.get(tasks[j].id).add(tasks[i].id)
      }
    }
  }
  return adj
}

function intersects(a, b) {
  const setB = new Set(b)
  return a.some((x) => setB.has(x))
}

/**
 * Connected components of the conflict graph. Tasks in the same component must
 * serialize (only one runs at a time); different components are parallel-eligible.
 * Returns an array of id-arrays. Single component => fully serial (NFR-5 warning case).
 */
function connectedComponents(tasks) {
  const adj = buildConflictGraph(tasks)
  const seen = new Set()
  const components = []
  for (const t of tasks) {
    if (seen.has(t.id)) continue
    const comp = []
    const stack = [t.id]
    seen.add(t.id)
    while (stack.length) {
      const id = stack.pop()
      comp.push(id)
      for (const nb of adj.get(id)) {
        if (!seen.has(nb)) {
          seen.add(nb)
          stack.push(nb)
        }
      }
    }
    components.push(comp)
  }
  return components
}

/** True if the conflict graph collapses to a single component => fully serial (NFR-5). */
function isFullySerial(tasks) {
  return tasks.length > 1 && connectedComponents(tasks).length === 1
}

// ===========================================================================
// NFR-3 — Concurrency cap resolution
// ===========================================================================

/** Read executor.concurrency_cap from config; clamp to [1,20] else default(4)+warn. */
function resolveConcurrencyCap(config, logger = console) {
  const raw = config && config.executor ? config.executor.concurrency_cap : undefined
  if (raw === undefined || raw === null) return DEFAULT_CONCURRENCY
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    logger.warn(
      `[dag-executor] concurrency_cap=${raw} out of [1,20]; falling back to ${DEFAULT_CONCURRENCY}.`
    )
    return DEFAULT_CONCURRENCY
  }
  return n
}

function resolveSerialFallback(config) {
  if (config && config.executor && typeof config.executor.serial_fallback === 'boolean') {
    return config.executor.serial_fallback
  }
  return true
}

// ===========================================================================
// FR-5 — Per-task verify gate (AC-5)
// ===========================================================================

/**
 * Evaluate a task's verify result.
 *   - verify absent OR NL-only (not a runnable command) => FAILED (no silent SKIP).
 *   - runVerify(cmd) returns {exitCode}; exit 0 => DONE, else FAILED.
 * `runVerify` is injected so tests use a mock instead of spawning shells.
 */
function evaluateVerify(task, runVerify) {
  if (!task.verify || !isExecutableVerify(task.verify)) {
    return { state: STATE.FAILED, reason: 'verify-absent-or-nl-only', weak: true }
  }
  const res = runVerify(task.verify) || {}
  const code = typeof res.exitCode === 'number' ? res.exitCode : 1
  if (code === 0) return { state: STATE.DONE, reason: 'verify-pass' }
  return { state: STATE.FAILED, reason: `verify-exit-${code}` }
}

/**
 * Heuristic: a verify string is "executable" if it looks like a shell command, not an
 * NL sentence. We treat anything that contains a known command token or a shell operator
 * as executable; pure prose (ends in a period, no command tokens) is weak/NL-only.
 */
function isExecutableVerify(v) {
  const s = String(v).trim()
  if (s === '') return false
  // Reject obvious always-pass theater is a PROCESS control (AK review, T2 STRIDE),
  // not enforced here, but flag the trivial ones as NL-only / weak so the gate fails.
  if (/^(true|:|exit\s+0)$/.test(s)) return false
  const cmdTokens = /\b(node|npm|npx|grep|test|bash|sh|python|pytest|jest|cargo|go|make|tsc|eslint|\.\/)\b/
  const shellOps = /[|&;><]|\$\(/
  return cmdTokens.test(s) || shellOps.test(s)
}

// ===========================================================================
// FR-6 — Recovery ladder state machine (AC-6, AC-7, AC-8, H-D1)
// ===========================================================================

/**
 * Decide the next ladder action for a task given an error type and the task's current
 * counters. PURE — returns {action, counters, terminal} and never mutates input.
 * Counters are independent per step (transient retries vs replans).
 *
 *   transient     -> RETRY while transient < MAX_TRANSIENT_RETRY, else FAIL
 *   deterministic -> LOCAL_PATCH immediately (no retry consumed)
 *   scope-drift   -> REPLAN while replan < MAX_REPLAN, else FAIL (H-D1 bound)
 */
function recoveryStep(errorType, counters = {}) {
  const c = {
    transient: counters.transient || 0,
    replan: counters.replan || 0,
    patch: counters.patch || 0,
  }
  switch (errorType) {
    case ERROR_TYPE.TRANSIENT:
      if (c.transient < MAX_TRANSIENT_RETRY) {
        return { action: LADDER_ACTION.RETRY, counters: { ...c, transient: c.transient + 1 }, terminal: false }
      }
      return { action: LADDER_ACTION.FAIL, counters: { ...c }, terminal: true }
    case ERROR_TYPE.DETERMINISTIC:
      return { action: LADDER_ACTION.LOCAL_PATCH, counters: { ...c, patch: c.patch + 1 }, terminal: false }
    case ERROR_TYPE.SCOPE_DRIFT:
      if (c.replan < MAX_REPLAN) {
        return { action: LADDER_ACTION.REPLAN, counters: { ...c, replan: c.replan + 1 }, terminal: false }
      }
      return { action: LADDER_ACTION.FAIL, counters: { ...c }, terminal: true }
    default:
      // Unknown error type is treated as deterministic-fail (conservative, no silent pass).
      return { action: LADDER_ACTION.FAIL, counters: { ...c }, terminal: true }
  }
}

// ===========================================================================
// NFR-4 — Recovery counter persistence (AC-14, I1)
// ===========================================================================

/**
 * Serialize per-task recovery counters into a WORKFLOW_STATE-shaped object. Only the
 * error TYPE and a short message are kept (I1: no raw stack traces).
 */
function serializeCounters(taskCounters) {
  const out = {}
  for (const [id, c] of Object.entries(taskCounters)) {
    out[id] = {
      transient: c.transient || 0,
      replan: c.replan || 0,
      patch: c.patch || 0,
      last_error_type: c.last_error_type || null,
      last_message: c.last_message ? String(c.last_message).slice(0, 200) : null,
    }
  }
  return { executor_recovery: out }
}

/** Restore counters from a persisted WORKFLOW_STATE object (AC-14: no reset to 0). */
function restoreCounters(persisted) {
  const src = (persisted && persisted.executor_recovery) || {}
  const out = {}
  for (const [id, c] of Object.entries(src)) {
    out[id] = {
      transient: c.transient || 0,
      replan: c.replan || 0,
      patch: c.patch || 0,
      last_error_type: c.last_error_type || null,
      last_message: c.last_message || null,
    }
  }
  return out
}

// ===========================================================================
// FR-7 — Post-merge integration pass (AC-9)
// ===========================================================================

/**
 * Run the post-merge integration command from plan_meta.integration_test.
 * Absent => warn, return {ran:false, pass:true} (does NOT block, FR-7).
 */
function runIntegration(planMeta, runVerify, logger = console) {
  const cmd = planMeta && planMeta.integration_test
  if (!cmd || !isExecutableVerify(cmd)) {
    logger.warn('[dag-executor] no post-merge integration_test declared; skipping (warn, not block).')
    return { ran: false, pass: true }
  }
  const res = runVerify(cmd) || {}
  const code = typeof res.exitCode === 'number' ? res.exitCode : 1
  return { ran: true, pass: code === 0, exitCode: code }
}

// ===========================================================================
// FR-8 — Completion gate (strict ALL-PASS) (AC-10)
// ===========================================================================

/**
 * Strict ALL-PASS gate. Allows the executing->done transition ONLY IF:
 *   - zero tasks in FAILED or SKIP,
 *   - every task reached DONE (no PENDING/INFLIGHT/BLOCKED left),
 *   - the post-merge integration pass succeeded.
 * Returns {pass:boolean, blocked:boolean, reasons:[]}. Vacuous truth: zero tasks => PASS.
 */
function evaluateCompletionGate(taskStates, integrationResult) {
  const reasons = []
  const entries = Object.entries(taskStates || {})
  const failed = entries.filter(([, s]) => s === STATE.FAILED).map(([id]) => id)
  const skipped = entries.filter(([, s]) => s === STATE.SKIP).map(([id]) => id)
  const unfinished = entries
    .filter(([, s]) => s === STATE.PENDING || s === STATE.INFLIGHT || s === STATE.BLOCKED)
    .map(([id]) => id)

  if (failed.length) reasons.push(`FAILED tasks: ${failed.join(', ')}`)
  if (skipped.length) reasons.push(`SKIP tasks: ${skipped.join(', ')}`)
  if (unfinished.length) reasons.push(`unfinished tasks: ${unfinished.join(', ')}`)
  if (integrationResult && integrationResult.ran && !integrationResult.pass) {
    reasons.push(`post-merge integration failed (exit ${integrationResult.exitCode})`)
  }
  const pass = reasons.length === 0
  return { pass, blocked: !pass, reasons }
}

// ===========================================================================
// Orchestration — topological dispatch over the conflict-graph-aware schedule
// ===========================================================================

/**
 * Execute a plan. Side-effectful dispatch + verify are injected for testability:
 *   runner(task)    -> { ok:boolean, errorType?:string, message?:string }
 *   runVerify(cmd)  -> { exitCode:number }
 *
 * Returns { states, gate, integration, counters, order, fullySerial }.
 * Honors: topo order, conflict-graph serialization (one task per component at a time),
 * concurrency cap across components, verify gate, recovery ladder, completion gate.
 *
 * NOTE: this is a synchronous reference scheduler (single-process, deterministic for
 * tests). It models concurrency via the conflict graph + cap rather than real async; the
 * executing-stage wiring maps "parallel-eligible" sets onto the Workflow parallel() runtime.
 */
function executePlan(plan, { runner, runVerify, config = {}, persisted = null, logger = console } = {}) {
  const { plan_meta, tasks } = parsePlan(plan)
  const order = topoSort(tasks) // throws on cycle BEFORE any dispatch (AC-15)
  const cap = resolveConcurrencyCap(config, logger)
  const fullySerial = isFullySerial(tasks)
  if (fullySerial && resolveSerialFallback(config)) {
    logger.warn(
      '[dag-executor] conflict graph is a single connected component — execution is FULLY SERIAL. ' +
        'No parallelism possible for this plan; inspect task granularity (NFR-5).'
    )
  }

  const byId = new Map(tasks.map((t) => [t.id, t]))
  const states = {}
  for (const t of tasks) states[t.id] = STATE.PENDING
  const counters = persisted ? restoreCounters(persisted) : {}
  const componentOf = new Map()
  connectedComponents(tasks).forEach((comp, idx) => comp.forEach((id) => componentOf.set(id, idx)))

  const depsDone = (t) => t.depends_on.every((d) => states[d] === STATE.DONE)
  const depsFailed = (t) =>
    t.depends_on.some((d) => states[d] === STATE.FAILED || states[d] === STATE.BLOCKED)

  // Deterministic scheduler: repeatedly pick a ready, non-conflicting batch (cap-bounded),
  // "run" it, then resolve verify + recovery. Conflict graph guarantees no two tasks in the
  // same component are in-flight together (we run at most one per component per batch).
  let progress = true
  while (progress) {
    progress = false
    // Block tasks whose deps failed.
    for (const t of tasks) {
      if (states[t.id] === STATE.PENDING && depsFailed(t)) {
        states[t.id] = STATE.BLOCKED
        progress = true
      }
    }
    const ready = order
      .map((id) => byId.get(id))
      .filter((t) => states[t.id] === STATE.PENDING && depsDone(t))
    if (!ready.length) break

    // Pick a batch: at most one task per component, up to the concurrency cap.
    const batch = []
    const usedComponents = new Set()
    for (const t of ready) {
      if (batch.length >= cap) break
      const comp = componentOf.get(t.id)
      if (usedComponents.has(comp)) continue // serialize within a component
      usedComponents.add(comp)
      batch.push(t)
    }

    for (const task of batch) {
      states[task.id] = STATE.INFLIGHT
      const outcome = runTaskWithRecovery(task, { runner, counters, logger })
      if (!outcome.ok) {
        states[task.id] = STATE.FAILED
        progress = true
        continue
      }
      const v = evaluateVerify(task, runVerify)
      states[task.id] = v.state
      progress = true
    }
  }

  const integration = runIntegration(plan_meta, runVerify, logger)
  const gate = evaluateCompletionGate(states, integration)
  return {
    states,
    gate,
    integration,
    counters,
    order,
    fullySerial,
    persisted: serializeCounters(counters),
  }
}

/**
 * Run a single task, applying the recovery ladder on failure. Mutates `counters[task.id]`
 * (the live counter map). Returns { ok:boolean }. local-patch and replan are modeled as a
 * single re-run of the runner (the harness performs the real patch/replan via Task in the
 * wiring layer); the bounded counters guarantee termination (H-D1).
 */
function runTaskWithRecovery(task, { runner, counters, logger }) {
  counters[task.id] = counters[task.id] || { transient: 0, replan: 0, patch: 0 }
  // Bound the ladder iterations defensively (sum of all per-step caps + 1).
  const HARD_CAP = MAX_TRANSIENT_RETRY + MAX_REPLAN + 2
  let iter = 0
  let res = runner(task)
  while (!res.ok && iter < HARD_CAP) {
    iter++
    const step = recoveryStep(res.errorType, counters[task.id])
    counters[task.id] = {
      ...step.counters,
      last_error_type: res.errorType || null,
      last_message: res.message ? String(res.message).slice(0, 200) : null,
    }
    if (logger && logger.info) {
      logger.info(
        `[dag-executor] task ${task.id}: error=${res.errorType} -> ${step.action} ` +
          `(transient=${counters[task.id].transient}, replan=${counters[task.id].replan})`
      )
    }
    if (step.terminal || step.action === LADDER_ACTION.FAIL) return { ok: false }
    res = runner(task) // retry / local-patch / replan all re-run the injected runner
  }
  return { ok: !!res.ok }
}

// ---------------------------------------------------------------------------
// CLI — spot-check / smoke entry point
// ---------------------------------------------------------------------------
function loadConfigFromYaml(path) {
  try {
    const raw = fs.readFileSync(path, 'utf8')
    const m = raw.match(/^executor\s*:\s*\n((?:\s+.*\n?)*)/m)
    if (!m) return {}
    const block = m[1]
    const cap = block.match(/concurrency_cap\s*:\s*(\d+)/)
    const sf = block.match(/serial_fallback\s*:\s*(true|false)/)
    return {
      executor: {
        ...(cap ? { concurrency_cap: Number(cap[1]) } : {}),
        ...(sf ? { serial_fallback: sf[1] === 'true' } : {}),
      },
    }
  } catch {
    return {}
  }
}

if (require.main === module) {
  const arg = process.argv[2]
  if (arg === '--self-check') {
    // Built-in smoke: a diamond DAG with one shared-file pair.
    const plan = {
      plan_meta: { integration_test: 'node -e "process.exit(0)"' },
      tasks: [
        { id: 'a', depends_on: [], touches: ['x.js'], verify: 'node -e "process.exit(0)"', estimate: '1m', scope: 'root' },
        { id: 'b', depends_on: ['a'], touches: ['x.js'], verify: 'node -e "process.exit(0)"', estimate: '1m', scope: 'shares x.js w/ a => serial' },
        { id: 'c', depends_on: ['a'], touches: ['y.js'], verify: 'node -e "process.exit(0)"', estimate: '1m', scope: 'parallel branch' },
        { id: 'd', depends_on: ['b', 'c'], touches: ['z.js'], verify: 'node -e "process.exit(0)"', estimate: '1m', scope: 'join' },
      ],
    }
    const out = executePlan(plan, {
      runner: () => ({ ok: true }),
      runVerify: () => ({ exitCode: 0 }),
      config: loadConfigFromYaml('.shinchan-config.yaml'),
    })
    console.log(JSON.stringify({ order: out.order, states: out.states, gate: out.gate, fullySerial: out.fullySerial }, null, 2))
    process.exit(out.gate.pass ? 0 : 1)
  } else {
    console.log('Usage: node src/dag-executor.js --self-check')
    console.log('  (library module: require() it for parsePlan/topoSort/buildConflictGraph/')
    console.log('   connectedComponents/evaluateVerify/recoveryStep/evaluateCompletionGate/')
    console.log('   runIntegration/executePlan/serializeCounters/restoreCounters/resolveConcurrencyCap)')
  }
}

module.exports = {
  STATE,
  ERROR_TYPE,
  LADDER_ACTION,
  MAX_TRANSIENT_RETRY,
  MAX_REPLAN,
  DEFAULT_CONCURRENCY,
  parsePlan,
  topoSort,
  buildConflictGraph,
  connectedComponents,
  isFullySerial,
  intersects,
  resolveConcurrencyCap,
  resolveSerialFallback,
  evaluateVerify,
  isExecutableVerify,
  recoveryStep,
  serializeCounters,
  restoreCounters,
  runIntegration,
  evaluateCompletionGate,
  executePlan,
  runTaskWithRecovery,
  loadConfigFromYaml,
}
