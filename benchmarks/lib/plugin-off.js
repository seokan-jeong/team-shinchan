'use strict';

/**
 * benchmarks/lib/plugin-off.js — Phase 5 (main-078)
 *
 * arm-B fairness machinery (DEC-1, NFR-3, HR-1). arm-B runs the SAME CLI binary,
 * model, and flags as arm-A but with the team-shinchan plugin DISABLED, via a clean
 * isolated CLAUDE_CONFIG_DIR that has no team-shinchan on its plugin path. The runner
 * then ASSERTS no team-shinchan hook/skill fired (no write-tracker JSONL line, no
 * .shinchan-docs mutation) — turning "we disabled it" from a claim into a verified,
 * auditable fact, the direct guard against the #126 unfair-baseline retraction.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Build a clean, isolated CLAUDE_CONFIG_DIR for arm-B with no team-shinchan plugin.
 * The dir is empty (no plugins/, no settings referencing team-shinchan), so the
 * baseline CLI cannot load the plugin. Caller passes this as CLAUDE_CONFIG_DIR.
 * @returns {string} absolute path to the isolated config dir
 */
function buildPluginOffConfigDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'armb-cfg-'));
  // Minimal settings with NO team-shinchan plugin and NO hooks. Empty plugins dir
  // documents intent; the key fact is the absence of any team-shinchan reference.
  fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({ note: 'baseline arm-B: plugin disabled, no hooks', enableAllProjectMcpServers: false }, null, 2) + '\n'
  );
  return dir;
}

/**
 * Assert that no team-shinchan hook/skill fired during an arm-B run in projectDir.
 * A fired hook (a write-tracker JSONL line, or any .shinchan-docs mutation) means
 * the baseline was contaminated — a HARD FAIL (unfair baseline = the #126 failure mode).
 * @param {string} projectDir
 * @returns {{ok:boolean, reason?:string}}
 */
function assertNoTeamShinchanFired(projectDir) {
  const shinchanDocs = path.join(projectDir, '.shinchan-docs');
  if (fs.existsSync(shinchanDocs)) {
    // any write-tracker JSONL line is proof a hook fired
    const tracker = path.join(shinchanDocs, 'work-tracker.jsonl');
    if (fs.existsSync(tracker) && fs.readFileSync(tracker, 'utf8').trim() !== '') {
      return { ok: false, reason: 'team-shinchan write-tracker JSONL line present — hook fired (unfair baseline)' };
    }
    // any other content under .shinchan-docs is also a mutation
    const entries = fs.readdirSync(shinchanDocs);
    if (entries.length > 0) {
      return { ok: false, reason: '.shinchan-docs mutated during arm-B run (unfair baseline)' };
    }
  }
  return { ok: true };
}

module.exports = { buildPluginOffConfigDir, assertNoTeamShinchanFired };
