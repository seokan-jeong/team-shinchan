// tests/dashboard/config.test.js
//
// Phase 5 — Dashboard config resolution tests.
//
// Coverage:
//   - env var TS_DASHBOARD_MD_RENDER wins over file/default
//   - .shinchan-config.yaml is parsed when env is unset
//   - default 'auto' falls through when neither is set
//   - unknown values fall through silently (no crash)
//   - parseConfigYaml returns null on malformed input

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  resolveMarkdownRenderMode,
  VALID_MD_MODES,
  DEFAULT_MD_RENDER,
  _internal: { parseConfigYaml }
} = require('../../src/dashboard/config');

function makeTempCwd() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ts-cfg-'));
}

test('default mode is auto when nothing is set', () => {
  const cwd = makeTempCwd();
  const r = resolveMarkdownRenderMode({ cwd, env: {} });
  assert.equal(r.mode, 'auto');
  assert.equal(r.source, 'default');
  assert.equal(DEFAULT_MD_RENDER, 'auto');
});

test('TS_DASHBOARD_MD_RENDER env var takes precedence over file + default', () => {
  const cwd = makeTempCwd();
  fs.writeFileSync(path.join(cwd, '.shinchan-config.yaml'),
    'dashboard:\n  markdown_render: pre\n', 'utf8');
  const r = resolveMarkdownRenderMode({
    cwd,
    env: { TS_DASHBOARD_MD_RENDER: 'iframe' }
  });
  assert.equal(r.mode, 'iframe');
  assert.equal(r.source, 'env');
});

test('TS_DASHBOARD_MD_RENDER with unknown value is ignored (falls to file/default)', () => {
  const cwd = makeTempCwd();
  const r = resolveMarkdownRenderMode({
    cwd,
    env: { TS_DASHBOARD_MD_RENDER: 'banana' }
  });
  assert.equal(r.mode, 'auto');
  assert.equal(r.source, 'default');
});

test('config file is read when env is unset', () => {
  const cwd = makeTempCwd();
  fs.writeFileSync(path.join(cwd, '.shinchan-config.yaml'),
    'dashboard:\n  markdown_render: pre\n', 'utf8');
  const r = resolveMarkdownRenderMode({ cwd, env: {} });
  assert.equal(r.mode, 'pre');
  assert.equal(r.source, 'config');
});

test('config file with quoted value works', () => {
  const cwd = makeTempCwd();
  fs.writeFileSync(path.join(cwd, '.shinchan-config.yaml'),
    'dashboard:\n  markdown_render: "iframe"\n', 'utf8');
  const r = resolveMarkdownRenderMode({ cwd, env: {} });
  assert.equal(r.mode, 'iframe');
});

test('config file with comment is tolerated', () => {
  const cwd = makeTempCwd();
  fs.writeFileSync(path.join(cwd, '.shinchan-config.yaml'),
    '# top comment\ndashboard:\n  markdown_render: iframe   # trailing comment\n', 'utf8');
  const r = resolveMarkdownRenderMode({ cwd, env: {} });
  assert.equal(r.mode, 'iframe');
});

test('config file with unknown markdown_render falls to default', () => {
  const cwd = makeTempCwd();
  fs.writeFileSync(path.join(cwd, '.shinchan-config.yaml'),
    'dashboard:\n  markdown_render: banana\n', 'utf8');
  const r = resolveMarkdownRenderMode({ cwd, env: {} });
  assert.equal(r.mode, 'auto');
  assert.equal(r.source, 'default');
});

test('parseConfigYaml returns null on empty/non-string input', () => {
  assert.equal(parseConfigYaml(''), null);
  assert.equal(parseConfigYaml(null), null);
  assert.equal(parseConfigYaml(undefined), null);
  assert.equal(parseConfigYaml(123), null);
});

test('parseConfigYaml handles all three valid modes', () => {
  assert.equal(parseConfigYaml('markdown_render: auto'), 'auto');
  assert.equal(parseConfigYaml('markdown_render: iframe'), 'iframe');
  assert.equal(parseConfigYaml('markdown_render: pre'), 'pre');
});

test('VALID_MD_MODES contains exactly the three documented strings', () => {
  assert.equal(VALID_MD_MODES.size, 3);
  for (const m of ['auto', 'iframe', 'pre']) {
    assert.ok(VALID_MD_MODES.has(m), `missing mode: ${m}`);
  }
});
