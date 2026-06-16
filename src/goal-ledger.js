#!/usr/bin/env node
/**
 * Durable Multi-Goal Execution Ledger — Team-Shinchan (TICKET DUR-01)
 *
 * Conceptual port of the MIT-licensed "ultragoal" ledger pattern from gajae-code,
 * origin: packages/coding-agent/src/defaults/gjc/skills/ultragoal/SKILL.md (MIT).
 *
 * This is the durable / append-only / audited complement to the in-place
 * WORKFLOW_STATE.yaml: where WORKFLOW_STATE.yaml is mutated in place to reflect the
 * *current* stage, this ledger preserves the *full history* of goal steering so the
 * retrospective-value and PR-doc-gate feedback (IMPLEMENTATION + RETROSPECTIVE evidence)
 * have a tamper-evident trail to draw from.
 *
 * Core invariants:
 *   - The aggregate objective + constraints are FROZEN after creation (never edited).
 *   - Goals are NEVER hard-deleted; they can only be marked blocked/superseded.
 *   - Every steering mutation (accepted OR rejected) appends a structured audit entry
 *     to ledger.jsonl. Broad / free-form / unknown mutations are rejected, not guessed.
 *
 * Storage layout (per dir):
 *   - goals.json   : { objective, constraints, goals:[{id,wording,status}], frozen:true }
 *   - ledger.jsonl : append-only stream of audit entries (one JSON object per line)
 *
 * Zero npm dependencies.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Steering mutation kinds this ledger accepts. Anything else is rejected. */
const ALLOWED_KINDS = Object.freeze([
  'add_subgoal',
  'split_subgoal',
  'reorder_pending',
  'revise_pending_wording',
  'annotate_ledger',
  'mark_blocked_superseded',
]);

function goalsPath(dir) {
  return path.join(dir, 'goals.json');
}

function ledgerPath(dir) {
  return path.join(dir, 'ledger.jsonl');
}

/**
 * Create a fresh ledger in `dir`.
 *
 * Writes goals.json (frozen aggregate + pending goals) and an empty ledger.jsonl,
 * then appends an "init" audit entry.
 *
 * @param {string} dir
 * @param {{objective:string, constraints?:any[], goals?:Array<{id?:string,wording:string}>}} spec
 * @returns {Object} the persisted goals.json object
 * @throws if the dir is already initialized
 */
function initLedger(dir, spec = {}) {
  const gp = goalsPath(dir);
  const lp = ledgerPath(dir);
  if (fs.existsSync(gp) || fs.existsSync(lp)) {
    throw new Error(`goal-ledger: already initialized at ${dir}`);
  }
  const { objective, constraints = [], goals = [] } = spec;
  if (typeof objective !== 'string' || objective.length === 0) {
    throw new Error('goal-ledger: objective (non-empty string) is required');
  }

  fs.mkdirSync(dir, { recursive: true });

  const normalizedGoals = goals.map((g, i) => ({
    id: g && g.id != null ? String(g.id) : `g${i + 1}`,
    wording: g && typeof g.wording === 'string' ? g.wording : String((g && g.wording) || ''),
    status: 'pending',
  }));

  const doc = {
    objective,
    constraints: Array.isArray(constraints) ? constraints.slice() : [],
    goals: normalizedGoals,
    frozen: true,
  };

  // Empty ledger first so writeGoals + init audit are the only initial mutations.
  fs.writeFileSync(lp, '', 'utf-8');
  writeGoals(dir, doc);

  appendLedger(dir, {
    kind: 'init',
    objective,
    constraintCount: doc.constraints.length,
    goalIds: normalizedGoals.map((g) => g.id),
  });

  return doc;
}

/**
 * Read goals.json back as an object.
 * @param {string} dir
 * @returns {Object}
 */
function readGoals(dir) {
  const gp = goalsPath(dir);
  if (!fs.existsSync(gp)) {
    throw new Error(`goal-ledger: not initialized at ${dir} (no goals.json)`);
  }
  return JSON.parse(fs.readFileSync(gp, 'utf-8'));
}

/**
 * Internal: persist the goals.json object. Not exported — callers steer via applySteering.
 * @param {string} dir
 * @param {Object} doc
 */
function writeGoals(dir, doc) {
  fs.writeFileSync(goalsPath(dir), JSON.stringify(doc, null, 2) + '\n', 'utf-8');
}

/**
 * Read ledger.jsonl back as an array of audit entries.
 * @param {string} dir
 * @returns {Object[]}
 */
function readLedger(dir) {
  const lp = ledgerPath(dir);
  if (!fs.existsSync(lp)) {
    throw new Error(`goal-ledger: not initialized at ${dir} (no ledger.jsonl)`);
  }
  return fs.readFileSync(lp, 'utf-8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

/**
 * Append one audit entry as a JSONL line.
 *
 * Pure w.r.t. time: this function NEVER calls Date.now(). If the caller supplies a `ts`
 * field on the entry, it is preserved verbatim; otherwise the entry is written as-is.
 *
 * @param {string} dir
 * @param {Object} entry
 * @returns {Object} the entry as written
 */
function appendLedger(dir, entry) {
  const lp = ledgerPath(dir);
  if (!fs.existsSync(lp)) {
    throw new Error(`goal-ledger: not initialized at ${dir} (no ledger.jsonl)`);
  }
  const record = entry && typeof entry === 'object' ? entry : { value: entry };
  fs.appendFileSync(lp, JSON.stringify(record) + '\n', 'utf-8');
  return record;
}

/**
 * Apply a typed steering mutation to the ledger.
 *
 * Accepts only the kinds in ALLOWED_KINDS. The frozen aggregate (objective/constraints)
 * may never be edited and goals may never be hard-deleted — such attempts, and any
 * unknown/free-form kind, are rejected. EVERY attempt (accepted or rejected) appends an
 * audit entry to ledger.jsonl.
 *
 * @param {string} dir
 * @param {Object} mutation - must have a `kind` field; `ts` (if present) is recorded verbatim
 * @returns {Object} { accepted:true, ... } on success, or { rejected:true, reason } on refusal
 */
function applySteering(dir, mutation = {}) {
  const doc = readGoals(dir);
  const kind = mutation && mutation.kind;
  const ts = mutation && mutation.ts;

  const reject = (reason) => {
    appendLedger(dir, { kind: 'steering_rejected', attemptedKind: kind, reason, ts });
    return { rejected: true, reason };
  };

  // Guard: frozen aggregate may not be edited, even under an allowed kind's guise.
  if (
    kind === 'edit_objective' ||
    kind === 'edit_constraints' ||
    'objective' in mutation ||
    'constraints' in mutation
  ) {
    return reject('objective/constraints are frozen and cannot be edited');
  }

  // Guard: goals may never be hard-deleted.
  if (kind === 'delete_subgoal' || kind === 'remove_goal' || kind === 'hard_delete') {
    return reject('goals are never hard-deleted; use mark_blocked_superseded instead');
  }

  if (!ALLOWED_KINDS.includes(kind)) {
    return reject(`unknown or free-form mutation kind: ${JSON.stringify(kind)}`);
  }

  const findIndex = (id) => doc.goals.findIndex((g) => g.id === String(id));

  switch (kind) {
    case 'add_subgoal': {
      const id = mutation.id != null ? String(mutation.id) : `g${doc.goals.length + 1}`;
      if (findIndex(id) !== -1) return reject(`subgoal id already exists: ${id}`);
      doc.goals.push({ id, wording: String(mutation.wording || ''), status: 'pending' });
      writeGoals(dir, doc);
      appendLedger(dir, { kind, id, wording: String(mutation.wording || ''), ts });
      return { accepted: true, kind, id };
    }

    case 'split_subgoal': {
      const idx = findIndex(mutation.id);
      if (idx === -1) return reject(`subgoal not found: ${mutation.id}`);
      const parts = Array.isArray(mutation.into) ? mutation.into : [];
      if (parts.length < 2) return reject('split_subgoal requires `into` of >= 2 wordings');
      // Parent is superseded (never deleted); children inserted in its place.
      doc.goals[idx].status = 'superseded';
      const children = parts.map((w, i) => ({
        id: `${doc.goals[idx].id}.${i + 1}`,
        wording: String(w),
        status: 'pending',
      }));
      doc.goals.splice(idx + 1, 0, ...children);
      writeGoals(dir, doc);
      appendLedger(dir, {
        kind,
        parentId: doc.goals[idx].id,
        childIds: children.map((c) => c.id),
        ts,
      });
      return { accepted: true, kind, childIds: children.map((c) => c.id) };
    }

    case 'reorder_pending': {
      const order = Array.isArray(mutation.order) ? mutation.order.map(String) : null;
      if (!order) return reject('reorder_pending requires an `order` array of ids');
      const pending = doc.goals.filter((g) => g.status === 'pending');
      const pendingIds = pending.map((g) => g.id);
      const sameSet =
        order.length === pendingIds.length &&
        order.every((id) => pendingIds.includes(id));
      if (!sameSet) {
        return reject('reorder_pending `order` must be a permutation of pending goal ids');
      }
      // Rebuild goals, replacing pending slots in the new order, non-pending untouched.
      const byId = new Map(doc.goals.map((g) => [g.id, g]));
      let oi = 0;
      doc.goals = doc.goals.map((g) =>
        g.status === 'pending' ? byId.get(order[oi++]) : g
      );
      writeGoals(dir, doc);
      appendLedger(dir, { kind, order, ts });
      return { accepted: true, kind, order };
    }

    case 'revise_pending_wording': {
      const idx = findIndex(mutation.id);
      if (idx === -1) return reject(`subgoal not found: ${mutation.id}`);
      if (doc.goals[idx].status !== 'pending') {
        return reject(`only pending goals may be reworded; ${mutation.id} is ${doc.goals[idx].status}`);
      }
      if (typeof mutation.wording !== 'string') {
        return reject('revise_pending_wording requires a `wording` string');
      }
      const from = doc.goals[idx].wording;
      doc.goals[idx].wording = mutation.wording;
      writeGoals(dir, doc);
      appendLedger(dir, { kind, id: doc.goals[idx].id, from, to: mutation.wording, ts });
      return { accepted: true, kind, id: doc.goals[idx].id };
    }

    case 'annotate_ledger': {
      // A note-only audit entry; does not touch goals.json.
      appendLedger(dir, { kind, note: String(mutation.note || ''), ts });
      return { accepted: true, kind };
    }

    case 'mark_blocked_superseded': {
      const idx = findIndex(mutation.id);
      if (idx === -1) return reject(`subgoal not found: ${mutation.id}`);
      const status = mutation.status === 'superseded' ? 'superseded' : 'blocked';
      const from = doc.goals[idx].status;
      doc.goals[idx].status = status; // sets status; never removes the goal
      writeGoals(dir, doc);
      appendLedger(dir, { kind, id: doc.goals[idx].id, from, to: status, reason: mutation.reason, ts });
      return { accepted: true, kind, id: doc.goals[idx].id, status };
    }

    default:
      // Unreachable (guarded by ALLOWED_KINDS above), kept for defensiveness.
      return reject(`unhandled mutation kind: ${JSON.stringify(kind)}`);
  }
}

module.exports = {
  ALLOWED_KINDS,
  initLedger,
  readGoals,
  readLedger,
  appendLedger,
  applySteering,
};
