#!/usr/bin/env node
// src/dashboard/index.js
//
// Phase 3 — Dashboard CLI entry point.
//
// Wires the SSE hub, filesystem watcher, and HTTP server together.
// Run with:  `node src/dashboard/index.js`  or  `npm run dashboard`
//
// SIGTERM / SIGINT trigger a graceful shutdown.
// `TS_DASHBOARD_PORT` env var forces a specific port (otherwise: 8765 → 8766 → 8767).

'use strict';

const path = require('path');

const { createServer } = require('./server');
const { SseHub } = require('./sse');
const { DashboardWatcher } = require('./watcher');
const { docsRoot, getWorkflow } = require('./discovery');
const { renderCard } = require('./views/card');

async function main() {
  const cwd = process.cwd();
  const root = docsRoot(cwd);

  const sse = new SseHub();
  const { listen, close, server } = createServer({ cwd, sse });

  let bound;
  try {
    bound = await listen({});
  } catch (err) {
    console.error('[dashboard] failed to bind:', err.message);
    process.exitCode = 1;
    return;
  }
  console.log(`[dashboard] listening on http://${bound.host}:${bound.port}`);
  console.log(`[dashboard] docs root: ${root}`);

  // Watcher → SSE bridge.
  //
  // Phase 4 enrichment: each `workflow_update` and `workflow_added` event
  // carries a pre-rendered card HTML fragment plus a `swap` directive so the
  // dashboard client can apply the LOW-2 swap rules immediately, without a
  // second HTTP round trip to /partial/card/:id. `workflow_removed` carries
  // only the doc_id so the client deletes the element.
  const watcher = new DashboardWatcher({
    docsRoot: root,
    logger: { warn: (msg) => console.warn(msg) }
  });
  watcher.on('workflow_update', payload => {
    const docId = payload && payload.doc_id;
    const meta = docId ? getWorkflow(docId, cwd) : null;
    sse.broadcast('workflow_update', Object.assign({}, payload, meta ? {
      swap: 'card',
      html: renderCard(meta)
    } : {}));
  });
  watcher.on('workflow_added', payload => {
    const docId = payload && payload.doc_id;
    const meta = docId ? getWorkflow(docId, cwd) : null;
    sse.broadcast('workflow_added', Object.assign({}, payload, meta ? {
      swap: 'add',
      html: renderCard(meta)
    } : {}));
  });
  watcher.on('workflow_removed', payload => {
    const docId = payload && payload.doc_id;
    sse.broadcast('workflow_removed', Object.assign({}, payload, {
      swap: 'remove',
      doc_id: docId
    }));
  });
  watcher.on('tracker_event', payload => sse.broadcast('tracker_event', payload));
  watcher.start();

  const shutdown = async (signal) => {
    console.log(`[dashboard] ${signal} received; shutting down`);
    try { watcher.close(); } catch (_) {}
    try { await close(); } catch (_) {}
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only run when invoked directly (not when required by tests).
if (require.main === module) {
  main().catch(err => {
    console.error('[dashboard] fatal:', err);
    process.exitCode = 1;
  });
}

module.exports = { main };
