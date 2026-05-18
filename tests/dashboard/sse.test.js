// tests/dashboard/sse.test.js
//
// Phase 3 — Unit tests for the SSE hub.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');

const { SseHub } = require('../../src/dashboard/sse');

// A minimal mock ServerResponse that records every chunk written.
function makeMockResponse() {
  const chunks = [];
  const headers = {};
  const listeners = {};
  let ended = false;
  const res = {
    writeHead: (status, hdrs) => {
      Object.assign(headers, hdrs || {});
      res._status = status;
    },
    write: (chunk) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
      return true;
    },
    end: () => { ended = true; },
    on: (event, fn) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    socket: { on: () => {} },
    _chunks: chunks,
    _headers: headers,
    _status: 0,
    _ended: () => ended,
    _emit: (event, ...args) => {
      for (const fn of listeners[event] || []) fn(...args);
    }
  };
  return res;
}

test('SseHub.attach sets text/event-stream headers and sends connected event', () => {
  const hub = new SseHub();
  const res = makeMockResponse();
  hub.attach(res);
  assert.equal(res._status, 200);
  assert.equal(res._headers['Content-Type'], 'text/event-stream');
  assert.equal(res._headers['Cache-Control'], 'no-cache, no-transform');
  assert.equal(hub.size(), 1);
  // First frame should be `connected`
  assert.ok(res._chunks.length >= 1);
  const firstFrame = res._chunks[0];
  assert.ok(firstFrame.startsWith('event: connected\n'), `first frame: ${firstFrame}`);
  assert.ok(firstFrame.includes('data: '));
  assert.ok(firstFrame.endsWith('\n\n'));
  hub.shutdown();
});

test('SseHub.broadcast emits properly framed events to all subscribers', () => {
  const hub = new SseHub();
  const a = makeMockResponse();
  const b = makeMockResponse();
  hub.attach(a);
  hub.attach(b);
  // Clear `connected` frames so we only see the broadcast.
  a._chunks.length = 0;
  b._chunks.length = 0;
  const delivered = hub.broadcast('workflow_update', { doc_id: 'main-068', phase: 3 });
  assert.equal(delivered, 2);
  for (const res of [a, b]) {
    assert.equal(res._chunks.length, 1);
    const frame = res._chunks[0];
    assert.match(frame, /^event: workflow_update\n/);
    assert.match(frame, /\ndata: \{"doc_id":"main-068","phase":3\}\n\n$/);
  }
  hub.shutdown();
});

test('SseHub.broadcast prunes dead subscribers on write failure', () => {
  const hub = new SseHub();
  const good = makeMockResponse();
  const goingDead = makeMockResponse();
  hub.attach(good);
  hub.attach(goingDead);
  assert.equal(hub.size(), 2);
  // Now the second subscriber's socket dies *between* attach and broadcast.
  goingDead.write = () => { throw new Error('socket closed'); };
  const delivered = hub.broadcast('test', { ok: true });
  assert.equal(delivered, 1);
  // Dead writer was auto-pruned during broadcast.
  assert.equal(hub.size(), 1);
  hub.shutdown();
});

test('SseHub disconnect listener removes the subscriber from the set', () => {
  const hub = new SseHub();
  const res = makeMockResponse();
  hub.attach(res);
  assert.equal(hub.size(), 1);
  res._emit('close');
  assert.equal(hub.size(), 0);
  hub.shutdown();
});

test('SseHub.broadcast rejects empty event names', () => {
  const hub = new SseHub();
  assert.throws(() => hub.broadcast('', {}));
  assert.throws(() => hub.broadcast(null, {}));
  hub.shutdown();
});

test('SseHub._serialiseFrame produces a frame with event/id/data ending in CRLF-equivalent', () => {
  const hub = new SseHub();
  const frame = hub._serialiseFrame('foo', { a: 1 }, 42);
  assert.equal(frame, 'event: foo\nid: 42\ndata: {"a":1}\n\n');
});
