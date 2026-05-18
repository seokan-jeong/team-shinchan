// src/dashboard/views/grid.js
//
// Phase 4 — Tier-3 swap target: the card grid container.
//
// LOW-2 § Tier 3 — when a brand-new workflow appears, the server pushes a
// single `<article>` card fragment and HTMX `afterbegin`-swaps it inside
// `#ts-grid`, so the newest doc appears at the top without re-rendering the
// whole grid.
//
// `renderGrid()` returns the entire `<section id="ts-grid">` including all
// cards — used both for full-page (`/`) render and for the `/partial/grid`
// refresh route.

'use strict';

const { renderCard } = require('./card');
const { escapeHtml } = require('./escape');

/**
 * Render the grid container with its current card set.
 *
 * @param {Array<object>} workflows — array of workflow metadata (active first).
 * @param {object} [opts]
 * @param {string} [opts.heading] — visible heading text (default: "Active workflows").
 * @returns {string} HTML fragment for the grid section.
 */
function renderGrid(workflows, opts) {
  const o = opts || {};
  const heading = o.heading || 'Active workflows';
  const list = Array.isArray(workflows) ? workflows : [];
  if (list.length === 0) {
    return `<section id="ts-grid"
                 class="ts-grid"
                 aria-labelledby="ts-grid-heading"
                 data-ts-kind="workflow-grid"
                 data-ts-count="0">
  <h2 id="ts-grid-heading" class="ts-sr-only">${escapeHtml(heading)}</h2>
  <div class="ts-grid-empty" role="status">No active workflows found.</div>
</section>`;
  }
  const cards = list.map(meta => renderCard(meta)).join('\n');
  return `<section id="ts-grid"
                 class="ts-grid"
                 aria-labelledby="ts-grid-heading"
                 data-ts-kind="workflow-grid"
                 data-ts-count="${list.length}">
  <h2 id="ts-grid-heading" class="ts-sr-only">${escapeHtml(heading)}</h2>
${cards}
</section>`;
}

module.exports = { renderGrid };
