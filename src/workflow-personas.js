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

const { scoreLearning } = require('./score-learning.js');

const LEARNINGS_FILE = path.join(__dirname, '..', '.shinchan-docs', 'learnings.md');

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

// CONST-3: min-score floor. An entry must score >= MIN_SCORE_FLOOR to be injected.
const MIN_SCORE_FLOOR = 8;

// CONST-2: agent -> role-keyword map. Folded into ctx.keywords before tag_overlap (DEC-C).
// NO separate agent-score term, NO new learning metadata. Router half (aichan/buriburi/masao/bo)
// is verbatim from agents/_shared/domain-router.json (READ-ONLY); the five non-router agents are
// the DESIGN.html CONST-2 derived table — they MUST NOT be added to domain-router.json.
const AGENT_ROLE_KEYWORDS = {
  // --- router-backed (domain-router.json keywords, verbatim) ---
  aichan: ['component', 'layout', 'styling', 'animation', 'ui', 'frontend', 'react', 'vue', 'css',
           'html', 'button', 'form', 'modal', 'page', 'render', 'style', 'theme', 'responsive'],
  buriburi: ['api', 'endpoint', 'database', 'migration', 'query', 'orm', 'model', 'schema', 'rest',
             'graphql', 'backend', 'server', 'auth', 'middleware', 'refund', 'payment'],
  masao: ['docker', 'pipeline', 'deployment', 'nginx', 'cloud', 'kubernetes', 'terraform',
          'ansible', 'devops', 'infra', 'environment'],
  bo: ['general', 'refactor', 'debug', 'utility'], // general fallback (domain-router.json general)
  // --- derived (DESIGN.html CONST-2; NOT in domain-router.json) ---
  nene: ['plan', 'task'],
  misae: ['requirement', 'risk'],
  hiroshi: ['architecture', 'design'],
  actionkamen: ['review', 'quality'],
  kazama: ['execution', 'deep-work', 'refactor'], // fierce-ralph worker lens — REQUIRED (CONST-2)
};

// Render the selected (already floored + score-desc sorted) entries into the block string,
// evicting the LOWEST-score item first until the block fits maxTokens. char/4 token heuristic
// (soft bound, only shrinks — DESIGN.html: NOT the event-shaped estimator module). FR-4/NFR-4.
const LEARNING_BLOCK_HEADER = '## 이 작업에 적용할 학습';
function estTokens(s) { return Math.ceil(s.length / 4); }
function renderLearningBlock(scored, maxTokens) {
  // scored: [{e, score}] sorted score-desc. Evict from the tail (lowest score) until under budget.
  let items = scored.slice();
  const lineFor = (x) => `- ${x.e.insight || x.e.title}`;
  const assemble = (arr) => `${LEARNING_BLOCK_HEADER}\n${arr.map(lineFor).join('\n')}`;
  while (items.length > 0 && estTokens(assemble(items)) > maxTokens) {
    items.pop(); // drop lowest-score (tail) — whole item, never a partial (AC-4)
  }
  if (items.length === 0) return ''; // budget too small for even one item (HR-4)
  return assemble(items);
}

// buildLearningBlock(agentName, ctx{stage?,keywords?}, opts{maxTokens=400}) -> string
// Pure core (DEC-2). Only I/O is a guarded best-effort read of learnings.md (NFR-2: never throws).
// Returns the "## 이 작업에 적용할 학습" block, or '' on 0 matches / missing file / parse failure.
function buildLearningBlock(agentName, ctx, opts) {
  try {
    ctx = ctx || {};
    opts = opts || {};
    const maxTokens = typeof opts.maxTokens === 'number' && opts.maxTokens > 0 ? opts.maxTokens : 400; // CONST-1

    // fold CONST-2 agent role keywords into ctx.keywords (Task 2.3 supplies the map)
    const roleKw = AGENT_ROLE_KEYWORDS[String(agentName || '').toLowerCase()] || [];
    const keywords = [].concat(Array.isArray(ctx.keywords) ? ctx.keywords : [], roleKw);
    const scoringCtx = { stage: ctx.stage || '', keywords };

    let content = '';
    try { content = fs.readFileSync(LEARNINGS_FILE, 'utf-8'); }
    catch (_e) { return ''; } // NFR-2: missing/unreadable -> ''

    const entries = parseLearnings(content);
    if (!entries.length) return '';

    // score, then floor, then sort desc (recency tie-break)
    const scored = entries
      .map(e => ({ e, score: scoreLearning(e, scoringCtx) }))
      .filter(x => x.score >= MIN_SCORE_FLOOR) // CONST-3 / FR-3
      .sort((a, b) => (b.score - a.score) || (String(b.e.date).localeCompare(String(a.e.date))));

    if (!scored.length) return ''; // AC-5: all below floor -> ''

    // budget eviction + block string: implemented in Task 2.4
    return renderLearningBlock(scored, maxTokens);
  } catch (_e) {
    return ''; // NFR-2: never throw
  }
}

// Parse .shinchan-docs/learnings.md into entries. HR-2/HR-4: per-entry defensive —
// an entry that fails to parse is skipped, never emitted raw. Entry shape (learnings.md):
//   ### [category] Title
//   - **Date**: YYYY-MM-DD
//   - **Tier**: preference|procedural|tool   (optional -> procedural)
//   - **Tags**: a, b, c                       (bare or #-prefixed, CONST-4)
//   - **Insight**: ...
function parseLearnings(content) {
  const out = [];
  if (typeof content !== 'string' || !content) return out;
  // Split on the entry header; keep the header with its block.
  const blocks = content.split(/\n(?=### \[)/);
  for (const block of blocks) {
    try {
      const head = block.match(/^### \[([^\]]+)\]\s*(.*)$/m);
      if (!head) continue;
      const category = head[1].trim().toLowerCase();
      const title = head[2].trim();
      const tierM = block.match(/^\s*-\s*\*\*Tier\*\*:\s*(.+)$/m);
      const dateM = block.match(/^\s*-\s*\*\*Date\*\*:\s*(.+)$/m);
      const tagsM = block.match(/^\s*-\s*\*\*Tags\*\*:\s*(.+)$/m);
      const insM = block.match(/^\s*-\s*\*\*Insight\*\*:\s*([\s\S]*?)(?=\n###|\n*$)/m);
      const tags = tagsM ? tagsM[1].split(',').map(s => s.trim()).filter(Boolean) : [];
      out.push({
        category,
        title,
        tier: tierM ? tierM[1].trim().toLowerCase() : 'procedural',
        date: dateM ? dateM[1].trim() : '',
        tags,
        insight: insM ? insM[1].trim() : '',
      });
    } catch (_e) { /* HR-2: skip malformed entry, never throw */ }
  }
  return out;
}

// CLI-only: source ctx from the active workflow (stage + REQUESTS keywords). Kept OUT of the pure
// core (DEC-2) so the core stays deterministic/testable. Best-effort; never throws (NFR-2).
function sourceCliCtx() {
  const ctx = { stage: '', keywords: [] };
  try {
    const docsDir = path.join(__dirname, '..', '.shinchan-docs');
    const dirs = fs.readdirSync(docsDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => path.join(docsDir, d.name));
    let best = null, bestMtime = 0;
    for (const d of dirs) {
      const ws = path.join(d, 'WORKFLOW_STATE.yaml');
      try {
        const st = fs.statSync(ws);
        const txt = fs.readFileSync(ws, 'utf-8');
        if (/status:\s*active/.test(txt) && st.mtimeMs > bestMtime) { best = { d, txt }; bestMtime = st.mtimeMs; }
      } catch (_e) { /* skip */ }
    }
    if (best) {
      const sm = best.txt.match(/^\s*stage:\s*(\S+)/m);
      if (sm) ctx.stage = sm[1].trim();
      const rm = best.txt.match(/restated_goal:\s*"?([^"\n]+)/);
      if (rm) ctx.keywords = rm[1].toLowerCase().split(/[^a-z0-9-]+/).filter(w => w.length > 3);
    }
  } catch (_e) { /* NFR-2: ctx stays empty */ }
  return ctx;
}

module.exports = { extractPersona, parseFrontmatter, buildLearningBlock, parseLearnings };

// ---- CLI ----
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--learnings') {
    const agent = argv[1];
    if (!agent) { console.error('usage: workflow-personas.js --learnings <agentName>'); process.exit(2); }
    try { process.stdout.write(buildLearningBlock(agent, sourceCliCtx(), {})); }
    catch (_e) { /* NFR-2: print nothing */ }
    process.exit(0);
  }
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
