#!/usr/bin/env node
'use strict';
/**
 * release.js — version bump + optional git / GitHub release orchestration
 *
 * Usage: node src/release.js <X.Y.Z> [flags]
 *   --dry-run         preview every step; no file writes, no git, no gh
 *   --notes-file <f>  release notes source (CHANGELOG body + GitHub Release body)
 *   --title <str>     GitHub Release title (default "vX.Y.Z")
 *   --git             stage the 4 files + commit "chore: release vX.Y.Z"
 *   --tag             annotated tag vX.Y.Z, message "chore: release vX.Y.Z"
 *   --push            push the current branch + tag to origin
 *   --gh-release      create a GitHub Release (gh release create)
 *   --full            = --git --tag --push --gh-release
 *
 * The 4-file version bump (plugin.json, marketplace.json, README badge,
 * CHANGELOG) is ALWAYS performed. git/gh steps are opt-in.
 *
 * IMPORTANT: commit AND tag messages are conventional ("chore: release vX.Y.Z")
 * — the team-shinchan harness commit-lint hook rejects non-conventional commit
 * and tag messages, so the orchestrator bakes the correct format in.
 *
 * Release notes resolution: --notes-file if given, else a draft is generated
 * from `git log <last-tag>..HEAD` (never a silently-empty CHANGELOG header).
 *
 * After a real --push/--gh-release, clear local plugin caches (see the
 * release-cache-clear memory).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  plugin: path.join(ROOT, '.claude-plugin', 'plugin.json'),
  marketplace: path.join(ROOT, '.claude-plugin', 'marketplace.json'),
  readme: path.join(ROOT, 'README.md'),
  changelog: path.join(ROOT, 'CHANGELOG.md'),
};

const SEMVER = /^\d+\.\d+\.\d+$/;

// ---------------------------------------------------------------------------
// Pure, unit-tested helpers
// ---------------------------------------------------------------------------

function isValidSemver(v) {
  return typeof v === 'string' && SEMVER.test(v);
}

function parseArgs(argv) {
  const o = {
    version: null, dryRun: false, notesFile: null, title: null,
    git: false, tag: false, push: false, ghRelease: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--git') o.git = true;
    else if (a === '--tag') o.tag = true;
    else if (a === '--push') o.push = true;
    else if (a === '--gh-release') o.ghRelease = true;
    else if (a === '--full') { o.git = o.tag = o.push = o.ghRelease = true; }
    else if (a === '--notes-file') o.notesFile = argv[++i];
    else if (a === '--title') o.title = argv[++i];
    else if (a === '--version') o.version = argv[++i];
    else if (!a.startsWith('--') && !o.version) o.version = a;
  }
  // Implied dependencies: a GH release needs a tag; a tag/push needs the commit.
  if (o.ghRelease) o.tag = true;
  if (o.tag || o.push) o.git = true;
  return o;
}

function bumpJsonVersion(raw, oldV, newV) {
  const needle = `"version": "${oldV}"`;
  return { content: raw.replace(needle, `"version": "${newV}"`), changed: raw.includes(needle) };
}

function bumpReadmeBadge(raw, oldV, newV) {
  const needle = `version-${oldV}-blue`;
  return { content: raw.replace(needle, `version-${newV}-blue`), changed: raw.includes(needle) };
}

function insertChangelogEntry(raw, version, today, notes) {
  const header = `## [${version}] - ${today}`;
  const block = notes && notes.trim() ? `${header}\n\n${notes.trim()}\n` : `${header}\n`;
  const anchor = '# Changelog\n';
  const idx = raw.indexOf(anchor);
  if (idx === -1) return `${block}\n${raw}`;
  const after = idx + anchor.length;
  let insertAt = after;
  while (insertAt < raw.length && raw[insertAt] === '\n') insertAt++;
  return raw.slice(0, after) + '\n' + block + '\n' + raw.slice(insertAt);
}

function formatGitLogNotes(logLines) {
  const bullets = (logLines || [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .filter((s) => !/^chore: release v/.test(s))
    .map((s) => `- ${s}`);
  return bullets.length ? `### Changed\n${bullets.join('\n')}` : '';
}

function buildReleaseCommands(opts, ctx) {
  const v = opts.version;
  const msg = `chore: release v${v}`;
  const cmds = [];
  if (opts.git) {
    cmds.push({ desc: 'stage release files', cmd: `git add ${ctx.files.join(' ')}` });
    cmds.push({ desc: 'commit', cmd: `git commit -m ${JSON.stringify(msg)}` });
  }
  if (opts.tag) {
    cmds.push({ desc: 'annotated tag (conventional msg)', cmd: `git tag -a v${v} -m ${JSON.stringify(msg)}` });
  }
  if (opts.push) {
    cmds.push({ desc: 'push branch', cmd: `git push origin ${ctx.branch}` });
    cmds.push({ desc: 'push tag', cmd: `git push origin v${v}` });
  }
  if (opts.ghRelease) {
    const title = opts.title || `v${v}`;
    cmds.push({ desc: 'github release', cmd: `gh release create v${v} --title ${JSON.stringify(title)} --notes-file ${ctx.notesPath}` });
  }
  return cmds;
}

// ---------------------------------------------------------------------------
// Side-effecting orchestration (only runs as a CLI)
// ---------------------------------------------------------------------------

function fail(msg) { console.error(`Error: ${msg}`); process.exit(1); }
function warn(msg) { console.error(`Warning: ${msg}`); }
function sh(cmd) { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }); }
function safeSh(cmd) { try { return sh(cmd); } catch { return ''; } }

function resolveNotes(opts) {
  if (opts.notesFile) return fs.readFileSync(opts.notesFile, 'utf8');
  if (!opts.git && !opts.ghRelease) return '';
  let log = '';
  const lastTag = safeSh('git describe --tags --abbrev=0').trim();
  log = lastTag ? safeSh(`git log ${lastTag}..HEAD --pretty=%s`) : safeSh('git log -10 --pretty=%s');
  const notes = formatGitLogNotes(log.split('\n'));
  if (notes) warn('no --notes-file: drafted CHANGELOG notes from git log — REVIEW before publishing');
  else warn('no --notes-file and no new commits since last tag — CHANGELOG header will be empty');
  return notes;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.version) fail('version argument required\nUsage: node src/release.js <X.Y.Z> [--full|--git|--tag|--push|--gh-release] [--notes-file f] [--dry-run]');
  if (!isValidSemver(opts.version)) fail(`invalid semver "${opts.version}" — expected X.Y.Z`);

  const today = new Date().toISOString().slice(0, 10);

  const pluginRaw = fs.readFileSync(FILES.plugin, 'utf8');
  const oldV = JSON.parse(pluginRaw).version;
  if (oldV === opts.version) fail(`version ${opts.version} is already current`);

  // Preconditions for opt-in steps (fail fast, before any write).
  if (opts.tag) {
    const exists = safeSh(`git tag -l v${opts.version}`).trim();
    if (exists) fail(`tag v${opts.version} already exists`);
  }
  const branch = (safeSh('git rev-parse --abbrev-ref HEAD').trim()) || 'main';
  if (opts.git && branch !== 'main') warn(`not on main (on "${branch}")`);
  if (opts.git && safeSh('git status --porcelain').trim() && !opts.dryRun) {
    warn('working tree has uncommitted changes beyond the bump — the release commit will include only the 4 bumped files');
  }
  if (opts.ghRelease && !opts.dryRun) {
    try { sh('gh auth status'); } catch { fail('gh is not authenticated — run `gh auth login`'); }
  }

  const plugin = bumpJsonVersion(pluginRaw, oldV, opts.version);
  const market = bumpJsonVersion(fs.readFileSync(FILES.marketplace, 'utf8'), oldV, opts.version);
  const readme = bumpReadmeBadge(fs.readFileSync(FILES.readme, 'utf8'), oldV, opts.version);
  if (!market.changed) warn(`marketplace.json version "${oldV}" not found — check manually`);
  if (!readme.changed) warn(`README badge "version-${oldV}-blue" not found — check manually`);

  const notes = resolveNotes(opts);
  const changelog = insertChangelogEntry(fs.readFileSync(FILES.changelog, 'utf8'), opts.version, today, notes);

  const changes = [
    { file: FILES.plugin, label: '.claude-plugin/plugin.json', content: plugin.content },
    { file: FILES.marketplace, label: '.claude-plugin/marketplace.json', content: market.content },
    { file: FILES.readme, label: 'README.md', content: readme.content },
    { file: FILES.changelog, label: 'CHANGELOG.md', content: changelog },
  ];

  console.log(`\nRelease: ${oldV} -> ${opts.version}   (${today})`);
  console.log(`Mode: ${opts.dryRun ? 'DRY RUN' : 'LIVE'} | steps: bump${opts.git ? ' +git' : ''}${opts.tag ? ' +tag' : ''}${opts.push ? ' +push' : ''}${opts.ghRelease ? ' +gh-release' : ''}\n`);
  changes.forEach((c) => console.log(`  bump: ${c.label}`));

  if (!opts.dryRun) changes.forEach((c) => fs.writeFileSync(c.file, c.content, 'utf8'));

  // Notes temp file for gh (when no explicit --notes-file).
  let notesPath = opts.notesFile;
  if (opts.ghRelease && !notesPath) {
    notesPath = path.join(os.tmpdir(), `release-notes-v${opts.version}.md`);
    if (!opts.dryRun) fs.writeFileSync(notesPath, notes || `Release v${opts.version}`, 'utf8');
  }

  const cmds = buildReleaseCommands(opts, {
    branch,
    files: changes.map((c) => path.relative(ROOT, c.file)),
    notesPath: notesPath || '<notes>',
  });
  for (const c of cmds) {
    if (opts.dryRun) { console.log(`  would run: ${c.cmd}`); continue; }
    console.log(`  ${c.desc}: ${c.cmd}`);
    try { sh(c.cmd); } catch (e) { fail(`step failed (${c.desc}): ${e.message}`); }
  }

  console.log(opts.dryRun ? '\nDry run complete — nothing written.' : '\nAll 4 files updated successfully.');
  if (!opts.dryRun && (opts.push || opts.ghRelease)) {
    console.log('Reminder: clear local plugin caches after release (memory: release-cache-clear).');
  }
}

module.exports = {
  isValidSemver, parseArgs, bumpJsonVersion, bumpReadmeBadge,
  insertChangelogEntry, formatGitLogNotes, buildReleaseCommands,
};

if (require.main === module) main();
