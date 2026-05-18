// tests/dashboard/integration.test.js
//
// Phase 4 — end-to-end dashboard integration.
//
// Boots the dashboard server on an ephemeral port and exercises:
//   - GET /                              full HTMX dashboard page
//   - GET /static/htmx.min.js            vendored asset (200 + JS content type)
//   - GET /static/style.css              vendored asset (200 + CSS content type)
//   - GET /static/PROVENANCE.md          documented provenance reachable
//   - GET /static/../etc/passwd          path traversal rejected (404)
//   - GET /static/random.js              unknown asset rejected (404)
//   - GET /partial/grid + card + field   HTML fragments with correct shape
//   - POST action with HX-Request        returns card HTML fragment
//   - SSE roundtrip                      action POST → SSE workflow_update
//                                         with swap=card + html payload
//   - XSS defence                        note containing <script> escaped in
//                                         the broadcast fragment
//   - CSP HTTP header on every HTML      script-src 'self' + frame-ancestors

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createServer } = require('../../src/dashboard/server');
const { SseHub } = require('../../src/dashboard/sse');

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
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-int-'));
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
      host, port, method, path: pathStr,
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
        resolve({ status: res.statusCode, body, headers: res.headers, raw });
      });
    });
    req.on('error', reject);
    if (o.body) req.write(typeof o.body === 'string' ? o.body : JSON.stringify(o.body));
    req.end();
  });
}

async function bootServer(cwd, sse) {
  const { listen, close, sse: hub } = createServer({ cwd, sse: sse || new SseHub() });
  const bound = await listen({ port: 0 });
  return { bound, close, sse: hub };
}

// ─── Page render ─────────────────────────────────────────────────────

test('integration: GET / serves a complete HTMX dashboard page with cards', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'main-068', BASE_YAML.replace('"demo-001"', '"main-068"'));
  seedYaml(cwd, 'demo-002', BASE_YAML.replace('"demo-001"', '"demo-002"'));
  seedYaml(cwd, 'demo-003', BASE_YAML.replace('"demo-001"', '"demo-003"'));
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);

  // AC-6c: data-doc-id appears at least 3 times.
  const matches = res.body.match(/data-doc-id="/g) || [];
  assert.ok(matches.length >= 3, `expected ≥3 data-doc-id occurrences, saw ${matches.length}`);

  // Each seeded doc rendered.
  assert.match(res.body, /data-ts-card="main-068"/);
  assert.match(res.body, /data-ts-card="demo-002"/);
  assert.match(res.body, /data-ts-card="demo-003"/);

  // CSP: HTTP header MUST carry script-src 'self' and frame-ancestors 'self'
  // (Phase 8.3 — 'self' allows the master-detail iframe to load same-origin
  // /api/file?view=html while third-party framing stays blocked).
  const csp = res.headers['content-security-policy'] || '';
  assert.match(csp, /frame-ancestors 'self'/);
  assert.doesNotMatch(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self'/);

  // HTMX wired from local /static.
  // ?v=<mtime> optional cache-bust added by layout.js
  assert.match(res.body, /<script src="\/static\/htmx\.min\.js(\?v=\d+)?"/);
  assert.match(res.body, /<script src="\/static\/htmx-ext-sse\.js(\?v=\d+)?"/);
  assert.match(res.body, /<script src="\/static\/dashboard-events\.js(\?v=\d+)?"/);

  // No external CDN references at all (NFR-4).
  assert.ok(!/<script[^>]+src=["']https?:\/\//i.test(res.body),
    'no external <script> origin allowed');
  assert.ok(!/<link[^>]+href=["']https?:\/\//i.test(res.body),
    'no external <link> origin allowed');
});

test('integration: GET / with zero workflows shows empty grid status', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.body, /data-ts-count="0"/);
  assert.match(res.body, /No active workflows found/);
});

// ─── Static assets ───────────────────────────────────────────────────

test('integration: GET /static/htmx.min.js serves vendored JS (200, application/javascript)', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/static/htmx.min.js');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/javascript/);
  // Sanity: file is non-trivial (HTMX is ~48 KB).
  assert.ok(res.raw.length > 10000, 'htmx.min.js looks truncated');
  // Aggressively cached (vendored + version-pinned).
  assert.match(res.headers['cache-control'], /max-age=\d+/);
});

test('integration: GET /static/style.css serves dashboard CSS', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/static/style.css');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/css/);
  assert.match(res.raw, /\.ts-card/, 'CSS missing required class');
});

test('integration: GET /static/dashboard-events.js serves the SSE router', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/static/dashboard-events.js');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/javascript/);
  assert.match(res.raw, /tsHandleSseMessage/);
});

test('integration: GET /static/htmx-ext-sse.js serves SSE extension', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/static/htmx-ext-sse.js');
  assert.equal(res.status, 200);
  assert.match(res.raw, /defineExtension\("sse"/);
});

test('integration: GET /static/unknown.js returns 404 (whitelist enforced)', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/static/unknown.js');
  assert.equal(res.status, 404);
});

test('integration: GET /static/ path traversal rejected', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  // Triple-encoded `..` should not survive the strict whitelist regex.
  const tries = [
    '/static/../server.js',
    '/static/..%2Fserver.js',
    '/static/%2E%2E%2Fserver.js',
    '/static/htmx.min.js/../server.js'
  ];
  for (const pathStr of tries) {
    const res = await request(bound.host, bound.port, 'GET', pathStr);
    assert.notEqual(res.status, 200, `path ${pathStr} must NOT return server.js`);
  }
});

// ─── Partial fragments ──────────────────────────────────────────────

test('integration: GET /partial/grid + card + field return the right HTML shape', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const grid = await request(bound.host, bound.port, 'GET', '/partial/grid');
  assert.equal(grid.status, 200);
  assert.match(grid.body, /<section id="ts-grid"/);

  const card = await request(bound.host, bound.port, 'GET', '/partial/card/demo-001');
  assert.equal(card.status, 200);
  assert.match(card.body, /^<article\s/);

  const field = await request(bound.host, bound.port, 'GET', '/partial/field/demo-001/status');
  assert.equal(field.status, 200);
  assert.match(field.body, /<span class="ts-status" data-ts-status="active">/);
});

test('integration: GET /partial/card with hostile doc_id rejected (400)', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  // %2E%2E = .. decoded server-side.
  const res = await request(bound.host, bound.port, 'GET', '/partial/card/..%2Fetc');
  assert.equal(res.status, 400);
});

test('integration: GET /partial/files/:doc_id lists workflow files as <li> elements', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  fs.writeFileSync(
    path.join(cwd, '.shinchan-docs', 'demo-001', 'REQUESTS.md'),
    '# requirements\n',
    'utf8'
  );
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/partial/files/demo-001');
  assert.equal(res.status, 200);
  // Phase 5: .md files now route through the iframe viewer (?view=html).
  // Earlier Phases linked without the suffix.
  assert.match(res.body, /href="\/api\/file\?path=demo-001%2FREQUESTS\.md&view=html"/);
});

// ─── Action POST + SSE ─────────────────────────────────────────────

test('integration: POST action with HX-Request returns card fragment + broadcasts SSE swap=card', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const sse = new SseHub();
  const { bound, close } = await bootServer(cwd, sse);
  t.after(() => close());

  const captured = [];
  const origBroadcast = sse.broadcast.bind(sse);
  sse.broadcast = (n, d) => { captured.push({ n, d }); return origBroadcast(n, d); };

  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json',
      'HX-Request': 'true'
    },
    body: { action: 'pause', author: 'user' }
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /^<article\s/);
  assert.match(res.body, /data-ts-status="paused"/);

  const upd = captured.find(x => x.n === 'workflow_update');
  assert.ok(upd, 'workflow_update was broadcast');
  assert.equal(upd.d.doc_id, 'demo-001');
  assert.equal(upd.d.action, 'pause');
  assert.equal(upd.d.swap, 'card', 'LOW-2 Tier-1 directive');
  assert.match(upd.d.html, /data-ts-card="demo-001"/);
});

test('integration: XSS — note containing <script> is escaped in card HTML fragment broadcast', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const sse = new SseHub();
  const { bound, close } = await bootServer(cwd, sse);
  t.after(() => close());

  const captured = [];
  const origBroadcast = sse.broadcast.bind(sse);
  sse.broadcast = (n, d) => { captured.push({ n, d }); return origBroadcast(n, d); };

  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json',
      'HX-Request': 'true'
    },
    body: { action: 'note', note: '<script>alert(1)</script>', author: 'attacker' }
  });
  assert.equal(res.status, 200);
  // Response body (the card HTML fragment) must NOT contain a live <script>.
  assert.ok(!res.body.includes('<script>alert(1)</script>'),
    'note must be escaped before re-rendering');
  // Escaped form is present.
  assert.match(res.body, /&lt;script&gt;alert\(1\)&lt;&#x2F;script&gt;/);

  // The SSE broadcast also carries the escaped fragment.
  const upd = captured.find(x => x.n === 'workflow_update');
  assert.ok(upd);
  assert.ok(!upd.d.html.includes('<script>alert(1)</script>'),
    'SSE fragment must be escaped');
});

test('integration: POST archive action transitions status and returns archived card with action toolbar reduced', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // First archive call still allowed (category is 'active' until the file is
  // actually moved, which is queued — Phase 5). The server flips status: archived
  // in the YAML and we re-read.
  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json',
      'HX-Request': 'true'
    },
    body: { action: 'archive' }
  });
  assert.equal(res.status, 200);
  assert.match(res.body, /data-ts-status="archived"/);
  // The folder isn't moved (Phase 5), but the doc's WORKFLOW_STATE status is.
  const after = fs.readFileSync(
    path.join(cwd, '.shinchan-docs', 'demo-001', 'WORKFLOW_STATE.yaml'),
    'utf8'
  );
  assert.match(after, /status: archived/);
});

// ─── Full SSE stream consumption ───────────────────────────────────

test('integration: SSE /events delivers workflow_update with swap=card after POST action', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const events = [];
  const sseDone = new Promise((resolve, reject) => {
    const req = http.request({
      host: bound.host, port: bound.port, method: 'GET', path: '/events',
      headers: { Host: `127.0.0.1:${bound.port}`, Accept: 'text/event-stream' }
    }, (res) => {
      let buf = '';
      res.on('data', chunk => {
        buf += chunk.toString('utf8');
        // Parse complete SSE frames separated by \n\n.
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const eventMatch = frame.match(/^event: (.+)$/m);
          const dataMatch = frame.match(/^data: (.+)$/m);
          if (eventMatch && dataMatch) {
            let parsed;
            try { parsed = JSON.parse(dataMatch[1]); } catch (_) { parsed = dataMatch[1]; }
            events.push({ event: eventMatch[1], data: parsed });
            // Resolve as soon as we see the workflow_update we triggered.
            if (eventMatch[1] === 'workflow_update' && parsed.doc_id === 'demo-001') {
              res.destroy();
              resolve();
            }
          }
        }
      });
      res.on('error', () => { /* ignore — destroyed intentionally */ });
    });
    req.on('error', reject);
    req.end();
    setTimeout(() => reject(new Error('SSE timeout after 3000ms')), 3000);
  });

  // Wait for the 'connected' event to arrive before triggering the action so
  // we don't race the subscription.
  await new Promise(resolve => setTimeout(resolve, 100));

  await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json'
    },
    body: { action: 'pause' }
  });

  await sseDone;
  const upd = events.find(e => e.event === 'workflow_update');
  assert.ok(upd, 'received workflow_update over SSE');
  assert.equal(upd.data.doc_id, 'demo-001');
  assert.equal(upd.data.action, 'pause');
  assert.equal(upd.data.swap, 'card');
  assert.match(upd.data.html, /^<article\s/);
  assert.match(upd.data.html, /data-ts-status="paused"/);
});

// ─── Negative tests ───────────────────────────────────────────────

test('integration: GET / on a docs root with archived workflows exposes count in page meta', async (t) => {
  // main-069 P6.1: the visible "N archived workflow(s) not shown." copy was
  // removed per user feedback (clutter). The archived count is still exposed
  // programmatically via the ts-page-meta JSON data island so callers /
  // assistive tooling can read it.
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived', 'old-001'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, '.shinchan-docs', 'archived', 'old-001', 'WORKFLOW_STATE.yaml'),
    BASE_YAML.replace('"demo-001"', '"old-001"'),
    'utf8'
  );
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/');
  assert.match(res.body, /"archived_count":1/);
  assert.ok(!/archived workflow.{0,4} not shown/.test(res.body),
    'no visible archived-note copy in rendered HTML after P6.1');
});

test('integration: GET /static method=HEAD honoured (200 body empty)', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'HEAD', '/static/style.css');
  assert.equal(res.status, 200);
});

// ── main-069 P6.2 — card click → iframe load regression ────────────────────
//
// Reproduces what the browser does when the user clicks a workflow card:
//   1. GET /                            → page rendered, contains a card with
//                                          hx-get="/partial/doc/<id>"
//   2. GET /partial/doc/<id>            → side panel HTML, contains an
//                                          <iframe src="/api/file?…&view=html">
//   3. GET /api/file?…&view=html        → viewer HTML, CSP must permit
//                                          same-origin framing (i.e.
//                                          frame-ancestors 'self', NOT 'none').
//
// Before the fix, step 3 returned `frame-ancestors 'none'`, which blocked
// the browser from rendering the iframe and surfaced as a card-click
// "불러오기 실패" via the htmx:swapError handler. This test pins the
// regression at the HTTP layer so any future CSP tightening is caught
// before it hits a browser.
test('integration: card click → doc panel → iframe load chain has compatible CSP (P6.2)', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  fs.writeFileSync(
    path.join(cwd, '.shinchan-docs', 'demo-001', 'REQUESTS.md'),
    '# Demo\n\nhello\n',
    'utf8'
  );
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // Step 1 — landing page exposes the card's hx-get endpoint.
  const landing = await request(bound.host, bound.port, 'GET', '/');
  assert.equal(landing.status, 200);
  const cardMatch = landing.body.match(/hx-get="(\/partial\/doc\/[^"]+)"/);
  assert.ok(cardMatch, 'card must expose hx-get="/partial/doc/..." for in-panel load');

  // Step 2 — panel fragment renders the iframe pointing at /api/file.
  const panel = await request(bound.host, bound.port, 'GET', cardMatch[1]);
  assert.equal(panel.status, 200);
  // src is attribute-escaped (& → &amp;, / → &#x2F;, = → &#x3D;).
  // Each path delimiter may be either literal `/` or `&#x2F;` depending on
  // escapeAttr's policy; allow both shapes.
  const slash = '(?:&#x2F;|\\/)';
  const iframeMatch = panel.body.match(
    new RegExp(`<iframe[^>]*src="(${slash}api${slash}file[^"]+)"`)
  );
  assert.ok(iframeMatch, 'panel must embed an iframe with src=/api/file...');
  const decodedSrc = iframeMatch[1]
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x3D;/g, '=');

  // Step 3 — fetching the iframe src must succeed AND advertise a CSP that
  // allows the dashboard (same origin) to frame it.
  const viewer = await request(bound.host, bound.port, 'GET', decodedSrc);
  assert.equal(viewer.status, 200);
  const csp = viewer.headers['content-security-policy'] || '';
  assert.match(csp, /frame-ancestors 'self'/,
    "viewer CSP must allow same-origin framing for the master-detail panel");
  assert.doesNotMatch(csp, /frame-ancestors 'none'/,
    "viewer CSP must NOT be 'none' — would silently break card click");
});
