// tests/dashboard/derived.test.js
//
// Phase 8 — unit tests for the derivation layer.
//
// derived.js maps raw discovery.readWorkflowMeta output (system-internal
// stage/phase/owner/history) into user-meaningful fields that the card
// surfaces directly: requestSummary, stageInfo, actionHint, timeMeta,
// recentActivity, statusLabel.
//
// Pure-function tests — no server, no filesystem (except for the few
// extractRequestSummary cases that read a tmp file via fs).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
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
  STAGE_ORDER
} = require('../../src/dashboard/derived');

// ─── computeStageInfo ───────────────────────────────────────────────

test('computeStageInfo maps known stages to 1-of-4 ordinals', () => {
  assert.deepEqual(computeStageInfo('requirements', null), {
    number: 1, total: 4, label: 'Requirements', phase: null, progressPct: 0
  });
  assert.equal(computeStageInfo('planning', null).number, 2);
  assert.equal(computeStageInfo('implementation', null).number, 3);
  assert.equal(computeStageInfo('completion', null).number, 4);
});

test('computeStageInfo on unknown stage degrades to number 0 + raw label', () => {
  const info = computeStageInfo('mystery', null);
  assert.equal(info.number, 0);
  assert.equal(info.label, 'mystery');
  assert.equal(info.progressPct, 0);
});

test('computeStageInfo phase contributes a fraction (saturates at 8)', () => {
  // Stage 3 of 4 with phase 6 → ((3-1) + 6/8) / 4 = (2 + 0.75) / 4 = 0.6875
  // rounded = 69
  assert.equal(computeStageInfo('implementation', '6').progressPct, 69);
  // Phase 100 saturates to 1 → 75 %
  assert.equal(computeStageInfo('implementation', '100').progressPct, 75);
  // Invalid phase → no contribution → 50 %
  assert.equal(computeStageInfo('implementation', 'oops').progressPct, 50);
});

// ─── computeActionHint ──────────────────────────────────────────────

test('computeActionHint flags paused / expired statuses', () => {
  assert.equal(computeActionHint({ status: 'paused' }).kind, 'paused');
  assert.equal(computeActionHint({ status: 'expired' }).kind, 'expired');
});

test('computeActionHint returns null for archived (no action needed)', () => {
  assert.equal(computeActionHint({ status: 'archived' }), null);
});

test('computeActionHint detects in-progress requirements interview', () => {
  const hint = computeActionHint({
    status: 'active', stage: 'requirements',
    interview: { collected_count: 2, last_question: 'X?' }
  });
  assert.equal(hint.kind, 'interview');
});

test('computeActionHint surfaces AK rejected / escalated gates', () => {
  assert.equal(computeActionHint({
    status: 'active', stage: 'planning',
    ak_gate: { requirements: { status: 'rejected' } }
  }).kind, 'ak_rejected');
  assert.equal(computeActionHint({
    status: 'active', stage: 'planning',
    ak_gate: { planning: { status: 'escalated' } }
  }).kind, 'ak_escalated');
});

test('computeActionHint suggests Stage-4 entry when planning is approved', () => {
  const hint = computeActionHint({
    status: 'active', stage: 'implementation',
    ak_gate: { planning: { status: 'approved' } }
  });
  assert.equal(hint.kind, 'stage_ready');
});

// ─── formatRelative / formatElapsed ─────────────────────────────────

test('formatRelative buckets time into 방금/N분 전/N시간 전/N일 전', () => {
  const now = new Date('2026-05-18T12:00:00Z');
  assert.equal(formatRelative(new Date(now - 10_000), now), '방금');           // <30s
  assert.equal(formatRelative(new Date(now - 45_000), now), '45초 전');
  assert.equal(formatRelative(new Date(now - 5 * 60_000), now), '5분 전');
  assert.equal(formatRelative(new Date(now - 3 * 3600_000), now), '3시간 전');
  assert.equal(formatRelative(new Date(now - 2 * 86_400_000), now), '2일 전');
});

test('formatRelative future timestamps collapse to 방금', () => {
  const now = new Date('2026-05-18T12:00:00Z');
  assert.equal(formatRelative(new Date(now.getTime() + 10_000), now), '방금');
});

test('formatElapsed renders 일/시간/분 with sensible omission', () => {
  const now = new Date('2026-05-18T12:00:00Z');
  assert.equal(formatElapsed(new Date(now - 86_400_000 * 2 - 3600_000 * 6), now), '2일 6시간');
  assert.equal(formatElapsed(new Date(now - 3600_000 * 3 - 60_000 * 15), now), '3시간 15분');
  assert.equal(formatElapsed(new Date(now - 30_000), now), '방금 시작');
});

// ─── computeTimeMeta ────────────────────────────────────────────────

test('computeTimeMeta combines elapsedText + updatedRelText from created/updated', () => {
  const meta = {
    created: '2026-05-16T00:00:00Z',
    updated: '2026-05-18T11:50:00Z'
  };
  const tm = computeTimeMeta(meta, '2026-05-18T12:00:00Z');
  assert.match(tm.elapsedText,    /진행/);
  assert.match(tm.updatedRelText, /업데이트/);
});

// ─── humanizeEventName + statusLabel ────────────────────────────────

test('humanizeEventName maps known events to Korean', () => {
  assert.equal(humanizeEventName('workflow_started'),  '워크플로 시작');
  assert.equal(humanizeEventName('ak_review_approved'), 'AK 검토 승인');
});

test('humanizeEventName falls back to title-cased slug for unknown events', () => {
  assert.equal(humanizeEventName('some_brand_new_event'), 'Some Brand New Event');
});

test('statusLabel maps known statuses to Korean', () => {
  assert.equal(statusLabel('active'),   '진행 중');
  assert.equal(statusLabel('paused'),   '일시정지');
  assert.equal(statusLabel('archived'), '아카이브');
  assert.equal(statusLabel('weird'),    'weird');
});

// ─── extractRecentActivity ──────────────────────────────────────────

test('extractRecentActivity returns last N events, newest first, humanised', () => {
  const now = '2026-05-18T12:00:00Z';
  const history = [
    { timestamp: '2026-05-18T11:00:00Z', event: 'workflow_started', agent: 'shinnosuke' },
    { timestamp: '2026-05-18T11:30:00Z', event: 'ak_review_approved', agent: 'ak' },
    { timestamp: '2026-05-18T11:50:00Z', event: 'note_added', agent: 'misae', note: 'looks good' }
  ];
  const out = extractRecentActivity(history, 2, now);
  assert.equal(out.length, 2);
  // note_added is not in EVENT_VERB_MAP → EVENT_LABELS fallback ('노트 추가'),
  // then note appended via " — {note}" composition.
  assert.equal(out[0].eventLabel, '노트 추가 — looks good');
  assert.equal(out[0].note, 'looks good');
  assert.equal(out[0].agent, 'misae');
  // ak_review_approved IS in EVENT_VERB_MAP → '{agent}가 AK 검토를 승인했습니다'.
  assert.equal(out[1].eventLabel, 'ak가 AK 검토를 승인했습니다');
  assert.match(out[0].relativeTime, /분 전/);
});

test('extractRecentActivity tolerates empty / non-array input', () => {
  assert.deepEqual(extractRecentActivity(null, 3, '2026-05-18'),      []);
  assert.deepEqual(extractRecentActivity(undefined, 3, '2026-05-18'), []);
  assert.deepEqual(extractRecentActivity([], 3, '2026-05-18'),         []);
});

// ─── extractRequestSummary ──────────────────────────────────────────

test('extractRequestSummary pulls the H1 title from REQUESTS.md', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  fs.writeFileSync(path.join(dir, 'REQUESTS.md'),
    '# 팀신짱 대시보드 HTML 전환\n\n첫 단락입니다.\n');
  assert.equal(extractRequestSummary(dir), '팀신짱 대시보드 HTML 전환');
});

test('extractRequestSummary falls back to first paragraph if title is just the workflow ID', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  fs.writeFileSync(path.join(dir, 'REQUESTS.md'),
    '# main-068\n\n실제 의미 있는 첫 단락입니다.\n');
  assert.equal(extractRequestSummary(dir), '실제 의미 있는 첫 단락입니다.');
});

test('extractRequestSummary reads .html if .md is missing and strips tags', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  fs.writeFileSync(path.join(dir, 'REQUESTS.html'),
    '<h1>HTML 제목</h1><p>본문 단락</p>');
  assert.equal(extractRequestSummary(dir), 'HTML 제목');
});

test('extractRequestSummary returns null when no REQUESTS file exists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  assert.equal(extractRequestSummary(dir), null);
});

test('extractRequestSummary skips YAML frontmatter (--- … ---) before scanning', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  fs.writeFileSync(path.join(dir, 'REQUESTS.md'),
    '---\ndocument_type: requirements\nstatus: draft\n---\n\n# 진짜 제목\n\n본문\n');
  assert.equal(extractRequestSummary(dir), '진짜 제목');
});

test('extractRequestSummary strips boilerplate prefixes like "Requirements:"', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  fs.writeFileSync(path.join(dir, 'REQUESTS.md'),
    '# Requirements: 팀신짱 대시보드 HTML 전환\n');
  assert.equal(extractRequestSummary(dir), '팀신짱 대시보드 HTML 전환');
});

// ─── deriveCardFields (integration) ─────────────────────────────────

test('deriveCardFields augments meta with all derived fields and is non-mutating', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-derived-'));
  fs.writeFileSync(path.join(dir, 'REQUESTS.md'), '# 사용자 요청\n\n본문.\n');
  const meta = {
    doc_id: 'main-068',
    yaml_path: path.join(dir, 'WORKFLOW_STATE.yaml'),
    stage: 'implementation',
    phase: '6',
    status: 'active',
    created: '2026-05-16T00:00:00Z',
    updated: '2026-05-18T11:30:00Z',
    ak_gate: { planning: { status: 'approved' } }
  };
  const original = JSON.parse(JSON.stringify(meta));
  const out = deriveCardFields(meta, {
    nowIso: '2026-05-18T12:00:00Z',
    history: [
      { timestamp: '2026-05-18T11:30:00Z', event: 'ak_review_approved', agent: 'ak' }
    ]
  });
  assert.equal(out.requestSummary, '사용자 요청');
  assert.equal(out.stageInfo.number, 3);
  assert.equal(out.actionHint.kind, 'stage_ready');
  assert.match(out.timeMeta.elapsedText, /진행/);
  assert.equal(out.recentActivity.length, 1);
  assert.equal(out.statusLabel, '진행 중');
  // Input was not mutated.
  assert.deepEqual(meta, original);
});

test('deriveCardFields tolerates null / non-object input', () => {
  assert.equal(deriveCardFields(null), null);
  assert.equal(deriveCardFields(undefined), undefined);
});

test('STAGE_ORDER is the canonical 4-element list', () => {
  assert.deepEqual(STAGE_ORDER, ['requirements', 'planning', 'implementation', 'completion']);
});
