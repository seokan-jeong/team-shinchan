// src/dashboard/watcher.js
//
// Phase 3 — Filesystem watcher + work-tracker.jsonl tail.
//
// Two concerns merged into a single module because they share the debouncer
// and the SSE hub:
//
//   1. Directory tree watch — `.shinchan-docs/` (recursive when available, with
//      `fs.watchFile` polling fallback for the recursive case on Linux).
//      The watcher detects WORKFLOW_STATE.yaml mutations (`workflow_update`)
//      and brand-new doc folders (`workflow_added`) as well as removals
//      (`workflow_removed`). Sub-second debouncing absorbs editor write-bursts.
//
//   2. JSONL tail — `.shinchan-docs/work-tracker.jsonl` is monitored by
//      incremental size deltas. New lines are parsed and re-broadcast as
//      `tracker_event` SSE messages. The tail handles file rotation
//      (rename + new file, LOW-1 S5) by reopening on inode change / shrink.
//
// LOW-1 scenarios (phase-0-decisions.md, NFR-7 Claude session isolation):
//   - S1 WORKFLOW_STATE concurrent write — readers always use fs.readFileSync
//     and tolerate parser failure (no partial state propagated).
//   - S2 hook + dashboard write — the watcher never WRITES; it only observes.
//   - S3 atomic rename — `fs.watch` fires for both temp-create and rename,
//     debouncer collapses them to a single event.
//   - S4 PID file stale — handled by server.js, not here.
//   - S5 jsonl rotation — tail reopens on inode change or size shrink.

'use strict';

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { discoverActive } = require('./discovery');

const DEFAULT_DEBOUNCE_MS = 200;
const TAIL_POLL_MS = 500;

class DashboardWatcher extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string} opts.docsRoot — absolute path to `.shinchan-docs/`.
   * @param {number} [opts.debounceMs] — debounce window in ms (default 200).
   * @param {object} [opts.logger] — optional logger with `.warn(msg)`.
   */
  constructor(opts) {
    super();
    if (!opts || typeof opts.docsRoot !== 'string') {
      throw new TypeError('DashboardWatcher requires { docsRoot: string }');
    }
    this.docsRoot = opts.docsRoot;
    this.debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.logger = opts.logger || { warn: () => {} };

    // Tree watcher
    this._fsWatcher = null;
    this._pollingWatchers = new Map();        // doc_id -> StatWatcher (fallback)
    this._knownDocs = new Set();              // set of doc_ids we've seen

    // Debounce buffers
    this._pendingDocChanges = new Map();      // doc_id -> Timer
    this._pendingNewScan = null;              // Timer for "new doc may exist" scan

    // JSONL tail
    this._trackerPath = path.join(this.docsRoot, 'work-tracker.jsonl');
    this._trackerOffset = 0;
    this._trackerInode = null;
    this._trackerTimer = null;
    this._trackerLeftover = '';

    this._stopped = false;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Public lifecycle

  start() {
    if (this._stopped) return;
    this._seedKnownDocs();
    this._startTreeWatch();
    this._startTrackerTail();
  }

  close() {
    if (this._stopped) return;
    this._stopped = true;
    if (this._fsWatcher) {
      try { this._fsWatcher.close(); } catch (_) {}
      this._fsWatcher = null;
    }
    for (const docId of this._pollingWatchers.keys()) {
      const watcher = this._pollingWatchers.get(docId);
      try { fs.unwatchFile(watcher.target); } catch (_) {}
    }
    this._pollingWatchers.clear();
    for (const timer of this._pendingDocChanges.values()) clearTimeout(timer);
    this._pendingDocChanges.clear();
    if (this._pendingNewScan) {
      clearTimeout(this._pendingNewScan);
      this._pendingNewScan = null;
    }
    if (this._trackerTimer) {
      clearInterval(this._trackerTimer);
      this._trackerTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Tree watching

  _seedKnownDocs() {
    let entries;
    try {
      entries = fs.readdirSync(this.docsRoot, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (ent.name === 'archived') continue;
      if (ent.name.startsWith('.')) continue;
      if (ent.name === 'ontology') continue;
      const yamlPath = path.join(this.docsRoot, ent.name, 'WORKFLOW_STATE.yaml');
      if (fs.existsSync(yamlPath)) this._knownDocs.add(ent.name);
    }
  }

  _startTreeWatch() {
    // First, try recursive fs.watch (macOS/Windows). On Linux this is supported
    // since Node 20, but if it throws ENOSYS we fall back to per-doc polling.
    let watcher = null;
    try {
      watcher = fs.watch(this.docsRoot, { recursive: true, persistent: true }, (eventType, filename) => {
        if (this._stopped) return;
        if (!filename) {
          // Some platforms don't report a filename; rescan defensively.
          this._scheduleNewScan();
          return;
        }
        this._handleFsEvent(filename);
      });
      watcher.on('error', (err) => {
        this.logger.warn(`[watcher] recursive fs.watch error: ${err.message}; switching to polling`);
        try { watcher.close(); } catch (_) {}
        this._fsWatcher = null;
        this._startPollingFallback();
      });
      this._fsWatcher = watcher;
      return;
    } catch (err) {
      this.logger.warn(`[watcher] recursive fs.watch unavailable (${err.code || err.message}); using polling`);
    }

    // Fallback: poll every known WORKFLOW_STATE.yaml using fs.watchFile, plus
    // periodically rescan the docs root for new doc folders.
    this._startPollingFallback();
  }

  _startPollingFallback() {
    // Add fs.watchFile for each currently-known doc.
    for (const docId of this._knownDocs) this._attachPolling(docId);
    // Periodic rescan for new doc folders (every 2s).
    const rescan = setInterval(() => {
      if (this._stopped) return;
      this._scheduleNewScan();
    }, 2000);
    if (typeof rescan.unref === 'function') rescan.unref();
    // Track for cleanup via the timer map.
    this._pollingWatchers.set('__rescan__', { target: '__rescan__', timer: rescan });
  }

  _attachPolling(docId) {
    const target = path.join(this.docsRoot, docId, 'WORKFLOW_STATE.yaml');
    if (this._pollingWatchers.has(docId)) return;
    const listener = (curr, prev) => {
      if (this._stopped) return;
      // mtime change OR size change OR new file (ino changed)
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size || curr.ino !== prev.ino) {
        if (curr.ino === 0 || !fs.existsSync(target)) {
          this._scheduleDocRemoved(docId);
        } else {
          this._scheduleDocChange(docId);
        }
      }
    };
    try {
      fs.watchFile(target, { interval: 1000 }, listener);
      this._pollingWatchers.set(docId, { target, listener });
    } catch (err) {
      this.logger.warn(`[watcher] fs.watchFile failed for ${target}: ${err.message}`);
    }
  }

  _handleFsEvent(filename) {
    // `filename` is relative to docsRoot. Examples:
    //   "main-068/WORKFLOW_STATE.yaml"
    //   "main-068/REQUESTS.html"
    //   "work-tracker.jsonl"
    //   "new-doc-123/" (when a directory is created)
    if (filename === path.basename(this._trackerPath)) {
      // Tracker handled separately by tail loop.
      return;
    }
    if (filename === 'archived' || filename.startsWith('archived' + path.sep)) {
      return;
    }
    const parts = filename.split(/[\/\\]/);
    const docId = parts[0];
    if (!docId || docId.startsWith('.')) return;
    if (docId === 'ontology') return;

    const yamlPath = path.join(this.docsRoot, docId, 'WORKFLOW_STATE.yaml');
    const exists = fs.existsSync(yamlPath);

    if (parts.length === 1) {
      // Directory create/delete at top level. Rescan with delay.
      this._scheduleNewScan();
      return;
    }

    if (parts[1] === 'WORKFLOW_STATE.yaml') {
      if (!exists) {
        this._scheduleDocRemoved(docId);
      } else if (!this._knownDocs.has(docId)) {
        this._knownDocs.add(docId);
        this._scheduleDocAdded(docId);
      } else {
        this._scheduleDocChange(docId);
      }
    }
    // Other files (REQUESTS.html, PLAN.md, ...) — also notify, so the dashboard
    // can refresh the cached file list. We piggy-back on `workflow_update`.
    else if (this._knownDocs.has(docId)) {
      this._scheduleDocChange(docId);
    }
  }

  _scheduleDocChange(docId) {
    const existing = this._pendingDocChanges.get(docId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this._pendingDocChanges.delete(docId);
      if (this._stopped) return;
      this.emit('workflow_update', { doc_id: docId });
    }, this.debounceMs);
    this._pendingDocChanges.set(docId, timer);
  }

  _scheduleDocAdded(docId) {
    // Don't merge with `_scheduleDocChange` because the listener kinds differ.
    setTimeout(() => {
      if (this._stopped) return;
      this.emit('workflow_added', { doc_id: docId });
      // Also attach polling fallback so the new doc is observed even if recursive
      // fs.watch missed sub-paths on some platforms.
      this._attachPolling(docId);
    }, this.debounceMs);
  }

  _scheduleDocRemoved(docId) {
    setTimeout(() => {
      if (this._stopped) return;
      if (!this._knownDocs.has(docId)) return;
      this._knownDocs.delete(docId);
      this.emit('workflow_removed', { doc_id: docId });
      const watcher = this._pollingWatchers.get(docId);
      if (watcher) {
        try { fs.unwatchFile(watcher.target); } catch (_) {}
        this._pollingWatchers.delete(docId);
      }
    }, this.debounceMs);
  }

  _scheduleNewScan() {
    if (this._pendingNewScan) return;
    this._pendingNewScan = setTimeout(() => {
      this._pendingNewScan = null;
      if (this._stopped) return;
      this._runRescan();
    }, this.debounceMs);
  }

  _runRescan() {
    const active = discoverActive(path.dirname(this.docsRoot));
    const seen = new Set(active.map(d => d.doc_id));
    for (const docId of seen) {
      if (!this._knownDocs.has(docId)) {
        this._knownDocs.add(docId);
        this.emit('workflow_added', { doc_id: docId });
        this._attachPolling(docId);
      }
    }
    for (const docId of Array.from(this._knownDocs)) {
      if (!seen.has(docId)) {
        this._knownDocs.delete(docId);
        this.emit('workflow_removed', { doc_id: docId });
        const watcher = this._pollingWatchers.get(docId);
        if (watcher) {
          try { fs.unwatchFile(watcher.target); } catch (_) {}
          this._pollingWatchers.delete(docId);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // work-tracker.jsonl tail

  _startTrackerTail() {
    this._reopenTracker(true);
    this._trackerTimer = setInterval(() => {
      if (this._stopped) return;
      this._pollTracker();
    }, TAIL_POLL_MS);
    if (typeof this._trackerTimer.unref === 'function') this._trackerTimer.unref();
  }

  _reopenTracker(seekToEnd) {
    try {
      const stat = fs.statSync(this._trackerPath);
      this._trackerInode = stat.ino;
      // Start from the END of the file on first open — the dashboard reports
      // only NEW activity, not history.
      this._trackerOffset = seekToEnd ? stat.size : 0;
      this._trackerLeftover = '';
    } catch (_) {
      this._trackerInode = null;
      this._trackerOffset = 0;
      this._trackerLeftover = '';
    }
  }

  _pollTracker() {
    let stat;
    try {
      stat = fs.statSync(this._trackerPath);
    } catch (_) {
      // File missing or rotated away — wait until it reappears.
      this._trackerInode = null;
      this._trackerOffset = 0;
      return;
    }
    // Detect rotation: inode changed OR file shrank.
    if (this._trackerInode !== null && stat.ino !== this._trackerInode) {
      this._reopenTracker(false);   // read the new file from the start
      stat = fs.statSync(this._trackerPath);
    } else if (stat.size < this._trackerOffset) {
      // Truncated.
      this._trackerOffset = 0;
    } else if (this._trackerInode === null) {
      // Fresh open mid-flight — read everything new.
      this._trackerInode = stat.ino;
    }
    if (stat.size <= this._trackerOffset) return;
    const fd = fs.openSync(this._trackerPath, 'r');
    try {
      const length = stat.size - this._trackerOffset;
      const buf = Buffer.alloc(length);
      const read = fs.readSync(fd, buf, 0, length, this._trackerOffset);
      this._trackerOffset += read;
      const text = this._trackerLeftover + buf.slice(0, read).toString('utf8');
      const lines = text.split('\n');
      // Last fragment may be partial (no trailing newline yet).
      this._trackerLeftover = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
        let evt;
        try {
          evt = JSON.parse(trimmed);
        } catch (_) {
          continue;
        }
        this.emit('tracker_event', evt);
      }
    } finally {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }
}

module.exports = { DashboardWatcher, DEFAULT_DEBOUNCE_MS, TAIL_POLL_MS };
