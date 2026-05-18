// src/dashboard/views/card.js
//
// Phase 8.3 — Master-detail card. Clicking anywhere on the card body loads
// the workflow's documents into #ts-doc-panel via HTMX; no more new-tab
// navigation. The footer (folder/files) is gone — documents are now the
// primary surface, not an afterthought.
//
// Layout (top → bottom):
//
//   ┌────────────────────────────────────────────────────────┐
//   │  • 진행 중                    Implementation  3/4      │  ← status (L) / stage text (R)
//   │  팀신짱 문서 HTML 전환 + 로컬 …                          │  ← title (request summary)
//   │  main-068                                              │  ← doc_id (mono, faint)
//   │                                                        │
//   │  ⓘ Stage 4 진입 대기 — 사용자 컨펌 필요                  │  ← action hint (only when present)
//   │  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░                            │  ← 3px progress bar
//   │  Phase 6                                       69%      │  ← bar meta (L/R muted)
//   │  18시간 8분 진행                       방금 업데이트       │  ← time row (L/R muted)
//   │                                                        │
//   │  RECENT ACTIVITY                                       │  ← ALL CAPS caption
//   │  15시간 전  action-kamen-test  Dashboard Action          │  ← single-line rows
//   └────────────────────────────────────────────────────────┘
//
// HTMX wiring: the <article> carries hx-get="/partial/doc/<id>" with
// hx-target="#ts-doc-panel" hx-swap="innerHTML". hx-push-url="false" keeps
// the URL stable so refreshes don't deep-link into a transient state.
// role="button" + tabindex="0" lets keyboard users open the panel too.
//
// NFR-5 — preserves data-ts-* hooks (card/kind/category/status/field).
// NFR-6 — pure string template, zero deps.

'use strict';

const { escapeHtml, escapeAttr } = require('./escape');
const { renderField } = require('./field');

function renderCard(meta, opts) {
  const includeActions = !opts || opts.includeActions !== false;
  const docId = escapeAttr(meta.doc_id);
  const docIdText = escapeHtml(meta.doc_id);
  const status = String(meta.status || 'unknown');
  const category = String(meta.category || 'active');
  const titleText = meta.requestSummary ? escapeHtml(meta.requestSummary) : docIdText;

  // hx-get wiring only attaches when actions are enabled (matches how the
  // card surfaces interactivity). includeActions=false is used by snapshot
  // / mail-render contexts that need a static, click-inert card.
  const hxAttrs = includeActions
    ? ` hx-get="/partial/doc/${docId}"`
      + ` hx-target="#ts-doc-panel"`
      + ` hx-swap="innerHTML"`
      + ` hx-push-url="false"`
      + ` role="button"`
      + ` tabindex="0"`
    : '';

  return `<article class="ts-card"
         data-ts-card="${docId}"
         data-doc-id="${docId}"
         data-ts-kind="workflow-card"
         data-ts-category="${escapeAttr(category)}"
         data-ts-status="${escapeAttr(status)}"
         aria-labelledby="ts-card-title-${docId}"
         id="ts-card-${docId}"${hxAttrs}>
    <header class="ts-card-header">
      <div class="ts-card-top-row">
        <span data-ts-field="${docId}:status-badge" class="ts-card-status-badge-slot">${renderField(meta, 'status-badge')}</span>
        <span data-ts-field="${docId}:stage-line" class="ts-card-stage">${renderField(meta, 'stage-line')}</span>
      </div>
      <h2 class="ts-card-title" id="ts-card-title-${docId}" data-ts-field="${docId}:title">${titleText}</h2>
      <p class="ts-card-docid"><code>${docIdText}</code></p>
    </header>

    <div class="ts-card-hint" data-ts-field="${docId}:action-hint">${renderField(meta, 'action-hint')}</div>

    <div class="ts-card-progress" data-ts-field="${docId}:progress">${renderField(meta, 'progress')}</div>

    <div class="ts-card-time" data-ts-field="${docId}:time-meta">${renderField(meta, 'time-meta')}</div>

    <section class="ts-card-recent" aria-label="최근 활동">
      <h3 class="ts-card-recent-heading">최근 활동</h3>
      <div data-ts-field="${docId}:recent-activity">${renderField(meta, 'recent-activity')}</div>
    </section>
  </article>`;
}

module.exports = { renderCard };
