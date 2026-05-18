// src/dashboard/views/files.js
//
// Phase 4 — file list fragment for `<details><ul hx-get="/partial/files/:id">`
// inside a card.
//
// Renders a `<ul>` of links to each file in the workflow folder. Links open
// via the existing /api/file?path= endpoint which enforces path traversal
// protection (path-validated in server.js). HTML files open with target=_blank
// so the user can preview them; other files download as their content type.

'use strict';

const { escapeHtml, escapeAttr } = require('./escape');

/**
 * Render the inner-list (without the wrapping <ul>) — the wrapping element
 * is the actions.js template's <ul>, and innerHTML is replaced.
 *
 * @param {string} docId
 * @param {Array<{name: string, extension: string, size: number, rel_path: string}>} files
 * @returns {string} <li>…</li> sequence (or empty-state <li>).
 */
function renderFilesList(docId, files) {
  if (!Array.isArray(files) || files.length === 0) {
    return `<li class="ts-files-empty"><em>no files yet</em></li>`;
  }
  return files.map(f => renderFileLink(docId, f)).join('');
}

function renderFileLink(docId, file) {
  const rel = escapeAttr(file.rel_path);
  const name = escapeHtml(file.name);
  const size = humanSize(file.size);
  const ext = String(file.extension).toLowerCase();
  const isHtml = ext === '.html';
  const isMd = ext === '.md';
  // Phase 5: for .md and .html we link with `?view=html` so the server returns
  // the iframe-sandboxed viewer (renderMarkdownViewer / renderHtmlViewer)
  // instead of the legacy JSON envelope. Both open in a new tab so the
  // dashboard chrome stays put. For yaml/json/txt we keep the legacy JSON
  // envelope behaviour (scripts may rely on it) — clicking will download or
  // display per the browser's content-type heuristics.
  const isViewer = isHtml || isMd;
  const href = isViewer
    ? `/api/file?path=${encodeURIComponent(file.rel_path)}&view=html`
    : `/api/file?path=${encodeURIComponent(file.rel_path)}`;
  const target = isViewer ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<li><a href="${href}"${target}>${name}</a> <small style="color:var(--ts-muted)">(${escapeHtml(size)})</small></li>`;
}

function humanSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '?';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

module.exports = { renderFilesList, _internal: { humanSize, renderFileLink } };
