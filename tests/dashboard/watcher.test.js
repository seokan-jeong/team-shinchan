// tests/dashboard/watcher.test.js
//
// Phase 3 — Filesystem + tracker watcher tests.
//
// These tests use real fs writes inside a tmpdir to exercise the actual
// fs.watch / fs.watchFile paths. We keep the debounce small (50 ms) so
// the suite finishes quickly.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { DashboardWatcher } = require('../../src/dashboard/watcher');

function makeTempRoot() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-watch-'));
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
    }, timeoutMs || 4000);
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

test('DashboardWatcher emits workflow_added for a new doc folder (LOW-1 S1 candidate)', async (t) => {
  const cwd = makeTempRoot();
  // start with no docs
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50
  });
  watcher.start();
  t.after(() => watcher.close());

  const promise = waitForEvent(watcher, 'workflow_added', (p) => p.doc_id === 'demo-new');
  // Create a new doc folder mid-flight.
  setTimeout(() => seedWorkflow(cwd, 'demo-new'), 100);
  const ev = await promise;
  assert.equal(ev.doc_id, 'demo-new');
});

test('DashboardWatcher emits workflow_update when an existing WORKFLOW_STATE.yaml is rewritten (LOW-1 S3 atomic rename)', async (t) => {
  const cwd = makeTempRoot();
  seedWorkflow(cwd, 'demo-up');
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50
  });
  watcher.start();
  t.after(() => watcher.close());

  const yamlPath = path.join(cwd, '.shinchan-docs', 'demo-up', 'WORKFLOW_STATE.yaml');
  const promise = waitForEvent(watcher, 'workflow_update', (p) => p.doc_id === 'demo-up');

  // Simulate an atomic rename: write to tmp + rename into place.
  setTimeout(async () => {
    const tmp = yamlPath + '.tmp';
    await fsp.writeFile(tmp, 'schema_version: 2\nupdated: "2026-05-17T15:00:00Z"\n');
    await fsp.rename(tmp, yamlPath);
  }, 100);

  const ev = await promise;
  assert.equal(ev.doc_id, 'demo-up');
});

test('DashboardWatcher debounces burst writes into a single workflow_update', async (t) => {
  const cwd = makeTempRoot();
  seedWorkflow(cwd, 'demo-burst');
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 100
  });
  watcher.start();
  t.after(() => watcher.close());

  const yamlPath = path.join(cwd, '.shinchan-docs', 'demo-burst', 'WORKFLOW_STATE.yaml');
  let count = 0;
  watcher.on('workflow_update', () => { count++; });

  // Fire 5 quick writes within the debounce window.
  for (let i = 0; i < 5; i++) {
    fs.writeFileSync(yamlPath, `schema_version: 2\nrev: ${i}\n`);
    await new Promise(r => setTimeout(r, 10));
  }

  // Wait long enough for any debounced event to flush.
  await new Promise(r => setTimeout(r, 400));
  // We should only see 1 (or at most a small number) — never the full 5.
  assert.ok(count >= 1, `expected at least 1 workflow_update, got ${count}`);
  assert.ok(count <= 2, `expected ≤2 debounced events, got ${count}`);
});

test('DashboardWatcher tails work-tracker.jsonl and parses appended JSON lines (LOW-1 S2 hook + read isolation)', async (t) => {
  const cwd = makeTempRoot();
  // Create the tracker file first so the watcher seeks to its end on start.
  const trackerPath = path.join(cwd, '.shinchan-docs', 'work-tracker.jsonl');
  fs.writeFileSync(trackerPath, '');
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50
  });
  watcher.start();
  t.after(() => watcher.close());

  const promise = waitForEvent(watcher, 'tracker_event', (p) => p.type === 'unit_test');

  setTimeout(() => {
    fs.appendFileSync(trackerPath,
      JSON.stringify({ ts: new Date().toISOString(), type: 'unit_test', agent: 'kazama' }) + '\n');
  }, 200);

  const ev = await promise;
  assert.equal(ev.type, 'unit_test');
  assert.equal(ev.agent, 'kazama');
});

test('DashboardWatcher reopens work-tracker.jsonl after rotation (LOW-1 S5)', async (t) => {
  const cwd = makeTempRoot();
  const trackerPath = path.join(cwd, '.shinchan-docs', 'work-tracker.jsonl');
  fs.writeFileSync(trackerPath, '');
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50
  });
  watcher.start();
  t.after(() => watcher.close());

  // Initial event
  fs.appendFileSync(trackerPath, JSON.stringify({ type: 'before_rotate' }) + '\n');
  // Wait briefly so the watcher consumes it (then it's free to rotate).
  await new Promise(r => setTimeout(r, 700));

  // Simulate rotation: rename out + new empty file.
  const rotated = trackerPath + '.20260517';
  fs.renameSync(trackerPath, rotated);
  fs.writeFileSync(trackerPath, '');

  const promise = waitForEvent(watcher, 'tracker_event', (p) => p.type === 'after_rotate', 6000);
  setTimeout(() => {
    fs.appendFileSync(trackerPath, JSON.stringify({ type: 'after_rotate' }) + '\n');
  }, 200);

  const ev = await promise;
  assert.equal(ev.type, 'after_rotate');
});

test('DashboardWatcher emits workflow_removed when a doc folder disappears', async (t) => {
  const cwd = makeTempRoot();
  seedWorkflow(cwd, 'demo-remove');
  const watcher = new DashboardWatcher({
    docsRoot: path.join(cwd, '.shinchan-docs'),
    debounceMs: 50
  });
  watcher.start();
  t.after(() => watcher.close());

  const promise = waitForEvent(watcher, 'workflow_removed', (p) => p.doc_id === 'demo-remove', 6000);
  setTimeout(() => {
    const docDir = path.join(cwd, '.shinchan-docs', 'demo-remove');
    fs.rmSync(docDir, { recursive: true, force: true });
  }, 200);

  const ev = await promise;
  assert.equal(ev.doc_id, 'demo-remove');
});
