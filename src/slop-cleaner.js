#!/usr/bin/env node
/**
 * Team-Shinchan AI Slop Cleaner — Detects and removes AI filler language
 *
 * Usage:
 *   echo "Certainly, here is your answer." | node src/slop-cleaner.js
 *   node src/slop-cleaner.js --file path/to/doc.md
 *   node src/slop-cleaner.js --fix --file path/to/doc.md
 *   node src/slop-cleaner.js --fix < input.txt
 *
 * Modes:
 *   scan (default)  — print matched phrases with line numbers, exit 0
 *   --fix           — rewrite cleaned text to stdout (or back to --file)
 *
 * Safety:
 *   HR-2: Operates on decoded UTF-8 strings, never raw Buffer slices
 *   HR-5: Detects and preserves LF vs CRLF line endings
 *   HR-6: Rejects input > 50,000 chars with a warning, exit 0
 *   AC-13: Always exits 0 (including when no slop found)
 *
 * Only uses Node.js built-in modules. No external dependencies.
 * Performance: < 1s for 10K chars.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Slop Pattern Definitions ──────────────────────────────────────────────────

/**
 * Filler opener phrases — matched at the start of a line (case-sensitive).
 * The trailing comma/space is included so removal leaves a clean sentence start.
 */
const FILLER_OPENERS = [
  /^Certainly,\s*/m,
  /^Absolutely,\s*/m,
  /^Of course,\s*/m,
  /^Sure,\s*/m,
  /^Great,\s*/m,
  /^I'll help you\b[^.\n]*/m,
];

/**
 * Hedge stack phrases — matched anywhere in a line.
 * Trailing space included so removal doesn't leave double-spaces.
 */
const HEDGE_STACKS = [
  /It's worth noting that\s+/g,
  /It is worth noting that\s+/g,
  /It is important to mention\s+/g,
  /Please note that\s+/g,
];

/**
 * Redundant qualifier replacements — [pattern, replacement].
 * Word-boundary safe to avoid partial matches.
 */
const REDUNDANT_QUALIFIERS = [
  [/\bvery unique\b/gi,          'unique'],
  [/\bcompletely eliminate\b/gi, 'eliminate'],
  [/\btotally unnecessary\b/gi,  'unnecessary'],
];

/**
 * Emoji cluster pattern — 3 or more consecutive Emoji_Presentation codepoints.
 * Uses Unicode property escapes (Node.js 10+ / V8 6.3+).
 */
const EMOJI_CLUSTER = /\p{Emoji_Presentation}{3,}/gu;

// ── Argument Parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    fix:  false,
    file: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--fix') {
      result.fix = true;
    } else if (arg === '--file' && args[i + 1] !== undefined) {
      result.file = args[++i];
    }
  }

  return result;
}

// ── Input Reading ─────────────────────────────────────────────────────────────

/**
 * Read raw bytes from a file path, then decode as UTF-8.
 * Throws if the path is not readable.
 *
 * @param {string} filePath
 * @returns {string}
 */
function readFile(filePath) {
  const buf = fs.readFileSync(filePath);       // Buffer
  return buf.toString('utf8');                 // HR-2: decoded string, not Buffer slice
}

/**
 * Read all of stdin synchronously as a UTF-8 string.
 *
 * @returns {string}
 */
function readStdin() {
  const buf = fs.readFileSync('/dev/stdin');   // Buffer
  return buf.toString('utf8');                 // HR-2
}

// ── DoS Guard ─────────────────────────────────────────────────────────────────

const MAX_CHARS = 50_000;

/**
 * Validate input length and encoding.
 * Exits 0 with a warning if the input exceeds the limit or contains
 * replacement characters that indicate invalid UTF-8.
 *
 * @param {string} text
 */
function dosGuard(text) {
  if (text.length > MAX_CHARS) {
    process.stderr.write(
      `[slop-cleaner] WARNING: input is ${text.length} chars (limit ${MAX_CHARS}). Skipping.\n`
    );
    process.exit(0);
  }
  // U+FFFD replacement character indicates invalid UTF-8 from the decoder.
  if (text.includes('\uFFFD')) {
    process.stderr.write(
      '[slop-cleaner] WARNING: input contains invalid UTF-8 sequences. Skipping.\n'
    );
    process.exit(0);
  }
}

// ── Line Ending Detection ─────────────────────────────────────────────────────

/**
 * Detect the dominant line ending style of the text.
 *
 * @param {string} text
 * @returns {'CRLF'|'LF'}
 */
function detectLineEnding(text) {
  const crlfCount = (text.match(/\r\n/g) || []).length;
  const lfCount   = (text.match(/(?<!\r)\n/g) || []).length;
  return crlfCount >= lfCount ? 'CRLF' : 'LF';
}

// ── Cleaning Logic ────────────────────────────────────────────────────────────

/**
 * Apply all slop removal rules to a text string.
 * Operates on the full string for multi-line openers, then line-by-line for
 * accurate scan reporting.
 *
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  let result = text;

  for (const pattern of FILLER_OPENERS) {
    result = result.replace(pattern, '');
  }

  for (const pattern of HEDGE_STACKS) {
    result = result.replace(pattern, '');
  }

  for (const [pattern, replacement] of REDUNDANT_QUALIFIERS) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(EMOJI_CLUSTER, '');

  return result;
}

// ── Scan Mode ─────────────────────────────────────────────────────────────────

/**
 * Scan text and print matched slop phrases with line numbers.
 * Returns the total number of matches found.
 *
 * @param {string} text
 * @returns {number} total match count
 */
function scanText(text) {
  // Normalize to LF for line splitting; we track original lines for display.
  const normalizedText = text.replace(/\r\n/g, '\n');
  const lines = normalizedText.split('\n');
  let totalMatches = 0;

  /** @param {number} lineNum 1-based */
  function reportMatch(lineNum, matchedText, category) {
    process.stdout.write(`  Line ${lineNum} [${category}]: "${matchedText}"\n`);
    totalMatches++;
  }

  // We need to run each pattern against the full text to get line numbers.
  // Build a helper that maps a string-index to a 1-based line number.
  function lineOf(idx) {
    return normalizedText.slice(0, idx).split('\n').length;
  }

  // Filler openers
  for (const pattern of FILLER_OPENERS) {
    // Reset lastIndex for global patterns (though these aren't /g, be safe).
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + '');
    let m;
    // Use exec loop with a one-shot non-global pattern.
    const match = normalizedText.match(re);
    if (match) {
      const lineNum = lineOf(normalizedText.indexOf(match[0]));
      reportMatch(lineNum, match[0].trim(), 'filler opener');
    }
  }

  // Hedge stacks (global)
  for (const pattern of HEDGE_STACKS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(normalizedText)) !== null) {
      reportMatch(lineOf(m.index), m[0].trim(), 'hedge stack');
    }
  }

  // Redundant qualifiers (global)
  for (const [pattern, replacement] of REDUNDANT_QUALIFIERS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(normalizedText)) !== null) {
      reportMatch(lineOf(m.index), `"${m[0]}" → "${replacement}"`, 'redundant qualifier');
    }
  }

  // Emoji clusters (global, unicode)
  {
    const re = new RegExp(EMOJI_CLUSTER.source, EMOJI_CLUSTER.flags);
    let m;
    while ((m = re.exec(normalizedText)) !== null) {
      reportMatch(lineOf(m.index), m[0], 'emoji cluster');
    }
  }

  return totalMatches;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const params = parseArgs(process.argv);

  // Read input
  let rawText;
  if (params.file) {
    try {
      rawText = readFile(params.file);
    } catch (err) {
      process.stderr.write(`[slop-cleaner] ERROR: Cannot read file "${params.file}": ${err.message}\n`);
      process.exit(0);                           // AC-13: always exit 0
    }
  } else {
    try {
      rawText = readStdin();
    } catch (err) {
      process.stderr.write(`[slop-cleaner] ERROR: Cannot read stdin: ${err.message}\n`);
      process.exit(0);
    }
  }

  // HR-6: DoS guard (also catches invalid UTF-8)
  dosGuard(rawText);

  if (params.fix) {
    // ── Fix mode ──────────────────────────────────────────────────────────────
    const lineEnding = detectLineEnding(rawText);             // HR-5: detect
    const cleaned    = cleanText(rawText);

    // Restore original line endings if CRLF
    const output = lineEnding === 'CRLF'
      ? cleaned.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n') // normalize then restore
      : cleaned;

    if (params.file) {
      // Write back to file (HR-5: preserve line endings)
      try {
        fs.writeFileSync(params.file, output, 'utf8');
        const removedCount = rawText.length - cleaned.length;
        process.stdout.write(
          `[slop-cleaner] Cleaned "${path.basename(params.file)}" — removed ~${removedCount} chars of slop.\n`
        );
      } catch (err) {
        process.stderr.write(`[slop-cleaner] ERROR: Cannot write file "${params.file}": ${err.message}\n`);
        process.exit(0);
      }
    } else {
      // Write cleaned text to stdout
      process.stdout.write(output);
    }
  } else {
    // ── Scan mode ─────────────────────────────────────────────────────────────
    process.stdout.write('[slop-cleaner] Scan results:\n');
    const count = scanText(rawText);
    if (count === 0) {
      process.stdout.write('  No slop detected.\n');
    } else {
      process.stdout.write(`\n[slop-cleaner] Found ${count} slop match(es). Run with --fix to clean.\n`);
    }
  }

  process.exit(0);                               // AC-13: always exit 0
}

if (require.main === module) { main(); }

module.exports = { cleanText, scanText, detectLineEnding, dosGuard };
