// src/dashboard/render-md.js
//
// Phase 5 — Markdown → HTML renderer for legacy archived/*.md preservation.
//
// CONTEXT
//   AC-7 requires the dashboard to display both new HTML artifacts and legacy
//   markdown artifacts (`archived/main-XXX/*.md`) without forcing a migration.
//   This module is the single render path: callers pass markdown text and a
//   mode, get back HTML that is safe to drop into an iframe srcdoc.
//
// DESIGN — AK Stage 2 MEDIUM-1 resolution
//   markdown-it is NOT a hard dependency. It lives in `optionalDependencies`
//   in package.json so `npm install` succeeds even if the registry is
//   unreachable for that single package. We `require()` it lazily and cache
//   the result so the cost is paid at most once per process.
//
//   The renderer supports three modes:
//
//   - 'auto'   (default): if markdown-it loads, render with it; otherwise fall
//                         back to escape + <pre>. Best UX, never errors.
//   - 'iframe' (strict)  : require markdown-it; if missing, fall back to <pre>
//                         **unless** opts.strict is true (then throw). This
//                         lets AC-7a explicitly exercise the iframe path
//                         (AK Stage 2 MEDIUM-2 resolution).
//   - 'pre'              : force escape + <pre>. Zero deps, max safety.
//                         Mandatory for environments that refuse the optional
//                         dep (NFR-6 enforcement).
//
//   Every returned HTML fragment carries a `data-ts-md-render="<mode>"` data
//   attribute on the outermost wrapper so:
//     (a) mechanical-check can assert the chosen render path was actually
//         exercised in a given run (defeats AC-7a trivial-pass),
//     (b) the UI can apply per-mode CSS (mono font for <pre>, prose-styled
//         scaling for iframe).
//
// SECURITY
//   - When markdown-it is used, we configure `html: false` so raw HTML inside
//     the markdown is *escaped*, not rendered. Combined with iframe sandbox
//     attributes set by file-viewer.js this defeats stored-XSS in legacy
//     archived markdown (R-4).
//   - In <pre> mode we use the existing escapeHtml helper which already
//     covers `&<>"'/=` and backticks per the OWASP cheat sheet.
//   - We never call `eval`, `Function()`, or any code-generating API.
//
// API
//   renderMarkdownToHtml(text, opts)
//     → { html: string, mode: 'iframe'|'pre', requested: 'auto'|'iframe'|'pre',
//          markdown_it_available: boolean }
//
//   isMarkdownItAvailable() → boolean (lazy probe with caching)

'use strict';

const { escapeHtml } = require('./views/escape');

const VALID_MODES = new Set(['auto', 'iframe', 'pre']);

// Module-level cache. `_mdProbe` holds {ok: boolean, instance: object|null,
// error: string|null}. The probe runs on first call and is reused thereafter.
// Tests can reset it via `_internal.resetProbeCache()`.
let _mdProbe = null;

/**
 * Lazy-load markdown-it. Returns a parser instance configured for safety, or
 * null if the package is not installed. Result is cached for the process.
 *
 * @returns {{ok: boolean, instance: object|null, error: string|null}}
 */
function _probeMarkdownIt() {
  if (_mdProbe) return _mdProbe;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const MarkdownIt = require('markdown-it');
    const md = new MarkdownIt({
      html: false,      // raw HTML in source is ESCAPED, never rendered (R-4)
      linkify: true,    // detect bare URLs as links
      breaks: false,    // single newlines do not become <br> (CommonMark)
      typographer: false
    });
    _mdProbe = { ok: true, instance: md, error: null };
  } catch (err) {
    _mdProbe = {
      ok: false,
      instance: null,
      error: err && err.code === 'MODULE_NOT_FOUND'
        ? 'markdown-it not installed (optionalDependency)'
        : (err && err.message ? err.message : String(err))
    };
  }
  return _mdProbe;
}

/**
 * Boolean convenience wrapper around the probe — exported so server.js / UI
 * code can branch without inspecting the internal cache shape.
 *
 * @returns {boolean}
 */
function isMarkdownItAvailable() {
  return _probeMarkdownIt().ok === true;
}

/**
 * Escape + <pre> rendering. Never calls markdown-it. Used as the explicit
 * `pre` mode AND as the auto-fallback when markdown-it is missing.
 *
 * The wrapping <div> carries `data-ts-md-render="pre"` so callers and
 * mechanical-check can identify which path was exercised.
 *
 * @param {string} text
 * @returns {string} HTML fragment.
 */
function _renderPre(text) {
  const safe = escapeHtml(text || '');
  return `<div class="ts-archived-md" data-ts-md-render="pre"><pre class="ts-archived-md-pre">${safe}</pre></div>`;
}

/**
 * Strip a leading YAML frontmatter block (`---\n…\n---\n`) before handing
 * text to markdown-it. Without this, markdown sees the opening `---` as a
 * horizontal rule and the field lines that follow as a setext-style heading
 * underlined by the closing `---`, surfacing the YAML metadata in the body
 * as a garbled multi-line <h2>. Stripping is safe because:
 *   - The frontmatter is metadata for tooling (status, doc_id, stage); it
 *     is never intended as visible prose.
 *   - The dashboard already exposes the same fields via the JSON
 *     `<script type="application/json" id="ts-page-meta">` data island, so
 *     no information is lost.
 *   - We strip ONLY when the file truly opens with `---\n…\n---\n`; any
 *     other shape (no frontmatter, or `---` mid-document used as a real hr)
 *     passes through unchanged.
 *
 * @param {string} text
 * @returns {string}
 */
function _stripFrontmatter(text) {
  if (typeof text !== 'string' || text.length === 0) return '';
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? text.slice(match[0].length).replace(/^\r?\n/, '') : text;
}

/**
 * Iframe-style rich rendering via markdown-it. Wraps the result in a div with
 * `data-ts-md-render="iframe"` to mirror the <pre> path's identifier.
 *
 * Caller passes the pre-loaded markdown-it instance to avoid re-probing.
 *
 * @param {string} text
 * @param {object} md — markdown-it instance from _probeMarkdownIt().
 * @returns {string}
 */
function _renderRich(text, md) {
  const rendered = md.render(_stripFrontmatter(String(text || '')));
  return `<div class="ts-archived-md ts-archived-md-iframe" data-ts-md-render="iframe">${rendered}</div>`;
}

/**
 * Public API — render markdown text to HTML per the requested mode.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {'auto'|'iframe'|'pre'} [opts.mode] — render mode (default 'auto').
 * @param {boolean} [opts.strict]  — when mode='iframe' and markdown-it is
 *                                    missing, throw instead of falling back.
 *                                    Default false.
 * @returns {{html: string, mode: 'iframe'|'pre', requested: string,
 *            markdown_it_available: boolean}}
 */
function renderMarkdownToHtml(text, opts) {
  const o = opts || {};
  const requested = VALID_MODES.has(o.mode) ? o.mode : 'auto';
  const strict = o.strict === true;

  // Explicit 'pre' bypasses the probe entirely.
  if (requested === 'pre') {
    return {
      html: _renderPre(text),
      mode: 'pre',
      requested,
      markdown_it_available: _probeMarkdownIt().ok === true
    };
  }

  const probe = _probeMarkdownIt();

  // Explicit 'iframe' — strict mode throws if markdown-it missing.
  if (requested === 'iframe') {
    if (!probe.ok) {
      if (strict) {
        const err = new Error(
          'renderMarkdownToHtml: mode=iframe requested but markdown-it is not available — '
          + (probe.error || 'unknown reason')
        );
        err.code = 'MARKDOWN_IT_MISSING';
        throw err;
      }
      // Non-strict iframe with missing dep → graceful fallback to <pre>.
      return {
        html: _renderPre(text),
        mode: 'pre',
        requested,
        markdown_it_available: false
      };
    }
    return {
      html: _renderRich(text, probe.instance),
      mode: 'iframe',
      requested,
      markdown_it_available: true
    };
  }

  // 'auto' — prefer rich, fall back to <pre>.
  if (probe.ok) {
    return {
      html: _renderRich(text, probe.instance),
      mode: 'iframe',
      requested,
      markdown_it_available: true
    };
  }
  return {
    html: _renderPre(text),
    mode: 'pre',
    requested,
    markdown_it_available: false
  };
}

module.exports = {
  renderMarkdownToHtml,
  isMarkdownItAvailable,
  VALID_MODES,
  // Exposed for unit tests (probe caching needs reset between tests
  // that monkey-patch require).
  _internal: {
    _probeMarkdownIt,
    _renderPre,
    _renderRich,
    _stripFrontmatter,
    resetProbeCache() { _mdProbe = null; },
    setProbeCache(value) { _mdProbe = value; }
  }
};
