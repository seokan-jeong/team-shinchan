// src/dashboard/derived.js
//
// Phase 8 — derive user-meaningful fields from raw WORKFLOW_STATE metadata.
//
// Raw discovery.js fields (`stage`, `phase`, `owner`, `history`) are
// system-internal terms. The dashboard card surfaces these as concrete
// human signals:
//
//   - requestSummary  : one-line summary pulled from REQUESTS.{md,html}
//   - stageInfo       : { number, total, label, progressPct }
//   - actionHint      : { kind, text } | null  (what the user might need to do)
//   - timeMeta        : { elapsedText, updatedRelText }
//   - recentActivity  : last N history events humanised
//
// Zero deps — only Node built-ins. Deterministic given (meta, nowIso).
//
// Author: kazama (Phase 8 information value, main-068).

'use strict';

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────────────────
// Stage → ordinal number mapping. WORKFLOW_STATE.current.stage uses
// short slugs; we expose a 1-of-4 ordinal plus a human label.
const STAGE_ORDER = ['requirements', 'planning', 'implementation', 'completion'];
const STAGE_LABELS = {
  requirements:   { ko: 'Requirements',   short: '요구사항' },
  planning:       { ko: 'Planning',       short: '설계' },
  implementation: { ko: 'Implementation', short: '구현' },
  completion:     { ko: 'Completion',     short: '완료' }
};

// History event names → human verb sentences. Used by extractRecentActivity
// to surface "사용자가 컨펌했습니다" rather than the slug. Wins over
// EVENT_LABELS when both define the same name. `{agent}` placeholder is
// interpolated from ev.agent (or stripped if absent).
const EVENT_VERB_MAP = {
  workflow_started:               '{agent}가 워크플로를 시작했습니다',
  requests_drafted:               '{agent}가 요구사항 초안을 작성했습니다',
  requirements_drafted:           '{agent}가 요구사항 초안을 작성했습니다',
  ak_review:                      '{agent}가 AK 검토를 수행했습니다',
  ak_review_completed:            '{agent}가 AK 검토를 완료했습니다',
  ak_review_approved:             '{agent}가 AK 검토를 승인했습니다',
  ak_review_rejected:             '{agent}가 AK 검토를 거부했습니다',
  user_approved:                  '사용자가 승인했습니다',
  user_confirmed:                 '사용자가 컨펌했습니다',
  stage_transition:               '{agent}가 단계를 전환했습니다',
  plan_drafted:                   '{agent}가 플랜 초안을 작성했습니다',
  plan_inline_fixes:              '{agent}가 플랜 인라인 수정을 적용했습니다',
  interview_progress:             '{agent}가 인터뷰를 진행했습니다',
  interview_done:                 '{agent}가 인터뷰를 완료했습니다',
  interview_completed:            '{agent}가 인터뷰를 완료했습니다',
  implementation_phase_started:   '{agent}가 구현 단계를 시작했습니다',
  implementation_phase_completed: '{agent}가 구현 단계를 완료했습니다',
  implementation_completed:       '{agent}가 구현을 완료했습니다',
  phase_completed:                '{agent}가 단계를 완료했습니다',
  phase_skipped:                  '{agent}가 단계를 건너뛰었습니다',
  closeout_docs_written:          '{agent}가 완료 문서를 작성했습니다',
  workflow_done:                  '{agent}가 워크플로를 완료했습니다',
  auto_expired:                   '워크플로가 자동 만료되었습니다'
};

// History event names → Korean human labels. Unknown names fall back to a
// lightly-pretty-printed slug.
const EVENT_LABELS = {
  workflow_started:               '워크플로 시작',
  auto_archive:                   '만료된 워크플로 자동 정리',
  interview_progress:             '인터뷰 진행',
  requirements_drafted:           'Requirements 초안 작성',
  mechanical_check:               'Mechanical check',
  ak_gate_delegated:              'AK 게이트 위임',
  ak_gate_completed:              'AK 게이트 완료',
  ak_review_completed:            'AK 검토 완료',
  ak_review_approved:             'AK 검토 승인',
  ak_review_rejected:             'AK 검토 거부',
  planning_drafted:               'Planning 초안 작성',
  planning_approved:              'Planning 승인',
  implementation_phase_started:   'Implementation Phase 시작',
  implementation_phase_completed: 'Implementation Phase 완료',
  implementation_completed:       'Implementation 완료',
  stage_advanced:                 '단계 진입',
  status_changed:                 '상태 변경',
  paused:                         '일시정지',
  resumed:                        '재개',
  note_added:                     '노트 추가',
  user_confirmation_requested:    '사용자 컨펌 요청',
  user_confirmed:                 '사용자 컨펌'
};

function humanizeEventName(name) {
  if (!name || typeof name !== 'string') return '활동';
  if (EVENT_LABELS[name]) return EVENT_LABELS[name];
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ──────────────────────────────────────────────────────────────────────
// Request summary — first prose line of REQUESTS.{md,html} for the workflow.

function extractRequestSummary(docDir) {
  // Prefer .md (canonical body); fall back to .html (strip tags).
  const mdPath = path.join(docDir, 'REQUESTS.md');
  const htmlPath = path.join(docDir, 'REQUESTS.html');
  try {
    if (fs.existsSync(mdPath)) {
      return summariseMarkdown(fs.readFileSync(mdPath, 'utf8'));
    }
    if (fs.existsSync(htmlPath)) {
      return summariseHtml(fs.readFileSync(htmlPath, 'utf8'));
    }
  } catch (_) { /* unreadable; fall through */ }
  return null;
}

function summariseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  let title = null;
  let firstParagraph = null;
  let i = 0;
  // Skip leading YAML frontmatter (`---` … `---`). Without this we'd grab
  // `document_type: requirements` as the first paragraph for any doc that
  // uses the team-shinchan canonical frontmatter.
  if (lines[0] !== undefined && lines[0].trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    if (i < lines.length) i++;
  }
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (!title && /^#\s+/.test(t))  { title = t.replace(/^#\s+/, '').trim();  continue; }
    if (!title && /^##\s+/.test(t)) { title = t.replace(/^##\s+/, '').trim(); continue; }
    if (/^[#>\-*`|]/.test(t))       continue;     // skip lists, quotes, code, headings, tables
    firstParagraph = t;
    break;
  }
  return pickSummary(title, firstParagraph);
}

function summariseHtml(text) {
  const titleMatch = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || text.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const paraMatch = text.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).trim() : null;
  const para = paraMatch ? stripTags(paraMatch[1]).trim() : null;
  return pickSummary(title, para);
}

function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, m => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' '
  })[m] || m).replace(/\s+/g, ' ');
}

function pickSummary(title, firstParagraph) {
  const cleanTitle = stripTitlePrefix((title || '').replace(/\s+/g, ' ').trim());
  const p = (firstParagraph || '').replace(/\s+/g, ' ').trim();
  // Prefer title if it's substantive (>= 4 chars and not just the workflow ID).
  if (cleanTitle && cleanTitle.length >= 4 && !/^(main|issue)[-_]?\d+$/i.test(cleanTitle)) return clamp(cleanTitle, 140);
  if (p) return clamp(p, 140);
  if (cleanTitle) return clamp(cleanTitle, 140);
  return null;
}

// Strip leading boilerplate from canonical titles like "Requirements: …",
// "Plan: …", "Implementation Plan: …" — these are document-type labels that
// add noise to the dashboard summary.
function stripTitlePrefix(t) {
  return t.replace(/^(Requirements?|Planning?|Plan|Implementation(?:\s+Plan)?|Completion|Retrospective)\s*[:：]\s*/i, '');
}

function clamp(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s\S*$/, '') + '…';
}

// ──────────────────────────────────────────────────────────────────────
// Stage info — ordinal position + visual progress percentage.

function computeStageInfo(stage, phase, status) {
  const idx = STAGE_ORDER.indexOf(stage);
  const number = idx === -1 ? 0 : idx + 1;
  const total = STAGE_ORDER.length;
  const label = STAGE_LABELS[stage] ? STAGE_LABELS[stage].ko : (stage || 'Unknown');
  // Done workflows are 100% regardless of where the phase counter stopped —
  // status is the authoritative completion signal.
  if (status === 'done') {
    return { number, total, label, phase: phase ?? null, progressPct: 100 };
  }
  // Progress = stage / total, plus phase-fraction (rough; max 25 % per stage).
  // phase like "6" or "6.3" pushes progress within the current stage.
  let phaseFrac = 0;
  if (phase != null) {
    const p = parseFloat(String(phase));
    if (!isNaN(p) && p > 0) {
      // Saturate at 8 phases per stage; anything beyond counts as full.
      phaseFrac = Math.min(1, p / 8);
    }
  }
  const stageProgress = number > 0 ? ((number - 1) + phaseFrac) / total : 0;
  return {
    number,
    total,
    label,
    phase: phase ?? null,
    progressPct: Math.round(stageProgress * 100)
  };
}

// ──────────────────────────────────────────────────────────────────────
// Action hint — what the user might need to do right now.

function computeActionHint(meta) {
  if (!meta) return null;
  const status = meta.status;
  if (status === 'paused')   return { kind: 'paused',  text: '일시정지됨 — 재개하려면 사용자 액션 필요' };
  if (status === 'expired')  return { kind: 'expired', text: '만료됨 (7일 비활성) — 정리 필요' };
  if (status === 'archived') return null;     // archived needs no action
  if (status === 'done')     return null;     // done needs no action — must precede stage branches

  const stage = meta.stage;
  const ak = meta.ak_gate || {};
  const ig = meta.interview || {};

  // Interview in progress.
  if (stage === 'requirements' && ig && ig.collected_count != null && ig.last_question) {
    return { kind: 'interview', text: '인터뷰 진행 중 — 사용자 답변 대기' };
  }
  // AK rejection.
  for (const gateName of ['requirements', 'planning']) {
    const g = ak[gateName];
    if (g && g.status === 'rejected') {
      return { kind: 'ak_rejected', text: `AK ${gateName} 게이트 거부 — 수정 필요` };
    }
    if (g && g.status === 'escalated') {
      return { kind: 'ak_escalated', text: `AK ${gateName} 게이트 escalated — 사용자 판단 필요` };
    }
  }
  // Stage transition signals.
  if (stage === 'implementation' && ak.planning && ak.planning.status === 'approved') {
    // Could also check if Phase 6 / final phase is complete via history events.
    // We at least mark it as runnable; UI may further inspect history.
    return { kind: 'stage_ready', text: 'Stage 4 (Completion) 진입 대기 — 사용자 컨펌 필요' };
  }
  if (stage === 'completion') {
    return { kind: 'stage_completing', text: '워크플로 마무리 진행 중' };
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Relative time helpers ("12분 전", "1일 6시간 진행").

function parseIso(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatRelative(then, now) {
  if (!then) return null;
  const ms = (now ? now.getTime() : Date.now()) - then.getTime();
  if (ms < 0) return '방금';
  const s = Math.floor(ms / 1000);
  if (s < 30)        return '방금';
  if (s < 60)        return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60)        return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24)        return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7)         return `${d}일 전`;
  const w = Math.floor(d / 7);
  if (w < 5)         return `${w}주 전`;
  const mo = Math.floor(d / 30);
  if (mo < 12)       return `${mo}개월 전`;
  return `${Math.floor(d / 365)}년 전`;
}

function formatElapsed(start, now) {
  if (!start) return null;
  const ms = (now ? now.getTime() : Date.now()) - start.getTime();
  if (ms < 0) return '0분';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}일 ${h}시간` : `${d}일`;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return `${m}분`;
  return '방금 시작';
}

function computeTimeMeta(meta, nowIso) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const created = parseIso(meta.created);
  const updated = parseIso(meta.updated);
  return {
    elapsedText:     created ? `${formatElapsed(created, now)} 진행` : null,
    updatedRelText:  updated ? `${formatRelative(updated, now)} 업데이트` : null
  };
}

// ──────────────────────────────────────────────────────────────────────
// Recent activity — last N history events as human strings.

function extractRecentActivity(history, n, nowIso) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const now = nowIso ? new Date(nowIso) : new Date();
  const limit = Math.max(1, n || 3);
  const tail = history.slice(-limit).reverse();
  return tail.map(ev => {
    const ts = ev && ev.timestamp ? parseIso(ev.timestamp) : null;
    const evName = ev && ev.event;
    const agentVal = ev && typeof ev.agent === 'string' ? ev.agent : null;
    let eventLabel;
    if (evName && EVENT_VERB_MAP[evName]) {
      const template = EVENT_VERB_MAP[evName];
      eventLabel = agentVal
        ? template.replace('{agent}', agentVal)
        : template.replace('{agent}가 ', '').replace('{agent}이 ', '').replace('{agent} ', '');
    } else {
      eventLabel = humanizeEventName(evName);
    }
    const noteVal = ev && typeof ev.note === 'string' ? clamp(ev.note, 90) : null;
    return {
      relativeTime: ts ? formatRelative(ts, now) : null,
      agent:        agentVal,
      eventLabel:   noteVal ? `${eventLabel} — ${noteVal}` : eventLabel,
      note:         noteVal
    };
  });
}

// ──────────────────────────────────────────────────────────────────────
// Status → Korean phrase, mostly for the card heading.

const STATUS_LABELS = {
  active:    '진행 중',
  paused:    '일시정지',
  archived:  '아카이브',
  expired:   '만료',
  completed: '완료'
};
function statusLabel(s) { return STATUS_LABELS[s] || s || '상태 미상'; }

/**
 * Augment a raw meta object (from discovery.readWorkflowMeta) with derived,
 * user-meaningful fields. Pure function — does not mutate input.
 *
 * opts:
 *   nowIso  — ISO timestamp string, makes relative time deterministic for tests.
 *   history — full history array from the YAML (discovery doesn't expose it
 *             on the returned meta; callers pass it explicitly).
 *   docDir  — directory containing REQUESTS.{md,html}; defaults to dirname(yaml_path).
 */
function deriveCardFields(meta, opts) {
  if (!meta || typeof meta !== 'object') return meta;
  const nowIso = opts && opts.nowIso;
  const docDir = opts && opts.docDir
    ? opts.docDir
    : (meta.yaml_path ? path.dirname(meta.yaml_path) : null);

  const historySource = opts && Array.isArray(opts.history)
    ? opts.history
    : (Array.isArray(meta._history)
        ? meta._history
        : (Array.isArray(meta.history) ? meta.history : []));

  const requestSummary = docDir ? extractRequestSummary(docDir) : null;
  const stageInfo = computeStageInfo(meta.stage, meta.phase, meta.status);
  const actionHint = computeActionHint(meta);
  const timeMeta = computeTimeMeta(meta, nowIso);
  const recentActivity = extractRecentActivity(historySource, 3, nowIso);

  return Object.assign({}, meta, {
    requestSummary,
    stageInfo,
    actionHint,
    timeMeta,
    recentActivity,
    statusLabel: statusLabel(meta.status)
  });
}

module.exports = {
  deriveCardFields,
  computeStageInfo,
  computeActionHint,
  computeTimeMeta,
  extractRequestSummary,
  extractRecentActivity,
  formatRelative,
  formatElapsed,
  humanizeEventName,
  statusLabel,
  STAGE_ORDER,
  STAGE_LABELS,
  EVENT_LABELS,
  EVENT_VERB_MAP
};
