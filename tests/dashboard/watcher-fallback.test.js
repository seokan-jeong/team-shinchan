// tests/dashboard/watcher-fallback.test.js
//
// Phase 3 — NFR-8 / AK MEDIUM-3.
//
// When the OS does not support recursive `fs.watch` (e.g. older Linux kernels
// or container sandboxes lacking inotify_recursive), DashboardWatcher must
// transparently fall back to a polling strategy via `fs.watchFile` + a 2 s
// directory rescan. This test monkey-patches `fs.watch` to throw `ENOSYS`,
// then verifies that a brand-new doc folder is still discovered and emitted
// as `workflow_added`.
//
// We restore `fs.watch` in a finalizer so the rest of the suite is unaffected.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function makeTempRoot() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-watch-fb-'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived'));
  return cwd;
}

function seedWorkflow(cwd, docId, body) {
  const dir = path.join(cwd, '.shinchan-docs', docId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'WORKFLOW_STATE.yaml'), body || 'schema_version: 2\n');
}

function waitForEvent(watcher, eventName, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      watcher.removeListener(eventName, handler);
      reject(new Error(`timeout waiting for ${eventName} (${timeoutMs}ms)`));
    }, timeoutMs);
    const handler = (payload) => {
      if (!predicate || predicate(payload)) {
        clearTimeout(timer);
        watcher.removeListener(eventName, handler);
        resolve(payload);
      }
    };
    watcher.on(eventName, handler);
  });
}

test('DashboardWatcher falls back to polling when recursive fs.watch throws ENOSYS (NFR-8)', async (t) => {
  // Monkey-patch fs.watch BEFORE constructing the watcher so the catch branch
  // in _startTreeWatch is exercised. fs.watchFile (used by the fallback) is
  // left untouched so the polling path still works.
  const realFsWatch = fs.watch;
  let watchCalls = 0;
  fs.watch = function patchedWatch() {
    watchCalls += 1;
    const err = new Error('Function not implemented');
    err.code = 'ENOSYS';
    throw err;
  };
  t.after(() => { fs.watch = realFsWatch; });

  const cwd = makeTempRoot();
  // Re-require fresh so the watcher module sees the patched fs (it caches
  // `require('fs')` which is the same module exports object — patching the
  // property on it suffices).
  const { DashboardWatcher } = require('../../src/dashboard/watcher');

  let warned = null;
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50,
    logger: { warn: (msg) => { warned = msg; } }
  });
  watcher.start();
  t.after(() => watcher.close());

  // Sanity: the fallback path must have been entered.
  assert.equal(watchCalls, 1, 'fs.watch must have been called exactly once');
  assert.ok(warned && /polling/i.test(warned),
    `expected polling warning, got: ${warned}`);

  // The polling fallback rescans every 2 s. Allow ~3.5 s to be safe.
  const promise = waitForEvent(
    watcher,
    'workflow_added',
    (p) => p.doc_id === 'demo-fallback',
    5000
  );
  // Create a brand-new doc folder mid-flight.
  setTimeout(() => seedWorkflow(cwd, 'demo-fallback'), 200);

  const ev = await promise;
  assert.equal(ev.doc_id, 'demo-fallback');
});
