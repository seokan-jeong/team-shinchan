#!/usr/bin/env node
/**
 * Team-Shinchan Mechanical Pre-Check — $0 cost structural validation
 *
 * Usage:
 *   node src/mechanical-check.js --file <path> [--project-root <path>]
 *
 * Output: JSON { pass: boolean, errors: string[], mode: "markdown"|"html" } to stdout
 * Exit:   0 (pass) or 1 (fail)
 *
 * Mode routing (main-068 Phase 1):
 *   - .html extension → HTML mode (DOM-selector-style checks on data-ts-* attributes)
 *   - everything else → Markdown mode (heading + backtick checks, default since v1)
 *
 * Checks performed (Markdown mode):
 *   A — AC Existence: at least one AC-N reference or - [ ] checkbox in document
 *   B — File Reference Validity: backtick-quoted paths must resolve to existing files
 *       (section-level "Create"/"신규"/"New" exception per HR-3)
 *   C — FR→AC Mapping: every FR-N.N must map to ≥1 AC-N or a dedicated AC section
 *
 * Checks performed (HTML mode):
 *   HA — AC Existence: a [data-ts-kind="ac"] section OR at least one AC-N reference exists
 *   HB — Semantic structure + data-ts-kind hierarchy (main-068 Phase 2 strengthened):
 *        (HB-1) at least one <article> tag present (semantic root)
 *        (HB-2) at least one <section> tag present (semantic section)
 *        (HB-3) data-ts-kind values include `requirements`/`progress`/`retrospective`
 *               root + at least one of the canonical inner sections
 *               (`problem|fr|nfr|scope|hr|risk|ac`)
 *        Any of HB-1/HB-2/HB-3 missing → fail.
 *   HC — frontmatter JSON: exactly one <script type="application/json" id="ts-frontmatter">
 *        with parseable JSON containing `document_type` and `doc_id` keys.
 *
 * Fail-safe (NFR-2): any uncaught error → { pass: true, errors: [], mode: ... } + exit 0.
 *
 * Only uses Node.js built-in modules. No external dependencies.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────

const FILE_EXTENSIONS_RE = /\.(js|sh|md|yaml|yml|json|ts|tsx)$/;
// Backtick-quoted path pattern — captures content between backticks
const BACKTICK_RE = /`([^`]+)`/g;
// Section heading pattern (## or ###)
const HEADING_RE  = /^(#{2,3})\s+(.+)$/m;
// AC identifier
const AC_RE       = /AC-\d+/;
const AC_CHECKBOX = /- \[ \]/;
// FR identifier (e.g. FR-1.1, FR-2.3)
const FR_RE       = /FR-(\d+\.\d+)/g;
// Creation keywords for the section-level exception (HR-3)
const CREATION_KEYWORDS = ['신규', 'Create', 'New'];

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { filePath: null, projectRoot: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--file' || arg === '-f') && args[i + 1] !== undefined) {
      result.filePath = args[++i];
    } else if (arg === '--project-root' && args[i + 1] !== undefined) {
      result.projectRoot = args[++i];
    } else if (!arg.startsWith('--') && result.filePath === null) {
      // Positional fallback
      result.filePath = arg;
    }
  }

  return result;
}

// ── Section-level context (HR-3) ──────────────────────────────────────────────

/**
 * Split document into sections, each with its heading text and body content.
 * Returns array of { heading: string, start: number, end: number, text: string }
 * where start/end are character offsets in the original document.
 */
function parseSections(content) {
  const sections = [];
  // Split on ## or ### headings; capture the heading line itself
  const headingGlobalRe = /^#{2,3} .+$/gm;
  const matches = [];
  let m;
  while ((m = headingGlobalRe.exec(content)) !== null) {
    matches.push({ index: m.index, heading: m[0] });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end   = i + 1 < matches.length ? matches[i + 1].index : content.length;
    sections.push({
      heading : matches[i].heading,
      start,
      end,
      text    : content.slice(start, end),
    });
  }

  // Add an implicit "document root" section for content before the first heading
  if (matches.length > 0 && matches[0].index > 0) {
    sections.unshift({
      heading : '__root__',
      start   : 0,
      end     : matches[0].index,
      text    : content.slice(0, matches[0].index),
    });
  } else if (matches.length === 0) {
    sections.push({ heading: '__root__', start: 0, end: content.length, text: content });
  }

  return sections;
}

/**
 * Return true if the given section heading or any of the 3 lines before the match
 * position contain a creation keyword (HR-3).
 */
function sectionHasCreationKeyword(sectionText, sectionHeading) {
  for (const kw of CREATION_KEYWORDS) {
    if (sectionHeading.includes(kw)) return true;
    if (sectionText.includes(kw)) return true;
  }
  return false;
}

/**
 * Find which section (by character offset) contains the given match position.
 */
function findContainingSection(sections, matchIndex) {
  // Sections are non-overlapping; find the one that contains matchIndex
  for (const sec of sections) {
    if (matchIndex >= sec.start && matchIndex < sec.end) return sec;
  }
  // Fallback: last section
  return sections[sections.length - 1] || { heading: '__root__', text: '', start: 0, end: 0 };
}

// ── Check A — AC Existence ────────────────────────────────────────────────────

function checkA(content) {
  const errors = [];
  if (!AC_RE.test(content) && !AC_CHECKBOX.test(content)) {
    errors.push('Check A: No AC checkboxes or AC-N references found in document');
  }
  return errors;
}

// ── Check B — File Reference Validity ────────────────────────────────────────

function checkB(content, projectRoot, sections) {
  const errors = [];
  let match;

  // Reset lastIndex before use
  BACKTICK_RE.lastIndex = 0;

  while ((match = BACKTICK_RE.exec(content)) !== null) {
    const raw     = match[1];
    const matchAt = match.index;

    // Must end with a known extension to be treated as a file reference
    if (!FILE_EXTENSIONS_RE.test(raw)) continue;

    // Skip glob/template patterns
    if (raw.includes('*') || raw.includes('{') || raw.includes('$')) continue;
    if (raw.startsWith('#') || raw.startsWith('//')) continue;

    // Strip trailing colon+line-range suffixes (e.g. file.js:10-20)
    const cleanedPath = raw.replace(/:[\d\-]+$/, '');

    // HR-3: Section-level creation exception
    const containingSection = findContainingSection(sections, matchAt);
    if (sectionHasCreationKeyword(containingSection.text, containingSection.heading)) continue;

    // Resolve relative to project root
    const fullPath = path.resolve(projectRoot, cleanedPath);
    if (!fs.existsSync(fullPath)) {
      errors.push('Check B: file reference not found: ' + cleanedPath);
    }
  }

  return errors;
}

// ── Check C — FR→AC Mapping ───────────────────────────────────────────────────

function checkC(content) {
  const errors = [];

  // Extract all unique FR-N.N identifiers
  const frIds = new Set();
  let m;
  FR_RE.lastIndex = 0;
  while ((m = FR_RE.exec(content)) !== null) {
    frIds.add('FR-' + m[1]);
  }

  if (frIds.size === 0) return errors; // No FRs → Check C passes vacuously

  // If an "Acceptance Criteria" or Korean "성공 기준" heading exists, assume full coverage
  // PROGRESS.md uses "### 성공 기준" per-phase, which serves as the AC section
  if (/^#{1,4}\s+.*(Acceptance Criteria|성공 기준)/im.test(content)) return errors;

  // Per-FR check: each FR-N.N must appear on a line that also has an AC-N reference
  // or appear in a checkbox line that maps it
  for (const frId of frIds) {
    const lines = content.split('\n');
    const frNum = frId; // e.g. "FR-1.1"

    // Look for any line that mentions both frId and AC-N, or that is an AC checkbox line
    // containing a reference to the FR
    const hasCoverage = lines.some(line => {
      if (!line.includes(frNum)) return false;
      return AC_RE.test(line);
    });

    if (!hasCoverage) {
      errors.push('Check C: ' + frId + ' has no AC reference or Acceptance Criteria section');
    }
  }

  return errors;
}

// ── HTML mode (main-068 Phase 1) ──────────────────────────────────────────────

const HTML_ROOT_KINDS  = ['requirements', 'progress', 'retrospective'];
const HTML_INNER_KINDS = ['problem', 'fr', 'nfr', 'scope', 'hr', 'risk', 'ac'];

/**
 * Extract all data-ts-kind="..." values from raw HTML (regex-only, no DOM parser).
 * Returns Set of distinct values.
 */
function extractHtmlKinds(content) {
  const re = /data-ts-kind=["']([a-z\-]+)["']/g;
  const out = new Set();
  let m;
  while ((m = re.exec(content)) !== null) out.add(m[1]);
  return out;
}

/**
 * Extract the frontmatter JSON from <script type="application/json" id="ts-frontmatter">.
 * Returns { found: bool, parsed: object|null, raw: string|null, error: string|null }.
 */
function extractHtmlFrontmatter(content) {
  // Match either order of attributes (type first or id first)
  const re = /<script\b[^>]*\bid=["']ts-frontmatter["'][^>]*>([\s\S]*?)<\/script>/g;
  const matches = [];
  let m;
  while ((m = re.exec(content)) !== null) matches.push(m[1]);

  if (matches.length === 0) {
    return { found: false, parsed: null, raw: null, error: 'no <script id="ts-frontmatter"> found' };
  }
  if (matches.length > 1) {
    return { found: true, parsed: null, raw: matches[0], error: 'multiple <script id="ts-frontmatter"> blocks' };
  }
  const raw = matches[0].trim();
  try {
    const parsed = JSON.parse(raw);
    return { found: true, parsed, raw, error: null };
  } catch (e) {
    return { found: true, parsed: null, raw, error: 'frontmatter JSON parse failed: ' + e.message };
  }
}

// HA — AC Existence
function checkHA(content) {
  const errors = [];
  const hasAcKind = /data-ts-kind=["']ac["']/.test(content);
  const hasAcRef  = AC_RE.test(content);
  if (!hasAcKind && !hasAcRef) {
    errors.push('Check HA: no [data-ts-kind="ac"] section or AC-N reference found');
  }
  return errors;
}

// HB — Semantic structure + data-ts-kind hierarchy (main-068 Phase 2 strengthened)
// HB-1: <article> tag present
// HB-2: <section> tag present
// HB-3: data-ts-kind root + inner section
function checkHB(content) {
  const errors = [];

  // HB-1: at least one <article> tag (semantic root)
  if (!/<article\b/i.test(content)) {
    errors.push('Check HB: no <article> semantic tag found (HB-1)');
  }

  // HB-2: at least one <section> tag (semantic section)
  if (!/<section\b/i.test(content)) {
    errors.push('Check HB: no <section> semantic tag found (HB-2)');
  }

  // HB-3: data-ts-kind hierarchy (existing check)
  const kinds  = extractHtmlKinds(content);

  const hasRoot = HTML_ROOT_KINDS.some(k => kinds.has(k));
  if (!hasRoot) {
    errors.push('Check HB: no root data-ts-kind in {' + HTML_ROOT_KINDS.join('|') + '} (HB-3)');
  }

  const innerHits = HTML_INNER_KINDS.filter(k => kinds.has(k));
  if (innerHits.length === 0) {
    errors.push('Check HB: no inner section data-ts-kind found (expected at least one of ' + HTML_INNER_KINDS.join('|') + ') (HB-3)');
  }

  return errors;
}

// HC — frontmatter JSON
function checkHC(content) {
  const errors = [];
  const fm = extractHtmlFrontmatter(content);
  if (!fm.found) {
    errors.push('Check HC: ' + fm.error);
    return errors;
  }
  if (fm.error) {
    errors.push('Check HC: ' + fm.error);
    return errors;
  }
  if (!fm.parsed || typeof fm.parsed !== 'object') {
    errors.push('Check HC: frontmatter is not a JSON object');
    return errors;
  }
  if (!('document_type' in fm.parsed)) {
    errors.push('Check HC: frontmatter missing key "document_type"');
  }
  if (!('doc_id' in fm.parsed)) {
    errors.push('Check HC: frontmatter missing key "doc_id"');
  }
  return errors;
}

function checkHtml(content) {
  return [
    ...checkHA(content),
    ...checkHB(content),
    ...checkHC(content),
  ];
}

function isHtmlMode(filePath) {
  return /\.html?$/i.test(filePath);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const params = parseArgs(process.argv);

  // Fail-safe (NFR-2, AC-2.6): any error → pass:true
  if (!params.filePath) {
    process.stdout.write(JSON.stringify({ pass: true, errors: [], mode: 'markdown' }, null, 2) + '\n');
    process.exit(0);
  }

  // Resolve file path
  const resolvedFile = path.resolve(process.cwd(), params.filePath);
  const mode = isHtmlMode(resolvedFile) ? 'html' : 'markdown';

  // File not found → fail-safe pass (NFR-2)
  if (!fs.existsSync(resolvedFile)) {
    process.stdout.write(JSON.stringify({ pass: true, errors: [], mode }, null, 2) + '\n');
    process.exit(0);
  }

  // Determine project root: explicit arg → file's directory two levels up (heuristic) → cwd
  const projectRoot = params.projectRoot
    ? path.resolve(process.cwd(), params.projectRoot)
    : process.cwd();

  const content = fs.readFileSync(resolvedFile, 'utf-8');

  let errors;
  if (mode === 'html') {
    errors = checkHtml(content);
  } else {
    const sections = parseSections(content);
    errors = [
      ...checkA(content),
      ...checkB(content, projectRoot, sections),
      ...checkC(content),
    ];
  }

  const result = { pass: errors.length === 0, errors, mode };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.pass ? 0 : 1);
}

// Exports for unit tests (main-068 Phase 1 — tests/mechanical-check-html.test.js)
module.exports = {
  // Markdown mode
  checkA, checkB, checkC, parseSections,
  // HTML mode
  checkHA, checkHB, checkHC, checkHtml,
  extractHtmlKinds, extractHtmlFrontmatter, isHtmlMode,
  // Shared
  parseArgs,
};

// Fail-safe wrapper (NFR-2, AC-2.6) — only run main when invoked as CLI
if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stdout.write(JSON.stringify({ pass: true, errors: [], mode: 'markdown' }, null, 2) + '\n');
    process.exit(0);
  }
}
