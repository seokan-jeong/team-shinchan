// src/dashboard/views/actions.js
//
// Phase 8.2 — Minimal action footer.
//
// pause / archive / note were all removed from the card surface (low value vs.
// the visual cost). Agents still POST those actions through /api/workflow/:id
// directly; server.js applyAction is unchanged. The card footer now exposes
// only the two affordances a human actually reaches for while scanning:
//
//   - "folder"  → opens the workflow folder in a new tab.
//   - "files ▾" → lazy-loaded list of files (hx-get partial).

'use strict';

const { escapeAttr } = require('./escape');

function renderActions(meta) {
  const docId = escapeAttr(meta.doc_id);

  // File-open dropdown — server returns escaped /api/file?path=… links.
  const filesBlock = `
      <details class="ts-files">
        <summary>files</summary>
        <ul hx-get="/partial/files/${docId}"
            hx-trigger="toggle from:closest details once"
            hx-swap="innerHTML">
          <li class="ts-files-empty"><em>loading...</em></li>
        </ul>
      </details>`;

  return `
    <div class="ts-actions" data-ts-field="${docId}:actions">
        <a class="ts-btn"
           href="/docs/${docId}/folder"
           target="_blank"
           rel="noopener noreferrer">folder</a>
      </div>${filesBlock}`;
}

module.exports = { renderActions };
