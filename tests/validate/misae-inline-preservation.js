#!/usr/bin/env node
/**
 * Misae Inline-Preservation Validator (DEC-2)
 * Asserts that after the agents/misae.md diet:
 *   (i)   the IMMUTABLE RULES block is present verbatim,
 *   (ii)  every mode-contract JSON block (interview-question / finalize-result) is present verbatim,
 *   (iii) the frontmatter is byte-identical,
 *   (iv)  the needs_reframe YAML history block is present verbatim,
 *   (v)   the 5 misae-* stub links resolve to existing files.
 * Baseline = the pre-diet misae.md pinned by PRE_DIET_SHA (immutable in git history).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');
const MISAE = path.join(ROOT_DIR, 'agents/misae.md');
const SHARED_DIR = path.join(ROOT_DIR, 'agents/_shared');

// Pre-diet commit of agents/misae.md (git log -1 --format=%H -- agents/misae.md at plan time).
// This commit's misae.md is the pristine 1097-line baseline and stays reachable forever.
const PRE_DIET_SHA = '7003ed500295a2937a1cb778cc9ac94ad991202d';

const EXPECTED_SHARED = [
  'misae-interview-option-pipeline.md',
  'misae-interview-gate-tickets.md',
  'misae-solution-smell-gate.md',
  'misae-workflow-state-schema.md',
  'misae-ak-review-loop.md'
];

// --- helpers -------------------------------------------------------------
function readBaseline() {
  return execSync(`git show ${PRE_DIET_SHA}:agents/misae.md`, {
    cwd: ROOT_DIR, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024
  });
}

// Extract the frontmatter (text between the first and second '---' line, exclusive-of-fences
// but including the inner bytes exactly as they appear).
function extractFrontmatter(src) {
  const lines = src.split('\n');
  if (lines[0].trim() !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  return lines.slice(0, end + 1).join('\n'); // includes both --- fences
}

// Extract the fenced block immediately following the '## IMMUTABLE RULES' heading.
function extractImmutableRules(src) {
  const lines = src.split('\n');
  const h = lines.findIndex(l => /^##\s+IMMUTABLE RULES/.test(l));
  if (h === -1) return null;
  const open = lines.indexOf('```', h);
  if (open === -1) return null;
  const close = lines.indexOf('```', open + 1);
  if (close === -1) return null;
  return lines.slice(open, close + 1).join('\n');
}

// Extract every fenced block whose info-string === tag (e.g. 'interview-question', 'finalize-result').
function extractFencedByTag(src, tag) {
  const lines = src.split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '```' + tag) {
      const close = lines.indexOf('```', i + 1);
      if (close !== -1) {
        blocks.push(lines.slice(i, close + 1).join('\n'));
        i = close;
      }
    }
  }
  return blocks;
}

// Extract the yaml block that contains 'event: needs_reframe'.
function extractNeedsReframeYaml(src) {
  const blocks = extractFencedByTag(src, 'yaml');
  return blocks.find(b => b.includes('event: needs_reframe')) || null;
}

// --- validation ----------------------------------------------------------
function checkPreservation() {
  const errors = [];
  const current = fs.readFileSync(MISAE, 'utf-8');
  const baseline = readBaseline();

  // (iii) frontmatter byte-identical
  const fmBase = extractFrontmatter(baseline);
  const fmCur = extractFrontmatter(current);
  if (!fmBase) errors.push('baseline frontmatter not found');
  else if (fmBase !== fmCur) errors.push('frontmatter NOT byte-identical (AC-10)');

  // (i) IMMUTABLE RULES verbatim
  const irBase = extractImmutableRules(baseline);
  if (!irBase) errors.push('baseline IMMUTABLE RULES block not found');
  else if (!current.includes(irBase)) errors.push('IMMUTABLE RULES block missing/altered (AC-2)');

  // (ii) every mode-contract JSON block verbatim
  for (const tag of ['interview-question', 'finalize-result']) {
    const blocks = extractFencedByTag(baseline, tag);
    blocks.forEach((b, idx) => {
      if (!current.includes(b)) errors.push(`${tag} block #${idx + 1} missing/altered (AC-3)`);
    });
  }

  // (iv) needs_reframe YAML history block verbatim
  const nr = extractNeedsReframeYaml(baseline);
  if (!nr) errors.push('baseline needs_reframe yaml block not found');
  else if (!current.includes(nr)) errors.push('needs_reframe yaml block missing/altered (AC-4)');

  // (v) 5 stub links resolve to existing files AND use the ${CLAUDE_PLUGIN_ROOT} prefix so the
  //     link is reachable from a real plugin install (a bare relative path resolves against the
  //     invoking session CWD, not the plugin dir — it would silently fail in production).
  for (const f of EXPECTED_SHARED) {
    if (!current.includes(f)) errors.push(`stub link to ${f} not present in misae.md (FR-2)`);
    if (!fs.existsSync(path.join(SHARED_DIR, f))) errors.push(`_shared file missing: ${f} (DEC-1)`);
    if (!current.includes('${CLAUDE_PLUGIN_ROOT}/agents/_shared/' + f)) {
      errors.push(`stub link to ${f} is not \${CLAUDE_PLUGIN_ROOT}-prefixed — unreachable in a real install (FR-2 convention)`);
    }
  }

  return errors;
}

function runValidation() {
  console.log('========================================');
  console.log('  Misae Inline-Preservation Validation');
  console.log('========================================\n');
  let errors;
  try {
    errors = checkPreservation();
  } catch (e) {
    console.log(`\x1b[31m✗ validator error: ${e.message}\x1b[0m\n`);
    return 1;
  }
  if (errors.length === 0) {
    console.log('\x1b[32m✓ IMMUTABLE RULES, mode-contract JSON, frontmatter, needs_reframe YAML preserved; 5 stub links resolve.\x1b[0m\n');
    return 0;
  }
  console.log(`\x1b[31m✗ ${errors.length} preservation error(s):\x1b[0m`);
  errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
  console.log('');
  return errors.length; // non-zero = FAIL, matches index.js error-count convention
}

if (require.main === module) {
  process.exit(runValidation() > 0 ? 1 : 0);
}

module.exports = { runValidation };
