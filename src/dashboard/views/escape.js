// src/dashboard/views/escape.js
//
// Phase 4 — XSS-safe HTML serialisation helpers.
//
// Every value that originates from a workflow file, user note, or filesystem
// entry is funnelled through `escapeHtml()` before being concatenated into a
// template string. The dashboard never accepts arbitrary HTML.
//
// NFR-4 (R-4) — see HTML_STYLE_GUIDE.md § "코드 블록 처리".
//
// API:
//   escapeHtml(value)             — return a string with &<>"'/ escaped.
//   escapeAttr(value)             — alias used at HTML-attribute boundaries.
//   stringifyJsonForScript(obj)   — JSON.stringify with </ neutralised so
//                                    we can safely embed JSON inside
//                                    <script type="application/json"> blocks.
//
// All functions are pure and have zero dependencies.

'use strict';

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escape a value for safe inclusion in HTML text or attribute context.
 *
 * `null` / `undefined` → empty string. Non-string values are coerced via
 * `String()` before escaping.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  // Replace once per pass; simple character class is faster than per-char.
  return s.replace(/[&<>"'`=/]/g, ch => HTML_ESCAPE_MAP[ch]);
}

/**
 * Attribute-context escaper. Currently identical to `escapeHtml` (both contexts
 * require the same five-character escape per the OWASP XSS cheat sheet); kept
 * as a named function so callers self-document intent and so future tightening
 * (e.g. URL attribute checks) lives in one place.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeAttr(value) {
  return escapeHtml(value);
}

// Unicode line/paragraph separators are valid JSON but break ES5 string literal
// context; we must replace them when embedding JSON into <script> blocks.
const U2028 = String.fromCharCode(0x2028);
const U2029 = String.fromCharCode(0x2029);

/**
 * Safe JSON serialisation for embedding inside a `<script type="application/json">`
 * block. The browser parses `</script` case-insensitively as the end tag, so any
 * "</" inside the payload must be neutralised. We also strip the unicode line/
 * paragraph separators which break JS string literal context.
 *
 * @param {*} value
 * @returns {string}
 */
function stringifyJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/<\//g, '<\\/')
    .split(U2028).join('\\u2028')
    .split(U2029).join('\\u2029');
}

module.exports = {
  escapeHtml,
  escapeAttr,
  stringifyJsonForScript
};
