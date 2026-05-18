// tests/dashboard/file-viewer.test.js
//
// Phase 5 — File viewer integration tests.
//
// Covers two layers:
//
//   1. Pure-function view layer (no server boot):
//        - renderMarkdownViewer / renderHtmlViewer / renderTextViewer
//          shape, sandbox attribute, srcdoc escaping.
//
//   2. End-to-end HTTP layer (boots dashboard, exercises /api/file):
//        - archived/*.md returns iframe-wrapped viewer with sandbox="…"
//        - HTML artifact returns iframe-wrapped viewer
//        - Text artifact returns escape+<pre> wrapper
//        - Path traversal regression (Phase 3/4 guard still active)
//        - Legacy JSON envelope still works (?raw=1 / no opt-in)
//        - CSP frame-src 'self' present in response

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const {
  renderMarkdownViewer,
  renderHtmlViewer,
  renderTextViewer
} = require('../../src/dashboard/views/file-viewer');
const { renderMarkdownToHtml } = require('../../src/dashboard/render-md');
const { createServer } = require('../../src/dashboard/server');

// ── helpers ──────────────────────────────────────────────────────────

function makeTempCwd() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-fv-'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs'));
  fs.mkdirSync(path.join(cwd, '.shinchan-docs', 'archived'));
  return cwd;
}

function seed(cwd, relPath, body) {
  const abs = path.join(cwd, '.shinchan-docs', relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body, 'utf8');
  return abs;
}

const BASE_YAML = `schema_version: 2
doc_id: "demo-001"
updated: "2026-05-17T12:00:00Z"

current:
  stage: implementation
  phase: 5
  owner: kazama
  status: active

history:
  - timestamp: "2026-05-17T11:00:00Z"
    event: workflow_started
    agent: shinnosuke
`;

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

async function bootServer(cwd) {
  const { listen, close } = createServer({ cwd });
  const bound = await listen({ port: 0 });
  return { bound, close };
}

// ── pure-function tests ──────────────────────────────────────────────

test('renderMarkdownViewer wraps in <article> + iframe sandbox attribute', () => {
  const rendered = renderMarkdownToHtml('# Hi', { mode: 'pre' });
  const out = renderMarkdownViewer({
    docId: 'main-067',
    relPath: 'archived/main-067/REQUESTS.md',
    html: rendered.html,
    mode: rendered.mode
  });
  assert.match(out, /<article class="ts-file-viewer"/);
  assert.match(out, /data-ts-file-viewer="markdown"/);
  // Iframe must carry sandbox attribute (defence-in-depth, R-4).
  assert.match(out, /<iframe[^>]*sandbox="allow-same-origin"/);
  // Must NOT include allow-scripts (no JS execution inside the frame).
  assert.ok(!/sandbox="[^"]*allow-scripts/.test(out), 'iframe must not allow scripts');
  // srcdoc must be present and the inner content visible in the attribute.
  assert.match(out, /srcdoc="/);
  assert.match(out, /referrerpolicy="no-referrer"/);
  // The header carries the doc_id link.
  assert.match(out, /main-067/);
});

test('renderMarkdownViewer marks the chosen mode in data-ts-md-mode', () => {
  const out1 = renderMarkdownViewer({ docId: 'd', relPath: 'd/x.md', html: '<x/>', mode: 'iframe' });
  assert.match(out1, /data-ts-md-mode="iframe"/);
  const out2 = renderMarkdownViewer({ docId: 'd', relPath: 'd/x.md', html: '<x/>', mode: 'pre' });
  assert.match(out2, /data-ts-md-mode="pre"/);
});

test('renderHtmlViewer wraps a full HTML doc in iframe srcdoc', () => {
  const body = '<!doctype html><html><body><article data-ts-kind="requirements"><h1>Hello</h1></article></body></html>';
  const out = renderHtmlViewer({
    docId: 'main-068',
    relPath: 'main-068/REQUESTS.html',
    htmlBody: body
  });
  assert.match(out, /data-ts-file-viewer="html"/);
  assert.match(out, /<iframe[^>]*sandbox="allow-same-origin"/);
  // srcdoc attribute receives the escaped doctype HTML.
  assert.match(out, /srcdoc="&lt;!doctype/);
});

test('renderHtmlViewer wraps a bare fragment too', () => {
  const body = '<article data-ts-kind="progress"><p>Just a fragment</p></article>';
  const out = renderHtmlViewer({
    docId: 'main-068',
    relPath: 'main-068/PROGRESS.html',
    htmlBody: body
  });
  // The fragment must be wrapped in our boilerplate srcdoc document.
  assert.match(out, /srcdoc="&lt;!doctype html/);
});

test('renderTextViewer uses <pre> + escapes content (no iframe)', () => {
  const out = renderTextViewer({
    docId: 'd',
    relPath: 'd/state.yaml',
    text: 'a: <script>alert(1)</script>\nb: 42',
    extension: '.yaml'
  });
  assert.match(out, /data-ts-file-viewer="text"/);
  assert.match(out, /data-ts-ext="\.yaml"/);
  assert.match(out, /<pre class="ts-file-viewer-text">/);
  // XSS escape — angle brackets must be escaped, no live <script>.
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(!/<script>alert/.test(out));
  // No iframe for text files (keeps payload light).
  assert.ok(!/<iframe/.test(out));
});

// ── HTTP integration tests ──────────────────────────────────────────

test('GET /api/file?view=html on archived/*.md returns iframe viewer with sandbox (AC-7a)', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  // Seed a legacy-style archived md (mirrors archived/main-067/REQUESTS.md).
  seed(cwd, 'archived/main-067/WORKFLOW_STATE.yaml', BASE_YAML.replace('demo-001', 'main-067'));
  const legacyMd = `# Legacy REQUESTS

## Section A

- Item 1
- Item 2

\`\`\`yaml
schema_version: 1
\`\`\`

[link](/safe)
`;
  seed(cwd, 'archived/main-067/REQUESTS.md', legacyMd);

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('archived/main-067/REQUESTS.md') + '&view=html');
  assert.equal(res.status, 200, 'expected 200 OK from viewer');
  assert.match(res.headers['content-type'] || '', /text\/html/);
  // Viewer shell.
  assert.match(res.body, /<article class="ts-file-viewer"/);
  assert.match(res.body, /data-ts-file-viewer="markdown"/);
  // iframe with sandbox.
  assert.match(res.body, /<iframe[^>]*sandbox="allow-same-origin"/);
  // Path traversal headers must still be set (regression guard).
  const csp = res.headers['content-security-policy'] || '';
  assert.match(csp, /frame-src 'self'/, 'CSP frame-src self missing');
  assert.match(csp, /frame-ancestors 'self'/, "frame-ancestors must allow same-origin embedding (Phase 8.3)");
  assert.doesNotMatch(csp, /frame-ancestors 'none'/, "frame-ancestors 'none' would block the dashboard's own doc iframe");
  // The outer <article> wrapper carries `data-ts-md-mode="iframe|pre"`
  // unconditionally so callers can identify which path was exercised without
  // peering into the iframe srcdoc (which is entity-encoded). The actual
  // `data-ts-md-render="iframe|pre"` from render-md.js DOES appear inside
  // the srcdoc but is `=` and `"` -encoded as `data-ts-md-render&#x3D;&quot;…&quot;`.
  // We assert the outer attribute is present (any of the two valid modes).
  const hasModeIframe = /data-ts-md-mode="iframe"/.test(res.body);
  const hasModePre = /data-ts-md-mode="pre"/.test(res.body);
  assert.ok(hasModeIframe || hasModePre, 'must emit data-ts-md-mode on outer wrapper');

  // Defence-in-depth: the inner render-md identifier must also be present
  // in escape-encoded form somewhere in the srcdoc — proves the render
  // function actually ran (defeats AC-7a trivial-pass per MEDIUM-2).
  const hasInnerEncoded = /data-ts-md-render&#x3D;&quot;(iframe|pre)&quot;/.test(res.body);
  assert.ok(hasInnerEncoded, 'render-md inner identifier must appear escape-encoded inside srcdoc');
});

test('GET /api/file?view=html on HTML artifact returns sandboxed iframe (AC-7b)', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  const html = `<!doctype html><html><body><article data-ts-kind="requirements"><h1>Title</h1></article></body></html>`;
  seed(cwd, 'demo-001/REQUESTS.html', html);

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/REQUESTS.html') + '&view=html');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'] || '', /text\/html/);
  assert.match(res.body, /data-ts-file-viewer="html"/);
  assert.match(res.body, /<iframe[^>]*sandbox="allow-same-origin"/);
  // No allow-scripts.
  assert.ok(!/sandbox="[^"]*allow-scripts/.test(res.body));
});

test('GET /api/file?view=html on yaml returns escape+<pre> viewer', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/WORKFLOW_STATE.yaml') + '&view=html');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'] || '', /text\/html/);
  assert.match(res.body, /data-ts-file-viewer="text"/);
  // No iframe for text files.
  assert.ok(!/<iframe/.test(res.body));
});

test('legacy JSON envelope still works without view=html opt-in (Phase 3 back-compat)', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  // Default (no view= and no HX-Request) → JSON envelope.
  const r1 = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/WORKFLOW_STATE.yaml'));
  assert.equal(r1.status, 200);
  assert.equal(typeof r1.body, 'object', 'body should be JSON');
  assert.equal(r1.body.path, 'demo-001/WORKFLOW_STATE.yaml');
  assert.equal(typeof r1.body.content, 'string');

  // Explicit raw=1 also returns JSON (legacy override).
  const r2 = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/WORKFLOW_STATE.yaml') + '&raw=1');
  assert.equal(r2.status, 200);
  assert.equal(typeof r2.body, 'object');
});

test('path traversal still blocked on /api/file?view=html (regression guard)', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const evil = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('../../etc/passwd') + '&view=html');
  assert.equal(evil.status, 400);
});

test('archived markdown XSS payload is contained: no live tags reach the response', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  seed(cwd, 'archived/main-evil/WORKFLOW_STATE.yaml', BASE_YAML.replace('demo-001', 'main-evil'));
  const malicious = `# Header

<script>alert('pwned')</script>

<img src=x onerror="alert('x')">

inline \`<script>\` and **bold**.
`;
  seed(cwd, 'archived/main-evil/REQUESTS.md', malicious);

  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('archived/main-evil/REQUESTS.md') + '&view=html');
  assert.equal(res.status, 200);

  // The viewer wraps content in iframe srcdoc; srcdoc is escaped at
  // attribute boundary. The raw `<script>` from the markdown source must
  // be escaped at least once (either by markdown-it html:false → &lt; or
  // by escape.js → &lt;).
  //
  // Top-level response body must not contain a live <script> tag *outside*
  // the srcdoc attribute. Because srcdoc has the script tag escaped to
  // &lt;script&gt;, we can simply assert no raw `<script>` exists.
  assert.ok(!/<script>alert\('pwned'\)<\/script>/.test(res.body),
    'live <script> from archived MD must not appear in top-level response');
  // The iframe must be sandboxed without allow-scripts as defence in depth.
  assert.match(res.body, /<iframe[^>]*sandbox="allow-same-origin"/);
  assert.ok(!/sandbox="[^"]*allow-scripts/.test(res.body), 'no allow-scripts');
});

test('viewer responds with CSP that includes frame-src self and frame-ancestors self (Phase 8.3)', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  seed(cwd, 'demo-001/REQUESTS.md', '# hi\n');
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/REQUESTS.md') + '&view=html');
  assert.equal(res.status, 200);
  const csp = res.headers['content-security-policy'] || '';
  assert.match(csp, /frame-src 'self'/);
  // Phase 8.3 master-detail panel embeds /api/file?view=html in a same-origin
  // iframe. frame-ancestors must allow 'self' (and explicitly NOT 'none', which
  // would block even the dashboard's own iframe and surface as a card-click
  // "불러오기 실패" error).
  assert.match(csp, /frame-ancestors 'self'/);
  assert.doesNotMatch(csp, /frame-ancestors 'none'/);
  // Existing Phase 4 directives must still be present (regression).
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /default-src 'self'/);
});

test('HX-Request header auto-opts into viewer mode for .md files', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  seed(cwd, 'demo-001/REQUESTS.md', '# HX path\n');
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/REQUESTS.md'), {
    headers: { 'HX-Request': 'true' }
  });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'] || '', /text\/html/);
  assert.match(res.body, /data-ts-file-viewer="markdown"/);
});

test('large markdown (50 KB) renders without truncation', async (t) => {
  const cwd = makeTempCwd();
  seed(cwd, 'demo-001/WORKFLOW_STATE.yaml', BASE_YAML);
  const big = '# Header\n\n' + 'lorem ipsum dolor sit amet '.repeat(2000) + '\n\nfooter';
  seed(cwd, 'demo-001/BIG.md', big);
  const { bound, close } = await bootServer(cwd);
  t.after(() => close());

  const res = await request(bound.host, bound.port, 'GET',
    '/api/file?path=' + encodeURIComponent('demo-001/BIG.md') + '&view=html');
  assert.equal(res.status, 200);
  // Body must include the footer marker, proving the full content was processed.
  assert.ok(res.body.includes('footer'), 'large content was truncated');
});
