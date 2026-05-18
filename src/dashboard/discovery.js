// src/dashboard/discovery.js
//
// Phase 3 — Workflow discovery (`.shinchan-docs/*/WORKFLOW_STATE.yaml`).
//
// Responsibilities:
//   - Scan `.shinchan-docs/` directly under the docs root for `*/WORKFLOW_STATE.yaml`.
//   - Parse minimal YAML subset (no external deps — NFR-6) to extract metadata:
//     doc_id, schema_version, stage, phase, owner, status, created, updated,
//     interview meta if present, ak_gate summary if present, history length.
//   - Treat `archived/**` as a separate category. `discoverActive()` returns
//     only the directly nested doc folders (active workflows). `discoverArchived()`
//     scans `archived/*/WORKFLOW_STATE.yaml` (one level under archived).
//   - Idempotent — repeated calls re-scan and return a consistent snapshot.
//
// No external network. No build. Node built-ins only.
//
// Author: kazama (Phase 3, main-068).

'use strict';

const fs = require('fs');
const path = require('path');
// Lazy require to keep circular-dependency surface small (derived only
// needs fs + path; loaded at first use, not at module load).
let _derivedMod = null;
function derivedMod() {
  if (!_derivedMod) _derivedMod = require('./derived');
  return _derivedMod;
}

// ──────────────────────────────────────────────────────────────────────
// Minimal YAML parser (subset). Covers what `WORKFLOW_STATE.yaml` uses:
//   - top-level mappings (`key: value`)
//   - nested mappings via indentation (2 spaces)
//   - inline scalar values (string, number, boolean, null)
//   - block sequences (`- item` or `- key: value`)
//   - inline flow mappings on one line (`{a: 1, b: 2}`)
//   - quoted strings (`"…"`, `'…'`), unquoted strings, dates
//   - block scalars (`|` and `>`) — kept as joined string (folding minimal)
//   - comments (`# …`) stripped
//
// This is intentionally a small, defensive parser focused on extracting
// metadata for the dashboard. It will NOT attempt to be a faithful YAML
// renderer. If a doc has exotic YAML, we degrade gracefully (the offending
// node becomes a raw string).

function stripComment(line) {
  // Strip trailing comment but respect quoted strings.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '#' && !inSingle && !inDouble) {
      // Comment starts here; if preceded by non-space, treat as non-comment.
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i).replace(/\s+$/, '');
    }
  }
  return line;
}

function parseScalar(rawInput) {
  const raw = String(rawInput).trim();
  if (raw === '' || raw === '~' || raw.toLowerCase() === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Quoted strings
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // Numbers (integer or float). Reject things like "01.02.03" (dates).
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return parseFloat(raw);
  // Inline flow mapping { a: 1, b: 2 }
  if (raw.startsWith('{') && raw.endsWith('}')) {
    return parseInlineFlowMapping(raw.slice(1, -1));
  }
  // Inline flow sequence [ a, b ]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return parseInlineFlowSequence(raw.slice(1, -1));
  }
  return raw;
}

function parseInlineFlowMapping(body) {
  // Very small parser; handles depth-1 only. Adequate for current schemas.
  const out = {};
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let buf = '';
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (!inSingle && !inDouble) {
      if (ch === '{' || ch === '[') depth++;
      if (ch === '}' || ch === ']') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(buf);
        buf = '';
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  for (const part of parts) {
    const colonIdx = findUnquotedColon(part);
    if (colonIdx === -1) continue;
    const k = part.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
    const v = part.slice(colonIdx + 1).trim();
    out[k] = parseScalar(v);
  }
  return out;
}

function parseInlineFlowSequence(body) {
  const out = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let buf = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (!inSingle && !inDouble) {
      if (ch === '{' || ch === '[') depth++;
      if (ch === '}' || ch === ']') depth--;
      if (ch === ',' && depth === 0) {
        out.push(parseScalar(buf));
        buf = '';
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) out.push(parseScalar(buf));
  return out;
}

function findUnquotedColon(s) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === ':' && !inSingle && !inDouble) {
      // Require ':' followed by whitespace or end-of-string (YAML rule).
      const next = s[i + 1];
      if (next === undefined || /\s/.test(next)) return i;
    }
  }
  return -1;
}

function indentOf(line) {
  const m = line.match(/^( *)/);
  return m ? m[1].length : 0;
}

/**
 * Parse a YAML string into a plain JS value.
 * Returns `{}` if input is empty.
 * Never throws — falls back to a partial parse if exotic constructs appear.
 */
function parseYaml(input) {
  if (typeof input !== 'string' || input.length === 0) return {};
  // Strip leading "---" document separator (frontmatter style).
  let text = input.replace(/^---\s*\r?\n/, '');
  // Drop any trailing "---" document end markers.
  text = text.replace(/\r?\n---\s*$/g, '');

  // Tokenise lines (keep raw lines for block scalars).
  const rawLines = text.split(/\r?\n/);
  // Preprocessed lines (comment-stripped, blank-skippable). Indexes align with rawLines.
  const lines = rawLines.map(line => stripComment(line));

  // Parser state: recursive descent on indentation.
  let cursor = 0;
  function peek() {
    while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
    return cursor < lines.length ? lines[cursor] : null;
  }
  function consume() {
    while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
    return cursor < lines.length ? lines[cursor++] : null;
  }

  function parseBlock(baseIndent) {
    // Decide mapping vs sequence by first non-blank line at baseIndent.
    const first = peek();
    if (first === null) return null;
    const firstIndent = indentOf(first);
    if (firstIndent < baseIndent) return null;
    const trimmed = first.slice(firstIndent);
    if (trimmed.startsWith('- ') || trimmed === '-') {
      return parseSequence(baseIndent);
    }
    return parseMapping(baseIndent);
  }

  function parseMapping(baseIndent) {
    const out = {};
    while (true) {
      const line = peek();
      if (line === null) break;
      const indent = indentOf(line);
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        // Stray over-indent (shouldn't happen with valid YAML); skip.
        consume();
        continue;
      }
      const content = line.slice(indent);
      const colonIdx = findUnquotedColon(content);
      if (colonIdx === -1) {
        // Not a mapping line; back out.
        break;
      }
      consume();
      const key = content.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
      let rest = content.slice(colonIdx + 1).trim();
      // Block scalar markers
      if (rest === '|' || rest === '>' || rest === '|+' || rest === '|-' || rest === '>+' || rest === '>-') {
        const folded = rest.startsWith('>');
        // Read all following lines with greater indent.
        const blockLines = [];
        let blockIndent = null;
        while (cursor < lines.length) {
          const raw = lines[cursor];
          if (raw.trim() === '') {
            blockLines.push('');
            cursor++;
            continue;
          }
          const ind = indentOf(raw);
          if (blockIndent === null) {
            if (ind <= baseIndent) break;
            blockIndent = ind;
          }
          if (ind < blockIndent) break;
          blockLines.push(raw.slice(blockIndent));
          cursor++;
        }
        out[key] = folded ? blockLines.join(' ').trim() : blockLines.join('\n').replace(/\s+$/, '');
        continue;
      }
      if (rest === '') {
        // Nested mapping or sequence on next lines.
        const nestedFirst = peek();
        if (nestedFirst === null || indentOf(nestedFirst) <= baseIndent) {
          out[key] = null;
        } else {
          out[key] = parseBlock(indentOf(nestedFirst));
        }
        continue;
      }
      out[key] = parseScalar(rest);
    }
    return out;
  }

  function parseSequence(baseIndent) {
    const out = [];
    while (true) {
      const line = peek();
      if (line === null) break;
      const indent = indentOf(line);
      if (indent < baseIndent) break;
      const content = line.slice(indent);
      if (!content.startsWith('-')) break;
      if (indent !== baseIndent) break;
      consume();
      const rest = content.slice(1).replace(/^\s/, '');
      if (rest === '') {
        // Nested block — parse next deeper block as item.
        const nestedFirst = peek();
        if (nestedFirst === null || indentOf(nestedFirst) <= baseIndent) {
          out.push(null);
        } else {
          out.push(parseBlock(indentOf(nestedFirst)));
        }
        continue;
      }
      // Inline scalar or inline mapping `- key: value, more lines deeper`
      const inlineColon = findUnquotedColon(rest);
      if (inlineColon !== -1) {
        // Treat this as the first key of an inline mapping; subsequent same-indent
        // (baseIndent + 2) lines extend that mapping.
        const key = rest.slice(0, inlineColon).trim().replace(/^["']|["']$/g, '');
        const valueText = rest.slice(inlineColon + 1).trim();
        const mapItem = {};
        if (valueText === '|' || valueText === '>' || valueText === '|+' || valueText === '|-' || valueText === '>+' || valueText === '>-') {
          const folded = valueText.startsWith('>');
          const blockLines = [];
          let blockIndent = null;
          while (cursor < lines.length) {
            const raw = lines[cursor];
            if (raw.trim() === '') {
              blockLines.push('');
              cursor++;
              continue;
            }
            const ind = indentOf(raw);
            if (blockIndent === null) {
              if (ind <= baseIndent + 2) break;
              blockIndent = ind;
            }
            if (ind < blockIndent) break;
            blockLines.push(raw.slice(blockIndent));
            cursor++;
          }
          mapItem[key] = folded ? blockLines.join(' ').trim() : blockLines.join('\n').replace(/\s+$/, '');
        } else if (valueText === '') {
          const nestedFirst = peek();
          if (nestedFirst === null || indentOf(nestedFirst) <= baseIndent + 2) {
            mapItem[key] = null;
          } else {
            mapItem[key] = parseBlock(indentOf(nestedFirst));
          }
        } else {
          mapItem[key] = parseScalar(valueText);
        }
        // Extend mapping with following indented mapping keys (baseIndent + 2).
        while (true) {
          const next = peek();
          if (next === null) break;
          const nextIndent = indentOf(next);
          if (nextIndent <= baseIndent) break;
          if (nextIndent !== baseIndent + 2) break;
          const nextContent = next.slice(nextIndent);
          if (nextContent.startsWith('-')) break;
          const nextColon = findUnquotedColon(nextContent);
          if (nextColon === -1) break;
          consume();
          const nKey = nextContent.slice(0, nextColon).trim().replace(/^["']|["']$/g, '');
          let nRest = nextContent.slice(nextColon + 1).trim();
          if (nRest === '|' || nRest === '>' || nRest === '|+' || nRest === '|-' || nRest === '>+' || nRest === '>-') {
            const folded = nRest.startsWith('>');
            const blockLines = [];
            let blockIndent = null;
            while (cursor < lines.length) {
              const raw = lines[cursor];
              if (raw.trim() === '') {
                blockLines.push('');
                cursor++;
                continue;
              }
              const ind = indentOf(raw);
              if (blockIndent === null) {
                if (ind <= baseIndent + 2) break;
                blockIndent = ind;
              }
              if (ind < blockIndent) break;
              blockLines.push(raw.slice(blockIndent));
              cursor++;
            }
            mapItem[nKey] = folded ? blockLines.join(' ').trim() : blockLines.join('\n').replace(/\s+$/, '');
            continue;
          }
          if (nRest === '') {
            const nestedFirst = peek();
            if (nestedFirst === null || indentOf(nestedFirst) <= baseIndent + 2) {
              mapItem[nKey] = null;
            } else {
              mapItem[nKey] = parseBlock(indentOf(nestedFirst));
            }
          } else {
            mapItem[nKey] = parseScalar(nRest);
          }
        }
        out.push(mapItem);
      } else {
        out.push(parseScalar(rest));
      }
    }
    return out;
  }

  return parseBlock(0) || {};
}

// ──────────────────────────────────────────────────────────────────────
// Discovery

/**
 * Compute the path to the docs root (`.shinchan-docs/`).
 * @param {string} [cwd] — defaults to process.cwd().
 */
function docsRoot(cwd) {
  return path.join(cwd || process.cwd(), '.shinchan-docs');
}

/**
 * Read a WORKFLOW_STATE.yaml and extract metadata + derived user-facing fields
 * for the dashboard. Returns `null` if the file is missing/unreadable.
 *
 * `opts.nowIso` makes relative-time derivations deterministic in tests.
 * `opts.skipDerived` returns the raw shape without `requestSummary`, `stageInfo`,
 *   `actionHint`, `timeMeta`, `recentActivity`, `statusLabel` (used by code
 *   that wants the pre-derive shape — e.g. legacy callers / direct YAML view).
 */
function readWorkflowMeta(yamlPath, doc_id, category, opts) {
  let raw;
  try {
    raw = fs.readFileSync(yamlPath, 'utf8');
  } catch (e) {
    return null;
  }
  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (e) {
    parsed = {};
  }
  const current = (parsed && parsed.current) || {};
  const history = Array.isArray(parsed && parsed.history) ? parsed.history : [];
  const lastEvent = history.length > 0 ? history[history.length - 1] : null;
  let mtime = null;
  try {
    mtime = fs.statSync(yamlPath).mtime.toISOString();
  } catch (_) {
    /* ignore */
  }
  const base = {
    doc_id,
    category,             // 'active' | 'archived'
    yaml_path: yamlPath,
    schema_version: parsed.schema_version ?? null,
    created: parsed.created ?? null,
    updated: parsed.updated ?? null,
    output_format: current.output_format ?? null,
    stage: current.stage ?? null,
    phase: current.phase ?? null,
    owner: current.owner ?? null,
    status: current.status ?? null,
    interview: current.interview ?? null,
    ak_gate: current.ak_gate ?? null,
    notes: Array.isArray(current.notes) ? current.notes : [],
    history_length: history.length,
    last_event: lastEvent
      ? {
          timestamp: lastEvent.timestamp ?? null,
          event: lastEvent.event ?? null,
          agent: lastEvent.agent ?? null,
          note: typeof lastEvent.note === 'string' ? lastEvent.note.slice(0, 200) : null
        }
      : null,
    mtime
  };
  if (opts && opts.skipDerived) return base;
  return derivedMod().deriveCardFields(base, {
    nowIso: opts && opts.nowIso,
    history,
    docDir: path.dirname(yamlPath)
  });
}

/**
 * Discover ACTIVE workflows (those directly under `.shinchan-docs/<doc_id>/`).
 * @param {string} [cwd]
 * @param {{nowIso?: string, skipDerived?: boolean}} [opts]
 * @returns {Array<object>}
 */
function discoverActive(cwd, opts) {
  const root = docsRoot(cwd);
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const out = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ent.name === 'archived') continue;
    if (ent.name.startsWith('.')) continue;     // .dashboard-state etc.
    if (ent.name === 'ontology') continue;
    const yamlPath = path.join(root, ent.name, 'WORKFLOW_STATE.yaml');
    if (!fs.existsSync(yamlPath)) continue;
    const meta = readWorkflowMeta(yamlPath, ent.name, 'active', opts);
    if (meta) out.push(meta);
  }
  // Sort newest-updated first (stable for testing).
  out.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  return out;
}

/**
 * Discover ARCHIVED workflows under `.shinchan-docs/archived/<doc_id>/`.
 * Only descends one level deep.
 */
function discoverArchived(cwd, opts) {
  const archivedRoot = path.join(docsRoot(cwd), 'archived');
  let entries;
  try {
    entries = fs.readdirSync(archivedRoot, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const out = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.')) continue;
    const yamlPath = path.join(archivedRoot, ent.name, 'WORKFLOW_STATE.yaml');
    if (!fs.existsSync(yamlPath)) continue;
    const meta = readWorkflowMeta(yamlPath, ent.name, 'archived', opts);
    if (meta) out.push(meta);
  }
  out.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  return out;
}

/**
 * Lookup a single workflow by doc_id (checks active first, then archived).
 * Returns null if not found.
 */
function getWorkflow(doc_id, cwd, opts) {
  if (typeof doc_id !== 'string' || doc_id === '') return null;
  if (doc_id.includes('/') || doc_id.includes('\\') || doc_id.includes('..')) return null;
  const root = docsRoot(cwd);
  const activePath = path.join(root, doc_id, 'WORKFLOW_STATE.yaml');
  if (fs.existsSync(activePath)) return readWorkflowMeta(activePath, doc_id, 'active', opts);
  const archivedPath = path.join(root, 'archived', doc_id, 'WORKFLOW_STATE.yaml');
  if (fs.existsSync(archivedPath)) return readWorkflowMeta(archivedPath, doc_id, 'archived', opts);
  return null;
}

module.exports = {
  discoverActive,
  discoverArchived,
  getWorkflow,
  readWorkflowMeta,
  parseYaml,
  docsRoot,
  // For tests
  _internal: { stripComment, parseScalar, parseInlineFlowMapping, parseInlineFlowSequence, findUnquotedColon }
};
