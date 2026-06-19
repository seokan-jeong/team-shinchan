#!/usr/bin/env node
/**
 * main-076 AC-6 / NFR-1 / R-3: assert hooks/session-wrap.sh makes NO LLM/model invocation.
 * The determinism boundary is load-bearing — the shell hook writes only metric skeletons.
 */
const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '../..');
const HOOK = path.join(ROOT_DIR, 'hooks/session-wrap.sh');

function runValidation() {
  console.log('========================================');
  console.log('  Session-Wrap No-LLM Boundary (AC-6)');
  console.log('========================================\n');
  const errors = [];
  let src = '';
  try { src = fs.readFileSync(HOOK, 'utf-8'); } catch (e) {
    console.log('  \x1b[31m✗\x1b[0m cannot read session-wrap.sh'); return 1;
  }
  // Strip comments/strings is overkill; the design forbids ANY of these tokens as live calls.
  const forbidden = [
    /\bcurl\b/, /\bwget\b/, /\bfetch\(/, /api\.anthropic\.com/,
    /claude\s+-p\b/, /\banthropic\b/i, /subagent_type/, /Task\s*\(/
  ];
  forbidden.forEach((re) => {
    if (re.test(src)) {
      errors.push('forbidden LLM-invocation token matched: ' + re);
      console.log('  \x1b[31m✗\x1b[0m matched ' + re);
    }
  });
  if (errors.length === 0) console.log('  \x1b[32m✓\x1b[0m no LLM/model invocation in session-wrap.sh');
  console.log('\nErrors: ' + errors.length + '\n');
  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) process.exit(runValidation());
module.exports = { runValidation };
