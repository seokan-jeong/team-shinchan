// tests/dashboard/static-assets.test.js
//
// Phase 4 cleanup — contract tests for vendored / hand-written static assets.
//
// The dashboard ships three hand-written static files:
//   - /static/style.css            (Phase 4)
//   - /static/dashboard-events.js  (Phase 4 — SSE → DOM router)
//
// HTMX itself (`htmx.min.js` + `htmx-ext-sse.js`) is vendored and intentionally
// out of scope here (PROVENANCE.md governs refresh).
//
// These tests pin the CSP-safety contract from AK Phase 4 HIGH-1: HTMX 1.9.x
// compiles its inline event-handler attribute family via `new Function(...)`,
// which CSP `script-src 'self'` (no `'unsafe-eval'`) blocks. The SSE router
// and note-form payload builder are wired in dashboard-events.js via
// delegated `htmx:sseMessage` and `htmx:configRequest` listeners instead.
//
// All tests are pure file-content assertions — no browser, no server.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STATIC_DIR = path.join(__dirname, '..', '..', 'src', 'dashboard', 'static');

function readStatic(name) {
  return fs.readFileSync(path.join(STATIC_DIR, name), 'utf8');
}

// ─── style.css (LOW-1: ts-files-empty class definition) ────────────

test('style.css defines .ts-files-empty for actions.js + files.js empty state', () => {
  const css = readStatic('style.css');
  // The class is referenced in src/dashboard/views/actions.js (initial
  // "loading..." placeholder) and src/dashboard/views/files.js (no-files
  // empty state). Without this rule the muted/italic styling is missing.
  assert.match(css, /\.ts-files-empty\s*\{/, 'missing .ts-files-empty CSS rule');
  // Sanity: rule sets at least colour (uses --ts-muted token).
  const ruleMatch = css.match(/\.ts-files-empty\s*\{[^}]+\}/);
  assert.ok(ruleMatch, 'rule body could not be extracted');
  assert.match(ruleMatch[0], /--ts-muted|color\s*:/, 'rule must set a muted colour');
});

// ─── dashboard-events.js (HIGH-1: delegated listeners) ─────────────

test('dashboard-events.js registers a delegated htmx:sseMessage listener on document.body', () => {
  const js = readStatic('dashboard-events.js');
  // Replaces the removed inline handler on <main> in layout.js. The listener
  // must be attached to document.body so it catches the bubbled event from
  // the SSE source element regardless of which child element HTMX dispatches
  // from.
  assert.match(js, /document\.body[^;]*addEventListener\(\s*['"]htmx:sseMessage['"]/,
    'missing htmx:sseMessage listener on document.body');
});

test('dashboard-events.js does NOT register a note-form configRequest listener (form removed)', () => {
  const js = readStatic('dashboard-events.js');
  // Phase 8 removed the note <form> from the card surface. The matching
  // htmx:configRequest listener was deleted in lockstep — if either re-appears
  // alone the contract is broken. Keep this guard so a half-revert is caught.
  assert.ok(!/form\[data-ts-action="note"\]/.test(js),
    'note-form selector must not return without re-introducing the <form> in actions.js');
  assert.ok(!/htmx:configRequest/.test(js),
    'configRequest listener was only there for the note form; it must stay removed');
});

test('dashboard-events.js does not rely on eval / new Function (CSP guard)', () => {
  const js = readStatic('dashboard-events.js');
  // Defence in depth: the event router file itself must remain free of
  // eval-family calls so it loads under `script-src 'self'`. Strip comments
  // before scanning so this guard does not trip on prose explaining why
  // these constructs are avoided.
  const stripped = js
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/^\s*\/\/.*$/gm, '');    // line comments
  assert.ok(!/\beval\s*\(/.test(stripped), 'dashboard-events.js must not call eval()');
  assert.ok(!/\bnew\s+Function\s*\(/.test(stripped),
    'dashboard-events.js must not call new Function() (CSP would block)');
});
