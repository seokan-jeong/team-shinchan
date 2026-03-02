#!/usr/bin/env node
/**
 * Team-Shinchan Hook Runner — Cross-platform wrapper for shell hook execution
 *
 * Usage: node run.cjs <script-path> [KEY=VALUE ...]
 *
 * - Reads stdin and pipes to the spawned bash process
 * - Parses KEY=VALUE arguments as environment variables
 * - Always exits 0 to prevent hook from blocking Claude Code on error
 * - Exit code 2 from child = block decision (propagated)
 * - Zero npm dependencies (Node.js built-ins only)
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Global error handlers — never crash
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

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

// Resolve script path — check existence, try sibling cache versions
let resolvedScript = scriptPath;
if (!fs.existsSync(resolvedScript)) {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
  let found = false;
  if (pluginRoot) {
    try {
      const cacheParent = path.dirname(pluginRoot);
      const siblings = fs.readdirSync(cacheParent)
        .filter(d => d !== path.basename(pluginRoot))
        .sort()
        .reverse();
      const relative = path.relative(pluginRoot, scriptPath);
      for (const sibling of siblings) {
        const candidate = path.join(cacheParent, sibling, relative);
        if (fs.existsSync(candidate)) {
          resolvedScript = candidate;
          found = true;
          break;
        }
      }
    } catch (e) {}
  }
  if (!found) process.exit(0);
}

// Collect all stdin, then spawn the child
const chunks = [];
let spawned = false;

function doSpawn() {
  if (spawned) return;
  spawned = true;

  try {
    const stdinData = Buffer.concat(chunks);
    const child = spawn('bash', [resolvedScript], {
      env: { ...process.env, ...envOverrides },
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

    child.on('error', () => process.exit(0));
  } catch (e) {
    process.exit(0);
  }
}

process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', doSpawn);
process.stdin.on('error', doSpawn);

// Timeout: if no stdin data arrives within 300ms, proceed with empty stdin
setTimeout(() => {
  if (!spawned) doSpawn();
}, 300);
