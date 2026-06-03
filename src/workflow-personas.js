#!/usr/bin/env node
// workflow-personas.js — derive a prompt-injection persona string for a team-shinchan agent
// from its agents/<name>.md definition, so Workflow scripts stay DRY with the real agents.
//
// WHY THIS EXISTS: the Workflow runtime's agent registry does NOT expose plugin subagents
// (agentType resolves built-ins only), so Workflow-tier skills (fierce-debate, fierce-review,
// …) must deliver an agent's role/voice by PROMPT INJECTION. Hard-coding those strings in each
// script drifts from the canonical agents/<name>.md. AND the Workflow SCRIPT cannot read files —
// so this MUST run in the main loop (the SKILL.md), which then injects the result via `args`.
//
// USAGE (from a SKILL, in the main loop):
//   node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js actionkamen        # → one persona string
//   node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js hiroshi misae      # → JSON { name: persona }
//   node ${CLAUDE_PLUGIN_ROOT}/src/workflow-personas.js --json actionkamen # → JSON for one too
// Then inject the printed string into the Workflow `args` (e.g. args.persona / options[].persona).

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');

// Same frontmatter parser shape as gen-agents-map.js (kept local to avoid a cross-module dep).
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return {};
  const meta = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') break;
    if (lines[i].startsWith('<') || lines[i].startsWith(' ')) continue;
    const m = lines[i].match(/^(\w+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function firstSentence(s) {
  if (!s) return '';
  // Split off "Use for …" / "Use when …" trailing guidance; keep the role clause.
  const role = s.split(/\.\s+(?:Use (?:for|when)\b)/i)[0];
  const dot = role.indexOf('. ');
  return (dot === -1 ? role : role.slice(0, dot)).trim().replace(/\.$/, '');
}

// Pull the voice traits from the "## Personality & Tone" Prefix line:
//   "- Prefix: `👔 [Hiroshi]` | Wise, … analyst | Clear reasoning … | Adapt to user's language"
// → "Wise, … analyst; Clear reasoning …"  (drop the prefix segment and the boilerplate tail)
function extractTraits(content) {
  const line = content.split('\n').find(l => /Prefix:/.test(l) && l.includes('|'));
  if (!line) return '';
  const segs = line.split('|').map(s => s.trim());
  return segs
    .slice(1)
    .filter(s => s && !/adapt to user'?s language/i.test(s))
    .join('; ');
}

function displayName(content, meta) {
  const m = content.match(/^You are \*\*(.+?)\*\*/m);
  if (m) return m[1].trim();
  const n = meta.name || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'a senior team-shinchan specialist';
}

// The agent's own opening role sentence: "You are **X**. <role>." → "<role>"
function openingRole(content) {
  const m = content.match(/^You are \*\*.+?\*\*\.?\s*(.+)$/m);
  return m ? m[1].trim().replace(/\.$/, '') : '';
}

/**
 * Build a concise (1-2 sentence) persona descriptor for `agentName`, drawn verbatim from
 * agents/<agentName>.md. Throws if the agent file does not exist.
 */
function extractPersona(agentName) {
  const safe = String(agentName).replace(/[^a-z0-9_-]/gi, '');
  if (!safe) throw new Error(`invalid agent name: ${JSON.stringify(agentName)}`);
  const file = path.join(AGENTS_DIR, `${safe}.md`);
  if (!fs.existsSync(file)) throw new Error(`no such agent: agents/${safe}.md`);
  const content = fs.readFileSync(file, 'utf-8');
  const meta = parseFrontmatter(content);

  const name = displayName(content, meta);
  const role = firstSentence(meta.description) || openingRole(content);
  const traits = extractTraits(content);

  let persona = role ? `You are ${name} — ${role}.` : `You are ${name}, a senior team-shinchan specialist.`;
  if (traits) persona += ` ${traits}.`;
  return persona;
}

module.exports = { extractPersona, parseFrontmatter };

// ---- CLI ----
if (require.main === module) {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const names = argv.filter(a => a !== '--json');
  if (names.length === 0) {
    console.error('usage: workflow-personas.js [--json] <agentName> [<agentName>...]');
    process.exit(2);
  }
  try {
    if (names.length === 1 && !asJson) {
      console.log(extractPersona(names[0]));
    } else {
      const out = {};
      for (const n of names) out[n] = extractPersona(n);
      console.log(JSON.stringify(out, null, 2));
    }
  } catch (e) {
    console.error(`workflow-personas: ${e.message}`);
    process.exit(1);
  }
}
