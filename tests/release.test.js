'use strict';
// Unit tests for src/release.js (the release orchestrator).
// Run: node --test tests/release.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const R = require('../src/release.js');

test('isValidSemver accepts X.Y.Z only', () => {
  assert.ok(R.isValidSemver('4.39.0'));
  assert.ok(!R.isValidSemver('4.39'));
  assert.ok(!R.isValidSemver('v4.39.0'));
  assert.ok(!R.isValidSemver('4.39.0-rc1'));
});

test('parseArgs: bump-only is the default (git/gh opt-in)', () => {
  const o = R.parseArgs(['4.39.0']);
  assert.equal(o.version, '4.39.0');
  assert.ok(!o.git && !o.tag && !o.push && !o.ghRelease);
  assert.ok(!o.dryRun);
});

test('parseArgs: --full expands to every step', () => {
  const o = R.parseArgs(['4.39.0', '--full']);
  assert.ok(o.git && o.tag && o.push && o.ghRelease);
});

test('parseArgs: --gh-release implies --tag implies --git', () => {
  const o = R.parseArgs(['4.39.0', '--gh-release']);
  assert.ok(o.tag, 'gh-release needs a tag');
  assert.ok(o.git, 'tag needs the release commit');
});

test('parseArgs: --push implies --git', () => {
  const o = R.parseArgs(['4.39.0', '--push']);
  assert.ok(o.git);
});

test('parseArgs: --notes-file and --title take the next token', () => {
  const o = R.parseArgs(['4.39.0', '--notes-file', 'notes.md', '--title', 'My Title']);
  assert.equal(o.notesFile, 'notes.md');
  assert.equal(o.title, 'My Title');
});

test('parseArgs: --dry-run recognised', () => {
  assert.ok(R.parseArgs(['4.39.0', '--dry-run']).dryRun);
});

test('parseArgs: --allow-dirty defaults false, set true when present', () => {
  assert.equal(R.parseArgs(['4.39.0', '--full']).allowDirty, false);
  assert.equal(R.parseArgs(['4.39.0', '--full', '--allow-dirty']).allowDirty, true);
});

test('parseArgs: accepts both positional and --version forms', () => {
  assert.equal(R.parseArgs(['4.39.0']).version, '4.39.0');
  assert.equal(R.parseArgs(['--version', '4.39.0', '--full']).version, '4.39.0');
});

test('bumpJsonVersion replaces the version and reports changed', () => {
  const r = R.bumpJsonVersion('{\n  "version": "1.0.0"\n}', '1.0.0', '1.0.1');
  assert.ok(r.changed);
  assert.match(r.content, /"version": "1\.0\.1"/);
  const miss = R.bumpJsonVersion('{"version":"9.9.9"}', '1.0.0', '1.0.1');
  assert.ok(!miss.changed);
});

test('bumpReadmeBadge updates the shields version badge', () => {
  const r = R.bumpReadmeBadge('![v](https://img.shields.io/badge/version-1.0.0-blue)', '1.0.0', '1.0.1');
  assert.ok(r.changed);
  assert.match(r.content, /version-1\.0\.1-blue/);
});

test('insertChangelogEntry inserts header + notes right after "# Changelog"', () => {
  const raw = '# Changelog\n\n## [1.0.0] - 2020-01-01\n\nold\n';
  const out = R.insertChangelogEntry(raw, '1.0.1', '2026-05-30', '### Fixed\n- thing');
  assert.match(out, /# Changelog\n\n## \[1\.0\.1\] - 2026-05-30\n\n### Fixed\n- thing\n\n## \[1\.0\.0\]/);
});

test('insertChangelogEntry with empty notes yields a bare header', () => {
  const out = R.insertChangelogEntry('# Changelog\n\n## [1.0.0]\n', '1.0.1', '2026-05-30', '');
  assert.match(out, /## \[1\.0\.1\] - 2026-05-30\n\n## \[1\.0\.0\]/);
});

test('formatGitLogNotes bullets the log and drops prior release commits', () => {
  const notes = R.formatGitLogNotes(['feat: a', 'chore: release v1.0.0', 'fix: b', '']);
  assert.match(notes, /- feat: a/);
  assert.match(notes, /- fix: b/);
  assert.ok(!/release v1\.0\.0/.test(notes));
  assert.equal(R.formatGitLogNotes(['chore: release v1.0.0']), '');
});

test('buildReleaseCommands uses CONVENTIONAL commit AND tag messages (harness hook safe)', () => {
  const cmds = R.buildReleaseCommands(
    { version: '4.39.0', git: true, tag: true, push: true, ghRelease: true, title: null },
    { branch: 'main', files: ['a.json', 'b.md'], notesPath: '/tmp/n.md' });
  const joined = cmds.map((c) => c.cmd).join('\n');
  assert.match(joined, /git add a\.json b\.md/);
  assert.match(joined, /git commit -m "chore: release v4\.39\.0"/);
  assert.match(joined, /git tag -a v4\.39\.0 -m "chore: release v4\.39\.0"/);
  assert.match(joined, /git push origin main/);
  assert.match(joined, /git push origin v4\.39\.0/);
  assert.match(joined, /gh release create v4\.39\.0 --title "v4\.39\.0" --notes-file \/tmp\/n\.md/);
});

test('buildReleaseCommands honours an explicit --title', () => {
  const cmds = R.buildReleaseCommands(
    { version: '4.39.0', ghRelease: true, tag: true, git: true, title: 'Big Release' },
    { branch: 'main', files: ['a'], notesPath: '/tmp/n.md' });
  assert.match(cmds.map((c) => c.cmd).join('\n'), /gh release create v4\.39\.0 --title "Big Release"/);
});

test('buildReleaseCommands for bump-only emits no git/gh commands', () => {
  const cmds = R.buildReleaseCommands({ version: '4.39.0' }, { branch: 'main', files: [], notesPath: '' });
  assert.equal(cmds.length, 0);
});

// ---- clearLocalCache: mandatory post-release step (memory: release-cache-clear) ----
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('parseArgs: clearCache defaults ON; --no-clear-cache turns it off', () => {
  assert.equal(R.parseArgs(['4.55.0', '--full']).clearCache, true);
  assert.equal(R.parseArgs(['4.55.0', '--full', '--no-clear-cache']).clearCache, false);
});

test('clearLocalCache: dry-run previews, touches no disk', () => {
  const res = R.clearLocalCache({ dryRun: true, version: '4.55.0', cacheDir: '/nope/x', marketplaceDir: '/nope/y' });
  assert.equal(res.dryRun, true);
  assert.deepEqual(res.cleared, []);
  assert.ok(res.lines.join('\n').match(/would clear/i));
});

test('clearLocalCache: removes cached version dirs (injected paths), never throws', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-cache-'));
  const cacheDir = path.join(tmp, 'cache');
  fs.mkdirSync(path.join(cacheDir, '4.48.1'), { recursive: true });
  fs.mkdirSync(path.join(cacheDir, '4.50.0'), { recursive: true });
  const res = R.clearLocalCache({ version: '4.55.0', cacheDir, marketplaceDir: path.join(tmp, 'no-marketplace') });
  assert.deepEqual(res.cleared.sort(), ['4.48.1', '4.50.0']);
  assert.equal(fs.existsSync(path.join(cacheDir, '4.48.1')), false); // actually removed (delivery, not just reported)
  assert.equal(res.synced, false); // marketplace dir absent => graceful
  assert.ok(res.lines.join('\n').match(/Restart Claude Code/));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('clearLocalCache: missing cache dir => graceful (none cached), no throw', () => {
  const res = R.clearLocalCache({ version: '4.55.0', cacheDir: '/definitely/not/here', marketplaceDir: '/nor/here' });
  assert.deepEqual(res.cleared, []);
  assert.ok(res.lines.join('\n').match(/none cached/));
});
