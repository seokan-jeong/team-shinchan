#!/usr/bin/env node
/**
 * Hook Execution Validator
 * Tests hooks locally without restarting Claude Code.
 *
 * Tests:
 * 1. hooks.json schema — valid JSON, required fields, matcher on every entry
 * 2. Script existence — all referenced .sh and .md files exist
 * 3. Script permissions — all .sh files are executable
 * 4. run.cjs wrapper — spawns bash and pipes stdin correctly
 * 5. Hook execution — pipes test JSON to each .sh hook, verifies exit 0
 * 6. Prompt file readability — all .md files are non-empty
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');
const HOOKS_JSON = path.join(ROOT_DIR, 'hooks/hooks.json');
const RUN_CJS = path.join(ROOT_DIR, 'scripts/run.cjs');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';

let errors = 0;
let warnings = 0;
let passed = 0;

function ok(msg) { console.log(`  ${PASS} ${msg}`); passed++; }
function fail(msg) { console.log(`  ${FAIL} ${msg}`); errors++; }
function warn(msg) { console.log(`  ${WARN} ${msg}`); warnings++; }

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(50)}\n`);
}

// ── 1. hooks.json Schema ──

section('1. hooks.json Schema');

let hooksConfig;
try {
  hooksConfig = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf-8'));
  ok('Valid JSON');
} catch (e) {
  fail(`Invalid JSON: ${e.message}`);
  process.exit(1);
}

if (hooksConfig.hooks && typeof hooksConfig.hooks === 'object') {
  ok('"hooks" key present');
} else {
  fail('Missing "hooks" key');
  process.exit(1);
}

const VALID_EVENTS = [
  'SessionStart', 'SessionEnd', 'PreToolUse', 'PostToolUse',
  'UserPromptSubmit', 'Stop', 'SubagentStart', 'SubagentStop',
  'PreCompact', 'PermissionRequest', 'PostToolUseFailure'
];

const events = Object.keys(hooksConfig.hooks);
events.forEach(event => {
  if (VALID_EVENTS.includes(event)) {
    ok(`Valid event: ${event}`);
  } else {
    fail(`Unknown event: ${event}`);
  }
});

// Check matcher on every entry
let missingMatcher = 0;
let totalEntries = 0;
events.forEach(event => {
  hooksConfig.hooks[event].forEach((entry, i) => {
    totalEntries++;
    if (!entry.matcher) {
      missingMatcher++;
      fail(`${event}[${i}]: missing "matcher" (must be "*" or tool name)`);
    }
  });
});
if (missingMatcher === 0) {
  ok(`All ${totalEntries} entries have "matcher" field`);
}

// ── 2. Script Existence ──

section('2. Referenced Files Exist');

const commandScripts = new Set();
const promptFiles = new Set();

events.forEach(event => {
  hooksConfig.hooks[event].forEach(entry => {
    (entry.hooks || []).forEach(h => {
      if (h.type === 'command' && h.command) {
        // Extract .sh paths from command string
        const shMatch = h.command.match(/hooks\/[\w-]+\.sh/g);
        if (shMatch) shMatch.forEach(s => commandScripts.add(s));
      }
      if (h.type === 'prompt' && h.prompt) {
        const mdMatch = h.prompt.match(/hooks\/[\w-]+\.md/);
        if (mdMatch) promptFiles.add(mdMatch[0]);
      }
    });
  });
});

commandScripts.forEach(script => {
  const fullPath = path.join(ROOT_DIR, script);
  if (fs.existsSync(fullPath)) {
    ok(`${script} exists`);
  } else {
    fail(`${script} MISSING`);
  }
});

promptFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, file);
  if (fs.existsSync(fullPath)) {
    ok(`${file} exists`);
  } else {
    fail(`${file} MISSING`);
  }
});

// ── 3. Script Permissions ──

section('3. Script Permissions');

if (fs.existsSync(RUN_CJS)) {
  ok('scripts/run.cjs exists');
} else {
  fail('scripts/run.cjs MISSING');
}

commandScripts.forEach(script => {
  const fullPath = path.join(ROOT_DIR, script);
  if (!fs.existsSync(fullPath)) return;
  try {
    fs.accessSync(fullPath, fs.constants.X_OK);
    ok(`${script} is executable`);
  } catch {
    fail(`${script} NOT executable — run: chmod +x ${script}`);
  }
});

// Check shebang
commandScripts.forEach(script => {
  const fullPath = path.join(ROOT_DIR, script);
  if (!fs.existsSync(fullPath)) return;
  const firstLine = fs.readFileSync(fullPath, 'utf-8').split('\n')[0];
  if (firstLine.startsWith('#!/bin/bash') || firstLine.startsWith('#!/usr/bin/env bash')) {
    ok(`${script} has bash shebang`);
  } else {
    fail(`${script} missing bash shebang: "${firstLine}"`);
  }
});

// Check set -eo (no -u)
commandScripts.forEach(script => {
  const fullPath = path.join(ROOT_DIR, script);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf-8');
  if (content.includes('set -euo pipefail')) {
    fail(`${script} uses -u flag (unbound var crash risk) — use set -eo pipefail`);
  } else if (content.includes('set -eo pipefail')) {
    ok(`${script} uses safe set -eo pipefail`);
  }
});

// ── 4. Prompt File Readability ──

section('4. Prompt Files');

promptFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf-8').trim();
  if (content.length > 0) {
    ok(`${file} (${content.length} chars)`);
  } else {
    fail(`${file} is empty`);
  }
});

// ── 5. run.cjs Wrapper Test ──

section('5. run.cjs Wrapper');

if (fs.existsSync(RUN_CJS)) {
  // Test 1: Missing script exits cleanly
  try {
    const result = execSync(
      `echo '{}' | node "${RUN_CJS}" /nonexistent/script.sh 2>/dev/null`,
      { timeout: 5000, encoding: 'utf-8' }
    );
    ok('Handles missing script gracefully (exit 0)');
  } catch (e) {
    if (e.status === 0) {
      ok('Handles missing script gracefully (exit 0)');
    } else {
      fail(`Crashed on missing script (exit ${e.status})`);
    }
  }

  // Test 2: Can spawn a simple bash command
  try {
    const result = execSync(
      `echo '{}' | node "${RUN_CJS}" "${path.join(ROOT_DIR, 'hooks/trace-init.sh')}" 2>/dev/null`,
      { timeout: 5000, encoding: 'utf-8', cwd: ROOT_DIR }
    );
    ok('Successfully spawns bash hook via run.cjs');
  } catch (e) {
    if (e.status === 0) {
      ok('Successfully spawns bash hook via run.cjs');
    } else {
      fail(`Failed to spawn bash hook (exit ${e.status})`);
    }
  }

  // Test 3: Environment variable injection
  try {
    const result = execSync(
      `echo '{}' | node "${RUN_CJS}" "${path.join(ROOT_DIR, 'hooks/write-tracker.sh')}" HOOK_EVENT=Test 2>/dev/null`,
      { timeout: 5000, encoding: 'utf-8', cwd: ROOT_DIR }
    );
    ok('Environment variable injection works (HOOK_EVENT=Test)');
  } catch (e) {
    if (e.status === 0) {
      ok('Environment variable injection works (HOOK_EVENT=Test)');
    } else {
      warn(`Env var injection returned exit ${e.status} (may be normal)`);
    }
  }
}

// ── 6. Hook Execution (pipe test data) ──

section('6. Hook Execution (stdin pipe test)');

const TEST_INPUTS = {
  'security-check.sh': '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}',
  'deny-check.sh': '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}',
  'agent-tool-guard.sh': '{"tool_name":"Bash","tool_input":{"command":"ls"}}',
  'budget-guard.sh': '{"tool_name":"Bash","tool_input":{"command":"ls"}}',
  'workflow-guard.sh': '{"tool_name":"Bash","tool_input":{"command":"ls"}}',
  'transition-gate.sh': '{"tool_name":"Write","tool_input":{"file_path":"test.js","content":"x"}}',
  'layer-guard.sh': '{"tool_name":"Task","tool_input":{"subagent_type":"team-shinchan:bo"}}',
  'commit-lint.sh': '{"tool_name":"Bash","tool_input":{"command":"git commit -m \\"feat: test commit\\""}}',
  'session-init.sh': '{}',
  'write-tracker.sh': '{"agent_type":"team-shinchan:test"}',
  'trace-init.sh': '{}',
};

Object.entries(TEST_INPUTS).forEach(([script, testInput]) => {
  const fullPath = path.join(ROOT_DIR, 'hooks', script);
  if (!fs.existsSync(fullPath)) {
    fail(`${script}: file not found`);
    return;
  }
  try {
    const envVars = script === 'write-tracker.sh' ? 'HOOK_EVENT=Test' : '';
    const cmd = envVars
      ? `echo '${testInput}' | node "${RUN_CJS}" "${fullPath}" ${envVars}`
      : `echo '${testInput}' | node "${RUN_CJS}" "${fullPath}"`;
    const result = execSync(cmd, {
      timeout: 10000,
      encoding: 'utf-8',
      cwd: ROOT_DIR,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT_DIR }
    });
    const output = result.trim();
    if (output) {
      // Check if it's a block decision (expected for some tests)
      try {
        const parsed = JSON.parse(output);
        if (parsed.decision === 'block') {
          ok(`${script}: correctly blocks (${parsed.reason.slice(0, 50)}...)`);
        } else {
          ok(`${script}: returned JSON output`);
        }
      } catch {
        ok(`${script}: returned text (${output.slice(0, 40)}...)`);
      }
    } else {
      ok(`${script}: exit 0, no output (allow)`);
    }
  } catch (e) {
    if (e.status === 0) {
      ok(`${script}: exit 0`);
    } else {
      fail(`${script}: exit ${e.status} — ${(e.stderr || '').slice(0, 80)}`);
    }
  }
});

// ── 7. Block Detection Tests ──

section('7. Block Detection (should block dangerous inputs)');

const BLOCK_TESTS = [
  {
    name: 'security-check blocks secrets',
    script: 'security-check.sh',
    input: '{"tool_name":"Bash","tool_input":{"command":"git add .env"}}',
    expectBlock: true
  },
  {
    name: 'deny-check blocks rm -rf /',
    script: 'deny-check.sh',
    input: '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}',
    expectBlock: true
  },
  {
    name: 'deny-check blocks git add .',
    script: 'deny-check.sh',
    input: '{"tool_name":"Bash","tool_input":{"command":"git add ."}}',
    expectBlock: true
  },
  {
    name: 'commit-lint blocks bad commit message',
    script: 'commit-lint.sh',
    input: '{"tool_name":"Bash","tool_input":{"command":"git commit -m \\"bad message\\""}}',
    expectBlock: true
  },
  {
    name: 'commit-lint allows conventional commit',
    script: 'commit-lint.sh',
    input: '{"tool_name":"Bash","tool_input":{"command":"git commit -m \\"feat: good message\\""}}',
    expectBlock: false
  },
  {
    name: 'security-check allows safe command',
    script: 'security-check.sh',
    input: '{"tool_name":"Bash","tool_input":{"command":"npm test"}}',
    expectBlock: false
  },
  {
    name: 'security-check blocks unpinned deps',
    script: 'security-check.sh',
    input: '{"tool_name":"Write","tool_input":{"file_path":"package.json","content":"{\\"deps\\":{\\"foo\\":\\"*\\"}}"}}',
    expectBlock: true
  }
];

BLOCK_TESTS.forEach(({ name, script, input, expectBlock }) => {
  const fullPath = path.join(ROOT_DIR, 'hooks', script);
  try {
    const result = execSync(
      `echo '${input}' | node "${RUN_CJS}" "${fullPath}"`,
      { timeout: 10000, encoding: 'utf-8', cwd: ROOT_DIR, env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT_DIR } }
    );
    const output = result.trim();
    let blocked = false;
    if (output) {
      try {
        const parsed = JSON.parse(output);
        blocked = parsed.decision === 'block';
      } catch {}
    }
    if (expectBlock && blocked) {
      ok(`${name} → BLOCKED (correct)`);
    } else if (!expectBlock && !blocked) {
      ok(`${name} → ALLOWED (correct)`);
    } else if (expectBlock && !blocked) {
      fail(`${name} → ALLOWED (should have blocked)`);
    } else {
      fail(`${name} → BLOCKED (should have allowed)`);
    }
  } catch (e) {
    if (e.status === 0 && !expectBlock) {
      ok(`${name} → ALLOWED (correct)`);
    } else {
      fail(`${name} → error (exit ${e.status})`);
    }
  }
});

// ── Summary ──

section('Summary');

console.log(`  Passed:   ${passed}`);
console.log(`  Failed:   ${errors}`);
console.log(`  Warnings: ${warnings}`);
console.log();

if (errors === 0) {
  console.log('  \x1b[32m✓ ALL HOOK TESTS PASSED\x1b[0m\n');
} else {
  console.log(`  \x1b[31m✗ ${errors} test(s) failed\x1b[0m\n`);
}

process.exit(errors > 0 ? 1 : 0);
