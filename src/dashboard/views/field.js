// src/dashboard/views/field.js
//
// Phase 8 — Tier-2 field renderers.
//
// LOW-2 § Tier 2: for small mutations the server may return just one field's
// inner content (no wrapper) and HTMX innerHTML-swaps it. Each renderer here
// is responsible for one named slot, with `data-ts-field="<doc_id>:<name>"`
// being the contract used both by the card template and the `/partial/field/…`
// route in server.js.
//
// Field names (KNOWN_FIELDS):
//   New (Phase 8 information-first):
//     - status-badge     dot + Korean status label
//     - stage-line       "Stage 3 · 구현 · Phase 6"
//     - title            request summary or doc_id fallback
//     - action-hint      "Stage 4 진입 대기 — 사용자 컨펌 필요" (or empty)
//     - progress         visual progress bar + "Stage N of M"
//     - time-meta        elapsedText · updatedRelText
//     - recent-activity  <ul> of last 3 history events humanised
//
//   Legacy (kept for /partial/field/<id>/<name> backwards-compat):
//     - stage   - phase   - owner   - status   - updated   - last-event
//
// All field renderers escape their input.

'use strict';

const { escapeHtml, escapeAttr } = require('./escape');

const KNOWN_FIELDS = new Set([
  // information-first
  'status-badge',
  'stage-line',
  'title',
  'action-hint',
  'progress',
  'time-meta',
  'recent-activity',
  // legacy
  'stage', 'phase', 'owner', 'status', 'last-event', 'updated'
]);

/**
 * Render the inner content of a single field — no enclosing span.
 *
 * @param {object} meta — enriched workflow metadata.
 * @param {string} fieldName — one of KNOWN_FIELDS.
 * @returns {string} HTML fragment (always escaped).
 */
function renderField(meta, fieldName) {
  switch (fieldName) {
    // ── Phase 8 fields ──────────────────────────────────────────
    case 'status-badge':
      return renderStatusBadge(meta);
    case 'stage-line':
      return renderStageLine(meta);
    case 'title':
      return escapeHtml(meta.requestSummary || meta.doc_id || '');
    case 'action-hint':
      return renderActionHint(meta.actionHint);
    case 'progress':
      return renderProgress(meta.stageInfo, meta);
    case 'time-meta':
      return renderTimeMeta(meta.timeMeta);
    case 'recent-activity':
      return renderRecentActivity(meta.recentActivity);

    // ── Legacy fields (still supported) ─────────────────────────
    case 'stage':
      return escapeHtml(meta.stage || '—');
    case 'phase':
      return escapeHtml(meta.phase != null ? String(meta.phase) : '—');
    case 'owner':
      return escapeHtml(meta.owner || '—');
    case 'status': {
      const s = String(meta.status || 'unknown');
      return `<span class="ts-status" data-ts-status="${escapeAttr(s)}">${escapeHtml(s)}</span>`;
    }
    case 'updated':
      return escapeHtml(formatTimestamp(meta.updated));
    case 'last-event':
      return renderLastEvent(meta.last_event);

    default:
      return '';
  }
}

// ──────────────────────────────────────────────────────────────────────
// Phase 8 renderers

function renderStatusBadge(meta) {
  const raw = String(meta.status || 'unknown');
  const label = meta.statusLabel || raw;
  return `<span class="ts-status" data-ts-status="${escapeAttr(raw)}">`
       + `<span class="ts-status-dot" aria-hidden="true"></span>`
       + `<span class="ts-status-label">${escapeHtml(label)}</span>`
       + `</span>`;
}

function renderStageLine(meta) {
  // Linear-style stage indicator: label + faint "n/total". No chip box, no
  // separator glyph, no number bold. Reads as one line of text. Phase moved
  // to the progress row so "n/total" can never be misread as Phase/Stage.
  const si = meta.stageInfo || {};
  const number = si.number || 0;
  const total = si.total || 4;
  const label = si.label || meta.stage || '—';
  if (number === 0) {
    return `<span class="ts-stage-text">${escapeHtml(String(label))}</span>`;
  }
  return `<span class="ts-stage-text">`
       + `<span class="ts-stage-label">${escapeHtml(String(label))}</span>`
       + ` <span class="ts-stage-count" aria-label="Stage ${number} of ${total}">${number}/${total}</span>`
       + `</span>`;
}

function renderActionHint(hint) {
  if (!hint || typeof hint !== 'object' || !hint.text) {
    return ''; // empty — CSS hides the slot via :empty
  }
  const kind = String(hint.kind || 'info');
  return `<div class="ts-hint" data-ts-hint="${escapeAttr(kind)}" role="note">`
       + `<span class="ts-hint-icon" aria-hidden="true"></span>`
       + `<span class="ts-hint-text">${escapeHtml(hint.text)}</span>`
       + `</div>`;
}

function renderProgress(stageInfo, meta) {
  // Linear-style single hairline bar. Step dots were removed (redundant with
  // the bar). Phase + pct sit muted under the bar on opposite ends so the
  // reader gets the linear position AND the discrete phase counter in one
  // glance.
  const si = stageInfo || {};
  const pct = Math.max(0, Math.min(100, Number(si.progressPct) || 0));
  const phase = si.phase ?? (meta && meta.phase);
  const phaseText = (phase != null && phase !== '')
    ? `Phase ${escapeHtml(String(phase))}`
    : '';
  return `<div class="ts-progress" role="progressbar"`
       + ` aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"`
       + ` data-ts-progress="${pct}">`
       + `<div class="ts-progress-track">`
       + `<div class="ts-progress-fill" style="width:${pct}%"></div>`
       + `</div>`
       + `<div class="ts-progress-meta">`
       + `<span class="ts-progress-phase">${phaseText}</span>`
       + `<span class="ts-progress-pct">${pct}%</span>`
       + `</div>`
       + `</div>`;
}

function renderTimeMeta(timeMeta) {
  const tm = timeMeta || {};
  if (!tm.elapsedText && !tm.updatedRelText) return '';
  const elapsed = tm.elapsedText
    ? `<span class="ts-time-elapsed">${escapeHtml(tm.elapsedText)}</span>`
    : '<span class="ts-time-elapsed ts-time-empty">—</span>';
  const updated = tm.updatedRelText
    ? `<span class="ts-time-updated">${escapeHtml(tm.updatedRelText)}</span>`
    : '<span class="ts-time-updated ts-time-empty">—</span>';
  return `<div class="ts-time-row">${elapsed}${updated}</div>`;
}

function renderRecentActivity(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="ts-recent-empty">아직 활동이 없습니다.</p>`;
  }
  const lis = items.map(it => {
    const time = it.relativeTime ? escapeHtml(it.relativeTime) : '—';
    const agent = it.agent ? escapeHtml(it.agent) : '?';
    const labelRaw = it.eventLabel || '활동';
    const label = escapeHtml(labelRaw);
    // main-071 EVENT_VERB_MAP embeds "{agent}가 ..." into eventLabel.
    // Suppress the dedicated agent column when that prefix is already present
    // (otherwise the agent name shows twice). The legacy schema (separate
    // agent + agent-less label) still renders the agent column normally.
    const labelLeadsWithAgent = it.agent && (
      labelRaw.startsWith(it.agent + '가 ') ||
      labelRaw.startsWith(it.agent + '이 ') ||
      labelRaw.startsWith(it.agent + ' ')
    );
    const agentFrag = labelLeadsWithAgent
      ? ''
      : `<span class="ts-recent-agent">${agent}</span>`;
    // Note is truncated tight (50 chars) and displayed inline so a single
    // activity row stays one line; CSS `text-overflow: ellipsis` clips overflow.
    // main-071: extractRecentActivity already appends " — {note}" to eventLabel
    // for verb-mapped events. The legacy schema still passes note separately,
    // so the inline ts-recent-note span path is preserved.
    const noteTrunc = it.note ? truncate(String(it.note).replace(/\s+/g, ' '), 50) : '';
    const noteAlreadyInLabel = noteTrunc && labelRaw.endsWith(' — ' + String(it.note).replace(/\s+/g, ' '));
    const noteFrag = (noteTrunc && !noteAlreadyInLabel)
      ? ` <span class="ts-recent-sep" aria-hidden="true">·</span> <span class="ts-recent-note" title="${escapeAttr(it.note)}">${escapeHtml(noteTrunc)}</span>`
      : '';
    return `<li class="ts-recent-item">`
         + `<span class="ts-recent-time">${time}</span>`
         + agentFrag
         + `<span class="ts-recent-event">${label}</span>`
         + noteFrag
         + `</li>`;
  }).join('');
  return `<ul class="ts-recent-list">${lis}</ul>`;
}

// ──────────────────────────────────────────────────────────────────────
// Legacy helpers (still used by 'last-event' / 'updated')

function renderLastEvent(evt) {
  if (!evt) return '<em>no events yet</em>';
  const name = evt.event || 'event';
  const agent = evt.agent ? ` by ${evt.agent}` : '';
  const note = evt.note ? `: ${truncate(evt.note, 80)}` : '';
  const ts = evt.timestamp ? ` (${formatTimestamp(evt.timestamp)})` : '';
  return `<span class="ts-event-name">${escapeHtml(name)}</span>${escapeHtml(agent)}${escapeHtml(note)}${escapeHtml(ts)}`;
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 16).replace('T', ' ');
  }
  return s.slice(0, 80);
}

function truncate(s, max) {
  if (typeof s !== 'string') return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

module.exports = {
  renderField,
  KNOWN_FIELDS,
  _internal: {
    renderLastEvent,
    formatTimestamp,
    truncate,
    renderStatusBadge,
    renderStageLine,
    renderActionHint,
    renderProgress,
    renderTimeMeta,
    renderRecentActivity
  }
};
