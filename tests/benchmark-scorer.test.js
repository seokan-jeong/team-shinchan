'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const { countLoc, score } = require('../benchmarks/scorer.js');

// ---- helpers: build a tiny throwaway git repo (NO paid calls) ----
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scorer-repo-'));
  const git = (c) => execSync(`git ${c}`, { cwd: dir, stdio: 'pipe' });
  git('init -q');
  git('config user.email t@t.t');
  git('config user.name t');
  fs.writeFileSync(path.join(dir, 'value.js'), 'module.exports = 1;\n');
  fs.writeFileSync(
    path.join(dir, 'value.test.js'),
    "const assert=require('node:assert');const {test}=require('node:test');test('v',()=>{assert.equal(require('./value.js'),2);});\n"
  );
  git('add -A');
  git('commit -qm base');
  return dir;
}

// A diff that changes value.js from 1 -> 2, making the pinned test pass.
function passingDiff() {
  return [
    'diff --git a/value.js b/value.js',
    'index 0000000..1111111 100644',
    '--- a/value.js',
    '+++ b/value.js',
    '@@ -1 +1 @@',
    '-module.exports = 1;',
    '+module.exports = 2;',
    '',
  ].join('\n');
}

test('countLoc: synthetic diff adding 3 / deleting 1', () => {
  const diff = [
    'diff --git a/f.txt b/f.txt',
    '--- a/f.txt',
    '+++ b/f.txt',
    '@@ -1,2 +1,4 @@',
    ' keep',
    '-old',
    '+new1',
    '+new2',
    '+new3',
    '',
  ].join('\n');
  const r = countLoc(diff);
  assert.equal(r.loc_added, 3);
  assert.equal(r.loc_deleted, 1);
});

test('score: passing diff -> pass true via real exit code 0', () => {
  const dir = makeRepo();
  const r = score(passingDiff(), { test_cmd: 'node --test value.test.js' }, dir);
  assert.equal(r.pass, true);
  assert.equal(r.loc_added, 1);
  assert.equal(r.loc_deleted, 1);
  assert.ok(typeof r.wall_clock_ms === 'number');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('score: breaking diff -> pass false via real nonzero exit', () => {
  const dir = makeRepo();
  const breaking = passingDiff().replace('+module.exports = 2;', '+module.exports = 99;');
  const r = score(breaking, { test_cmd: 'node --test value.test.js' }, dir);
  assert.equal(r.pass, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('score: empty diff -> deterministic FAIL, no throw (HR-10)', () => {
  const dir = makeRepo();
  const r = score('', { test_cmd: 'node --test value.test.js' }, dir);
  assert.equal(r.pass, false);
  assert.equal(r.loc_added, 0);
  assert.equal(r.loc_deleted, 0);
  assert.match(r.reason || '', /non-applying-or-empty/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('score: non-applying/corrupt diff -> deterministic FAIL, no throw (HR-10)', () => {
  const dir = makeRepo();
  const corrupt = 'diff --git a/nope.js b/nope.js\n--- a/nope.js\n+++ b/nope.js\n@@ -5,2 +5,2 @@\n-this context does not exist\n+garbage\n';
  const r = score(corrupt, { test_cmd: 'node --test value.test.js' }, dir);
  assert.equal(r.pass, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('score: re-scoring same stored diff is byte-identical on deterministic fields (AC-6)', () => {
  const dir1 = makeRepo();
  const dir2 = makeRepo();
  const diff = passingDiff();
  const s1 = score(diff, { test_cmd: 'node --test value.test.js' }, dir1);
  const s2 = score(diff, { test_cmd: 'node --test value.test.js' }, dir2);
  const det = (s) => JSON.stringify({ pass: s.pass, loc_added: s.loc_added, loc_deleted: s.loc_deleted });
  assert.equal(det(s1), det(s2));
  fs.rmSync(dir1, { recursive: true, force: true });
  fs.rmSync(dir2, { recursive: true, force: true });
});
