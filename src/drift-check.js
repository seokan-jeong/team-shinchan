#!/usr/bin/env node
/**
 * drift-check.js — Measures AC coverage drift between REQUESTS.md and PROGRESS.md.
 *
 * Usage:
 *   node src/drift-check.js --requests <path> --progress <path>
 *
 * Output (stdout): JSON { total_ac, met_ac, coverage_pct, status, reason? }
 * Exit codes:
 *   0  = ok (coverage >= 0.50) or skip (no progress data yet)
 *   1  = warn (0 < coverage < 0.50)
 *   2  = block (coverage = 0 AND progress has checkbox data)
 *
 * Only uses Node.js built-in modules (fs, path). No external dependencies.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// HR-4: AC pattern handles variants:
//   - [ ] AC-1:
//   - [ ] AC-1.
//   - [ ] **AC-1**:
//   - [ ] AC-1.2:
// Total AC pattern: matches both checked and unchecked AC checkboxes
const AC_PATTERN     = /^-\s+\[[ xX]\]\s+\*{0,2}AC-\d+(\.\d+)?\*{0,2}[:.]/;
// Checked AC pattern: only checked checkboxes with AC reference
const CHECKED_PATTERN = /^-\s+\[[xX]\]\s+\*{0,2}AC-\d+(\.\d+)?\*{0,2}[:.]/;
// Any checkbox line (for HR-2: detecting whether PROGRESS.md has any checkbox data)
const ANY_CHECKBOX_PATTERN = /^-\s+\[[ xX]\]/m;

// HR-3: max bytes to tail-read from PROGRESS.md (32 KB)
const MAX_TAIL_BYTES = 32 * 1024;

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { requests: null, progress: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--requests' && args[i + 1]) result.requests = args[++i];
    if (args[i] === '--progress' && args[i + 1]) result.progress = args[++i];
  }
  return result;
}

// ── Tail read (HR-3) ──────────────────────────────────────────────────────────

function readTail(filePath, maxBytes) {
  const stat     = fs.statSync(filePath);
  const size     = stat.size;
  const readSize = Math.min(maxBytes, size);
  const buf      = Buffer.alloc(readSize);
  const fd       = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, readSize, size - readSize);
  fs.closeSync(fd);
  return buf.toString('utf-8');
}

// ── Scan REQUESTS.md for total AC count ──────────────────────────────────────

function countTotalAcs(requestsPath) {
  const content = fs.readFileSync(requestsPath, 'utf-8');

  // NFR-3: prefer scanning only the AC section (anchored to line start)
  // Match from "## N. Acceptance Criteria" heading to next ## heading or ---
  const acSectionMatch = content.match(
    /^##[^#].*Acceptance Criteria[^\n]*\n([\s\S]*?)(?=^##[^#]|^---)/m
  );

  const sectionText = acSectionMatch ? acSectionMatch[1] : content;
  return sectionText.split('\n').filter(l => AC_PATTERN.test(l)).length;
}

// ── Scan PROGRESS.md for checked items ───────────────────────────────────────

function countCheckedAcs(progressPath) {
  const content = readTail(progressPath, MAX_TAIL_BYTES);
  // Count checked AC checkboxes (- [x] AC-N: ...)
  const checkedAcCount = content.split('\n').filter(l => CHECKED_PATTERN.test(l)).length;
  return checkedAcCount;
}

// ── HR-2: detect whether PROGRESS.md has any checkbox data ───────────────────

function hasAnyCheckboxLines(progressPath) {
  const content = readTail(progressPath, MAX_TAIL_BYTES);
  return ANY_CHECKBOX_PATTERN.test(content);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const { requests, progress } = parseArgs(process.argv);

  if (!requests || !progress) {
    process.stderr.write(
      'Usage: node src/drift-check.js --requests <path> --progress <path>\n'
    );
    process.exit(1);
  }

  try {
    // HR-2: skip if PROGRESS.md is absent or has no checkbox data
    if (!fs.existsSync(progress) || !hasAnyCheckboxLines(progress)) {
      const out = {
        total_ac    : 0,
        met_ac      : 0,
        coverage_pct: 0,
        status      : 'skip',
        reason      : 'no_progress_data',
      };
      process.stdout.write(JSON.stringify(out, null, 2) + '\n');
      process.exit(0);
    }

    const total_ac     = countTotalAcs(requests);
    const met_ac       = countCheckedAcs(progress);
    const coverage_pct = total_ac === 0 ? 0 : Math.round((met_ac / total_ac) * 100);

    let status, exitCode;
    if (coverage_pct >= 50) {
      status = 'ok';    exitCode = 0;
    } else if (coverage_pct > 0) {
      status = 'warn';  exitCode = 1;
    } else {
      status = 'block'; exitCode = 2;
    }

    const out = { total_ac, met_ac, coverage_pct, status };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(exitCode);

  } catch (err) {
    // NFR-2: fail-safe — exit 0 on any parse or I/O error
    const out = {
      total_ac    : 0,
      met_ac      : 0,
      coverage_pct: 0,
      status      : 'skip',
      reason      : 'parse_error',
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
  }
}

main();
