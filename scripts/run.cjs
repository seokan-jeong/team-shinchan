#!/usr/bin/env node
/**
 * Team-Shinchan Hook Runner — Cross-platform wrapper for shell hook execution
 *
 * Usage: node run.cjs <script-path> [KEY=VALUE ...]
 *
 * - Reads stdin and pipes to the spawned bash process
 * - Parses KEY=VALUE arguments as environment variables
 * - Always exits 0 to prevent hook from blocking Claude Code on error
 * - Zero npm dependencies (Node.js built-ins only)
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(0);
}

const scriptPath = args[0];

// Parse KEY=VALUE arguments as environment overrides
const envOverrides = {};
for (let i = 1; i < args.length; i++) {
  const eqIdx = args[i].indexOf('=');
  if (eqIdx > 0) {
    envOverrides[args[i].slice(0, eqIdx)] = args[i].slice(eqIdx + 1);
  }
}

// Verify script exists; exit cleanly if not found
if (!fs.existsSync(scriptPath)) {
  // Stale cache fallback: scan sibling version directories
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
  if (pluginRoot) {
    const cacheParent = path.dirname(pluginRoot);
    try {
      const siblings = fs.readdirSync(cacheParent)
        .filter(d => d !== path.basename(pluginRoot))
        .sort()
        .reverse();
      for (const sibling of siblings) {
        const relative = path.relative(pluginRoot, scriptPath);
        const candidate = path.join(cacheParent, sibling, relative);
        if (fs.existsSync(candidate)) {
          // Found in sibling version — use it
          runScript(candidate, envOverrides);
          return;
        }
      }
    } catch (e) {
      // Cannot read sibling dirs — exit cleanly
    }
  }
  process.exit(0);
}

runScript(scriptPath, envOverrides);

function runScript(script, envVars) {
  const chunks = [];
  let ended = false;

  function spawnChild() {
    if (ended) return;
    ended = true;
    const stdinData = Buffer.concat(chunks);
    const child = spawn('bash', [script], {
      env: { ...process.env, ...envVars },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    child.stdin.write(stdinData);
    child.stdin.end();

    let stdout = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', () => {}); // absorb stderr

    child.on('close', (code) => {
      if (stdout.trim()) process.stdout.write(stdout);
      process.exit(code === 2 ? 2 : 0);
    });

    child.on('error', () => {
      process.exit(0);
    });
  }

  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', spawnChild);

  // If stdin is already closed or empty, fire after short timeout
  if (process.stdin.readableEnded) {
    spawnChild();
  } else {
    setTimeout(() => {
      if (!ended) {
        try { process.stdin.destroy(); } catch (e) {}
        spawnChild();
      }
    }, 200);
  }
}
