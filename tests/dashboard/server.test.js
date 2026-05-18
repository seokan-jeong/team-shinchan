// tests/dashboard/server.test.js
//
// Phase 3 — Server tests. Boots a real HTTP server bound to 127.0.0.1
// (using port 0 to avoid collisions) and exercises every endpoint plus
// the security checks: path traversal, host/origin enforcement, action
// guardrails.
//
// Tests for port fallback create a dummy server occupying 8765 and assert
// the dashboard chooses 8766. They are tagged inline.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const {
  createServer,
  _internal: { isLocalHost, validateDocId, resolveDocsPath }
} = require('../../src/dashboard/server');

function makeTempCwd() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-srv-'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived'));
  return cwd;
}

function seedYaml(cwd, docId, body, opts) {
  const o = opts || {};
  const dir = o.archived
    ? path.join(cwd, '.shinchan-docs', 'archived', docId)
    : path.join(cwd, '.shinchan-docs', docId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'WORKFLOW_STATE.yaml'), body, 'utf8');
}

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

// Helper: GET / POST returning {status, body, headers}.
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

// ── unit-level (no listening server) ─────────────────────────────────

test('isLocalHost accepts the canonical localhost forms', () => {
  assert.equal(isLocalHost('127.0.0.1'), true);
  assert.equal(isLocalHost('127.0.0.1:8765'), true);
  assert.equal(isLocalHost('localhost'), true);
  assert.equal(isLocalHost('localhost:8765'), true);
  assert.equal(isLocalHost('[::1]:8765'), true);
  assert.equal(isLocalHost('http://localhost:8765'), true);
  assert.equal(isLocalHost('http://127.0.0.1:8765/foo'), true);
});

test('isLocalHost rejects external interfaces', () => {
  assert.equal(isLocalHost('192.168.1.10'), false);
  assert.equal(isLocalHost('192.168.1.10:8765'), false);
  assert.equal(isLocalHost('example.com'), false);
  assert.equal(isLocalHost('http://example.com'), false);
  assert.equal(isLocalHost(''), false);
  assert.equal(isLocalHost(null), false);
});

test('validateDocId allows safe characters only', () => {
  assert.equal(validateDocId('main-068'), true);
  assert.equal(validateDocId('feature_001'), true);
  assert.equal(validateDocId('demo.v1'), true);
  // Rejections
  assert.equal(validateDocId(''), false);
  assert.equal(validateDocId('../etc'), false);
  assert.equal(validateDocId('a/b'), false);
  assert.equal(validateDocId('a\\b'), false);
  assert.equal(validateDocId('foo bar'), false);
  assert.equal(validateDocId('foo;DROP TABLE'), false);
});

test('resolveDocsPath blocks traversal & absolute paths', () => {
  const root = path.join(os.tmpdir(), 'docs-root');
  fs.mkdirSync(root, { recursive: true });
  assert.equal(resolveDocsPath('main-068/REQUESTS.html', root).ok, true);
  assert.equal(resolveDocsPath('../../etc/passwd', root).ok, false);
  assert.equal(resolveDocsPath('foo/../../../etc/passwd', root).ok, false);
  assert.equal(resolveDocsPath('/etc/passwd', root).ok, false);
  assert.equal(resolveDocsPath('main-068/file\0name.html', root).ok, false);
  assert.equal(resolveDocsPath('', root).ok, false);
});

// ── integration tests (real listening server) ────────────────────────

async function bootServer(cwd) {
  const { server, sse, listen, close } = createServer({ cwd });
  const bound = await listen({ port: 0 });
  return { server, sse, bound, close };
}

test('server returns 200 + JSON for /api/workflows', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  seedYaml(cwd, 'demo-002', BASE_YAML.replace('"demo-001"', '"demo-002"'));
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/api/workflows');
  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.body.active), true);
  assert.equal(res.body.active.length, 2);
  assert.equal(res.body.count.active, 2);
  // Security headers
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.headers['content-security-policy'] || '', /frame-ancestors 'self'/);
});

test('server returns workflow detail and 404 for unknown doc_id', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const ok = await request(bound.host, bound.port, 'GET', '/api/workflow/demo-001');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.doc_id, 'demo-001');
  assert.equal(ok.body.owner, 'kazama');

  const notFound = await request(bound.host, bound.port, 'GET', '/api/workflow/nope-999');
  assert.equal(notFound.status, 404);
});

test('GET /api/file rejects path traversal attempts', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // Legitimate access works
  const ok = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/WORKFLOW_STATE.yaml'));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.path, 'demo-001/WORKFLOW_STATE.yaml');
  assert.ok(typeof ok.body.content === 'string');

  // Traversal
  const evil1 = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('../../etc/passwd'));
  assert.equal(evil1.status, 400);
  const evil2 = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/../../../etc/passwd'));
  assert.equal(evil2.status, 400);
  const evil3 = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('/etc/passwd'));
  assert.equal(evil3.status, 400);
});

test('server rejects requests with non-localhost Host header (NFR-4)', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/api/workflows', {
    headers: { Host: 'example.com' }
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'host not allowed');
});

test('server rejects cross-origin POST (CSRF defence)', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: 'http://evil.com',
      'Content-Type': 'application/json'
    },
    body: { action: 'pause' }
  });
  assert.equal(res.status, 403);
});

test('POST /api/workflow/:doc/action updates WORKFLOW_STATE.yaml without touching the Claude session', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const yamlPath = path.join(cwd, '.shinchan-docs', 'demo-001', 'WORKFLOW_STATE.yaml');
  const before = fs.readFileSync(yamlPath, 'utf8');
  assert.match(before, /status: active/);

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: {
      Origin: `http://127.0.0.1:${bound.port}`,
      'Content-Type': 'application/json'
    },
    body: { action: 'pause', note: 'manual pause from dashboard', author: 'user' }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.action, 'pause');

  const after = fs.readFileSync(yamlPath, 'utf8');
  assert.match(after, /status: paused/);
  // History entry appended
  assert.match(after, /event: dashboard_action/);
  assert.match(after, /action: pause/);
  assert.match(after, /note: "manual pause from dashboard"/);
});

test('POST action rejects unknown action and invalid doc_id', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const r1 = await request(bound.host, bound.port, 'POST', '/api/workflow/demo-001/action', {
    headers: { Origin: `http://127.0.0.1:${bound.port}`, 'Content-Type': 'application/json' },
    body: { action: 'rm-rf' }
  });
  assert.equal(r1.status, 400);

  const r2 = await request(bound.host, bound.port, 'POST', '/api/workflow/..%2F..%2Fetc/action', {
    headers: { Origin: `http://127.0.0.1:${bound.port}`, 'Content-Type': 'application/json' },
    body: { action: 'pause' }
  });
  assert.equal(r2.status, 400);
});

test('server falls back from port 8765 to the next candidate when 8765 is occupied (AC-14)', async (t) => {
  const cwd = makeTempCwd();
  // Try to occupy 8765. If we cannot bind (port already in use by something
  // else), skip this test rather than fail.
  const blocker = http.createServer((_req, res) => res.end('busy'));
  let blockerListening = false;
  try {
    await new Promise((resolve, reject) => {
      const onError = (err) => { blocker.removeListener('listening', onListen); reject(err); };
      const onListen = () => { blocker.removeListener('error', onError); blockerListening = true; resolve(); };
      blocker.once('error', onError);
      blocker.once('listening', onListen);
      blocker.listen(8765, '127.0.0.1');
    });
  } catch (err) {
    t.skip(`cannot occupy 8765 (${err.code}); skipping fallback test`);
    return;
  }
  t.after(() => { if (blockerListening) blocker.close(); });

  // Boot the dashboard — should fall back to 8766 (or 8767).
  const { listen, close } = createServer({ cwd });
  t.after(() => close());
  let bound;
  try {
    bound = await listen({});
  } catch (err) {
    // 8766/8767 are also occupied by something else on the host.
    t.skip(`fallback ports also occupied: ${err.message}`);
    return;
  }
  assert.notEqual(bound.port, 8765);
  assert.ok([8766, 8767].includes(bound.port), `unexpected fallback port ${bound.port}`);
});

test('GET /events returns text/event-stream with a connected event', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const result = await new Promise((resolve, reject) => {
    const req = http.request({
      host: bound.host,
      port: bound.port,
      method: 'GET',
      path: '/events',
      headers: { Host: `127.0.0.1:${bound.port}`, Accept: 'text/event-stream' }
    }, (res) => {
      const chunks = [];
      res.on('data', c => {
        chunks.push(c.toString('utf8'));
        // As soon as we see the first frame, close and resolve.
        const all = chunks.join('');
        if (all.includes('event: connected\n')) {
          res.destroy();
          resolve({ status: res.statusCode, headers: res.headers, body: all });
        }
      });
      res.on('error', () => {/* ignore — we destroy intentionally */});
      res.on('close', () => {
        if (chunks.length === 0) reject(new Error('no SSE bytes received'));
      });
    });
    req.on('error', reject);
    req.end();
    setTimeout(() => reject(new Error('SSE handshake timeout')), 3000);
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers['content-type'], 'text/event-stream');
  assert.match(result.body, /event: connected\n/);
});

test('GET /health returns ok payload', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.ts, 'string');
});

test('GET / serves HTMX dashboard HTML with CSP frame-ancestors self HTTP header (Phase 4 / Phase 8.3)', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /Team-Shinchan Dashboard/);
  // CSP MUST be set as HTTP header (meta http-equiv is silently ignored for
  // frame-ancestors per W3C). The HTTP header carries frame-ancestors 'self'
  // (Phase 8.3 — was 'none' pre-master-detail; relaxed to 'self' so the same-
  // origin <iframe src="/api/file?view=html"> can load while third-party
  // framing stays blocked) plus script-src 'self'.
  const csp = res.headers['content-security-policy'] || '';
  assert.match(csp, /frame-ancestors 'self'/, 'CSP HTTP header missing frame-ancestors self');
  assert.doesNotMatch(csp, /frame-ancestors 'none'/, "frame-ancestors must NOT be 'none' — would break Phase 8.3 doc iframe");
  assert.match(csp, /script-src 'self'/, 'CSP HTTP header missing script-src self (AC-13b)');
  // Phase 4 page must wire HTMX from /static.
  assert.match(res.body, /<script src="\/static\/htmx\.min\.js(\?v=\d+)?"/);
  assert.match(res.body, /sse-connect="\/events"/);
});

// ── Phase 8.3 master-detail side panel routes ──────────────────────────

test('GET /partial/doc-empty returns the empty panel placeholder', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/partial/doc-empty');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /class="ts-doc-empty"/);
  assert.match(res.body, /문서 미선택/);
});

test('GET /partial/doc/:doc_id renders tabs + iframe for the workflow folder', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  // Seed two viewable files plus a non-viewable one (the latter must be
  // filtered out of the tab strip).
  fs.writeFileSync(path.join(cwd, '.shinchan-docs', 'demo-001', 'REQUESTS.md'),
    '# Requirements\n', 'utf8');
  fs.writeFileSync(path.join(cwd, '.shinchan-docs', 'demo-001', 'PLAN.md'),
    '# Plan\n', 'utf8');
  fs.writeFileSync(path.join(cwd, '.shinchan-docs', 'demo-001', 'logo.png'),
    'binary', 'utf8');

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/partial/doc/demo-001');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  // P6.4: doc_id is in the tablist aria-label + iframe title (moved out of
  // the chrome header band into the inner viewer overlay).
  assert.match(res.body, /aria-label="demo-001 문서"/);
  // Two viewable tabs.
  assert.match(res.body, /data-ts-tab="REQUESTS\.md"/);
  assert.match(res.body, /data-ts-tab="PLAN\.md"/);
  // logo.png is not viewable → no tab.
  assert.ok(!res.body.includes('logo.png'));
  // REQUESTS.md is the default tab.
  assert.match(res.body, /data-ts-tab="REQUESTS\.md"[^>]*aria-selected="true"/);
  // Iframe points at the file viewer (path is HTML-entity-escaped by escapeAttr).
  assert.ok(res.body.includes('demo-001%2FREQUESTS.md'),
    'iframe must reference REQUESTS.md');
  assert.match(res.body, /class="ts-doc-iframe"/);
  assert.match(res.body, /sandbox="allow-same-origin"/);
});

test('GET /partial/doc/:doc_id?file=NAME activates the requested tab', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-001', BASE_YAML);
  fs.writeFileSync(path.join(cwd, '.shinchan-docs', 'demo-001', 'REQUESTS.md'),
    '# R\n', 'utf8');
  fs.writeFileSync(path.join(cwd, '.shinchan-docs', 'demo-001', 'PLAN.md'),
    '# P\n', 'utf8');
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/partial/doc/demo-001?file=PLAN.md');
  assert.equal(res.status, 200);
  assert.match(res.body, /data-ts-tab="PLAN\.md"[^>]*aria-selected="true"/);
  assert.ok(res.body.includes('demo-001%2FPLAN.md'),
    'iframe must reference PLAN.md when activeName=PLAN.md');
});

test('GET /partial/doc/:doc_id works for archived workflows and shows the badge', async (t) => {
  const cwd = makeTempCwd();
  seedYaml(cwd, 'demo-old', BASE_YAML.replace('"demo-001"', '"demo-old"'), { archived: true });
  fs.writeFileSync(
    path.join(cwd, '.shinchan-docs', 'archived', 'demo-old', 'REQUESTS.md'),
    '# R\n', 'utf8'
  );
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET', '/partial/doc/demo-old');
  assert.equal(res.status, 200);
  // P6.4: doc_id moved from the panel chrome into the inner viewer overlay.
  // The outer panel surfaces it via the tablist aria-label and the iframe
  // title; the archived badge remains in the merged chrome strip on the right.
  assert.match(res.body, /aria-label="demo-old 문서"/);
  assert.match(res.body, /class="ts-doc-badge">archived</);
  // iframe path must be discovery-root-relative ("archived/demo-old/REQUESTS.md").
  assert.ok(res.body.includes('archived%2Fdemo-old%2FREQUESTS.md'),
    'archived iframe path must include archived/ prefix');
});

test('GET /partial/doc/:doc_id returns 404 for unknown doc_id', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  const res = await request(bound.host, bound.port, 'GET', '/partial/doc/no-such-doc');
  assert.equal(res.status, 404);
});

test('GET /partial/doc/:doc_id rejects unsafe doc_id characters', async (t) => {
  const cwd = makeTempCwd();
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());
  // validateDocId rejects anything outside [A-Za-z0-9._-]. The "~" is URL-safe
  // (no normalization by node:url) but invalid for doc_id — guards against
  // path-traversal / special-character injection.
  const res1 = await request(bound.host, bound.port, 'GET', '/partial/doc/bad~id');
  assert.equal(res1.status, 400);
  // URL-encoded "/" decodes to a slash, which validateDocId rejects.
  const res2 = await request(bound.host, bound.port, 'GET', '/partial/doc/foo%2Fbar');
  assert.equal(res2.status, 400);
});
