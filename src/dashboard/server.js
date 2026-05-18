// src/dashboard/server.js
//
// Phase 3 + 4 — HTTP server using Node `http` built-in (NFR-6, zero deps).
//
// Routes:
//   GET  /                                 → full HTMX dashboard page (Phase 4)
//   GET  /health                           → JSON health check (testing convenience)
//   GET  /events                           → SSE stream
//   GET  /static/:filename                 → vendored HTMX + CSS (Phase 4)
//   GET  /partial/grid                     → grid fragment (Phase 4)
//   GET  /partial/card/:doc_id             → single card fragment (Phase 4)
//   GET  /partial/field/:doc_id/:field     → inline field fragment (Phase 4)
//   GET  /partial/files/:doc_id            → file list fragment (Phase 4)
//   GET  /partial/doc/:doc_id              → side-panel doc viewer (tabs + iframe, Phase 8.3)
//                                            optional ?file=NAME selects the active tab
//   GET  /partial/doc-empty                → empty-state for the side panel
//   GET  /api/workflows                    → list active + archived workflows
//   GET  /api/workflow/:doc_id             → single workflow detail
//   GET  /api/workflow/:doc_id/files       → enumerate files in a doc's folder
//   POST /api/workflow/:doc_id/action      → pause | resume | archive | note
//                                            Returns HTML card fragment when the
//                                            request carries `HX-Request: true`,
//                                            otherwise the legacy JSON envelope.
//   GET  /api/file?path=<encoded>          → file contents (constrained to .shinchan-docs/)
//
// Security (NFR-4 / R-4):
//   - Bind 127.0.0.1 only — never the wildcard / external interface.
//   - Reject requests whose `Host` header isn't a localhost form.
//   - Reject cross-origin POSTs unless `Origin` is a localhost form.
//   - Path-traversal protection: every file path is normalised and asserted
//     to live under .shinchan-docs/.
//   - SSE writes use the SseHub which serialises every payload via JSON.stringify.
//
// Port fallback (AC-14):
//   - 8765 → 8766 → 8767, then explicit error.
//   - Override via `TS_DASHBOARD_PORT` env var (single port, no fallback).
//
// Graceful shutdown:
//   - SIGTERM and SIGINT both call `.close()` and disconnect SSE subscribers.
//
// No external network. No external deps.

'use strict';

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const { SseHub } = require('./sse');
const { discoverActive, discoverArchived, getWorkflow, docsRoot } = require('./discovery');
const { renderIndex } = require('./views/index');
const { renderGrid } = require('./views/grid');
const { renderCard } = require('./views/card');
const { renderField, KNOWN_FIELDS } = require('./views/field');
const { renderFilesList } = require('./views/files');
const { renderDocPanel, renderDocPanelEmpty } = require('./views/doc-panel');
const { renderMarkdownToHtml } = require('./render-md');
const {
  renderMarkdownViewer,
  renderHtmlViewer,
  renderTextViewer
} = require('./views/file-viewer');
const { resolveMarkdownRenderMode } = require('./config');

const DEFAULT_PORTS = [8765, 8766, 8767];
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const ALLOWED_ACTIONS = new Set(['pause', 'resume', 'archive', 'note']);
const MAX_BODY_BYTES = 64 * 1024;        // 64 KB — sufficient for any dashboard action

// Static asset whitelist — every byte under src/dashboard/static/ is vendored
// HTMX or our own CSS / JS. The serve handler refuses any name not on this
// list to keep enumeration / accidental exposure to zero.
const STATIC_DIR = path.join(__dirname, 'static');
const STATIC_ALLOW = new Set([
  'htmx.min.js',
  'htmx-ext-sse.js',
  'style.css',
  'dashboard-events.js',
  'PROVENANCE.md'
]);

function pickStaticContentType(name) {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case '.js':  return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.md':  return 'text/markdown; charset=utf-8';
    case '.html': return 'text/html; charset=utf-8';
    default:     return 'application/octet-stream';
  }
}

// ──────────────────────────────────────────────────────────────────────
// Utilities

/**
 * Return true iff the `Host` header (or `Origin`) refers to a localhost form.
 */
function isLocalHost(value) {
  if (!value) return false;
  // Strip protocol if it's an Origin header
  const stripped = String(value).replace(/^https?:\/\//, '');
  // Strip path if present
  const [hostPort] = stripped.split('/');
  if (!hostPort) return false;
  // IPv6 literal `[::1]:8765`
  if (hostPort.startsWith('[')) {
    const closing = hostPort.indexOf(']');
    if (closing === -1) return false;
    const host = hostPort.slice(0, closing + 1);
    return LOCAL_HOSTS.has(host);
  }
  const host = hostPort.split(':')[0];
  return LOCAL_HOSTS.has(host);
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'self'",
    'Referrer-Policy': 'no-referrer'
  });
  res.end(payload);
}

function sendText(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    // CSP must be an HTTP response header — `<meta http-equiv>` is silently
    // ignored for `frame-ancestors` per the spec (clickjacking exposure).
    //
    // Phase 4 hardening:
    //   - `script-src 'self'`  — HTMX is served from /static/, no third party.
    //   - `style-src 'self' 'unsafe-inline'` — inline <style> in layout.js
    //     (sr-only fallback) is the only inline style we keep.
    //   - `connect-src 'self'` — SSE /events is same-origin only.
    //   - `img-src 'self' data:` — placeholder for future dashed icons; data:
    //     is allowed for SVG fallbacks. No remote images.
    //   - `frame-ancestors 'self'` — clickjacking defence (the dashboard
    //     cannot be embedded by any third-party page; same-origin framing
    //     stays allowed so Phase 8.3's master-detail iframe — which embeds
    //     /api/file?view=html inside the dashboard — can still load).
    //   - `base-uri 'none'`, `form-action 'self'` — anti-injection guardrails.
    //
    // Phase 5 hardening:
    //   - `frame-src 'self'` — the file-viewer embeds rendered markdown /
    //     HTML via iframe srcdoc; that frame document is technically same-
    //     origin (no URL), but Chromium still consults frame-src for srcdoc
    //     loading. `'self'` is the minimal grant. The combination of srcdoc
    //     + sandbox="allow-same-origin" (no allow-scripts) defangs the inline
    //     content even if it carries `<script>` tags.
    'Content-Security-Policy':
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-src 'self'; " +
      "frame-ancestors 'self'; " +
      "base-uri 'none'; " +
      "form-action 'self'",
    'Referrer-Policy': 'no-referrer'
  });
  res.end(body);
}

/**
 * Serve a vendored static asset (HTMX, CSS, dashboard-events.js).
 * Caches aggressively because contents are version-pinned (PROVENANCE.md
 * documents refresh procedure); long max-age means fast subsequent loads.
 * Path traversal already blocked because we only allow names in STATIC_ALLOW
 * and never join user-provided segments.
 */
async function serveStatic(res, filename) {
  if (!STATIC_ALLOW.has(filename)) {
    sendJson(res, 404, { error: 'static asset not found' });
    return;
  }
  const abs = path.join(STATIC_DIR, filename);
  let buf;
  try {
    buf = await fsp.readFile(abs);
  } catch (_) {
    sendJson(res, 404, { error: 'static asset missing on disk' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': pickStaticContentType(filename),
    'Content-Length': buf.length,
    'Cache-Control': 'public, max-age=86400, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(buf);
}

/**
 * Read at most `MAX_BODY_BYTES` from the request and JSON.parse it.
 * Resolves to `{ok:true, body}` or `{ok:false, status, message}`.
 */
function readJsonBody(req) {
  return new Promise(resolve => {
    let total = 0;
    const chunks = [];
    let resolved = false;
    const reject = (status, message) => {
      if (resolved) return;
      resolved = true;
      resolve({ ok: false, status, message });
    };
    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(413, 'request body too large');
        try { req.destroy(); } catch (_) {}
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (resolved) return;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw === '') {
        resolved = true;
        return resolve({ ok: true, body: {} });
      }
      try {
        const body = JSON.parse(raw);
        if (body === null || typeof body !== 'object' || Array.isArray(body)) {
          return reject(400, 'body must be a JSON object');
        }
        resolved = true;
        resolve({ ok: true, body });
      } catch (_) {
        reject(400, 'invalid JSON');
      }
    });
    req.on('error', () => reject(400, 'request error'));
  });
}

/**
 * Validate a doc_id: only allow `^[A-Za-z0-9_.-]{1,64}$` and forbid `..`.
 */
function validateDocId(docId) {
  if (typeof docId !== 'string') return false;
  if (docId.length === 0 || docId.length > 64) return false;
  if (docId.includes('..')) return false;
  return /^[A-Za-z0-9_.-]+$/.test(docId);
}

/**
 * Resolve a user-supplied path under the docs root, enforcing path traversal
 * protection. Returns `{ok:true, absolute}` or `{ok:false, status, message}`.
 */
function resolveDocsPath(rawPath, root) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    return { ok: false, status: 400, message: 'path required' };
  }
  // Strict reject of any sequence containing ".." or null byte.
  if (rawPath.includes('\0') || rawPath.includes('..')) {
    return { ok: false, status: 400, message: 'invalid path' };
  }
  // Reject absolute paths outright (we always anchor at docsRoot).
  if (path.isAbsolute(rawPath)) {
    return { ok: false, status: 400, message: 'absolute path forbidden' };
  }
  const normalised = path.normalize(rawPath).replace(/^[\\/]+/, '');
  const absolute = path.resolve(root, normalised);
  const rootResolved = path.resolve(root);
  if (absolute !== rootResolved && !absolute.startsWith(rootResolved + path.sep)) {
    return { ok: false, status: 400, message: 'path escapes docs root' };
  }
  return { ok: true, absolute };
}

// ──────────────────────────────────────────────────────────────────────
// File-content reader

const TEXT_EXTENSIONS = new Set(['.md', '.html', '.yaml', '.yml', '.json', '.txt', '.jsonl', '.log', '.tpl']);
const MAX_FILE_BYTES = 2 * 1024 * 1024;  // 2 MB

async function readFileSafely(absolute) {
  let stat;
  try {
    stat = await fsp.stat(absolute);
  } catch (_) {
    return { ok: false, status: 404, message: 'not found' };
  }
  if (!stat.isFile()) {
    return { ok: false, status: 400, message: 'not a regular file' };
  }
  if (stat.size > MAX_FILE_BYTES) {
    return { ok: false, status: 413, message: 'file too large' };
  }
  const ext = path.extname(absolute).toLowerCase();
  const isText = TEXT_EXTENSIONS.has(ext);
  const content = await fsp.readFile(absolute, isText ? 'utf8' : null);
  return {
    ok: true,
    isText,
    extension: ext,
    contentType: pickContentType(ext),
    size: stat.size,
    mtime: stat.mtime.toISOString(),
    content
  };
}

function pickContentType(ext) {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.yaml':
    case '.yml':  return 'text/yaml; charset=utf-8';
    case '.md':   return 'text/markdown; charset=utf-8';
    case '.jsonl': return 'application/x-ndjson; charset=utf-8';
    case '.tpl':  return 'text/plain; charset=utf-8';
    default:      return 'text/plain; charset=utf-8';
  }
}

// ──────────────────────────────────────────────────────────────────────
// Workflow action handler — edits WORKFLOW_STATE.yaml only

async function applyAction(docId, action, payload, root) {
  const yamlPath = path.join(root, docId, 'WORKFLOW_STATE.yaml');
  let raw;
  try {
    raw = await fsp.readFile(yamlPath, 'utf8');
  } catch (_) {
    return { ok: false, status: 404, message: 'workflow not found' };
  }
  const timestamp = new Date().toISOString();
  let updated = raw;

  // Bump `updated:` at the top.
  updated = updated.replace(/^updated:\s*.*$/m, `updated: "${timestamp}"`);

  // Mutate current.status if pause/resume/archive
  if (action === 'pause' || action === 'resume' || action === 'archive') {
    const targetStatus = action === 'pause' ? 'paused' :
                         action === 'resume' ? 'active' :
                         'archived';
    if (/(^|\n)( {2}status:\s*).*/.test(updated)) {
      updated = updated.replace(/(\n {2}status:\s*).*/, `$1${targetStatus}`);
    } else {
      // No status field; inject one under current:
      updated = updated.replace(/(\ncurrent:\n)/, `$1  status: ${targetStatus}\n`);
    }
  }

  // Append a history entry.
  const note = typeof payload.note === 'string' ? payload.note.replace(/"/g, '\\"').slice(0, 500) : null;
  const author = typeof payload.author === 'string' ? payload.author.slice(0, 80) : 'dashboard';
  const historyEntry =
    `  - timestamp: "${timestamp}"\n` +
    `    event: dashboard_action\n` +
    `    agent: ${author}\n` +
    `    action: ${action}\n` +
    (note ? `    note: "${note}"\n` : '');

  if (/(^|\n)history:\s*$/m.test(updated) || /(^|\n)history:\s*\n/.test(updated)) {
    // Existing history block — append at the end of the document.
    if (!updated.endsWith('\n')) updated += '\n';
    updated += historyEntry;
  } else {
    // No history yet — synthesise.
    if (!updated.endsWith('\n')) updated += '\n';
    updated += `history:\n${historyEntry}`;
  }

  // Atomic write: tempfile + rename. Keeps Claude session readers safe (LOW-1 S3).
  const tmp = yamlPath + '.tmp.' + process.pid + '.' + Date.now();
  try {
    await fsp.writeFile(tmp, updated, { encoding: 'utf8', mode: 0o644 });
    await fsp.rename(tmp, yamlPath);
  } catch (err) {
    try { await fsp.unlink(tmp); } catch (_) {}
    return { ok: false, status: 500, message: 'write failed: ' + err.message };
  }
  return { ok: true, timestamp, action };
}

// ──────────────────────────────────────────────────────────────────────
// Public factory

/**
 * Build (but do not start) a dashboard server.
 *
 * @param {object} opts
 * @param {string} [opts.cwd]                 — working directory (default: process.cwd())
 * @param {import('./sse').SseHub} [opts.sse] — pre-built SSE hub (otherwise one is created)
 * @returns {{ server: import('http').Server, sse: SseHub, listen: Function, close: Function }}
 */
function createServer(opts) {
  const cwd = (opts && opts.cwd) || process.cwd();
  const sse = (opts && opts.sse) || new SseHub();
  const root = docsRoot(cwd);

  const server = http.createServer(async (req, res) => {
    // ── Origin / Host whitelisting ────────────────────────────────────
    if (!isLocalHost(req.headers.host)) {
      sendJson(res, 400, { error: 'host not allowed' });
      return;
    }
    // Origin/Referer check for mutating methods.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const originHeader = req.headers.origin || req.headers.referer;
      if (originHeader && !isLocalHost(originHeader)) {
        sendJson(res, 403, { error: 'cross-origin not allowed' });
        return;
      }
    }
    // WHATWG URL API (Node 25+ deprecates legacy `url.parse` — DEP0169).
    // A dummy base is required because `req.url` is always a path, never absolute.
    const parsed = new URL(req.url, 'http://localhost');
    const pathname = parsed.pathname || '/';

    // HTMX uses these request headers to indicate "this is an XHR triggered
    // by HTMX, please return a HTML fragment instead of a JSON envelope".
    // We accept HX-Request because that's the canonical HTMX signal.
    const isHtmxRequest = String(req.headers['hx-request'] || '').toLowerCase() === 'true';

    // ── Routing ──────────────────────────────────────────────────────
    try {
      if (req.method === 'GET' && pathname === '/') {
        const active = discoverActive(cwd);
        const archived = discoverArchived(cwd);
        const html = renderIndex({ workflows: active, archived });
        return sendText(res, 200, html, 'text/html; charset=utf-8');
      }
      // Static assets — vendored HTMX + CSS. Strict whitelist applied in serveStatic.
      const staticMatch = pathname.match(/^\/static\/([A-Za-z0-9._-]+)$/);
      if (staticMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        return serveStatic(res, staticMatch[1]);
      }
      // Partial fragments — used by HTMX inline requests and SSE swap previews.
      if (req.method === 'GET' && pathname === '/partial/grid') {
        const active = discoverActive(cwd);
        return sendText(res, 200, renderGrid(active), 'text/html; charset=utf-8');
      }
      const cardPartial = pathname.match(/^\/partial\/card\/([^\/]+)$/);
      if (cardPartial && req.method === 'GET') {
        const docId = decodeURIComponent(cardPartial[1]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        return sendText(res, 200, renderCard(meta), 'text/html; charset=utf-8');
      }
      const fieldPartial = pathname.match(/^\/partial\/field\/([^\/]+)\/([^\/]+)$/);
      if (fieldPartial && req.method === 'GET') {
        const docId = decodeURIComponent(fieldPartial[1]);
        const field = decodeURIComponent(fieldPartial[2]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        if (!KNOWN_FIELDS.has(field)) return sendJson(res, 400, { error: 'unknown field', allowed: Array.from(KNOWN_FIELDS) });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        return sendText(res, 200, renderField(meta, field), 'text/html; charset=utf-8');
      }
      // Side panel — Phase 8.3 master-detail doc viewer.
      if (req.method === 'GET' && pathname === '/partial/doc-empty') {
        return sendText(res, 200, renderDocPanelEmpty(), 'text/html; charset=utf-8');
      }
      const docPanelPartial = pathname.match(/^\/partial\/doc\/([^\/]+)$/);
      if (docPanelPartial && req.method === 'GET') {
        const docId = decodeURIComponent(docPanelPartial[1]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        const docDir = meta.category === 'archived'
          ? path.join(root, 'archived', docId)
          : path.join(root, docId);
        let entries;
        try {
          entries = await fsp.readdir(docDir, { withFileTypes: true });
        } catch (_) {
          return sendText(res, 500,
            '<div class="ts-doc-empty"><p class="ts-doc-empty-hint">폴더를 읽을 수 없습니다.</p></div>',
            'text/html; charset=utf-8');
        }
        const files = [];
        for (const ent of entries) {
          if (!ent.isFile() || ent.name.startsWith('.')) continue;
          const abs = path.join(docDir, ent.name);
          let stat;
          try { stat = await fsp.stat(abs); } catch (_) { continue; }
          files.push({
            name: ent.name,
            extension: path.extname(ent.name).toLowerCase(),
            size: stat.size,
            rel_path: path.relative(root, abs)
          });
        }
        // Optional ?file=… selector — let the doc-panel renderer validate the
        // name against its whitelist (the matching file must exist in `files`).
        const activeName = parsed.searchParams.get('file') || '';
        const html = renderDocPanel({
          docId,
          category: meta.category,
          files,
          activeName
        });
        return sendText(res, 200, html, 'text/html; charset=utf-8');
      }

      const filesPartial = pathname.match(/^\/partial\/files\/([^\/]+)$/);
      if (filesPartial && req.method === 'GET') {
        const docId = decodeURIComponent(filesPartial[1]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        const docDir = meta.category === 'archived'
          ? path.join(root, 'archived', docId)
          : path.join(root, docId);
        let entries;
        try {
          entries = await fsp.readdir(docDir, { withFileTypes: true });
        } catch (_) {
          return sendText(res, 500, '<li class="ts-files-empty"><em>error reading folder</em></li>', 'text/html; charset=utf-8');
        }
        const list = [];
        for (const ent of entries) {
          if (!ent.isFile()) continue;
          if (ent.name.startsWith('.')) continue;
          const abs = path.join(docDir, ent.name);
          let stat;
          try { stat = await fsp.stat(abs); } catch (_) { continue; }
          list.push({
            name: ent.name,
            extension: path.extname(ent.name).toLowerCase(),
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            rel_path: path.relative(root, abs)
          });
        }
        return sendText(res, 200, renderFilesList(docId, list), 'text/html; charset=utf-8');
      }
      // Browsers auto-request /favicon.ico on every page load. Without a
      // handler the server returns 404 and the console fills with a benign
      // but noisy error. main-069 P6.2: serve a 204 No Content (no asset
      // shipped — keeps NFR-7 zero-new-asset guarantee intact).
      if (req.method === 'GET' && pathname === '/favicon.ico') {
        res.writeHead(204, {
          'Cache-Control': 'max-age=86400',
          'X-Content-Type-Options': 'nosniff'
        });
        return res.end();
      }
      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(res, 200, {
          ok: true,
          ts: new Date().toISOString(),
          subscribers: sse.size(),
          docs_root: root
        });
      }
      if (req.method === 'GET' && pathname === '/events') {
        sse.attach(res);
        return; // SSE handler keeps the response open.
      }
      if (req.method === 'GET' && pathname === '/api/workflows') {
        const active = discoverActive(cwd);
        const archived = discoverArchived(cwd);
        return sendJson(res, 200, {
          active,
          archived,
          count: { active: active.length, archived: archived.length },
          ts: new Date().toISOString()
        });
      }
      const single = pathname.match(/^\/api\/workflow\/([^\/]+)$/);
      if (single && req.method === 'GET') {
        const docId = decodeURIComponent(single[1]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        return sendJson(res, 200, meta);
      }
      const filesList = pathname.match(/^\/api\/workflow\/([^\/]+)\/files$/);
      if (filesList && req.method === 'GET') {
        const docId = decodeURIComponent(filesList[1]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        const docDir = meta.category === 'archived'
          ? path.join(root, 'archived', docId)
          : path.join(root, docId);
        let entries;
        try {
          entries = await fsp.readdir(docDir, { withFileTypes: true });
        } catch (_) {
          return sendJson(res, 500, { error: 'cannot read doc directory' });
        }
        const list = [];
        for (const ent of entries) {
          if (!ent.isFile()) continue;
          if (ent.name.startsWith('.')) continue;
          const abs = path.join(docDir, ent.name);
          let stat;
          try { stat = await fsp.stat(abs); } catch (_) { continue; }
          list.push({
            name: ent.name,
            extension: path.extname(ent.name).toLowerCase(),
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            rel_path: path.relative(root, abs)
          });
        }
        return sendJson(res, 200, { doc_id: docId, files: list });
      }
      const action = pathname.match(/^\/api\/workflow\/([^\/]+)\/action$/);
      if (action && req.method === 'POST') {
        const docId = decodeURIComponent(action[1]);
        if (!validateDocId(docId)) return sendJson(res, 400, { error: 'invalid doc_id' });
        const meta = getWorkflow(docId, cwd);
        if (!meta) return sendJson(res, 404, { error: 'not found' });
        if (meta.category !== 'active') {
          return sendJson(res, 409, { error: 'cannot modify archived workflow' });
        }
        const parsedBody = await readJsonBody(req);
        if (!parsedBody.ok) return sendJson(res, parsedBody.status, { error: parsedBody.message });
        const requestedAction = parsedBody.body.action;
        if (!ALLOWED_ACTIONS.has(requestedAction)) {
          return sendJson(res, 400, { error: 'unknown action', allowed: Array.from(ALLOWED_ACTIONS) });
        }
        const result = await applyAction(docId, requestedAction, parsedBody.body, root);
        if (!result.ok) return sendJson(res, result.status, { error: result.message });

        // Re-read the freshly-written WORKFLOW_STATE so we render the new card.
        const fresh = getWorkflow(docId, cwd);
        const cardHtml = fresh ? renderCard(fresh) : null;

        // Phase 4: broadcast the SSE update INCLUDING the rendered card HTML
        // so connected dashboards apply the LOW-2 Tier-1 (outerHTML) swap
        // without making a second round trip. Existing JSON consumers still
        // see action + ts; we just enrich the payload.
        try {
          sse.broadcast('workflow_update', {
            doc_id: docId,
            action: requestedAction,
            ts: result.timestamp,
            swap: cardHtml ? 'card' : undefined,
            html: cardHtml || undefined
          });
        } catch (_) {}

        // HTMX clients want the new card fragment back so they can outerHTML-
        // swap it directly (matches the Tier-1 rule). Non-HTMX clients keep
        // the existing JSON envelope for backward compatibility.
        if (isHtmxRequest && cardHtml) {
          return sendText(res, 200, cardHtml, 'text/html; charset=utf-8');
        }
        return sendJson(res, 200, result);
      }
      if (req.method === 'GET' && pathname === '/api/file') {
        const rawPath = parsed.searchParams.get('path') || '';
        // `view=raw` (or legacy `raw=1`) bypasses the viewer and returns the
        // legacy JSON envelope so existing programmatic consumers keep
        // working. `view=html` forces the viewer rendering even from a JSON
        // client.
        const viewParam = (parsed.searchParams.get('view') || '').toLowerCase();
        const rawParam = parsed.searchParams.get('raw');
        const wantRaw = viewParam === 'raw' || rawParam === '1';
        // HTMX clients automatically get HTML; explicit ?view=html also opts in;
        // everyone else (curl, scripts) gets the legacy JSON shape unless they
        // hit an .md or .html file with no override (in which case we render
        // a viewer fragment — Phase 5 AC-7a/AC-7b contract).
        const wantHtml = viewParam === 'html' || isHtmxRequest;

        const resolved = resolveDocsPath(rawPath, root);
        if (!resolved.ok) return sendJson(res, resolved.status, { error: resolved.message });
        const file = await readFileSafely(resolved.absolute);
        if (!file.ok) return sendJson(res, file.status, { error: file.message });

        // Derive the doc_id from the rel path's first segment (`main-068/REQUESTS.md`
        // → `main-068`, `archived/main-067/REQUESTS.md` → `main-067`). Used by
        // the viewer header.
        const segments = rawPath.split('/').filter(Boolean);
        const inferredDocId = segments[0] === 'archived' ? (segments[1] || '') : (segments[0] || '');

        // Binary: stream as octet-stream (rare for .shinchan-docs/).
        if (!file.isText) {
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': file.size,
            'Cache-Control': 'no-store'
          });
          return res.end(file.content);
        }

        // ?view=raw or ?raw=1 → legacy JSON envelope (back-compat).
        if (wantRaw || !wantHtml) {
          // .md and .html ALSO fall here unless the client opts into the
          // viewer via ?view=html or HX-Request. This preserves Phase 3
          // back-compat for `tests/dashboard/server.test.js`'s JSON contract.
          return sendJson(res, 200, {
            path: rawPath,
            extension: file.extension,
            size: file.size,
            mtime: file.mtime,
            content: file.content
          });
        }

        // ?view=html (or HTMX request) → viewer fragment.
        const mdResolved = resolveMarkdownRenderMode({ cwd });
        if (file.extension === '.md') {
          const rendered = renderMarkdownToHtml(file.content, { mode: mdResolved.mode });
          const html = renderMarkdownViewer({
            docId: inferredDocId,
            relPath: rawPath,
            html: rendered.html,
            mode: rendered.mode
          });
          return sendText(res, 200, html, 'text/html; charset=utf-8');
        }
        if (file.extension === '.html') {
          const html = renderHtmlViewer({
            docId: inferredDocId,
            relPath: rawPath,
            htmlBody: file.content
          });
          return sendText(res, 200, html, 'text/html; charset=utf-8');
        }
        // .yaml / .json / .txt / .jsonl / .log / .tpl → escape + <pre>.
        const html = renderTextViewer({
          docId: inferredDocId,
          relPath: rawPath,
          text: file.content,
          extension: file.extension
        });
        return sendText(res, 200, html, 'text/html; charset=utf-8');
      }
      // 404
      return sendJson(res, 404, { error: 'not found', path: pathname });
    } catch (err) {
      // Last-resort error wrapper — never crash the server.
      try {
        sendJson(res, 500, { error: 'internal error', message: err && err.message ? err.message : String(err) });
      } catch (_) {}
    }
  });

  // ── Listen with port fallback ─────────────────────────────────────
  async function listen(opts2) {
    const opts3 = opts2 || {};
    const envPort = process.env.TS_DASHBOARD_PORT
      ? Number(process.env.TS_DASHBOARD_PORT)
      : null;
    // Explicit port (including 0, which means "ask the OS for an ephemeral port")
    // wins over both the env var and the default fallback list.
    const candidates = (typeof opts3.port === 'number' && Number.isInteger(opts3.port) && opts3.port >= 0)
      ? [opts3.port]
      : envPort && Number.isInteger(envPort) && envPort > 0
        ? [envPort]
        : DEFAULT_PORTS.slice();
    const host = '127.0.0.1';
    let lastErr = null;
    for (const port of candidates) {
      try {
        await new Promise((resolve, reject) => {
          const onError = (err) => {
            server.removeListener('listening', onListening);
            reject(err);
          };
          const onListening = () => {
            server.removeListener('error', onError);
            resolve();
          };
          server.once('error', onError);
          server.once('listening', onListening);
          server.listen(port, host);
        });
        sse.start();
        const address = server.address();
        return { host, port: address && address.port ? address.port : port };
      } catch (err) {
        lastErr = err;
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          // Try next candidate.
          continue;
        }
        throw err;
      }
    }
    const list = candidates.join(', ');
    const err = new Error('All candidate ports in use: ' + list);
    err.cause = lastErr;
    throw err;
  }

  function close() {
    return new Promise(resolve => {
      sse.shutdown();
      try {
        server.close(() => resolve());
        // For lingering keepalive sockets in the test runner, force-close.
        setImmediate(() => {
          try { server.closeAllConnections && server.closeAllConnections(); } catch (_) {}
        });
      } catch (_) {
        resolve();
      }
    });
  }

  return { server, sse, listen, close };
}

module.exports = {
  createServer,
  DEFAULT_PORTS,
  // Exposed for unit tests.
  _internal: {
    isLocalHost,
    validateDocId,
    resolveDocsPath,
    readJsonBody,
    pickContentType,
    STATIC_ALLOW,
    pickStaticContentType
  }
};
