#!/usr/bin/env node
'use strict';

// hook-matcher.js — Resolve hooks for an event with wildcard support
// Usage: node hook-matcher.js <event-name> [hooks.json-path]

const fs = require('fs');
const path = require('path');

/**
 * Match an event name against a pattern (supports * wildcard)
 * Examples:
 *   "PreToolUse" matches "PreToolUse"
 *   "Pre*" matches "PreToolUse", "PreCompact"
 *   "*ToolUse" matches "PreToolUse", "PostToolUse"
 *   "*" matches everything
 */
function matchEvent(pattern, eventName) {
  if (pattern === '*') return true;
  if (pattern === eventName) return true;
  // Convert glob to regex
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(eventName);
}

/**
 * Find all hooks that match a given event
 * @param {Array} hooks - Array of hook definitions from hooks.json
 * @param {string} eventName - The event to match
 * @returns {Array} Matching hook definitions
 */
function resolveHooks(hooks, eventName) {
  return hooks.filter(hook => {
    const patterns = Array.isArray(hook.event) ? hook.event : [hook.event];
    return patterns.some(p => matchEvent(p, eventName));
  });
}

/**
 * Resolve hooks from the hooks.json object-keyed format.
 * hooks.json uses { hooks: { EventName: [ { matcher, hooks: [...] } ] } }
 * This function finds all event keys matching the pattern, then returns
 * the flattened list of hook entries.
 * @param {Object} hooksMap - The "hooks" object from hooks.json (keyed by event name)
 * @param {string} eventName - The event to match against keys
 * @returns {Array} Matching hook entries with their source event
 */
function resolveHooksFromMap(hooksMap, eventName) {
  const results = [];
  for (const key of Object.keys(hooksMap)) {
    if (matchEvent(key, eventName) || matchEvent(eventName, key)) {
      for (const entry of hooksMap[key]) {
        for (const hook of entry.hooks || []) {
          results.push({ event: key, matcher: entry.matcher, ...hook });
        }
      }
    }
  }
  return results;
}

// CLI
if (require.main === module) {
  const [,, eventName, hooksPath] = process.argv;
  if (!eventName) {
    console.error('Usage: node hook-matcher.js <event-name> [hooks.json]');
    process.exit(1);
  }
  const configPath = hooksPath || path.join(__dirname, '..', 'hooks', 'hooks.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hooksData = config.hooks || {};

  // Support both array format (resolveHooks) and object-keyed format (resolveHooksFromMap)
  if (Array.isArray(hooksData)) {
    const matched = resolveHooks(hooksData, eventName);
    console.log(JSON.stringify({ event: eventName, matched: matched.length, hooks: matched.map(h => h.command || h.script) }, null, 2));
  } else {
    const matched = resolveHooksFromMap(hooksData, eventName);
    console.log(JSON.stringify({ event: eventName, matched: matched.length, hooks: matched.map(h => h.command || h.type) }, null, 2));
  }
}

module.exports = { matchEvent, resolveHooks, resolveHooksFromMap };
