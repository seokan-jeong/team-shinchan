// src/dashboard/views/doc-panel.js
//
// Phase 8.3 — Master-detail side panel.
//
// Renders the right-hand pane: tabs for every viewable file in a workflow
// folder, plus a sandboxed iframe that loads the active file through the
// existing `/api/file?view=html` viewer (which already markdown-renders and
// wraps content in iframe-safe HTML).
//
// Contract:
//   GET /partial/doc/:docId          → panel with default file selected
//   GET /partial/doc/:docId?file=X   → panel with file X as the active tab
//
// Default-file priority (first one that exists wins): REQUESTS.md → PLAN.md →
// PROGRESS.md → REQUESTS.html → PLAN.html → PROGRESS.html → first .md/.html
// in the folder (alphabetical fallback). This matters because the order
// matches the workflow's stage progression — REQUESTS first when you open a
// new card.
//
// All HTML output here is escaped. The iframe's *contents* are rendered by
// /api/file?view=html, which already applies sandbox=allow-same-origin (see
// views/file-viewer.js).

'use strict';

const { escapeHtml, escapeAttr } = require('./escape');

const DEFAULT_PRIORITY = [
  'REQUESTS.md', 'PLAN.md', 'PROGRESS.md', 'IMPLEMENTATION.md', 'RETROSPECTIVE.md',
  'REQUESTS.html', 'PLAN.html', 'PROGRESS.html', 'IMPLEMENTATION.html', 'RETROSPECTIVE.html'
];

const VIEWABLE_EXT = new Set(['.md', '.html', '.yaml', '.yml', '.json', '.txt']);

function isViewable(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return VIEWABLE_EXT.has(ext);
}

// P6.4 — tab iconography. Tiny inline SVGs (16×16, currentColor stroke) keyed
// off the stripped filename. Falls back to a generic document icon for files
// not in the workflow vocabulary. Inline keeps the icons free (zero HTTP) and
// allows currentColor inheritance so the active-tab accent flows through.
const TAB_ICONS = {
  'REQUESTS':       '<path d="M3.5 3.5h7l3 3v6.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5z"/><path d="M10.5 3.5v3h3"/><path d="M5.5 8.5h5"/><path d="M5.5 10.5h3"/>',
  'PLAN':           '<path d="M2.5 4.5l3.5-1.5 4 1.5 3.5-1.5v9l-3.5 1.5-4-1.5-3.5 1.5v-9z"/><path d="M6 3v9"/><path d="M10 4.5v9"/>',
  'PROGRESS':       '<path d="M2.5 13.5h11"/><path d="M4.5 11v-3"/><path d="M7.5 11v-5"/><path d="M10.5 11v-2"/><path d="M13.5 11v-6.5"/>',
  'IMPLEMENTATION': '<path d="M6.5 9.5l-3 3 .5.5 3-3"/><path d="M9.5 6.5l-3 3"/><path d="M10.5 3.5l3 3-3 1.5-1.5-1.5 1.5-3z"/>',
  'RETROSPECTIVE':  '<path d="M3 8a5 5 0 1 1 1.5 3.55"/><path d="M3 11.5v-3.5h3.5"/><path d="M8 5.5v3l2 1"/>',
  'WORKFLOW_STATE': '<circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M1.5 8h2M12.5 8h2M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>'
};
function tabIcon(name) {
  const stripped = name.replace(/\.[^.]+$/, '').toUpperCase();
  const paths = TAB_ICONS[stripped]
    || '<rect x="3" y="2.5" width="10" height="11" rx="1"/><path d="M5 5h6M5 7.5h6M5 10h4"/>';
  return `<svg class="ts-doc-tab-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function pickDefault(files) {
  const names = new Set(files.map(f => f.name));
  for (const n of DEFAULT_PRIORITY) {
    if (names.has(n)) return n;
  }
  // Fallback: alphabetical .md, then alphabetical .html, then any viewable.
  // Alphabetical (not file-order) so the default is predictable regardless
  // of how readdir returns entries on the host filesystem.
  const mds = files.filter(f => f.name.toLowerCase().endsWith('.md'))
                   .map(f => f.name).sort();
  if (mds.length) return mds[0];
  const htmls = files.filter(f => f.name.toLowerCase().endsWith('.html'))
                     .map(f => f.name).sort();
  if (htmls.length) return htmls[0];
  return files[0] && files[0].name;
}

/**
 * Render the side panel with tabs + iframe.
 *
 * @param {object} args
 * @param {string} args.docId
 * @param {string} args.category — 'active' | 'archived'
 * @param {Array<{name:string, rel_path:string, size:number}>} args.files
 * @param {string} [args.activeName] — file the user clicked; falls back to default.
 * @returns {string} HTML fragment (no wrapper — caller already provides #ts-doc-panel).
 */
function renderDocPanel(args) {
  const docId = String(args.docId);
  const category = String(args.category || 'active');
  const allFiles = Array.isArray(args.files) ? args.files : [];
  const viewable = allFiles.filter(f => isViewable(f.name));

  if (viewable.length === 0) {
    return renderEmptyForDoc(docId);
  }

  // Sort: priority list first (in their order), then alphabetical for the rest.
  const priorityIdx = new Map(DEFAULT_PRIORITY.map((n, i) => [n, i]));
  viewable.sort((a, b) => {
    const ai = priorityIdx.has(a.name) ? priorityIdx.get(a.name) : 1000 + a.name.localeCompare(b.name);
    const bi = priorityIdx.has(b.name) ? priorityIdx.get(b.name) : 1000 + b.name.localeCompare(a.name);
    if (priorityIdx.has(a.name) && priorityIdx.has(b.name)) return ai - bi;
    if (priorityIdx.has(a.name)) return -1;
    if (priorityIdx.has(b.name)) return 1;
    return a.name.localeCompare(b.name);
  });

  const requested = args.activeName && viewable.some(f => f.name === args.activeName)
    ? args.activeName
    : pickDefault(viewable);
  const active = viewable.find(f => f.name === requested) || viewable[0];

  // rel_path is already discoveryroot-relative ("main-068/REQUESTS.md" or
  // "archived/main-067/PLAN.md"). /api/file accepts that shape directly.
  const iframeSrc = `/api/file?path=${encodeURIComponent(active.rel_path)}&view=html`;

  const tabs = viewable.map(f => {
    const isActive = f.name === active.name;
    const tabHref = `/partial/doc/${encodeURIComponent(docId)}?file=${encodeURIComponent(f.name)}`;
    return `<button type="button" class="ts-doc-tab" role="tab"`
      + ` data-ts-tab="${escapeAttr(f.name)}"`
      + (isActive ? ` aria-selected="true"` : ` aria-selected="false"`)
      + ` hx-get="${tabHref}"`
      + ` hx-target="#ts-doc-panel" hx-swap="innerHTML"`
      + `>${tabIcon(f.name)}<span class="ts-doc-tab-label">${escapeHtml(stripExt(f.name))}</span></button>`;
  }).join('');

  const closeBtn = `<button type="button" class="ts-doc-close"`
    + ` aria-label="패널 닫기"`
    + ` hx-get="/partial/doc-empty" hx-target="#ts-doc-panel" hx-swap="innerHTML">×</button>`;

  // P6.4: header + tab strip merged into one chrome row. The workflow id is
  // now surfaced inside the file viewer's overlay crumb (see file-viewer.js),
  // so the outer band only carries: [tabs] [archived badge?] [close]. This
  // matches the Apple HIG direction — the document is the surface, not the
  // chrome — while keeping the .ts-doc-header / .ts-doc-tabs / .ts-doc-badge
  // / .ts-doc-close class anchors that downstream tests + CSS depend on.
  const headerRight = (category === 'archived' ? ` <span class="ts-doc-badge">archived</span>` : '')
    + closeBtn;
  const docHeader = `<div class="ts-doc-header">`
    + `<div class="ts-doc-tabs" role="tablist" aria-label="${escapeAttr(docId)} 문서">${tabs}</div>`
    + `<div class="ts-doc-header-right">${headerRight}</div>`
    + `</div>`;

  return docHeader
    + `<iframe class="ts-doc-iframe"`
    + ` src="${escapeAttr(iframeSrc)}"`
    + ` title="${escapeAttr(active.name)} — ${escapeAttr(docId)}"`
    + ` sandbox="allow-same-origin"`
    + ` referrerpolicy="no-referrer"`
    + `></iframe>`;
}

function renderEmptyForDoc(docId) {
  // Folder existed but had no viewable files (corner case).
  return `<div class="ts-doc-empty">`
    + `<p class="ts-doc-empty-title">${escapeHtml(docId)}</p>`
    + `<p class="ts-doc-empty-hint">표시할 .md / .html 파일이 없습니다.</p>`
    + `</div>`;
}

function renderDocPanelEmpty() {
  return `<div class="ts-doc-empty" data-ts-doc-empty="true">`
    + `<p class="ts-doc-empty-title">문서 미선택</p>`
    + `<p class="ts-doc-empty-hint">왼쪽 카드를 클릭하여 해당 워크플로우의 문서(REQUESTS · PLAN · PROGRESS …)를 여기서 바로 확인하세요.</p>`
    + `</div>`;
}

function stripExt(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

module.exports = {
  renderDocPanel,
  renderDocPanelEmpty,
  _internal: { pickDefault, isViewable, stripExt, DEFAULT_PRIORITY }
};
