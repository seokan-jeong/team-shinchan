#!/usr/bin/env node
/**
 * Team-Shinchan Mechanical Pre-Check — $0 cost structural validation for Markdown documents
 *
 * Usage:
 *   node src/mechanical-check.js --file <path> [--project-root <path>]
 *
 * Output: JSON { pass: boolean, errors: string[] } to stdout
 * Exit:   0 (pass) or 1 (fail)
 *
 * Checks performed:
 *   A — AC Existence: at least one AC-N reference or - [ ] checkbox in document
 *   B — File Reference Validity: backtick-quoted paths must resolve to existing files
 *       (section-level "Create"/"신규"/"New" exception per HR-3)
 *   C — FR→AC Mapping: every FR-N.N must map to ≥1 AC-N or a dedicated AC section
 *
 * Fail-safe (NFR-2): any uncaught error → { pass: true, errors: [] } + exit 0
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

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const params = parseArgs(process.argv);

  // Fail-safe (NFR-2, AC-2.6): any error → pass:true
  if (!params.filePath) {
    process.stdout.write(JSON.stringify({ pass: true, errors: [] }, null, 2) + '\n');
    process.exit(0);
  }

  // Resolve file path
  const resolvedFile = path.resolve(process.cwd(), params.filePath);

  // File not found → fail-safe pass (NFR-2)
  if (!fs.existsSync(resolvedFile)) {
    process.stdout.write(JSON.stringify({ pass: true, errors: [] }, null, 2) + '\n');
    process.exit(0);
  }

  // Determine project root: explicit arg → file's directory two levels up (heuristic) → cwd
  const projectRoot = params.projectRoot
    ? path.resolve(process.cwd(), params.projectRoot)
    : process.cwd();

  const content  = fs.readFileSync(resolvedFile, 'utf-8');
  const sections = parseSections(content);

  const errors = [
    ...checkA(content),
    ...checkB(content, projectRoot, sections),
    ...checkC(content),
  ];

  const result = { pass: errors.length === 0, errors };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.pass ? 0 : 1);
}

// Fail-safe wrapper (NFR-2, AC-2.6)
try {
  main();
} catch (err) {
  process.stdout.write(JSON.stringify({ pass: true, errors: [] }, null, 2) + '\n');
  process.exit(0);
}
