// tests/dashboard/views.test.js
//
// Phase 4 — pure-function unit tests for the view layer.
//
// Validates:
//   - escape.js correctly escapes XSS payloads in text and attribute contexts.
//   - card.js renders the data-ts-card / data-doc-id / data-ts-status hooks
//     required by LOW-2 Tier 1 (outerHTML swap).
//   - field.js renders just the inner content (no wrapper) for LOW-2 Tier 2.
//   - grid.js wraps cards in #ts-grid with the right data-ts-count.
//   - actions.js produces hx-target/hx-swap pairs that match Tier 1.
//   - files.js renders absolute-path-safe links (uses rel_path verbatim
//     through encodeURIComponent).
//
// All tests are pure-function (no server, no filesystem) and run sub-millisecond.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { escapeHtml, escapeAttr, stringifyJsonForScript } = require('../../src/dashboard/views/escape');
const { renderCard } = require('../../src/dashboard/views/card');
const { renderField, KNOWN_FIELDS } = require('../../src/dashboard/views/field');
const { renderGrid } = require('../../src/dashboard/views/grid');
const { renderActions } = require('../../src/dashboard/views/actions');
const { renderFilesList, _internal: filesInternal } = require('../../src/dashboard/views/files');
const { renderLayout } = require('../../src/dashboard/views/layout');
const { renderIndex } = require('../../src/dashboard/views/index');
const {
  renderDocPanel,
  renderDocPanelEmpty,
  _internal: docPanelInternal
} = require('../../src/dashboard/views/doc-panel');

// ─── shared fixtures ─────────────────────────────────────────────────

function makeMeta(overrides) {
  return Object.assign({
    doc_id: 'main-068',
    category: 'active',
    schema_version: 2,
    created: '2026-05-17',
    updated: '2026-05-17T15:45:00Z',
    output_format: 'markdown',
    stage: 'execution',
    phase: '4',
    owner: 'kazama',
    status: 'active',
    interview: null,
    ak_gate: null,
    notes: [],
    history_length: 30,
    last_event: {
      timestamp: '2026-05-17T15:40:00Z',
      event: 'phase_transition',
      agent: 'shinnosuke',
      note: 'Phase 3 → Phase 4'
    },
    mtime: '2026-05-17T15:45:00Z'
  }, overrides || {});
}

// ─── escape.js ──────────────────────────────────────────────────────

test('escapeHtml escapes the six dangerous characters', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
  assert.equal(escapeHtml('"foo"&\'bar\''), '&quot;foo&quot;&amp;&#39;bar&#39;');
  assert.equal(escapeHtml('a/b=c`d'), 'a&#x2F;b&#x3D;c&#x60;d');
});

test('escapeHtml handles null, undefined, numbers, booleans', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(false), 'false');
});

test('escapeAttr behaves identically to escapeHtml at attribute boundaries', () => {
  const evil = '" onmouseover="alert(1)';
  assert.equal(escapeAttr(evil), '&quot; onmouseover&#x3D;&quot;alert(1)');
});

test('stringifyJsonForScript neutralises </ for safe <script> embedding', () => {
  const out = stringifyJsonForScript({ html: '<script>x</script>', text: '</body>' });
  assert.ok(!/<\/script>/i.test(out), 'must not contain literal </script>');
  assert.ok(out.includes('<\\/script>'));
  assert.ok(out.includes('<\\/body>'));
});

test('stringifyJsonForScript neutralises U+2028 / U+2029 line separators', () => {
  const sep = String.fromCharCode(0x2028) + String.fromCharCode(0x2029);
  const out = stringifyJsonForScript({ text: 'line1' + sep + 'line2' });
  assert.ok(out.includes('\\u2028'));
  assert.ok(out.includes('\\u2029'));
});

// ─── card.js ────────────────────────────────────────────────────────

test('renderCard emits LOW-2 Tier-1 selectors (data-ts-card + data-doc-id)', () => {
  const html = renderCard(makeMeta());
  // AC-6c: data-doc-id must be present so legacy AC grep continues to count.
  assert.match(html, /data-doc-id="main-068"/);
  // LOW-2 Tier-1 selector: data-ts-card
  assert.match(html, /data-ts-card="main-068"/);
  // Status badge with data-ts-status — used for CSS colouring.
  assert.match(html, /data-ts-status="active"/);
  // Aria-labelled-by must reference a real heading id.
  assert.match(html, /aria-labelledby="ts-card-title-main-068"/);
  assert.match(html, /id="ts-card-title-main-068"/);
});

test('renderCard escapes hostile content in title / hint / recent-activity', () => {
  // Phase 8 information-first card surfaces requestSummary, actionHint, and
  // recentActivity instead of raw owner/last-event. Every user-facing string
  // must still be escaped — defence in depth.
  const meta = makeMeta({
    requestSummary: '<img src=x onerror=alert(1)>',
    actionHint: { kind: 'paused', text: '"><script>hint</script>' },
    recentActivity: [
      { relativeTime: '12분 전', agent: '<b>kazama</b>', eventLabel: 'evil',
        note: '"><script>note</script>' }
    ]
  });
  const html = renderCard(meta);
  // No live HTML survives.
  assert.ok(!html.includes('<img src=x'),       'title (requestSummary) must be escaped');
  assert.ok(!html.includes('<script>hint'),     'action-hint text must be escaped');
  assert.ok(!html.includes('<script>note'),     'recent-activity note must be escaped');
  assert.ok(!html.includes('<b>kazama'),        'recent-activity agent must be escaped');
  // …but the escaped form is present.
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script&gt;hint/);
  assert.match(html, /&lt;script&gt;note/);
});

test('renderCard exposes each Phase-8 field with data-ts-field for Tier-2 swap', () => {
  const html = renderCard(makeMeta());
  // Phase 8.3 information-first slots — each rendered through a data-ts-field
  // hook so the server may emit a Tier-2 innerHTML swap when only that slot
  // changes (cheaper than re-rendering the whole card).
  // The 'actions' slot was removed in 8.3 along with the footer; agents POST
  // to /api/workflow/:id/action directly, no card surface needed.
  const fields = [
    'status-badge', 'stage-line', 'title',
    'action-hint', 'progress', 'time-meta', 'recent-activity'
  ];
  for (const field of fields) {
    assert.match(html, new RegExp(`data-ts-field="main-068:${field}"`),
      `missing field hook: ${field}`);
  }
});

test('renderCard wires hx-get to load doc panel on click (Phase 8.3 master-detail)', () => {
  // Phase 8.3 collapsed the new-tab "folder" / "files" affordances into a
  // single click target: the whole card body loads the workflow's documents
  // into #ts-doc-panel via HTMX, no navigation.
  const html = renderCard(makeMeta());
  assert.match(html, /hx-get="\/partial\/doc\/main-068"/);
  assert.match(html, /hx-target="#ts-doc-panel"/);
  assert.match(html, /hx-swap="innerHTML"/);
  // hx-push-url is explicitly false — refreshing the page must not deep-link
  // into a transient panel state.
  assert.match(html, /hx-push-url="false"/);
  // Keyboard accessibility: role + tabindex so non-mouse users can open it.
  assert.match(html, /role="button"/);
  assert.match(html, /tabindex="0"/);
});

test('renderCard omits hx-get wiring when includeActions=false (inert snapshot)', () => {
  // includeActions=false is used by mail / snapshot contexts where the card
  // must render without any interactive behaviour. The wiring (and the role)
  // must be absent so screen readers don't announce a non-functional button.
  const html = renderCard(makeMeta(), { includeActions: false });
  assert.ok(!html.includes('hx-get="/partial/doc/'),
    'inert card must not be clickable');
  assert.ok(!html.includes('role="button"'),
    'inert card must not advertise a button role');
  assert.ok(!html.includes('class="ts-actions"'),
    'no actions footer in any mode after Phase 8.3');
});

test('renderCard for archived workflow omits pause/archive/folder/note (Phase 8.3 clean surface)', () => {
  // Phase 8.3 removed the footer entirely — folder/files are no longer on the
  // card because the side panel renders documents in-place. Verifying that
  // none of the older footer affordances crept back is the regression guard.
  const html = renderCard(makeMeta({ category: 'archived', status: 'archived' }));
  assert.ok(!html.includes('action":"pause'), 'archived must not show pause button');
  assert.ok(!html.includes('action":"archive'), 'archived must not show archive button');
  assert.ok(!html.includes('class="ts-note-form'), 'note form must not exist anywhere');
  assert.ok(!html.includes('/docs/main-068/folder'), 'folder link removed in 8.3');
  assert.ok(!html.includes('hx-get="/partial/files/'), 'files dropdown removed in 8.3');
});

test('renderCard Phase 8.2 layout: top-row splits status badge + stage text', () => {
  const html = renderCard(makeMeta());
  // ts-card-top-row is the flex container that puts status LEFT, stage RIGHT.
  assert.match(html, /class="ts-card-top-row"/);
  // Phase 8.2: the stage slot dropped its chip box — class is now ts-card-stage.
  assert.match(html, /class="ts-card-stage"/);
  // doc_id is rendered as a code footnote under the title, not as the title.
  assert.match(html, /class="ts-card-docid"/);
  assert.match(html, /<code>main-068<\/code>/);
});

// ─── field.js ───────────────────────────────────────────────────────

test('renderField returns just the inner content (no wrapper) for innerHTML swap', () => {
  const meta = makeMeta();
  assert.equal(renderField(meta, 'stage'), 'execution');
  assert.equal(renderField(meta, 'phase'), '4');
  assert.equal(renderField(meta, 'owner'), 'kazama');
  // status keeps its badge span because the colour token is part of the field.
  assert.equal(renderField(meta, 'status'),
    '<span class="ts-status" data-ts-status="active">active</span>');
});

test('renderField returns "—" placeholder for missing values', () => {
  const empty = makeMeta({ stage: null, phase: null, owner: null, updated: null });
  assert.equal(renderField(empty, 'stage'), '—');
  assert.equal(renderField(empty, 'phase'), '—');
  assert.equal(renderField(empty, 'owner'), '—');
  assert.equal(renderField(empty, 'updated'), '—');
});

test('renderField updated trims ISO timestamp to YYYY-MM-DD HH:MM', () => {
  assert.equal(renderField(makeMeta(), 'updated'), '2026-05-17 15:45');
});

test('renderField last-event escapes hostile note content', () => {
  const meta = makeMeta({
    last_event: { event: 'normal', agent: 'kazama', note: '<script>alert(1)</script>', timestamp: '2026-05-17T15:00:00Z' }
  });
  const out = renderField(meta, 'last-event');
  assert.ok(!out.includes('<script>'));
  assert.match(out, /&lt;script&gt;/);
});

test('renderField returns empty for unknown field name (safe default)', () => {
  assert.equal(renderField(makeMeta(), 'unknown-field'), '');
});

test('KNOWN_FIELDS lists Phase-8 information slots plus legacy names', () => {
  // Phase 8: information-first slots are added; legacy field names stay so
  // the /partial/field/<id>/<name> route remains backwards-compatible for
  // any tooling that pinned to the old names.
  assert.deepEqual([...KNOWN_FIELDS].sort(), [
    // Phase 8
    'action-hint', 'progress', 'recent-activity', 'stage-line',
    'status-badge', 'time-meta', 'title',
    // Legacy
    'last-event', 'owner', 'phase', 'stage', 'status', 'updated'
  ].sort());
});

// ─── Phase 8 field renderers ────────────────────────────────────────

test('renderField status-badge emits dot + Korean label using statusLabel', () => {
  const meta = makeMeta({ status: 'paused', statusLabel: '일시정지' });
  const out = renderField(meta, 'status-badge');
  assert.match(out, /data-ts-status="paused"/);
  assert.match(out, /class="ts-status-dot"/);
  assert.match(out, /일시정지/);
});

test('renderField stage-line emits flat "label n/total" text (no chip box)', () => {
  // Phase 8.2: stage-line is plain text — label + faint count. No chip box,
  // no separator glyph. Phase stays in the progress row to avoid the
  // "Phase 6 / 4" fraction misread.
  const meta = makeMeta({
    stage: 'implementation', phase: '6',
    stageInfo: { number: 3, total: 4, label: 'Implementation', phase: '6', progressPct: 62 }
  });
  const out = renderField(meta, 'stage-line');
  assert.match(out, /class="ts-stage-label">Implementation</);
  assert.match(out, /class="ts-stage-count"[^>]*>3\/4</);
  // Accessible label still describes the fraction for screen readers.
  assert.match(out, /aria-label="Stage 3 of 4"/);
  // Critical regression guard: stage-line must NOT carry the phase number.
  assert.ok(!/Phase\s*6/.test(out),
    'stage-line must not include phase (moved to progress row)');
});

test('renderField action-hint returns empty when hint is null (CSS :empty hides slot)', () => {
  assert.equal(renderField(makeMeta({ actionHint: null }), 'action-hint'), '');
});

test('renderField action-hint carries data-ts-hint with the kind for styling', () => {
  const meta = makeMeta({ actionHint: { kind: 'paused', text: '일시정지됨 — 사용자 액션 필요' } });
  const out = renderField(meta, 'action-hint');
  assert.match(out, /data-ts-hint="paused"/);
  assert.match(out, /일시정지됨/);
  assert.match(out, /role="note"/);
});

test('renderField progress renders progressbar + phase label + visible % (no step dots)', () => {
  // Phase 8.2: step dots were removed (redundant with the bar). The progress
  // row keeps the hairline bar + Phase label LEFT + pct RIGHT.
  const meta = makeMeta({
    phase: '6',
    stageInfo: { number: 3, total: 4, progressPct: 62, phase: '6' }
  });
  const out = renderField(meta, 'progress');
  assert.match(out, /role="progressbar"/);
  assert.match(out, /aria-valuenow="62"/);
  assert.match(out, /62%/);
  assert.match(out, /Phase 6/);
  // Regression guard: step dots removed and must not return — Linear-style
  // progress bars stand alone without per-step indicators.
  assert.ok(!out.includes('ts-progress-dot'),
    'step dots were removed in Phase 8.2 (redundant with the bar)');
});

test('renderField time-meta lays elapsed LEFT / updated RIGHT in a flex row', () => {
  // Phase 8.1: the explicit dot separator was dropped in favour of a flex
  // row with justify-content: space-between (so the L/R split tracks the
  // card width and survives narrow columns gracefully).
  const meta = makeMeta({ timeMeta: { elapsedText: '2일 6시간 진행', updatedRelText: '12분 전 업데이트' } });
  const out = renderField(meta, 'time-meta');
  assert.match(out, /class="ts-time-row"/);
  assert.match(out, /class="ts-time-elapsed">2일 6시간 진행/);
  assert.match(out, /class="ts-time-updated">12분 전 업데이트/);
});

test('renderField recent-activity renders single-line <li> rows with time/agent/event', () => {
  // Phase 8.1: each row collapses to one line; the note is truncated to 50
  // characters and the full text is exposed via title= for hover.
  const meta = makeMeta({
    recentActivity: [
      { relativeTime: '12분 전', agent: 'kazama', eventLabel: 'Phase 완료', note: '문서 작성' },
      { relativeTime: '1시간 전', agent: 'ak', eventLabel: 'AK 승인', note: null }
    ]
  });
  const out = renderField(meta, 'recent-activity');
  assert.match(out, /<ul class="ts-recent-list">/);
  assert.match(out, /class="ts-recent-item"/);
  assert.match(out, /class="ts-recent-time">12분 전/);
  assert.match(out, /class="ts-recent-agent">kazama/);
  assert.match(out, /class="ts-recent-event">Phase 완료/);
  assert.match(out, /class="ts-recent-event">AK 승인/);
  // Item with a note carries an inline ts-recent-note span; item without a
  // note (the AK row) does not.
  assert.match(out, /class="ts-recent-note"[^>]*>문서 작성/);
});

test('renderField recent-activity truncates long notes to 50 chars and exposes full text in title=', () => {
  const longNote = 'a'.repeat(120);
  const meta = makeMeta({
    recentActivity: [
      { relativeTime: '5분 전', agent: 'kazama', eventLabel: '작업', note: longNote }
    ]
  });
  const out = renderField(meta, 'recent-activity');
  // truncated display: 49 chars + ellipsis (truncate() reserves 1 char for …).
  assert.match(out, /class="ts-recent-note"[^>]*>a{49}…/);
  // full text preserved in the title= for hover (escaped).
  assert.ok(out.includes('title="' + longNote + '"'));
});

test('renderField recent-activity returns empty-state when list is empty', () => {
  const out = renderField(makeMeta({ recentActivity: [] }), 'recent-activity');
  assert.match(out, /class="ts-recent-empty"/);
  assert.match(out, /아직 활동이 없습니다/);
});

// ─── grid.js ────────────────────────────────────────────────────────

test('renderGrid wraps cards in #ts-grid with data-ts-count', () => {
  const html = renderGrid([makeMeta(), makeMeta({ doc_id: 'demo-002' })]);
  assert.match(html, /id="ts-grid"/);
  assert.match(html, /data-ts-count="2"/);
  assert.match(html, /data-ts-card="main-068"/);
  assert.match(html, /data-ts-card="demo-002"/);
});

test('renderGrid empty-state shows status message and count=0', () => {
  const html = renderGrid([]);
  assert.match(html, /data-ts-count="0"/);
  assert.match(html, /No active workflows found\./);
  assert.match(html, /class="ts-grid-empty"/);
});

test('renderGrid handles non-array input defensively', () => {
  const html = renderGrid(null);
  assert.match(html, /data-ts-count="0"/);
});

// ─── actions.js ─────────────────────────────────────────────────────

test('renderActions exposes folder link + files dropdown only (pause/archive removed)', () => {
  // Phase 8.2: pause / archive / note were all stripped from the card surface
  // (low click-rate vs. the visual cost). Agents still POST those actions to
  // /api/workflow/:id/action — server.js applyAction is unchanged. The card
  // footer now offers only the affordances a human reaches for while
  // scanning the grid.
  const html = renderActions(makeMeta());
  assert.match(html, /href="\/docs\/main-068\/folder"/);
  assert.match(html, /hx-get="\/partial\/files\/main-068"/);
  // Regression guards: removed buttons must not creep back.
  assert.ok(!/"action":"pause"/.test(html),  'pause button was removed');
  assert.ok(!/"action":"archive"/.test(html), 'archive button was removed');
  assert.ok(!/"action":"resume"/.test(html), 'resume button was removed');
  assert.ok(!html.includes('class="ts-note-form'), 'note form was removed in Phase 8');
});

test('renderActions for paused workflow renders the same minimal footer (no resume button)', () => {
  // Phase 8.2: paused workflows show the same actions row as active ones —
  // status is communicated by the card border + status badge, not by an
  // inline resume button.
  const html = renderActions(makeMeta({ status: 'paused' }));
  assert.match(html, /href="\/docs\/main-068\/folder"/);
  assert.ok(!/"action":"resume"/.test(html));
  assert.ok(!/"action":"pause"/.test(html));
});

test('renderActions for archived workflows still renders folder link (read-only)', () => {
  const html = renderActions(makeMeta({ category: 'archived' }));
  assert.match(html, /href="\/docs\/main-068\/folder"/);
  assert.ok(!/"action":"pause"/.test(html));
  assert.ok(!/"action":"archive"/.test(html));
});

test('renderActions exposes files dropdown via hx-get partial', () => {
  const html = renderActions(makeMeta());
  assert.match(html, /hx-get="\/partial\/files\/main-068"/);
});

// ─── CSP-safety regression guards (Phase 4 cleanup, AK HIGH-1) ──────
//
// HTMX 1.9.x compiles its inline event-handler attribute family via
// `new Function(...)`, which CSP `script-src 'self'` (no `'unsafe-eval'`)
// blocks. These attributes therefore must NEVER appear in the rendered HTML.
// The SSE router and note-form payload builder are delegated to
// `/static/dashboard-events.js` instead — see that file for the listeners.

const TOKEN_HX_ON = 'hx' + '-on'; // split so this guard isn't tripped on itself

test('renderActions emits no CSP-incompatible inline handler attributes', () => {
  const html = renderActions(makeMeta());
  assert.ok(!html.includes(TOKEN_HX_ON),
    'CSP guard: ' + TOKEN_HX_ON + ' attributes require unsafe-eval; see dashboard-events.js');
});

// (Phase 8) The "renderActions note form carries data-ts-action=note" test was
// removed when the note <form> itself was removed from the card surface — see
// renderActions for archived workflows / the happy-path renderActions test for
// the regression guard that asserts the form does not reappear.

test('renderLayout (main element) emits no CSP-incompatible inline handler attributes', () => {
  const html = renderLayout({ title: 'Test', body: '<div>hello</div>' });
  assert.ok(!html.includes(TOKEN_HX_ON),
    'CSP guard: ' + TOKEN_HX_ON + ' on <main> blocks SSE message routing under script-src self');
});

// ─── files.js ───────────────────────────────────────────────────────

test('renderFilesList shows empty-state for no files', () => {
  assert.match(renderFilesList('demo', []), /class="ts-files-empty"/);
  assert.match(renderFilesList('demo', null), /class="ts-files-empty"/);
});

test('renderFilesList renders each file with /api/file link and human size', () => {
  const out = renderFilesList('main-068', [
    { name: 'REQUESTS.md', extension: '.md', size: 12000, rel_path: 'main-068/REQUESTS.md' },
    { name: 'REQUESTS.html', extension: '.html', size: 25000, rel_path: 'main-068/REQUESTS.html' }
  ]);
  // Phase 5: .md and .html now route through the viewer with ?view=html so
  // the iframe sandbox wraps the rendered content. Earlier Phases linked
  // without the suffix; this assertion accepts the Phase 5 URL shape.
  assert.match(out, /href="\/api\/file\?path=main-068%2FREQUESTS\.md&view=html"/);
  assert.match(out, /href="\/api\/file\?path=main-068%2FREQUESTS\.html&view=html"/);
  // Both .md and .html open in a new tab (viewer).
  assert.match(out, /target="_blank"/);
  // human-readable size.
  assert.match(out, /11\.7 KB/);
  assert.match(out, /24\.4 KB/);
});

test('renderFilesList escapes hostile file names (XSS defence)', () => {
  const out = renderFilesList('demo', [
    { name: '<img onerror=1>.md', extension: '.md', size: 100, rel_path: 'demo/x.md' }
  ]);
  assert.ok(!out.includes('<img onerror=1>'));
  assert.match(out, /&lt;img onerror&#x3D;1&gt;/);
});

test('humanSize formats bytes / KB / MB correctly', () => {
  assert.equal(filesInternal.humanSize(0), '0 B');
  assert.equal(filesInternal.humanSize(512), '512 B');
  assert.equal(filesInternal.humanSize(2048), '2.0 KB');
  assert.equal(filesInternal.humanSize(2 * 1024 * 1024), '2.0 MB');
  assert.equal(filesInternal.humanSize(-1), '?');
  assert.equal(filesInternal.humanSize('not a number'), '?');
});

// ─── layout.js + index.js ───────────────────────────────────────────

test('renderLayout wires HTMX from /static and adds sse-connect on body', () => {
  const html = renderLayout({ title: 'Test', body: '<div>hello</div>' });
  // Cache-bust query (?v=<mtimeMs>) is optional — layout adds it so browsers
  // refetch when a vendored asset changes, even under aggressive immutable
  // caching headers. Regex allows both "/static/x.js" and "/static/x.js?v=…".
  assert.match(html, /<script src="\/static\/htmx\.min\.js(\?v=\d+)?"/);
  assert.match(html, /<script src="\/static\/htmx-ext-sse\.js(\?v=\d+)?"/);
  assert.match(html, /<script src="\/static\/dashboard-events\.js(\?v=\d+)?"/);
  assert.match(html, /<link rel="stylesheet" href="\/static\/style\.css(\?v=\d+)?"/);
  assert.match(html, /hx-ext="sse" sse-connect="\/events"/);
  // No external origins.
  assert.ok(!/https?:\/\//.test(html.replace(/Phase|W3C|OWASP|sandboxed/g, '')) ||
    !/<script src="https?:\/\//.test(html),
    'no external CDN script tags allowed');
});

test('renderLayout escapes the page title (XSS defence)', () => {
  const html = renderLayout({ title: '<script>alert(1)</script>', body: '' });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;&#x2F;script&gt;/);
});

test('renderIndex composes layout + grid with active workflows', () => {
  const html = renderIndex({
    workflows: [makeMeta(), makeMeta({ doc_id: 'demo-002' })],
    archived: [makeMeta({ doc_id: 'main-067', category: 'archived' })]
  });
  assert.match(html, /<title>Team-Shinchan Dashboard<\/title>/);
  assert.match(html, /data-ts-count="2"/);
  // main-069 P6.1: visible archived note removed (user feedback). Count
  // remains exposed programmatically via ts-page-meta JSON data island.
  assert.match(html, /"archived_count":1/);
  assert.ok(!/archived workflow.{0,4} not shown/.test(html),
    'no visible archived-note copy in rendered HTML after P6.1');
  assert.match(html, /data-ts-card="main-068"/);
});

test('renderIndex includes JSON page metadata for AI / semantic parsing', () => {
  const html = renderIndex({ workflows: [], archived: [] });
  assert.match(html, /<script type="application\/json" id="ts-page-meta">/);
  assert.match(html, /"page":"index"/);
  assert.match(html, /"active_count":0/);
});

test('renderIndex composes master-detail split with empty doc panel slot', () => {
  // Phase 8.3 — index now splits into ts-split-left (grid) + ts-split-right
  // (#ts-doc-panel). The panel starts empty; card clicks load content into
  // it via hx-target.
  const html = renderIndex({ workflows: [makeMeta()], archived: [] });
  assert.match(html, /class="ts-split"/);
  assert.match(html, /class="ts-split-left"/);
  assert.match(html, /class="ts-split-right"/);
  assert.match(html, /id="ts-doc-panel"/);
  // Empty-state copy is present on first paint.
  assert.match(html, /ts-doc-empty/);
});

// ─── doc-panel.js (Phase 8.3) ──────────────────────────────────────

function viewableFiles() {
  return [
    { name: 'REQUESTS.md', rel_path: 'main-068/REQUESTS.md', size: 1024 },
    { name: 'PLAN.md',     rel_path: 'main-068/PLAN.md',     size: 2048 },
    { name: 'PROGRESS.md', rel_path: 'main-068/PROGRESS.md', size: 4096 },
    { name: 'WORKFLOW_STATE.yaml', rel_path: 'main-068/WORKFLOW_STATE.yaml', size: 512 }
  ];
}

test('renderDocPanel renders header + tabs + sandboxed iframe for default file', () => {
  const html = renderDocPanel({ docId: 'main-068', category: 'active', files: viewableFiles() });
  // P6.4: Header strip merges tab list + close button into a single chrome row.
  // The doc_id is no longer duplicated in the outer chrome (the inner viewer
  // overlay carries it as a glass breadcrumb chip) — instead it surfaces via
  // the tablist aria-label and the iframe title so screen readers + tooltips
  // still identify the workflow.
  assert.match(html, /class="ts-doc-header"/);
  assert.match(html, /aria-label="main-068 문서"/);
  assert.match(html, /title="REQUESTS\.md — main-068"/);
  assert.match(html, /class="ts-doc-close"/);
  assert.match(html, /hx-get="\/partial\/doc-empty"/);
  // Tab strip contains every viewable file.
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-ts-tab="REQUESTS\.md"/);
  assert.match(html, /data-ts-tab="PLAN\.md"/);
  assert.match(html, /data-ts-tab="PROGRESS\.md"/);
  // REQUESTS.md is the default (top of DEFAULT_PRIORITY) — aria-selected="true".
  assert.match(html, /data-ts-tab="REQUESTS\.md"[^>]*aria-selected="true"/);
  // Iframe loads through /api/file?view=html and is sandboxed. The src is
  // escaped via escapeAttr (defense in depth), so we look for the encoded
  // path substring rather than the literal URL.
  assert.match(html, /class="ts-doc-iframe"/);
  assert.ok(html.includes('main-068%2FREQUESTS.md'),
    'iframe src must reference URL-encoded path');
  assert.match(html, /sandbox="allow-same-origin"/);
  assert.match(html, /referrerpolicy="no-referrer"/);
});

test('renderDocPanel honours activeName when it points to a viewable file', () => {
  const html = renderDocPanel({
    docId: 'main-068', category: 'active', files: viewableFiles(),
    activeName: 'PLAN.md'
  });
  // PLAN.md is now selected; iframe loads PLAN.md.
  assert.match(html, /data-ts-tab="PLAN\.md"[^>]*aria-selected="true"/);
  assert.ok(html.includes('main-068%2FPLAN.md'),
    'iframe src must reference PLAN.md');
  // REQUESTS is *not* the selected tab anymore.
  assert.match(html, /data-ts-tab="REQUESTS\.md"[^>]*aria-selected="false"/);
});

test('renderDocPanel falls back to default when activeName is not viewable', () => {
  const html = renderDocPanel({
    docId: 'main-068', category: 'active', files: viewableFiles(),
    activeName: 'NOT_A_REAL_FILE.md'
  });
  assert.match(html, /data-ts-tab="REQUESTS\.md"[^>]*aria-selected="true"/);
});

test('renderDocPanel each tab is wired with hx-get for in-panel swap', () => {
  const html = renderDocPanel({ docId: 'main-068', category: 'active', files: viewableFiles() });
  // Tab button → hx-get="/partial/doc/main-068?file=PLAN.md", hx-target="#ts-doc-panel"
  assert.match(html, /hx-get="\/partial\/doc\/main-068\?file=PLAN\.md"/);
  assert.match(html, /hx-target="#ts-doc-panel"/);
  assert.match(html, /hx-swap="innerHTML"/);
});

test('renderDocPanel renders empty-state when the folder has no viewable files', () => {
  // YAML-only folders, log-only folders, etc. — the panel must degrade
  // gracefully rather than render a broken iframe.
  const html = renderDocPanel({
    docId: 'main-068', category: 'active',
    files: [{ name: 'IMAGE.png', rel_path: 'main-068/IMAGE.png', size: 9000 }]
  });
  assert.match(html, /class="ts-doc-empty"/);
  assert.match(html, /표시할 \.md \/ \.html 파일이 없습니다/);
});

test('renderDocPanel shows the archived badge when category is archived', () => {
  const html = renderDocPanel({
    docId: 'main-067', category: 'archived', files: viewableFiles()
  });
  assert.match(html, /class="ts-doc-badge">archived</);
});

test('renderDocPanel escapes hostile docId, file names, and paths', () => {
  const html = renderDocPanel({
    docId: '<script>x</script>',
    category: 'active',
    files: [
      { name: '<img onerror=1>.md', rel_path: 'main-068/<img>.md', size: 100 }
    ]
  });
  assert.ok(!html.includes('<script>x</script>'),  'docId must be escaped');
  assert.ok(!html.includes('<img onerror=1>'),     'file name must be escaped');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img onerror&#x3D;1&gt;/);
});

test('renderDocPanelEmpty shows the placeholder explaining what cards do', () => {
  const html = renderDocPanelEmpty();
  assert.match(html, /class="ts-doc-empty"/);
  assert.match(html, /data-ts-doc-empty="true"/);
  assert.match(html, /문서 미선택/);
  // Hint mentions REQUESTS · PLAN · PROGRESS to onboard new users.
  assert.match(html, /REQUESTS.*PLAN.*PROGRESS/);
});

test('doc-panel pickDefault prefers REQUESTS.md first, then PLAN, then PROGRESS', () => {
  const { pickDefault } = docPanelInternal;
  assert.equal(pickDefault([
    { name: 'PLAN.md' }, { name: 'PROGRESS.md' }, { name: 'REQUESTS.md' }
  ]), 'REQUESTS.md');
  assert.equal(pickDefault([
    { name: 'PROGRESS.md' }, { name: 'PLAN.md' }
  ]), 'PLAN.md');
  // No priority match → falls back to first .md alphabetically.
  assert.equal(pickDefault([
    { name: 'zebra.md' }, { name: 'alpha.md' }
  ]), 'alpha.md');
  // No .md, falls back to .html.
  assert.equal(pickDefault([
    { name: 'NOTES.html' }, { name: 'other.html' }
  ]), 'NOTES.html');
});

test('doc-panel isViewable filters by allowlist of extensions', () => {
  const { isViewable } = docPanelInternal;
  assert.equal(isViewable('REQUESTS.md'),   true);
  assert.equal(isViewable('PLAN.html'),     true);
  assert.equal(isViewable('state.yaml'),    true);
  assert.equal(isViewable('state.yml'),     true);
  assert.equal(isViewable('data.json'),     true);
  assert.equal(isViewable('notes.txt'),     true);
  assert.equal(isViewable('image.png'),     false);
  assert.equal(isViewable('binary.bin'),    false);
  assert.equal(isViewable('LICENSE'),       false);
});
