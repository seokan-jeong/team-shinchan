// tests/dashboard/render-md.test.js
//
// Phase 5 — Markdown→HTML renderer unit tests.
//
// Coverage matrix:
//   - mode='pre' (forced, zero-deps): escapes XSS, wraps in <pre>, emits the
//     data-ts-md-render="pre" identifier (AK Stage 2 MEDIUM-2 — proves the
//     <pre> path is real, not a trivial OR-condition pass).
//   - mode='auto' with markdown-it present: returns iframe-mode HTML with
//     data-ts-md-render="iframe".
//   - mode='auto' with markdown-it absent (simulated via probe-cache
//     injection): returns <pre> mode (graceful degradation).
//   - mode='iframe' with markdown-it present: returns iframe mode.
//   - mode='iframe' with markdown-it absent + strict=true: THROWS with
//     code MARKDOWN_IT_MISSING (explicit-path validation, MEDIUM-2).
//   - mode='iframe' with markdown-it absent + strict=false: falls back to <pre>.
//   - XSS in raw markdown source: html:false config means raw HTML in the
//     markdown is escaped, never rendered as live tags.
//   - Result shape: every return has html/mode/requested/markdown_it_available
//     fields populated.
//
// We DO NOT depend on markdown-it being installed for the suite to pass —
// the "present" cases skip cleanly when probe.ok===false.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  renderMarkdownToHtml,
  isMarkdownItAvailable,
  VALID_MODES,
  _internal
} = require('../../src/dashboard/render-md');

// ── helpers ──────────────────────────────────────────────────────────

function withFakeProbe(value, fn) {
  // Save existing cache so concurrent tests are not perturbed.
  const prev = _internal._probeMarkdownIt();
  _internal.setProbeCache(value);
  try {
    return fn();
  } finally {
    _internal.setProbeCache(prev);
  }
}

function fakeMdInstance(renderFn) {
  return {
    render(text) { return renderFn(text); }
  };
}

// ── shape + constants ────────────────────────────────────────────────

test('VALID_MODES exposes the three documented mode strings', () => {
  assert.equal(VALID_MODES.size, 3);
  assert.ok(VALID_MODES.has('auto'));
  assert.ok(VALID_MODES.has('iframe'));
  assert.ok(VALID_MODES.has('pre'));
});

test('isMarkdownItAvailable returns a boolean (regardless of install)', () => {
  const v = isMarkdownItAvailable();
  assert.equal(typeof v, 'boolean');
});

// ── mode='pre' (forced) ──────────────────────────────────────────────

test('mode=pre wraps content in <pre> with the pre identifier', () => {
  const out = renderMarkdownToHtml('# Title\n\nbody', { mode: 'pre' });
  assert.equal(out.mode, 'pre');
  assert.equal(out.requested, 'pre');
  assert.equal(typeof out.markdown_it_available, 'boolean');
  assert.match(out.html, /data-ts-md-render="pre"/);
  assert.match(out.html, /<pre class="ts-archived-md-pre">/);
  // The original `#` should be literal, not transformed to <h1>.
  assert.match(out.html, /# Title/);
});

test('mode=pre escapes XSS payloads in the source markdown (R-4)', () => {
  const evil = '# <script>alert(1)</script>\n\n<img src=x onerror="alert(2)">';
  const out = renderMarkdownToHtml(evil, { mode: 'pre' });
  // The angle brackets must be escaped — &lt;script&gt; appears, no live <script>.
  assert.ok(out.html.includes('&lt;script&gt;'), 'script tag must be escaped');
  assert.ok(out.html.includes('&lt;img'), 'img tag must be escaped');
  assert.ok(!/<script>/i.test(out.html), 'rendered HTML must not contain a live <script>');
  assert.ok(!/onerror=\"alert/i.test(out.html), 'no live onerror handler');
});

test('mode=pre handles empty / null / undefined input', () => {
  const a = renderMarkdownToHtml('', { mode: 'pre' });
  assert.match(a.html, /<pre class="ts-archived-md-pre"><\/pre>/);
  const b = renderMarkdownToHtml(null, { mode: 'pre' });
  assert.match(b.html, /data-ts-md-render="pre"/);
  const c = renderMarkdownToHtml(undefined, { mode: 'pre' });
  assert.match(c.html, /data-ts-md-render="pre"/);
});

// ── mode='auto' / 'iframe' with simulated markdown-it ─────────────────

test('mode=auto with markdown-it present returns iframe-mode HTML', () => {
  const fakeMd = fakeMdInstance(text => `<h1>RENDERED</h1><p>${String(text).length} chars</p>`);
  withFakeProbe({ ok: true, instance: fakeMd, error: null }, () => {
    const out = renderMarkdownToHtml('# Anything', { mode: 'auto' });
    assert.equal(out.mode, 'iframe');
    assert.equal(out.requested, 'auto');
    assert.equal(out.markdown_it_available, true);
    assert.match(out.html, /data-ts-md-render="iframe"/);
    assert.match(out.html, /<h1>RENDERED<\/h1>/);
    // The pre identifier must NOT also be present (defeats MEDIUM-2 trivial OR).
    assert.ok(!out.html.includes('data-ts-md-render="pre"'), 'iframe path must not emit the pre identifier');
  });
});

test('mode=auto gracefully falls back to <pre> when markdown-it is absent', () => {
  withFakeProbe({ ok: false, instance: null, error: 'simulated MODULE_NOT_FOUND' }, () => {
    const out = renderMarkdownToHtml('# Header', { mode: 'auto' });
    assert.equal(out.mode, 'pre');
    assert.equal(out.requested, 'auto');
    assert.equal(out.markdown_it_available, false);
    assert.match(out.html, /data-ts-md-render="pre"/);
    assert.match(out.html, /# Header/);
  });
});

test('mode=iframe with markdown-it present invokes the rich path', () => {
  const fakeMd = fakeMdInstance(_ => '<h2>ok</h2>');
  withFakeProbe({ ok: true, instance: fakeMd, error: null }, () => {
    const out = renderMarkdownToHtml('## ok', { mode: 'iframe' });
    assert.equal(out.mode, 'iframe');
    assert.equal(out.requested, 'iframe');
    assert.match(out.html, /<h2>ok<\/h2>/);
    assert.match(out.html, /data-ts-md-render="iframe"/);
  });
});

test('mode=iframe + strict=true throws when markdown-it is absent (MEDIUM-2 explicit gate)', () => {
  withFakeProbe({ ok: false, instance: null, error: 'simulated' }, () => {
    assert.throws(
      () => renderMarkdownToHtml('# x', { mode: 'iframe', strict: true }),
      err => err && err.code === 'MARKDOWN_IT_MISSING' &&
             /markdown-it is not available/.test(err.message)
    );
  });
});

test('mode=iframe + strict=false falls back to <pre> when markdown-it is absent', () => {
  withFakeProbe({ ok: false, instance: null, error: 'simulated' }, () => {
    const out = renderMarkdownToHtml('# x', { mode: 'iframe', strict: false });
    assert.equal(out.mode, 'pre');
    assert.equal(out.requested, 'iframe');
    assert.equal(out.markdown_it_available, false);
    assert.match(out.html, /data-ts-md-render="pre"/);
  });
});

// ── return shape ─────────────────────────────────────────────────────

test('return shape always has html/mode/requested/markdown_it_available', () => {
  for (const mode of ['auto', 'iframe', 'pre']) {
    const out = renderMarkdownToHtml('hi', { mode });
    assert.equal(typeof out.html, 'string');
    assert.ok(out.html.length > 0, `mode=${mode} returned empty html`);
    assert.ok(['iframe', 'pre'].includes(out.mode), `mode=${mode} returned invalid mode field`);
    assert.equal(out.requested, mode);
    assert.equal(typeof out.markdown_it_available, 'boolean');
  }
});

test('unknown mode falls back to auto behaviour', () => {
  const out = renderMarkdownToHtml('# x', { mode: 'banana' });
  // Auto picks iframe if present, pre if not. Whichever, the mode field
  // must be one of the two valid output modes.
  assert.ok(['iframe', 'pre'].includes(out.mode));
  assert.equal(out.requested, 'auto');
});

test('default options (no opts arg) behaves as auto', () => {
  const out = renderMarkdownToHtml('# x');
  assert.equal(out.requested, 'auto');
  assert.ok(['iframe', 'pre'].includes(out.mode));
});

// ── REAL markdown-it path (skipped if optional dep not installed) ────

test('real markdown-it path renders # Title to <h1> when installed', () => {
  // Reset cache so the real probe re-runs.
  _internal.resetProbeCache();
  if (!isMarkdownItAvailable()) {
    // Skip — markdown-it is optional. The non-installed path is exercised by
    // the fake-probe test above (mode=auto → pre fallback). We still pass
    // the test so CI without optional deps stays green.
    return;
  }
  const out = renderMarkdownToHtml('# Title', { mode: 'iframe', strict: true });
  assert.equal(out.mode, 'iframe');
  assert.match(out.html, /<h1>Title<\/h1>/);
  assert.match(out.html, /data-ts-md-render="iframe"/);
});

test('real markdown-it path with html:false neutralises raw HTML in source', () => {
  _internal.resetProbeCache();
  if (!isMarkdownItAvailable()) return;
  const src = '# Safe\n\n<script>alert(1)</script>';
  const out = renderMarkdownToHtml(src, { mode: 'iframe', strict: true });
  // Raw <script> must be escaped (html:false) — must not appear as a live tag.
  assert.ok(!/<script>alert/.test(out.html), 'raw <script> tag leaked into iframe HTML');
  assert.ok(out.html.includes('&lt;script&gt;') || out.html.includes('&lt;script'),
    'raw <script> should be escaped');
});

// ── YAML frontmatter stripping (main-069 P6.2 — bug fix) ──────────────────
//
// Without stripping, markdown-it sees the opening `---` as an hr and the
// field lines that follow as a setext heading underlined by the closing
// `---`, surfacing the YAML metadata in the body as a garbled multi-line
// <h2>. Stripping is unit-tested at the helper level AND at the rendered
// output level (mode=iframe) so a future refactor that moves the helper
// will still be caught by the integration assertion.
test('_stripFrontmatter removes a leading YAML frontmatter block', () => {
  const { _stripFrontmatter } = _internal;
  const src = '---\ndoc_id: x\nstage: 1\n---\n\n# Real title\n';
  assert.equal(_stripFrontmatter(src), '# Real title\n');
});

test('_stripFrontmatter is a no-op when there is no frontmatter', () => {
  const { _stripFrontmatter } = _internal;
  assert.equal(_stripFrontmatter('# Just markdown\n\nbody\n'), '# Just markdown\n\nbody\n');
});

test('_stripFrontmatter preserves a mid-document `---` used as an hr', () => {
  const { _stripFrontmatter } = _internal;
  const src = '# Title\n\nintro\n\n---\n\nmore body\n';
  // No leading `---` → entire text passes through, including the mid-doc hr.
  assert.equal(_stripFrontmatter(src), src);
});

test('_stripFrontmatter tolerates CRLF line endings', () => {
  const { _stripFrontmatter } = _internal;
  const src = '---\r\ndoc_id: x\r\n---\r\n# Title\r\n';
  assert.equal(_stripFrontmatter(src), '# Title\r\n');
});

test('_stripFrontmatter returns "" for null / undefined / empty input', () => {
  const { _stripFrontmatter } = _internal;
  assert.equal(_stripFrontmatter(''), '');
  assert.equal(_stripFrontmatter(null), '');
  assert.equal(_stripFrontmatter(undefined), '');
});

test('iframe render strips YAML frontmatter so it does not surface as <h2>', () => {
  _internal.resetProbeCache();
  if (!isMarkdownItAvailable()) return;
  const src = '---\ndoc_id: main-069\nstage: 1\n---\n\n# Real heading\n\nbody text\n';
  const out = renderMarkdownToHtml(src, { mode: 'iframe', strict: true });
  // Real h1 still renders; YAML fields must NOT appear as visible text
  // (would be the symptom of frontmatter being parsed as setext-h2 content).
  assert.match(out.html, /<h1>Real heading<\/h1>/);
  assert.ok(!/doc_id:\s*main-069/.test(out.html), 'frontmatter leaked into rendered output');
  assert.ok(!/<h2>doc_id/.test(out.html), 'frontmatter rendered as setext h2');
});
