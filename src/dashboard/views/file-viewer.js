// src/dashboard/views/file-viewer.js
//
// Phase 5 / main-069 P6.3 — File viewer wrapper.
//
// Renders archived/auth-time markdown, runtime HTML, or plain text inside a
// sandboxed iframe (markdown / html paths) or an inert <pre> (text path),
// wrapped in a *chromeless* shell: no header band, no footer band, just two
// floating glass chips overlaid on the content surface (breadcrumb pill +
// action menu). This matches the Apple HIG / Liquid Glass direction in main-
// 069 REQUESTS — the document is the surface, the chrome is ambient.
//
// Sandbox flags (markdown + html paths)
//   `sandbox="allow-same-origin"` — drops scripts, forms, top-nav, popups;
//   keeps same-origin so the iframe can resolve relative URLs for assets and
//   inherit the parent CSP (frame-src 'self' is already in place from P6.2).
//
// CSP / iframe interaction
//   Parent sets `frame-ancestors 'self'` (P6.2) so the dashboard can embed
//   /api/file?view=html. The inner srcdoc inherits no CSP HTTP headers (it is
//   constructed in-memory) so the sandbox attribute is the sole containment;
//   srcdoc contents themselves only execute as inert HTML+CSS.
//
// API (unchanged):
//   renderMarkdownViewer({ docId, relPath, html, mode })
//   renderHtmlViewer({ docId, relPath, htmlBody })
//   renderTextViewer({ docId, relPath, text, extension })

'use strict';

const { escapeHtml, escapeAttr } = require('./escape');

/**
 * Inner srcdoc document — the page the user actually reads. Typography is
 * tuned for prose readability (Apple SF stack, 15px/1.7 body, max-width 720
 * measure, 28px h1, subtle hr-style heading separators). Code blocks switch
 * to a dark inverted surface so they read as inline UI vs flat MD.
 *
 * @param {string} bodyHtml — already-escaped HTML to embed.
 * @returns {string}
 */
function _wrapSrcdocDocument(bodyHtml) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Archived document</title>
<style>
  /* P6.4: dashboard committed to a warm-dark design language. Hard-coding
   * the inner srcdoc to match means no jarring brightness jolt between the
   * dark dashboard chrome and the document surface. The light-mode @media
   * block is kept as a *secondary* fallback for printer / forced-light
   * environments; default (no media query) is dark so srcdoc and parent
   * always agree visually regardless of Chrome's iframe color-scheme
   * propagation quirks. The h1 carries a 4px accent column on the left so
   * the reader's eye lands cleanly on the document title. */
  :root {
    --doc-fg: #e7eaef;
    --doc-fg-soft: #c0c5cf;
    --doc-fg-faint: #8a8f98;
    --doc-bg: #15181f;
    --doc-rule: rgba(255,255,255,0.08);
    --doc-rule-soft: rgba(255,255,255,0.04);
    --doc-link: #8eb1ff;
    --doc-link-hover: #afc7ff;
    --doc-code-bg: rgba(255,255,255,0.06);
    --doc-code-fg: #f0c890;
    --doc-pre-bg: #0d1015;
    --doc-pre-fg: #d9dee5;
    --doc-pre-border: rgba(255,255,255,0.07);
    --doc-quote-bar: #5e6ad2;
    --doc-quote-fg: #b0b6c1;
    --doc-table-head-bg: rgba(255,255,255,0.04);
    --doc-accent: #7b87f0;
  }
  html, body { margin: 0; padding: 0; background: var(--doc-bg); }
  body {
    font: 15px/1.72 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, "Segoe UI", Roboto, sans-serif;
    color: var(--doc-fg);
    letter-spacing: -0.011em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Ambient warm glow at top so the document feels lit, not flat */
    background-image: radial-gradient(60% 35% at 12% 0%, rgba(94,106,210,0.10), transparent 70%),
                      radial-gradient(50% 30% at 88% 0%, rgba(208,134,220,0.05), transparent 70%);
    background-attachment: local;
    background-repeat: no-repeat;
    /* Centered prose measure: ~720px on wide viewports, comfortable padding on narrow. */
    padding: 64px max(24px, calc((100% - 760px) / 2)) 96px;
  }
  h1, h2, h3, h4, h5, h6 { color: var(--doc-fg); font-weight: 600; letter-spacing: -0.018em; line-height: 1.25; }
  h1 {
    font-size: 30px; font-weight: 700; letter-spacing: -0.024em;
    margin: 0 0 1.4rem; padding: 0 0 .8rem;
    border-bottom: 1px solid var(--doc-rule);
    position: relative;
  }
  h1::before {
    content: "";
    display: inline-block;
    width: 4px; height: 24px;
    background: linear-gradient(180deg, #8b95ff, #5e6ad2);
    border-radius: 2px;
    margin-right: 14px;
    vertical-align: -3px;
    box-shadow: 0 0 14px rgba(94,106,210,0.6);
  }
  h2 { font-size: 20px; margin: 2.6rem 0 .85rem; }
  h3 { font-size: 16.5px; margin: 2rem 0 .65rem; }
  h4 { font-size: 14.5px; margin: 1.6rem 0 .5rem; color: var(--doc-fg-soft); text-transform: none; letter-spacing: -0.01em; }
  h5, h6 { font-size: 13.5px; margin: 1.4rem 0 .4rem; color: var(--doc-fg-faint); font-weight: 600; }
  p { margin: 0 0 1.1em; }
  ul, ol { margin: 0 0 1.1em; padding-left: 1.4em; }
  li { margin-bottom: .35em; }
  li > p { margin-bottom: .35em; }
  a { color: var(--doc-link); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--doc-link) 30%, transparent); transition: border-color 150ms, color 150ms; }
  a:hover { color: var(--doc-link-hover); border-bottom-color: var(--doc-link); }
  pre, code, kbd, samp { font-family: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  code { background: var(--doc-code-bg); color: var(--doc-code-fg); padding: 1.5px 6px; border-radius: 5px; font-size: 0.88em; }
  pre { background: var(--doc-pre-bg); color: var(--doc-pre-fg); border: 1px solid var(--doc-pre-border); padding: 1rem 1.2rem; border-radius: 10px; overflow: auto; font-size: 13px; line-height: 1.6; margin: 1.2rem 0; }
  pre code { background: transparent; color: inherit; padding: 0; font-size: 1em; border-radius: 0; }
  table { border-collapse: collapse; margin: 1.5rem 0; font-size: 13.5px; width: 100%; }
  th, td { border: 1px solid var(--doc-rule); padding: 8px 12px; text-align: left; vertical-align: top; }
  th { background: var(--doc-table-head-bg); font-weight: 600; }
  blockquote { margin: 1.2rem 0; padding: .15rem 0 .15rem 1.2rem; border-left: 3px solid var(--doc-quote-bar); color: var(--doc-quote-fg); background: transparent; }
  hr { border: none; border-top: 1px solid var(--doc-rule); margin: 2.5rem 0; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  strong, b { font-weight: 600; color: var(--doc-fg); }
  em, i { font-style: italic; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/**
 * srcdoc attribute requires its value to be escaped to attribute context.
 * escapeAttr handles &, <, >, ", '.
 *
 * @param {string} doc
 * @returns {string}
 */
function _escapeSrcdoc(doc) {
  return escapeAttr(doc);
}

/**
 * Outer document wrapping the chromeless viewer shell. The shell positions
 * the content iframe (or <pre>) absolutely at inset:0 so it fills the entire
 * panel; two floating glass chips sit overlaid in the top-left (breadcrumb)
 * and top-right (action menu). Light/dark mode mirrors via prefers-color-
 * scheme so the chips match the parent canvas.
 *
 * @param {string} body — the <article>…</article> markup.
 * @returns {string} complete HTML document.
 */
function _wrapViewerDocument(body) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>file viewer</title>
<style>
  /* P6.4: chromeless viewer shell — always dark to match the dashboard's
   * warm-dark identity. The shell hosts the inner content iframe (or <pre>)
   * plus two glass overlay chips. By staying dark unconditionally the
   * dashboard avoids the brightness jolt when the user's system flips to
   * light mode independent of the dashboard chrome (which itself uses
   * prefers-color-scheme but lands on dark by default on most setups). */
  :root {
    --fv-canvas: #15181f;
    --fv-chip-bg: rgba(22,24,30,0.66);
    --fv-chip-bg-hover: rgba(30,33,42,0.88);
    --fv-chip-border: rgba(255,255,255,0.10);
    --fv-chip-fg: rgba(230,232,238,0.78);
    --fv-chip-fg-strong: rgba(245,247,250,0.98);
    --fv-chip-mute: rgba(230,232,238,0.38);
    --fv-pre-bg: #0e141a;
    --fv-pre-fg: #d9dee5;
  }
  html, body { height: 100%; margin: 0; padding: 0; background: var(--fv-canvas); }
  body { font: 14px/1.55 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; color: var(--fv-chip-fg-strong); }
  .ts-file-viewer { position: relative; width: 100%; height: 100vh; min-height: 0; overflow: hidden; }
  .ts-file-viewer-frame {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    border: 0; display: block;
    background: var(--fv-canvas);
  }
  .ts-file-viewer-text {
    position: absolute; inset: 0;
    margin: 0; padding: 64px max(24px, calc((100% - 880px) / 2));
    overflow: auto; background: var(--fv-pre-bg); color: var(--fv-pre-fg);
    font-family: "SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px; line-height: 1.62; white-space: pre;
  }
  .ts-fv-overlay {
    position: absolute; top: 14px; left: 16px; right: 16px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; pointer-events: none; z-index: 3;
  }
  .ts-fv-crumb {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 12px 6px 6px;
    background: var(--fv-chip-bg);
    -webkit-backdrop-filter: blur(14px) saturate(180%);
    backdrop-filter: blur(14px) saturate(180%);
    border: 1px solid var(--fv-chip-border);
    border-radius: 999px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06);
    font-size: 11.5px; color: var(--fv-chip-fg);
    pointer-events: auto; max-width: calc(100% - 110px);
    overflow: hidden;
  }
  .ts-fv-crumb-id {
    font-family: "SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px; letter-spacing: 0;
    color: var(--fv-chip-fg-strong);
    background: var(--fv-chip-bg-hover);
    padding: 2px 8px; border-radius: 999px;
    border: 1px solid var(--fv-chip-border);
    flex-shrink: 0;
  }
  .ts-fv-crumb-sep { color: var(--fv-chip-mute); flex-shrink: 0; }
  .ts-fv-crumb-path {
    color: var(--fv-chip-fg-strong); font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    min-width: 0; max-width: 100%;
  }
  .ts-fv-actions { display: inline-flex; gap: 4px; pointer-events: auto; }
  .ts-fv-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    background: var(--fv-chip-bg);
    -webkit-backdrop-filter: blur(14px) saturate(180%);
    backdrop-filter: blur(14px) saturate(180%);
    border: 1px solid var(--fv-chip-border);
    border-radius: 999px;
    color: var(--fv-chip-fg);
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06);
    text-decoration: none;
    transition: background 180ms cubic-bezier(.2,.6,.2,1), color 180ms, border-color 180ms, transform 180ms;
  }
  .ts-fv-btn:hover {
    background: var(--fv-chip-bg-hover);
    color: var(--fv-chip-fg-strong);
    transform: translateY(-1px);
  }
  .ts-fv-btn:focus-visible {
    outline: none;
    border-color: rgba(94,106,210,0.8);
    box-shadow: 0 0 0 3px rgba(94,106,210,0.25), 0 1px 2px rgba(0,0,0,0.08);
  }
  .ts-fv-btn svg { width: 14px; height: 14px; }
</style>
</head>
<body>${body}</body>
</html>`;
}

/**
 * SVG icon for the "view raw" action — outline arrow-up-right.
 */
function _iconExternal() {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M5 11L11 5"/><path d="M6.5 5h4.5v4.5"/></svg>';
}

/**
 * Shared overlay (floating breadcrumb chip + actions chip) — same shape
 * across the markdown / html / text variants so the chrome stays consistent.
 *
 * @param {string} docId
 * @param {string} relPath
 * @returns {string}
 */
function _renderOverlay(docId, relPath) {
  const docIdSafe = escapeHtml(docId);
  const relPathSafe = escapeHtml(relPath);
  const relPathAttr = escapeAttr(relPath);
  return `<div class="ts-fv-overlay" role="toolbar" aria-label="file viewer">
  <div class="ts-fv-crumb">
    <code class="ts-fv-crumb-id">${docIdSafe}</code>
    <span class="ts-fv-crumb-sep" aria-hidden="true">›</span>
    <span class="ts-fv-crumb-path" title="${relPathSafe}">${relPathSafe}</span>
  </div>
  <div class="ts-fv-actions">
    <a class="ts-fv-btn"
       href="/api/file?path=${encodeURIComponent(relPath || '')}&amp;raw=1"
       rel="noopener noreferrer"
       title="원본 보기"
       aria-label="원본 보기 (raw)">${_iconExternal()}</a>
  </div>
</div>`;
}

/**
 * Renderer for markdown artifacts (the legacy path).
 *
 * @param {object} args
 * @param {string} args.docId
 * @param {string} args.relPath
 * @param {string} args.html — output of renderMarkdownToHtml().html
 * @param {string} args.mode — 'iframe' | 'pre' (from renderMarkdownToHtml)
 * @returns {string}
 */
function renderMarkdownViewer(args) {
  const docId = args.docId || '';
  const relPath = args.relPath || '';
  const inner = String(args.html || '');
  const mode = args.mode === 'iframe' ? 'iframe' : 'pre';
  const relPathAttr = escapeAttr(relPath);
  const srcdoc = _escapeSrcdoc(_wrapSrcdocDocument(inner));

  return _wrapViewerDocument(`<article class="ts-file-viewer" data-ts-file-viewer="markdown" data-ts-md-mode="${mode}">
  ${_renderOverlay(docId, relPath)}
  <iframe class="ts-file-viewer-frame"
          sandbox="allow-same-origin"
          referrerpolicy="no-referrer"
          loading="lazy"
          srcdoc="${srcdoc}"
          title="${relPathAttr}"></iframe>
</article>`);
}

/**
 * Renderer for native HTML artifacts (Phase 1/2 output).
 *
 * @param {object} args
 * @param {string} args.docId
 * @param {string} args.relPath
 * @param {string} args.htmlBody — raw HTML contents of the file.
 * @returns {string}
 */
function renderHtmlViewer(args) {
  const docId = args.docId || '';
  const relPath = args.relPath || '';
  const inner = String(args.htmlBody || '');
  const relPathAttr = escapeAttr(relPath);
  const isFullDoc = /^<!doctype/i.test(inner) || /^\s*<html/i.test(inner);
  const srcdoc = _escapeSrcdoc(isFullDoc ? inner : _wrapSrcdocDocument(inner));

  return _wrapViewerDocument(`<article class="ts-file-viewer" data-ts-file-viewer="html">
  ${_renderOverlay(docId, relPath)}
  <iframe class="ts-file-viewer-frame"
          sandbox="allow-same-origin"
          referrerpolicy="no-referrer"
          loading="lazy"
          srcdoc="${srcdoc}"
          title="${relPathAttr}"></iframe>
</article>`);
}

/**
 * Renderer for text files (.yaml/.json/.txt/.jsonl/.log/.tpl).
 *
 * Inline <pre> — no iframe needed because text is inert. Same chromeless
 * overlay shell.
 *
 * @param {object} args
 * @returns {string}
 */
function renderTextViewer(args) {
  const docId = args.docId || '';
  const relPath = args.relPath || '';
  const text = String(args.text || '');
  const ext = escapeHtml(args.extension || '');
  return _wrapViewerDocument(`<article class="ts-file-viewer" data-ts-file-viewer="text" data-ts-ext="${ext}">
  ${_renderOverlay(docId, relPath)}
  <pre class="ts-file-viewer-text">${escapeHtml(text)}</pre>
</article>`);
}

module.exports = {
  renderMarkdownViewer,
  renderHtmlViewer,
  renderTextViewer,
  _internal: { _wrapSrcdocDocument, _escapeSrcdoc, _renderOverlay }
};
