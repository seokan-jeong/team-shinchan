// src/dashboard/views/layout.js
//
// Phase 4 — base HTML document wrapper.
//
// Wraps the full-page render with:
//   - doctype + lang + viewport meta
//   - vendored HTMX + SSE extension <script src="/static/...">
//   - vendored style.css <link>
//   - hx-ext="sse" sse-connect="/events" on a wrapper that hosts the grid
//   - sr-only class for the screen-reader-only heading
//   - small inline status-bar script to flip data-ts-conn between
//     "connected" | "lost" so users see SSE health
//
// CSP (set as HTTP header in server.js sendText()):
//   default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self';
//   img-src 'self' data:; frame-ancestors 'none'; connect-src 'self'
//
// The only inline script is the connection indicator updater; HTMX itself is
// loaded from /static/ so we do NOT need 'unsafe-inline' for scripts.

'use strict';

const fs = require('fs');
const path = require('path');
const { escapeHtml, stringifyJsonForScript } = require('./escape');

const STATIC_DIR = path.join(__dirname, '..', 'static');

/**
 * Compute a short cache-busting token for a vendored static file using its
 * mtime in ms. The server sets `Cache-Control: max-age=86400, immutable` on
 * /static/* (good for prod-style caching), but during iteration this would
 * pin browsers to a stale CSS for 24h. Appending `?v=<mtimeMs>` flips the
 * URL whenever the file changes, defeating the cache for that one revision
 * while still letting the browser cache unchanged files indefinitely.
 *
 * Errors (file missing, permission, race) fall back to `1` so the page
 * still renders rather than 500-ing on a cold cache miss.
 */
function assetVersion(filename) {
  try {
    return String(fs.statSync(path.join(STATIC_DIR, filename)).mtimeMs | 0);
  } catch {
    return '1';
  }
}

/**
 * Render the entire HTML document.
 *
 * @param {object} args
 * @param {string} args.title — document title (escaped).
 * @param {string} args.body  — already-escaped HTML body fragment.
 * @param {object} [args.frontmatter] — optional metadata embedded as JSON.
 * @returns {string} complete HTML document.
 */
function renderLayout(args) {
  const title = escapeHtml(args.title || 'Team-Shinchan Dashboard');
  const body = args.body || '';
  const frontmatter = args.frontmatter
    ? `<script type="application/json" id="ts-page-meta">${stringifyJsonForScript(args.frontmatter)}</script>`
    : '';

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <!--
    NOTE: Content-Security-Policy is set via HTTP response header in server.js
    (sendText). A meta http-equiv="Content-Security-Policy" would be silently
    ignored for the frame-ancestors directive per the W3C spec (clickjacking
    would slip through). Do not regress.
  -->
  <link rel="stylesheet" href="/static/style.css?v=${assetVersion('style.css')}">
  <script src="/static/htmx.min.js?v=${assetVersion('htmx.min.js')}" defer></script>
  <script src="/static/htmx-ext-sse.js?v=${assetVersion('htmx-ext-sse.js')}" defer></script>
  ${frontmatter}
  <style>
    /* Inline minimal sr-only fallback; full styles live in /static/style.css.
       We keep this here so even if /static fails to load (rare), screen reader
       users still get correct semantics. */
    .ts-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }
  </style>
</head>
<body hx-ext="sse" sse-connect="/events" hx-headers='{"X-TS-Dashboard":"1"}'>
  <div class="ts-shell">
    <header class="ts-topbar">
      <div class="ts-brand">
        <span class="ts-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ts-mark-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#8b95ff"/>
                <stop offset="0.55" stop-color="#5e6ad2"/>
                <stop offset="1" stop-color="#3d4aa6"/>
              </linearGradient>
              <linearGradient id="ts-mark-glow" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="rgba(255,255,255,0.55)"/>
                <stop offset="0.4" stop-color="rgba(255,255,255,0)"/>
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#ts-mark-grad)"/>
            <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#ts-mark-glow)" opacity="0.85"/>
            <path d="M11 12.5c0-1.66 1.34-3 3-3h4a3 3 0 0 1 3 3v0a1.5 1.5 0 0 1-1.5 1.5h-5a3 3 0 0 0-3 3v0a1.5 1.5 0 0 0 1.5 1.5h5a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <div class="ts-brand-text">
          <h1 class="ts-brand-name">Shinchan</h1>
          <span class="ts-brand-meta">workflow dashboard</span>
        </div>
      </div>
      <div class="ts-meta">
        <span class="ts-last-update" id="ts-last-update" aria-live="polite" title="마지막 업데이트 시각"></span>
        <span class="ts-conn-chip" data-ts-conn="connecting" id="ts-conn" aria-live="polite">
          <span class="ts-conn-dot" aria-hidden="true"></span>
          <span class="ts-sr-only">SSE connection:</span>
          <span data-ts-conn-label class="ts-conn-text">connecting</span>
        </span>
      </div>
    </header>

    <main id="ts-main"
          sse-swap="workflow_update"
          hx-swap="none">${body}</main>
  </div>

  <!--
    Inline event router. CSP allows self scripts (HTMX) but blocks remote
    inline scripts; this small block hooks HTMX SSE events to update the
    connection indicator and to apply LOW-2 swap rules per server-pushed
    event type. Server pushes a swap field inside the JSON event payload.
    See views/grid.js / card.js / field.js for fragment shapes.
  -->
  <script src="/static/dashboard-events.js?v=${assetVersion('dashboard-events.js')}" defer></script>
</body>
</html>
`;
}

module.exports = { renderLayout };
