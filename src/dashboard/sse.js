// src/dashboard/sse.js
//
// Phase 3 — Server-Sent Events broadcast hub.
//
// - Maintains a Set of connected ServerResponse subscribers.
// - `attach(res)` writes SSE-compliant headers, registers cleanup on close,
//   and sends an immediate `connected` event so the client knows it is live.
// - `broadcast(eventName, dataObject)` writes a properly framed SSE message
//   to every connected subscriber. Failed writes auto-prune the dead subscriber.
// - 15-second heartbeats keep the connection alive through NAT / proxies.
// - `shutdown()` gracefully ends every subscriber and stops the heartbeat.
//
// Event types emitted by the dashboard:
//   - `workflow_update`   — an existing workflow's WORKFLOW_STATE changed
//   - `workflow_added`    — a new doc_id directory appeared
//   - `workflow_removed`  — a doc folder was deleted/moved out
//   - `tracker_event`     — a new work-tracker.jsonl line was appended
//   - `heartbeat`         — keep-alive
//   - `connected`         — sent to a single subscriber on attach
//
// No external dependencies.

'use strict';

const HEARTBEAT_INTERVAL_MS = 15000;

class SseHub {
  constructor() {
    this.subscribers = new Set();
    this.heartbeatTimer = null;
    this._stopped = false;
    this._frameCount = 0;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Public API

  /**
   * Begin emitting heartbeats. Safe to call multiple times.
   */
  start() {
    if (this._stopped) return;
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('heartbeat', { ts: new Date().toISOString(), subscribers: this.subscribers.size });
    }, HEARTBEAT_INTERVAL_MS);
    if (typeof this.heartbeatTimer.unref === 'function') this.heartbeatTimer.unref();
  }

  /**
   * Attach a ServerResponse to the broadcast set.
   *
   * Writes SSE headers, sends a one-time `connected` event so the client
   * knows it is live, and arranges automatic cleanup on socket close.
   *
   * @param {import('http').ServerResponse} res
   */
  attach(res) {
    if (!res || typeof res.writeHead !== 'function') {
      throw new TypeError('SseHub.attach requires a ServerResponse');
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // CORS: allow the localhost-only browser tab; the server already enforces
      // that requests come from a localhost origin (see server.js).
      'X-Accel-Buffering': 'no'
    });

    this.subscribers.add(res);

    // Greet so the client knows the channel is live.
    this._writeFrame(res, 'connected', { ts: new Date().toISOString() });

    const onClose = () => {
      this.subscribers.delete(res);
    };
    res.on('close', onClose);
    res.on('error', onClose);
    if (res.socket && typeof res.socket.on === 'function') {
      res.socket.on('close', onClose);
    }
  }

  /**
   * Broadcast an event to every subscriber.
   *
   * @param {string} eventName
   * @param {unknown} dataObject — serialised with `JSON.stringify`.
   * @returns {number} count of subscribers that successfully received the frame.
   */
  broadcast(eventName, dataObject) {
    if (this._stopped) return 0;
    if (typeof eventName !== 'string' || eventName.length === 0) {
      throw new TypeError('eventName must be a non-empty string');
    }
    let delivered = 0;
    for (const res of this.subscribers) {
      if (this._writeFrame(res, eventName, dataObject)) delivered++;
    }
    return delivered;
  }

  /**
   * Gracefully close every subscriber and stop the heartbeat.
   */
  shutdown() {
    if (this._stopped) return;
    this._stopped = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const res of this.subscribers) {
      try {
        res.end();
      } catch (_) {
        /* ignore */
      }
    }
    this.subscribers.clear();
  }

  /**
   * Number of active subscribers (for tests / status endpoint).
   */
  size() {
    return this.subscribers.size;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Internal

  _writeFrame(res, eventName, dataObject) {
    let payload;
    try {
      payload = JSON.stringify(dataObject === undefined ? {} : dataObject);
    } catch (_) {
      payload = JSON.stringify({ error: 'serialise_failed' });
    }
    // Newlines inside payload would break SSE framing; encoded inside JSON anyway.
    const frame = `event: ${eventName}\nid: ${++this._frameCount}\ndata: ${payload}\n\n`;
    try {
      // res.write returns false on backpressure but we still consider it delivered.
      res.write(frame);
      return true;
    } catch (err) {
      // Dead writer — remove from set.
      this.subscribers.delete(res);
      return false;
    }
  }

  /**
   * Test helper: serialise a frame to its on-the-wire string without writing.
   * Exposed via `_serialiseFrame` for unit tests.
   */
  _serialiseFrame(eventName, dataObject, id) {
    let payload;
    try {
      payload = JSON.stringify(dataObject === undefined ? {} : dataObject);
    } catch (_) {
      payload = JSON.stringify({ error: 'serialise_failed' });
    }
    return `event: ${eventName}\nid: ${id ?? 0}\ndata: ${payload}\n\n`;
  }
}

module.exports = { SseHub, HEARTBEAT_INTERVAL_MS };
