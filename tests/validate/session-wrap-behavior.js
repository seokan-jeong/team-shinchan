#!/usr/bin/env node
/**
 * main-076 FR-8 / AC-1,2,3,7: behavioral test of hooks/session-wrap.sh.
 *  (a) block-once: first natural execution stop blocks + writes completion_prompted:true;
 *      second stop (now prompted) emits NO block.
 *  (b) auto-capture: skeleton written deterministically (skeleton:true, no scores).
 *  (c) no-op: planning stage / no files ⇒ no block, exit 0.
 *  (d) REGRESSION (main-076 MEDIUM #3): existing shared-block behaviors still run after the
 *      2.1-2.4 edits — budget used_total increments + SESSION_SUMMARY.md still written.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT_DIR = path.join(__dirname, '../..');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');
const HOOK = path.join(ROOT_DIR, 'hooks/session-wrap.sh');

function mkFixture(stage, files, prompted, withBudget) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-'));
  const docs = path.join(dir, '.shinchan-docs');
  fs.mkdirSync(path.join(docs, 'main-zzz'), { recursive: true });
  const ev = [];
  files.forEach((f, i) => ev.push(JSON.stringify({ session: 's1', ts: '2026-06-19T10:0' + i + ':00Z', type: 'file_change', data: { file: f } })));
  // terminal event is agent_start (non-tool_use) so naturalStop=true (DEC-1)
  ev.push(JSON.stringify({ session: 's1', ts: '2026-06-19T10:09:00Z', type: 'agent_start', agent: 'bo' }));
  fs.writeFileSync(path.join(docs, 'work-tracker.jsonl'), ev.join('\n') + '\n');
  fs.writeFileSync(path.join(docs, '.session-id'), 's1\n');
  let yaml = 'version: 1\ndoc_id: main-zzz\ncurrent:\n  stage: ' + stage + '\n  owner: bo\n  status: active\n';
  if (prompted) yaml += '  completion_prompted: true\n';
  if (withBudget) yaml += 'budget:\n  used_total: 0\n  used_phase: 0\n';
  fs.writeFileSync(path.join(docs, 'main-zzz', 'WORKFLOW_STATE.yaml'), yaml);
  fs.writeFileSync(path.join(dir, '.shinchan-config.yaml'), 'completion:\n  nudge: true\n');
  return dir;
}
function runHook(dir) {
  try { return execFileSync('node', [RUN_CJS, HOOK], { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { return (e.stdout || '') + ''; }
}

function runValidation() {
  console.log('========================================');
  console.log('  Session-Wrap Behavior (FR-8 / AC-1,2,3,7)');
  console.log('========================================\n');
  const errors = [];
  const ok = (m) => console.log('  \x1b[32m✓\x1b[0m ' + m);
  const bad = (m) => { errors.push(m); console.log('  \x1b[31m✗\x1b[0m ' + m); };
  const dirs = [];

  try {
  // (1) block-once: first stop blocks + auto-capture skeleton (AC-1, AC-3)
  let dir = mkFixture('execution', ['a.js'], false, false);
  dirs.push(dir);
  let out = runHook(dir);
  const blocked = /"decision":"block"/.test(out);
  const stateYaml = fs.readFileSync(path.join(dir, '.shinchan-docs/main-zzz/WORKFLOW_STATE.yaml'), 'utf-8');
  const promptedSet = /completion_prompted:\s*true/.test(stateYaml);
  const evalLine = fs.existsSync(path.join(dir, '.shinchan-docs/eval-history.jsonl'))
    ? fs.readFileSync(path.join(dir, '.shinchan-docs/eval-history.jsonl'), 'utf-8') : '';
  const skel = /"skeleton":true/.test(evalLine) && !/"scores"/.test(evalLine);
  // MEDIUM #2: the block JSON must be the parseable LAST line of multi-line stdout
  let lastLineOk = false;
  try {
    const lines = out.trim().split('\n').filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]);
    lastLineOk = last && last.decision === 'block';
  } catch (e) { lastLineOk = false; }
  blocked ? ok('AC-1 first execution stop emits decision:block') : bad('AC-1 expected a block');
  lastLineOk ? ok('MEDIUM#2 decision:block is the parseable LAST line of stdout') : bad('MEDIUM#2 last line is not parseable decision:block');
  promptedSet ? ok('AC-2 completion_prompted set true after block') : bad('AC-2 flag not set');
  skel ? ok('AC-3 skeleton:true record, no scores') : bad('AC-3 skeleton record missing/has scores');

  // (2) second stop (now prompted) ⇒ NO block (AC-2 block-ONCE)
  let dir2 = mkFixture('execution', ['a.js'], true, false);
  dirs.push(dir2);
  let out2 = runHook(dir2);
  /"decision":"block"/.test(out2) ? bad('AC-2 second stop unexpectedly blocked') : ok('AC-2 second stop no-ops (block-once)');

  // (3) planning stage ⇒ no block (AC-7)
  let dir3 = mkFixture('planning', ['a.js'], false, false);
  dirs.push(dir3);
  /"decision":"block"/.test(runHook(dir3)) ? bad('AC-7 planning stop blocked') : ok('AC-7 planning stage no block');

  // (4) zero files ⇒ no block, no empty skeleton (HR-6)
  let dir4 = mkFixture('execution', [], false, false);
  dirs.push(dir4);
  let out4 = runHook(dir4);
  const eval4 = path.join(dir4, '.shinchan-docs/eval-history.jsonl');
  (!/"decision":"block"/.test(out4) && !fs.existsSync(eval4)) ? ok('HR-6 zero-files no block, no skeleton') : bad('HR-6 unexpected block/skeleton on zero files');

  // (5) REGRESSION (MEDIUM #3): existing shared-block behaviors still run after 2.1-2.4 edits
  let dir5 = mkFixture('execution', ['a.js', 'b.js'], false, true);
  dirs.push(dir5);
  let out5 = runHook(dir5);
  const yaml5 = fs.readFileSync(path.join(dir5, '.shinchan-docs/main-zzz/WORKFLOW_STATE.yaml'), 'utf-8');
  const budgetBumped = /used_total:\s*[1-9]/.test(yaml5); // turnEvents>=2 files ⇒ used_total incremented from 0
  const summaryWritten = fs.existsSync(path.join(dir5, '.shinchan-docs/main-zzz/SESSION_SUMMARY.md'));
  budgetBumped ? ok('MEDIUM#3 regression: budget used_total still increments') : bad('MEDIUM#3 budget counter not incremented (regression!)');
  summaryWritten ? ok('MEDIUM#3 regression: SESSION_SUMMARY.md still written') : bad('MEDIUM#3 SESSION_SUMMARY.md not written (regression!)');

  } finally {
    dirs.forEach(d => { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} });
  }
  console.log('\nErrors: ' + errors.length + '\n');
  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) process.exit(runValidation());
module.exports = { runValidation };
