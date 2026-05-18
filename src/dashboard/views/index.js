// src/dashboard/views/index.js
//
// Phase 8.3 — Master-detail home page.
//
// Splits the main column into a left grid (workflow cards) and a right side
// panel (#ts-doc-panel) that loads a workflow's documents on demand. The
// panel starts empty; clicking a card POSTs hx-get="/partial/doc/:id" and
// replaces the panel's innerHTML.

'use strict';

const { renderLayout } = require('./layout');
const { renderGrid } = require('./grid');
const { renderDocPanelEmpty } = require('./doc-panel');

function renderIndex(args) {
  const workflows = Array.isArray(args.workflows) ? args.workflows : [];
  const archivedCount = Array.isArray(args.archived) ? args.archived.length : 0;

  const body = `
    <div class="ts-split" data-ts-split="master-detail">
      <section class="ts-split-left" aria-label="Workflow grid">
        ${renderGrid(workflows)}
      </section>
      <aside class="ts-split-right" aria-label="문서 패널">
        <div id="ts-doc-panel" class="ts-doc-panel">${renderDocPanelEmpty()}</div>
      </aside>
    </div>
  `;

  return renderLayout({
    title: 'Team-Shinchan Dashboard',
    frontmatter: {
      schema_version: 1,
      page: 'index',
      active_count: workflows.length,
      archived_count: archivedCount,
      generated_at: new Date().toISOString()
    },
    body
  });
}

module.exports = { renderIndex };
