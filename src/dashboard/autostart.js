#!/usr/bin/env node
// src/dashboard/autostart.js
//
// Phase 1 (main-072) — Singleton autostart library for the dashboard server.
//
// Responsibilities (FR-1.2 / FR-1.3 / FR-1.4):
//   1. Look for an existing daemon via ~/.shinchan/dashboard.lock.
//      If alive (kill -0 OK) AND /health returns 200 → attach, no spawn,
//      no browser. (FR-1.2 attach path.)
//   2. Otherwise spawn `node src/dashboard/index.js` detached on port 8765
//      (FR-1.3 fixed port), write the lockfile, poll /health up to 3s, then
//      open the browser exactly once (FR-1.4 first-spawn-only).
//   3. Exit 0 unconditionally so a failure here cannot break the
//      SessionStart hook chain (NFR-1.5 hook isolation).
//
// Zero new npm deps (NFR-1.2): http / fs / os / path / child_process only.
//
// Library only — Phase 1 wires no hooks, no plugin.json, no package.json.

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCK_DIR = path.join(os.homedir(), '.shinchan');
const LOCK_FILE = path.join(LOCK_DIR, 'dashboard.lock');
const LOG_FILE = path.join(LOCK_DIR, 'dashboard.log');
const PROBE_HOST = '127.0.0.1';
const PROBE_PORT = 8765; // fixed per FR-1.3
const PROBE_PATH = '/health';
const PROBE_TIMEOUT_MS = 1000;
const SPAWN_PROBE_DEADLINE_MS = 3000; // FR-1.4 browser-open wait window

// ---------------------------------------------------------------------------
// Opt-out chain (FR-1.5) — env var ALWAYS wins, plugin setting fallback
// ---------------------------------------------------------------------------

/**
 * Two-axis opt-out per FR-1.5:
 *   1. Env var `TS_DASHBOARD_AUTOSTART` has ABSOLUTE priority (npm/git pattern).
 *      - `0` / `false` / `off` (case-insensitive) → disabled.
 *      - Any other defined value → enabled (skip the setting fallback).
 *      - Undefined → fall through to setting.
 *   2. Plugin setting `.claude-plugin/plugin.json#settings.dashboard_autostart`.
 *      - Explicit `false` → disabled.
 *      - `true` / missing / unreadable → enabled (fail open per FR-1.5).
 *
 * Default is enabled — single source of truth lives in `.claude-plugin/plugin.json`
 * (the `true` default ships there, not here). If the file is unreadable we fail
 * open so a corrupted plugin.json cannot silently disable the dashboard.
 *
 * Returns true when autostart should be SKIPPED (no spawn, no probe, no mkdir).
 */
function isAutostartDisabled() {
  // Env var has absolute priority (FR-1.5).
  const env = process.env.TS_DASHBOARD_AUTOSTART;
  if (env !== undefined) {
    const v = String(env).trim().toLowerCase();
    return v === '0' || v === 'false' || v === 'off';
  }
  // Fall back to plugin setting.
  try {
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..', '..');
    const cfgPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg && cfg.settings && cfg.settings.dashboard_autostart === false) return true;
  } catch (_) {
    // plugin.json unreadable / malformed → fail open (default enabled per FR-1.5).
  }
  return false;
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/**
 * Ensure `~/.shinchan/` exists with mode 0o700. Swallow EACCES/EPERM
 * (R-5 mitigation: ownership issues must not break the hook chain).
 * Returns true on success, false if we cannot use the dir.
 */
function ensureLockDir() {
  try {
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    return true;
  } catch (err) {
    if (err && (err.code === 'EACCES' || err.code === 'EPERM')) return false;
    // Other errors (e.g. EEXIST with a file at that path) — also bail
    // quietly; caller will exit 0.
    return false;
  }
}

/**
 * Read `~/.shinchan/dashboard.lock` and parse the two-field
 * `<pid> <port>` format. Returns `{ pid, port }` or null on
 * ENOENT / parse failure (HR-2 stale + corrupt lockfile tolerance).
 */
function readLockfile() {
  let raw;
  try {
    raw = fs.readFileSync(LOCK_FILE, 'utf8');
  } catch (err) {
    return null; // ENOENT or any read error
  }
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const pid = Number(parts[0]);
  const port = Number(parts[1]);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  if (!Number.isInteger(port) || port <= 0) return null;
  return { pid, port };
}

/**
 * `kill -0` style liveness probe. Returns true only when the signal
 * succeeds (process exists and we may signal it). R-2 fast-path: skip
 * the HTTP probe when this already fails.
 */
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_err) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HTTP probe
// ---------------------------------------------------------------------------

/**
 * Probe `GET http://127.0.0.1:<port>/health`. Resolves true only when
 * statusCode === 200 (FR-1.2 status-code-only, AK LOW L-3 applied at
 * verification time — this function itself is status-only). Never
 * throws; resolves false on any error, timeout, or non-200.
 *
 * Body is consumed via `res.resume()` to avoid socket leaks.
 */
function probeHealth(port) {
  return new Promise(resolve => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let req;
    try {
      req = http.get({
        host: PROBE_HOST,
        port,
        path: PROBE_PATH,
        timeout: PROBE_TIMEOUT_MS
      }, (res) => {
        const ok = res.statusCode === 200;
        res.resume(); // drain & free socket
        done(ok);
      });
    } catch (_err) {
      done(false);
      return;
    }

    req.on('error', () => done(false));
    req.on('timeout', () => {
      try { req.destroy(); } catch (_) {}
      done(false);
    });
  });
}

// ---------------------------------------------------------------------------
// Lockfile write — AK LOW L-2 applied
// ---------------------------------------------------------------------------

/**
 * Write `<pid> <port>\n` to the lockfile.
 *
 * AK LOW L-2 (applied): use `fs.openSync(LOCK_FILE, 'wx')` as the PRIMARY
 * race serializer. `wx` is `O_CREAT | O_EXCL`, which on POSIX is an
 * atomic kernel-level "create if and only if not present". Two
 * concurrent autostarts cannot both win this open.
 *
 * Fallback: if `wx` fails with EEXIST (another instance won the race),
 * we fall back to atomic-tmp + rename so that an in-flight overwrite by
 * the same owner (e.g. updating the pid after a stale-cleanup) still
 * lands intact rather than partially. This second path is the original
 * HR-1 mitigation; it is reached only when EEXIST happens.
 *
 * The hard race-loss case (someone else's live daemon already owns the
 * file) is ultimately backstopped by the dashboard server's own
 * EADDRINUSE handling in src/dashboard/server.js — duplicate spawn
 * cannot bind port 8765, so the child process exits and the singleton
 * invariant is preserved even if our lockfile write happens to win.
 *
 * Returns true when the write landed, false on unrecoverable error.
 */
function atomicWriteLockfile(pid, port) {
  const payload = `${pid} ${port}\n`;

  // Primary: O_CREAT | O_EXCL (AK LOW L-2)
  try {
    const fd = fs.openSync(LOCK_FILE, 'wx', 0o600);
    try {
      fs.writeSync(fd, payload);
    } finally {
      fs.closeSync(fd);
    }
    return true;
  } catch (err) {
    if (!err || err.code !== 'EEXIST') {
      return false; // EACCES / EPERM / ENOENT(dir gone) — bail
    }
    // EEXIST — fall through to atomic-rename overwrite path below.
  }

  // Fallback: atomic tmp + rename (original HR-1 mitigation).
  const tmp = `${LOCK_FILE}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tmp, payload, { mode: 0o600 });
    fs.renameSync(tmp, LOCK_FILE);
    return true;
  } catch (_err) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    return false;
  }
}

// ---------------------------------------------------------------------------
// Spawn dashboard server
// ---------------------------------------------------------------------------

/**
 * Spawn the dashboard server detached. Stdout/stderr append to
 * ~/.shinchan/dashboard.log (R-1). Caller is responsible for writing
 * the lockfile afterwards with the returned pid.
 *
 * HR-4: uses `process.execPath` so we invoke the exact Node binary the
 * hook itself is running under (no PATH lookup).
 *
 * Returns the child's pid, or null on spawn failure.
 */
function spawnDashboard() {
  let logFd;
  try {
    logFd = fs.openSync(LOG_FILE, 'a');
    // R-1: emit a startup marker so the log is greppable.
    fs.writeSync(
      logFd,
      `\n[autostart ${new Date().toISOString()}] spawning dashboard via ${process.execPath}\n`
    );
  } catch (_err) {
    // If we cannot even open the log file, fall back to /dev/null-style ignore.
    logFd = 'ignore';
  }

  const entry = path.join(__dirname, 'index.js');

  let child;
  try {
    child = spawn(process.execPath, [entry], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: Object.assign({}, process.env, { TS_DASHBOARD_PORT: String(PROBE_PORT) }),
      cwd: process.cwd()
    });
  } catch (_err) {
    if (typeof logFd === 'number') {
      try { fs.closeSync(logFd); } catch (_) {}
    }
    return null;
  }

  // Parent does not need to keep the log fd open after stdio inheritance.
  if (typeof logFd === 'number') {
    try { fs.closeSync(logFd); } catch (_) {}
  }

  try { child.unref(); } catch (_) {}
  return child.pid;
}

// ---------------------------------------------------------------------------
// Browser open — best-effort (HR-5)
// ---------------------------------------------------------------------------

/**
 * Best-effort browser open. Never throws — HR-5 says SSH / headless /
 * missing-tool failures must not crash autostart.
 */
function openBrowser(url) {
  let cmd;
  let args;

  if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    // `start ""` keeps an empty window title so `start <url>` doesn't
    // mis-parse the URL as the title.
    cmd = 'cmd';
    args = ['/c', 'start', '""', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => { /* HR-5: swallow ENOENT etc. */ });
    try { child.unref(); } catch (_) {}
  } catch (_err) {
    // HR-5: swallow everything
  }
}

// ---------------------------------------------------------------------------
// Logging (single funnel — never throws)
// ---------------------------------------------------------------------------

function appendLog(line) {
  try {
    fs.appendFileSync(
      LOG_FILE,
      `[autostart ${new Date().toISOString()}] ${line}\n`
    );
  } catch (_) {
    // Logging itself must never break hook isolation (NFR-1.5).
  }
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 200;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Orchestrate the attach-or-spawn decision. Always resolves; never
 * throws. Caller (require.main block) translates resolution to exit 0.
 */
async function main() {
  // FR-1.5 opt-out chain — env var > plugin setting > default-enabled.
  // MUST be the first statement: no mkdir, no probe, no spawn when disabled.
  // This guarantees AC-8 (lockfile absent when TS_DASHBOARD_AUTOSTART=0).
  if (isAutostartDisabled()) {
    const reason = process.env.TS_DASHBOARD_AUTOSTART !== undefined ? 'env' : 'setting';
    appendLog(`disabled by: ${reason}`);
    return { action: 'disabled', reason };
  }

  if (!ensureLockDir()) {
    // R-5: ~/.shinchan/ unusable. Cannot proceed; exit cleanly.
    return { action: 'noop', reason: 'lock_dir_unavailable' };
  }

  const existing = readLockfile();
  if (existing) {
    const alive = isPidAlive(existing.pid);
    if (alive) {
      const healthy = await probeHealth(existing.port);
      if (healthy) {
        // FR-1.2 attach path — no spawn, no browser.
        appendLog(`attached to pid=${existing.pid} port=${existing.port}`);
        return { action: 'attached', pid: existing.pid, port: existing.port };
      }
    }
    // Stale lockfile (HR-2 / HR-3): pid dead OR alive-but-unhealthy.
    try { fs.unlinkSync(LOCK_FILE); } catch (_) {}
    appendLog(`cleared stale lockfile (pid=${existing.pid}, alive=${alive})`);
  }

  // Spawn path — first time we own the singleton this session.
  const childPid = spawnDashboard();
  if (!childPid) {
    appendLog('spawn failed');
    return { action: 'spawn_failed' };
  }

  const wrote = atomicWriteLockfile(childPid, PROBE_PORT);
  if (!wrote) {
    appendLog(`lockfile write failed for pid=${childPid}`);
    // Don't kill the child — dashboard server will self-arbitrate via
    // EADDRINUSE if a real race happened.
  }

  // FR-1.4: poll /health and open browser on first success.
  const deadline = Date.now() + SPAWN_PROBE_DEADLINE_MS;
  while (Date.now() < deadline) {
    const ok = await probeHealth(PROBE_PORT);
    if (ok) {
      openBrowser(`http://${PROBE_HOST}:${PROBE_PORT}/`);
      appendLog(`spawned pid=${childPid} port=${PROBE_PORT}, browser opened`);
      return { action: 'spawned', pid: childPid, port: PROBE_PORT };
    }
    await delay(POLL_INTERVAL_MS);
  }

  // NFR-1.5: deadline exceeded is not a crash. Log and exit 0.
  appendLog(`spawn timeout — pid=${childPid} did not answer /health within ${SPAWN_PROBE_DEADLINE_MS}ms`);
  return { action: 'spawn_timeout', pid: childPid };
}

// ---------------------------------------------------------------------------
// Module footer
// ---------------------------------------------------------------------------

if (require.main === module) {
  main()
    .catch(err => {
      try {
        fs.appendFileSync(
          LOG_FILE,
          `[autostart ${new Date().toISOString()}] fatal: ${err && err.stack ? err.stack : err}\n`
        );
      } catch (_) {}
    })
    .then(() => {
      // NFR-1.5: exit 0 unconditionally. A failure here must not break
      // the SessionStart hook chain.
      process.exit(0);
    });
}

module.exports = {
  main,
  run: main,
  isAutostartDisabled,
  ensureLockDir,
  readLockfile,
  isPidAlive,
  probeHealth,
  atomicWriteLockfile,
  spawnDashboard,
  openBrowser
};
