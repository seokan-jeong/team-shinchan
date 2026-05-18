// tests/dashboard/discovery.test.js
//
// Phase 3 — Unit tests for the discovery module.
//
// Uses Node's standard test runner (`node --test`) and a tmpdir-backed fixture
// so we never touch the real `.shinchan-docs/` tree.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  discoverActive,
  discoverArchived,
  getWorkflow,
  parseYaml
} = require('../../src/dashboard/discovery');

function makeTempRoot() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-disc-'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived'));
  return cwd;
}

function writeWorkflow(cwd, docId, body, opts) {
  const o = opts || {};
  const dir = o.archived
    ? path.join(cwd, '.shinchan-docs', 'archived', docId)
    : path.join(cwd, '.shinchan-docs', docId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'WORKFLOW_STATE.yaml'), body, 'utf8');
}

const SAMPLE_YAML = `schema_version: 2
doc_id: "demo-001"
created: "2026-05-17T10:00:00Z"
updated: "2026-05-17T12:00:00Z"
context_budget: 4000

current:
  stage: implementation
  phase: 3
  owner: kazama
  status: active
  output_format: markdown
  interview: { step: 5, collected_count: 5 }
  notes:
    - "first note"
    - "second note"

history:
  - timestamp: "2026-05-17T10:00:00Z"
    event: workflow_started
    agent: shinnosuke
  - timestamp: "2026-05-17T11:00:00Z"
    event: phase_transition
    agent: kazama
    note: "Phase 0 → Phase 1"
`;

test('discoverActive returns active docs sorted by updated desc', () => {
  const cwd = makeTempRoot();
  writeWorkflow(cwd, 'demo-001', SAMPLE_YAML);
  writeWorkflow(cwd, 'demo-002', SAMPLE_YAML.replace('"demo-001"', '"demo-002"').replace('2026-05-17T12:00:00Z', '2026-05-17T13:00:00Z'));
  writeWorkflow(cwd, 'demo-003', SAMPLE_YAML.replace('"demo-001"', '"demo-003"').replace('2026-05-17T12:00:00Z', '2026-05-17T11:00:00Z'));

  const active = discoverActive(cwd);
  assert.equal(active.length, 3);
  assert.equal(active[0].doc_id, 'demo-002');   // newest first
  assert.equal(active[1].doc_id, 'demo-001');
  assert.equal(active[2].doc_id, 'demo-003');

  for (const meta of active) {
    assert.equal(meta.category, 'active');
    assert.equal(meta.schema_version, 2);
    assert.equal(meta.stage, 'implementation');
    assert.equal(meta.phase, 3);
    assert.equal(meta.owner, 'kazama');
    assert.equal(meta.status, 'active');
    assert.equal(meta.output_format, 'markdown');
    assert.equal(meta.history_length, 2);
    assert.ok(meta.last_event);
    assert.equal(meta.last_event.event, 'phase_transition');
    assert.equal(meta.last_event.note, 'Phase 0 → Phase 1');
  }
});

test('discoverActive ignores the archived/ folder and dotfiles', () => {
  const cwd = makeTempRoot();
  writeWorkflow(cwd, 'main-068', SAMPLE_YAML);
  writeWorkflow(cwd, 'main-067', SAMPLE_YAML, { archived: true });
  // dotfile sibling — should be ignored
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', '.dashboard-state'));
  fs.writeFileSync(path.join(cwd, '.shinchan-docs', '.dashboard-state', 'WORKFLOW_STATE.yaml'), SAMPLE_YAML);

  const active = discoverActive(cwd);
  assert.equal(active.length, 1);
  assert.equal(active[0].doc_id, 'main-068');
});

test('discoverArchived enumerates archived/ subfolders', () => {
  const cwd = makeTempRoot();
  writeWorkflow(cwd, 'main-068', SAMPLE_YAML);
  writeWorkflow(cwd, 'main-067', SAMPLE_YAML, { archived: true });
  writeWorkflow(cwd, 'main-040', SAMPLE_YAML, { archived: true });

  const archived = discoverArchived(cwd);
  assert.equal(archived.length, 2);
  for (const meta of archived) {
    assert.equal(meta.category, 'archived');
  }
});

test('getWorkflow returns active first, then archived, then null', () => {
  const cwd = makeTempRoot();
  writeWorkflow(cwd, 'main-068', SAMPLE_YAML);
  writeWorkflow(cwd, 'main-067', SAMPLE_YAML, { archived: true });

  const a = getWorkflow('main-068', cwd);
  assert.ok(a);
  assert.equal(a.category, 'active');

  const b = getWorkflow('main-067', cwd);
  assert.ok(b);
  assert.equal(b.category, 'archived');

  const c = getWorkflow('does-not-exist', cwd);
  assert.equal(c, null);
});

test('getWorkflow rejects path-traversal in doc_id', () => {
  const cwd = makeTempRoot();
  writeWorkflow(cwd, 'main-068', SAMPLE_YAML);
  // None of these should ever return a workflow object.
  assert.equal(getWorkflow('../etc/passwd', cwd), null);
  assert.equal(getWorkflow('..', cwd), null);
  assert.equal(getWorkflow('foo/bar', cwd), null);
  assert.equal(getWorkflow('foo\\bar', cwd), null);
  assert.equal(getWorkflow('', cwd), null);
});

test('parseYaml handles common WORKFLOW_STATE shapes', () => {
  const parsed = parseYaml(SAMPLE_YAML);
  assert.equal(parsed.schema_version, 2);
  assert.equal(parsed.doc_id, 'demo-001');
  assert.ok(parsed.current);
  assert.equal(parsed.current.stage, 'implementation');
  assert.equal(parsed.current.phase, 3);
  assert.equal(parsed.current.owner, 'kazama');
  assert.equal(parsed.current.status, 'active');
  assert.ok(parsed.current.interview);
  assert.equal(parsed.current.interview.step, 5);
  assert.equal(parsed.current.interview.collected_count, 5);
  assert.deepEqual(parsed.current.notes, ['first note', 'second note']);
  assert.equal(parsed.history.length, 2);
  assert.equal(parsed.history[1].event, 'phase_transition');
});

test('parseYaml tolerates block scalars (| literal)', () => {
  const yaml = `history:
  - timestamp: "2026-05-17T13:00:00Z"
    event: phase_implemented
    agent: kazama
    note: |
      Multi-line note.
      Line two.
      Line three.
  - timestamp: "2026-05-17T13:05:00Z"
    event: another
    agent: bo
`;
  const parsed = parseYaml(yaml);
  assert.equal(parsed.history.length, 2);
  assert.equal(parsed.history[0].event, 'phase_implemented');
  assert.ok(parsed.history[0].note.includes('Multi-line note'));
  assert.ok(parsed.history[0].note.includes('Line three'));
  assert.equal(parsed.history[1].event, 'another');
});

test('parseYaml tolerates malformed yaml without throwing', () => {
  // Intentionally garbage.
  const garbage = `??not valid??::\n  ::not yaml::`;
  assert.doesNotThrow(() => parseYaml(garbage));
});
