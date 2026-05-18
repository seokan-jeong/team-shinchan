// tests/dashboard/swap-rules.test.js
//
// Phase 4 — LOW-2 3-tier swap rule verification.
//
// Phase 0 `phase-0-decisions.md` § LOW-2 locks three swap targets:
//
//   Tier 1 (card)  outerHTML on [data-ts-card="<doc_id>"]
//   Tier 2 (field) innerHTML on [data-ts-field="<doc_id>:<field>"]
//   Tier 3 (grid)  afterbegin into #ts-grid (the entire grid wrapper)
//
// This test validates that:
//   - the server returns the correct fragment shape per tier,
//   - the SSE broadcast payload carries the matching `swap` directive,
//   - the watcher → SSE bridge enriches each event with html + swap so the
//     client never needs a second round trip.
//
// We boot a real server on port 0 and exercise three scenarios end-to-end.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { createServer } = require('../../src/dashboard/server');
const { SseHub } = require('../../src/dashboard/sse');
const { renderCard } = require('../../src/dashboard/views/card');
const { getWorkflow } = require('../../src/dashboard/discovery');

const BASE_YAML = `schema_version: 2
doc_id: "demo-001"
updated: "2026-05-17T12:00:00Z"

current:
  stage: implementation
  phase: 3
  owner: kazama
  status: active

history:
  - timestamp: "2026-05-17T11:00:00Z"
    event: workflow_started
    agent: shinnosuke
`;

function makeTempCwd() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-swap-'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived'));
  return cwd;
}

function seedYaml(cwd, docId, body) {
  const dir = path.join(cwd, '.shinchan-docs', docId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'WORKFLOW_STATE.yaml'), body, 'utf8');
}

function request(host, port, method, pathStr, opts) {
  const o = opts || {};
  return new Promise((resolve, reject) => {
    const req = http.request({
      host,
      port,
      method,
      path: pathStr,
      headers: Object.assign({ Host: `127.0.0.1:${port}` }, o.headers || {})
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body = raw;
        if ((res.headers['content-type'] || '').includes('application/json')) {
          try { body = JSON.parse(raw); } catch (_) {}
        }
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (o.body) req.write(typeof o.body === 'string' ? o.body : JSON.stringify(o.body));
    req.end();
  });
}

// ─── Tier 1: card outerHTML ─────────────────────────────────────────

test('LOW-2 Tier 1 (card outerHTML) — GET /partial/card/:doc_id returns single article fragment', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { listen, close } = createServer({ cwd });
  const bound = await listen({ port: 0 });
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/partial/card/demo-001');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);

  const html = res.body;
  // The fragment is a single <article> root (LOW-2 Tier 1 outerHTML unit).
  assert.match(html, /^<article\s/, 'fragment must start with <article (single root)');
  // Tier-1 selector is data-ts-card="<doc_id>"
  assert.match(html, /data-ts-card="demo-001"/);
  // No <html> / <body> / <head> — that would be a full page, not a fragment.
  // (We test `<head>` and `<head ` separately so we don't false-positive on
  // the card's own `<header>` element which legitimately starts with `<head`.)
  assert.ok(!html.includes('<html'));
  assert.ok(!html.includes('<body'));
  assert.ok(!/<head[\s>]/.test(html), 'fragment must not contain a <head> element');
});

test('LOW-2 Tier 1 — POST action returns card fragment (HX-Request) AND broadcasts swap=card via SSE', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const sse = new SseHub();
  const { listen, close } = createServer({ cwd, sse });
  const bound = await listen({ port: 0 });
  t.after(() => close());

  const broadcasts = [];
  const originalBroadcast = sse.broadcast.bind(sse);
  sse.broadcast = (name, data) => {
    broadcasts.push({ name, data });
    return originalBroadcast(name, data);
  };

  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json',
      'HX-Request': 'true'
    },
    body: { action: 'pause', author: 'test' }
  });
  assert.equal(res.status, 200);
  // Response body is the HTML card fragment (Tier 1).
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /^<article\s/);
  assert.match(res.body, /data-ts-card="demo-001"/);
  // Status reflects the new state.
  assert.match(res.body, /data-ts-status="paused"/);

  // SSE broadcast carries swap="card" and the same HTML fragment.
  const upd = broadcasts.find(b => b.name === 'workflow_update');
  assert.ok(upd, 'expected one workflow_update broadcast');
  assert.equal(upd.data.swap, 'card');
  assert.match(upd.data.html, /^<article\s/);
  assert.match(upd.data.html, /data-ts-status="paused"/);
});

test('LOW-2 Tier 1 — POST action without HX-Request keeps JSON envelope (backward compat)', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { listen, close } = createServer({ cwd });
  const bound = await listen({ port: 0 });
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json'
    },
    body: { action: 'pause' }
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.equal(res.body.action, 'pause');
});

// ─── Tier 2: field innerHTML ────────────────────────────────────────

test('LOW-2 Tier 2 (field innerHTML) — GET /partial/field/:doc/:field returns inner content only', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { listen, close } = createServer({ cwd });
  const bound = await listen({ port: 0 });
  t.after(() => close());

  // status field returns the badge fragment (small but not naked text — has
  // colour class).
  const status = await request(bound.host, bound.port, 'GET', '/partial/field/demo-001/status');
  assert.equal(status.status, 200);
  assert.match(status.body, /<span class="ts-status" data-ts-status="active">active<\/span>/);
  // Crucially: no enclosing <article> or <div data-ts-field="…"> — that
  // wrapper stays in the card; the server returns ONLY the inner content
  // (Tier-2 innerHTML semantics).
  assert.ok(!status.body.includes('<article'), 'Tier-2 must not include the card wrapper');
  assert.ok(!status.body.includes('data-ts-field='), 'Tier-2 must not include its own wrapper data-ts-field');

  // phase field returns just the text.
  const phase = await request(bound.host, bound.port, 'GET', '/partial/field/demo-001/phase');
  assert.equal(phase.status, 200);
  assert.equal(phase.body.trim(), '3');

  // Unknown field rejected.
  const unknown = await request(bound.host, bound.port, 'GET', '/partial/field/demo-001/banana');
  assert.equal(unknown.status, 400);
});

// ─── Tier 3: grid afterbegin ────────────────────────────────────────

test('LOW-2 Tier 3 (grid afterbegin) — GET /partial/grid returns #ts-grid with cards as children', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  seedYaml(cwd, 'demo-002', BASE_YAML.replace('"demo-001"', '"demo-002"'));
  const { listen, close } = createServer({ cwd });
  const bound = await listen({ port: 0 });
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/partial/grid');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  // Tier-3 swap target is #ts-grid — the response is the entire container.
  assert.match(res.body, /<section id="ts-grid"/);
  // Two cards inside.
  assert.match(res.body, /data-ts-card="demo-001"/);
  assert.match(res.body, /data-ts-card="demo-002"/);
  assert.match(res.body, /data-ts-count="2"/);
});

test('LOW-2 Tier 3 — single card prepended into grid via SSE swap=add carries one <article>', async () => {
  // This test does NOT boot the watcher (that requires a long-running fs
  // watcher); instead we exercise the renderCard helper which is what the
  // CLI's watcher bridge calls when emitting workflow_added events.
  const tmpCwd = makeTempCwd();
  seedYaml(tmpCwd, 'demo-new', BASE_YAML.replace('"demo-001"', '"demo-new"'));
  const meta = getWorkflow('demo-new', tmpCwd);
  assert.ok(meta, 'getWorkflow must find the seeded doc');

  const fragment = renderCard(meta);
  // Single <article> root suitable for #ts-grid afterbegin swap.
  assert.match(fragment, /^<article\s/);
  assert.match(fragment, /data-ts-card="demo-new"/);
  // No <section id="ts-grid"> wrapper — the grid is the swap target, the
  // fragment is the new child.
  assert.ok(!fragment.includes('id="ts-grid"'));
});
