// src/dashboard/config.js
//
// Phase 5 — Dashboard runtime configuration.
//
// Single responsibility: resolve user-facing toggles from environment + an
// optional `.shinchan-config.yaml` (best-effort parse, no YAML library
// required so NFR-6 zero-dep stays intact). All keys have sane defaults so
// the dashboard boots without any config present.
//
// Currently exposes:
//   markdown_render: 'auto' | 'iframe' | 'pre'
//     - 'auto'   (default): try markdown-it; if missing, fall back to <pre>.
//     - 'iframe': force markdown-it (throws if not installed when used in
//                 strict mode; render-md.js falls back to <pre> at the call
//                 site if `strict` option is false).
//     - 'pre'   : force HTML-escaped <pre> (zero deps, max safety).
//
// Resolution order (highest precedence first):
//   1. Environment variable `TS_DASHBOARD_MD_RENDER`
//   2. `dashboard.markdown_render` key in `.shinchan-config.yaml` (if present)
//   3. Default: 'auto'
//
// Rationale for the toggle (AK Stage 2 MEDIUM-1):
//   markdown-it is listed as an optionalDependency so `npm install` never
//   fails on its absence. Lazy require in render-md.js degrades gracefully
//   to the <pre> path. The toggle lets operators *force* one mode for
//   reproducibility — production sites that want strict zero-dep set 'pre',
//   developers who installed the optional dep set 'iframe' to verify the
//   render path explicitly (resolves AK Stage 2 MEDIUM-2 trivial-pass).

'use strict';

const fs = require('fs');
const path = require('path');

const VALID_MD_MODES = new Set(['auto', 'iframe', 'pre']);
const DEFAULT_MD_RENDER = 'auto';

/**
 * Parse `dashboard.markdown_render: <value>` from a YAML-ish file using
 * a tiny regex — we deliberately do not require a YAML library to avoid
 * adding a hard dependency (NFR-6).
 *
 * Accepts only the shapes:
 *   dashboard:
 *     markdown_render: iframe
 *
 * Anything else (nested arrays, multi-doc YAML, comments mid-line) is
 * silently ignored. This is fine because the toggle is single-key.
 *
 * @param {string} text
 * @returns {string|null} resolved mode or null if unset/unparseable.
 */
function parseConfigYaml(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  // Match `markdown_render: <value>` indented under `dashboard:`. The negative
  // lookahead on `\s*#` makes us tolerant of trailing comments.
  const m = text.match(/(?:^|\n)\s*markdown_render:\s*['"]?([a-z]+)['"]?(?:\s*#.*)?(?:\n|$)/i);
  if (!m) return null;
  const candidate = String(m[1]).toLowerCase();
  return VALID_MD_MODES.has(candidate) ? candidate : null;
}

/**
 * Resolve the markdown_render mode for the current process.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd]       — base dir to look for .shinchan-config.yaml
 * @param {object} [opts.env]       — environment object (defaults to process.env)
 * @returns {{mode: string, source: 'env'|'config'|'default'}}
 */
function resolveMarkdownRenderMode(opts) {
  const o = opts || {};
  const env = o.env || process.env;
  const cwd = o.cwd || process.cwd();

  // 1. Environment wins.
  const envVal = String(env.TS_DASHBOARD_MD_RENDER || '').toLowerCase().trim();
  if (envVal && VALID_MD_MODES.has(envVal)) {
    return { mode: envVal, source: 'env' };
  }

  // 2. .shinchan-config.yaml (best-effort parse).
  const cfgPath = path.join(cwd, '.shinchan-config.yaml');
  if (fs.existsSync(cfgPath)) {
    try {
      const text = fs.readFileSync(cfgPath, 'utf8');
      const parsed = parseConfigYaml(text);
      if (parsed) return { mode: parsed, source: 'config' };
    } catch (_) {
      // Unreadable / malformed → fall through to default.
    }
  }

  // 3. Default.
  return { mode: DEFAULT_MD_RENDER, source: 'default' };
}

module.exports = {
  VALID_MD_MODES,
  DEFAULT_MD_RENDER,
  resolveMarkdownRenderMode,
  // Exported for unit tests.
  _internal: { parseConfigYaml }
};
