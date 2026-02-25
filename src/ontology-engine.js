#!/usr/bin/env node
/**
 * Ontology Engine — Core CRUD + Query + Merge for Project-Level Ontology
 * Zero npm dependencies. Node.js built-in only (fs, path, crypto).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ONTO_DIR = '.shinchan-docs/ontology';
const ONTO_FILE = 'ontology.json';
const HISTORY_FILE = 'ontology-history.jsonl';
const KB_FILE = '.shinchan-docs/kb-summary.md';

// ─── Schema Constants ───────────────────────────────────────────────
const ENTITY_TYPES = {
  Module:        { prefix: 'mod',  props: ['name','path','description','layer','domain'] },
  Component:     { prefix: 'comp', props: ['name','type_detail','file_path','line_range','visibility','complexity'] },
  DomainConcept: { prefix: 'dom',  props: ['name','definition','aliases','bounded_context'] },
  API:           { prefix: 'api',  props: ['method','path','handler','auth_required','version'] },
  DataModel:     { prefix: 'data', props: ['name','fields','table_name','relationships'] },
  Decision:      { prefix: 'dec',  props: ['title','date','options_considered','chosen','rationale','doc_id'] },
  Pattern:       { prefix: 'pat',  props: ['name','description','examples','anti_patterns'] },
  Dependency:    { prefix: 'dep',  props: ['name','version','purpose','dep_type'] },
  Configuration: { prefix: 'conf', props: ['name','file_path','env_specific','secrets'] },
  TestSuite:     { prefix: 'test', props: ['name','test_type','coverage_target','file_path'] }
};

const RELATION_TYPES = {
  DEPENDS_ON:      { props: ['dep_type','strength'], desc: 'A depends on B' },
  IMPLEMENTS:      { props: ['completeness'], desc: 'A implements domain concept B' },
  EXPOSES:         { props: [], desc: 'A exposes API B' },
  PERSISTS:        { props: ['operations'], desc: 'A persists data model B' },
  DECIDED_BY:      { props: [], desc: 'A design decided by decision B' },
  FOLLOWS_PATTERN: { props: ['conformance'], desc: 'A follows pattern B' },
  TESTED_BY:       { props: ['coverage'], desc: 'A tested by test suite B' },
  PART_OF:         { props: [], desc: 'A is part of module B' },
  RELATED_TO:      { props: ['context'], desc: 'A related to B (loose)' },
  CONFIGURED_BY:   { props: [], desc: 'A configured by configuration B' }
};

// ─── Helpers ────────────────────────────────────────────────────────
function genId(prefix) {
  return `${prefix}-${crypto.randomBytes(2).toString('hex')}`;
}

function ontoPath(root) { return path.join(root, ONTO_DIR, ONTO_FILE); }
function historyPath(root) { return path.join(root, ONTO_DIR, HISTORY_FILE); }
function kbPath(root) { return path.join(root, KB_FILE); }

function ensureDir(root) {
  const dir = path.join(root, ONTO_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Core CRUD ──────────────────────────────────────────────────────
function init(projectRoot) {
  ensureDir(projectRoot);
  const onto = {
    meta: { version: '1.0', created: new Date().toISOString(), updated: new Date().toISOString(), projectRoot },
    entities: [],
    relations: []
  };
  fs.writeFileSync(ontoPath(projectRoot), JSON.stringify(onto, null, 2));
  logHistory(projectRoot, 'init', { projectRoot });
  return onto;
}

function load(projectRoot) {
  try {
    const raw = fs.readFileSync(ontoPath(projectRoot), 'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
}

function save(projectRoot, onto) {
  ensureDir(projectRoot);
  onto.meta.updated = new Date().toISOString();
  fs.writeFileSync(ontoPath(projectRoot), JSON.stringify(onto, null, 2));
  return true;
}

function addEntity(projectRoot, entity) {
  const onto = load(projectRoot);
  if (!onto) return null;
  const typeDef = ENTITY_TYPES[entity.type];
  if (!typeDef) return null;
  const id = entity.id || genId(typeDef.prefix);
  const newEntity = { id, type: entity.type };
  for (const p of typeDef.props) {
    if (entity[p] !== undefined) newEntity[p] = entity[p];
  }
  onto.entities.push(newEntity);
  save(projectRoot, onto);
  logHistory(projectRoot, 'addEntity', { id, type: entity.type, name: entity.name || entity.title });
  return newEntity;
}

function removeEntity(projectRoot, entityId) {
  const onto = load(projectRoot);
  if (!onto) return false;
  const idx = onto.entities.findIndex(e => e.id === entityId);
  if (idx === -1) return false;
  onto.entities.splice(idx, 1);
  // Cascade remove relations
  onto.relations = onto.relations.filter(r => r.from !== entityId && r.to !== entityId);
  save(projectRoot, onto);
  logHistory(projectRoot, 'removeEntity', { id: entityId });
  return true;
}

function addRelation(projectRoot, relation) {
  const onto = load(projectRoot);
  if (!onto) return null;
  if (!RELATION_TYPES[relation.relation]) return null;
  const fromExists = onto.entities.some(e => e.id === relation.from);
  const toExists = onto.entities.some(e => e.id === relation.to);
  if (!fromExists || !toExists) return null;
  const id = relation.id || `rel-${crypto.randomBytes(2).toString('hex')}`;
  const newRel = { id, from: relation.from, relation: relation.relation, to: relation.to };
  const relDef = RELATION_TYPES[relation.relation];
  for (const p of relDef.props) {
    if (relation[p] !== undefined) newRel[p] = relation[p];
  }
  onto.relations.push(newRel);
  save(projectRoot, onto);
  logHistory(projectRoot, 'addRelation', { id, relation: relation.relation, from: relation.from, to: relation.to });
  return newRel;
}

function removeRelation(projectRoot, relationId) {
  const onto = load(projectRoot);
  if (!onto) return false;
  const idx = onto.relations.findIndex(r => r.id === relationId);
  if (idx === -1) return false;
  onto.relations.splice(idx, 1);
  save(projectRoot, onto);
  logHistory(projectRoot, 'removeRelation', { id: relationId });
  return true;
}

// ─── Query ──────────────────────────────────────────────────────────
function query(projectRoot, opts = {}) {
  const onto = load(projectRoot);
  if (!onto) return [];
  let results = onto.entities;
  if (opts.type) results = results.filter(e => e.type === opts.type);
  if (opts.name) {
    const lower = opts.name.toLowerCase();
    results = results.filter(e => {
      const n = (e.name || e.title || '').toLowerCase();
      return n.includes(lower);
    });
  }
  if (opts.id) results = results.filter(e => e.id === opts.id);
  return results;
}

function getRelated(projectRoot, entityId, opts = {}) {
  const onto = load(projectRoot);
  if (!onto) return { entities: [], relations: [] };
  const depth = opts.depth || 1;
  const direction = opts.direction || 'both';
  const visited = new Set([entityId]);
  const relatedEntities = [];
  const relatedRelations = [];
  let frontier = [entityId];

  for (let d = 0; d < depth && frontier.length > 0; d++) {
    const nextFrontier = [];
    for (const id of frontier) {
      const rels = onto.relations.filter(r => {
        if (direction === 'outgoing') return r.from === id;
        if (direction === 'incoming') return r.to === id;
        return r.from === id || r.to === id;
      });
      for (const r of rels) {
        relatedRelations.push(r);
        const otherId = r.from === id ? r.to : r.from;
        if (!visited.has(otherId)) {
          visited.add(otherId);
          const entity = onto.entities.find(e => e.id === otherId);
          if (entity) {
            relatedEntities.push(entity);
            nextFrontier.push(otherId);
          }
        }
      }
    }
    frontier = nextFrontier;
  }
  return { entities: relatedEntities, relations: relatedRelations };
}

function summary(projectRoot) {
  const onto = load(projectRoot);
  if (!onto) return null;
  const entityCount = onto.entities.length;
  const relationCount = onto.relations.length;
  const typeDist = {};
  for (const e of onto.entities) {
    typeDist[e.type] = (typeDist[e.type] || 0) + 1;
  }
  // Top connected entities
  const connCount = {};
  for (const r of onto.relations) {
    connCount[r.from] = (connCount[r.from] || 0) + 1;
    connCount[r.to] = (connCount[r.to] || 0) + 1;
  }
  const topConnected = Object.entries(connCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const e = onto.entities.find(x => x.id === id);
      return { id, name: e ? (e.name || e.title) : id, connections: count };
    });
  return { entityCount, relationCount, typeDist, topConnected, updated: onto.meta.updated };
}

// ─── Merge ──────────────────────────────────────────────────────────
function merge(projectRoot, scanResult) {
  let onto = load(projectRoot);
  if (!onto) { onto = init(projectRoot); }
  const stats = { added: { entities: 0, relations: 0 }, skipped: { entities: 0, relations: 0 } };
  const idMap = {}; // tmp-id → real-id

  // Merge entities
  for (const ent of (scanResult.entities || [])) {
    const existing = onto.entities.find(e => {
      if (e.type !== ent.type) return false;
      if (ent.type === 'Component') return e.name === ent.name && e.file_path === ent.file_path;
      return (e.name || e.title) === (ent.name || ent.title);
    });
    if (existing) {
      idMap[ent.id] = existing.id;
      stats.skipped.entities++;
    } else {
      const typeDef = ENTITY_TYPES[ent.type];
      if (!typeDef) continue;
      const id = genId(typeDef.prefix);
      idMap[ent.id] = id;
      const newEnt = { id, type: ent.type };
      for (const p of typeDef.props) {
        if (ent[p] !== undefined) newEnt[p] = ent[p];
      }
      onto.entities.push(newEnt);
      stats.added.entities++;
    }
  }

  // Merge relations
  for (const rel of (scanResult.relations || [])) {
    const fromId = idMap[rel.from] || rel.from;
    const toId = idMap[rel.to] || rel.to;
    // Verify both endpoints exist
    if (!onto.entities.some(e => e.id === fromId) || !onto.entities.some(e => e.id === toId)) {
      stats.skipped.relations++;
      continue;
    }
    const existing = onto.relations.find(r =>
      r.from === fromId && r.to === toId && r.relation === rel.relation
    );
    if (existing) {
      stats.skipped.relations++;
    } else {
      const id = `rel-${crypto.randomBytes(2).toString('hex')}`;
      const newRel = { id, from: fromId, relation: rel.relation, to: toId };
      const relDef = RELATION_TYPES[rel.relation];
      if (relDef) {
        for (const p of relDef.props) {
          if (rel[p] !== undefined) newRel[p] = rel[p];
        }
      }
      onto.relations.push(newRel);
      stats.added.relations++;
    }
  }

  save(projectRoot, onto);
  logHistory(projectRoot, 'merge', stats);
  return stats;
}

// ─── KB Summary Generation ──────────────────────────────────────────
function generateKbSummary(projectRoot) {
  const onto = load(projectRoot);
  if (!onto) return false;

  const lines = ['# Knowledge Base Summary', '', `> Auto-generated from ontology (${new Date().toISOString()})`, ''];

  // Architecture Overview
  const modules = onto.entities.filter(e => e.type === 'Module');
  if (modules.length > 0) {
    lines.push('## Architecture Overview', '');
    for (const m of modules) {
      const comps = onto.relations.filter(r => r.relation === 'PART_OF' && r.to === m.id).length;
      lines.push(`- **${m.name}** (\`${m.path || ''}\`) — ${comps} components${m.domain ? `, domain: ${m.domain}` : ''}`);
    }
    lines.push('');
  }

  // Key Components
  const components = onto.entities.filter(e => e.type === 'Component');
  if (components.length > 0) {
    lines.push('## Key Components', '');
    const sorted = components.slice().sort((a, b) => {
      const ca = onto.relations.filter(r => r.from === a.id || r.to === a.id).length;
      const cb = onto.relations.filter(r => r.from === b.id || r.to === b.id).length;
      return cb - ca;
    });
    for (const c of sorted.slice(0, 20)) {
      const rels = onto.relations.filter(r => r.from === c.id || r.to === c.id).length;
      lines.push(`- **${c.name}** (${c.type_detail || 'component'}) — \`${c.file_path || ''}\` [${rels} relations]`);
    }
    lines.push('');
  }

  // Domain Concepts
  const domains = onto.entities.filter(e => e.type === 'DomainConcept');
  if (domains.length > 0) {
    lines.push('## Domain Concepts', '');
    for (const d of domains) {
      const impls = onto.relations.filter(r => r.relation === 'IMPLEMENTS' && r.to === d.id)
        .map(r => onto.entities.find(e => e.id === r.from))
        .filter(Boolean);
      lines.push(`- **${d.name}**${d.definition ? `: ${d.definition}` : ''}`);
      if (impls.length > 0) lines.push(`  - Implemented by: ${impls.map(i => i.name).join(', ')}`);
    }
    lines.push('');
  }

  // Dependencies
  const deps = onto.entities.filter(e => e.type === 'Dependency');
  if (deps.length > 0) {
    lines.push('## Dependencies', '');
    for (const d of deps) {
      lines.push(`- **${d.name}**${d.version ? ` v${d.version}` : ''}${d.purpose ? ` — ${d.purpose}` : ''}`);
    }
    lines.push('');
  }

  // Recent Decisions
  const decisions = onto.entities.filter(e => e.type === 'Decision')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (decisions.length > 0) {
    lines.push('## Recent Decisions', '');
    for (const d of decisions.slice(0, 10)) {
      lines.push(`- **${d.title}** (${d.date || 'undated'}) — Chosen: ${d.chosen || 'N/A'}${d.rationale ? `. ${d.rationale}` : ''}`);
    }
    lines.push('');
  }

  const content = lines.join('\n');
  const kbDir = path.dirname(kbPath(projectRoot));
  if (!fs.existsSync(kbDir)) fs.mkdirSync(kbDir, { recursive: true });
  fs.writeFileSync(kbPath(projectRoot), content);
  logHistory(projectRoot, 'generateKbSummary', { entities: onto.entities.length, relations: onto.relations.length });
  return true;
}

// ─── Impact Analysis ────────────────────────────────────────────────
function impactAnalysis(projectRoot, entityId, opts = {}) {
  const onto = load(projectRoot);
  if (!onto) return null;
  const target = onto.entities.find(e => e.id === entityId);
  if (!target) return null;
  const depth = opts.depth || 2;

  // Get all related at specified depth (incoming = things that depend on target)
  const incoming = getRelated(projectRoot, entityId, { depth, direction: 'incoming' });
  const outgoing = getRelated(projectRoot, entityId, { depth: 1, direction: 'outgoing' });

  // Separate direct vs indirect
  const directIds = new Set(
    onto.relations.filter(r => r.to === entityId).map(r => r.from)
  );
  const direct = incoming.entities.filter(e => directIds.has(e.id));
  const indirect = incoming.entities.filter(e => !directIds.has(e.id));

  // Test coverage
  const tests = onto.relations
    .filter(r => r.relation === 'TESTED_BY' && (r.from === entityId || directIds.has(r.from)))
    .map(r => onto.entities.find(e => e.id === r.to))
    .filter(Boolean);

  // Affected modules
  const modCount = {};
  for (const e of [...direct, ...indirect]) {
    const partOf = onto.relations.find(r => r.relation === 'PART_OF' && r.from === e.id);
    if (partOf) {
      const mod = onto.entities.find(x => x.id === partOf.to);
      if (mod) modCount[mod.name] = (modCount[mod.name] || 0) + 1;
    }
  }

  // Risk level
  const totalAffected = direct.length + indirect.length;
  const fanIn = onto.relations.filter(r => r.to === entityId && r.relation === 'DEPENDS_ON').length;
  const risk = totalAffected >= 10 || fanIn >= 5 ? 'HIGH' : totalAffected >= 5 || fanIn >= 3 ? 'MEDIUM' : 'LOW';

  return { target, direct, indirect, tests, modules: modCount, risk, totalAffected, fanIn, outgoing: outgoing.entities };
}

// ─── Health Score ───────────────────────────────────────────────────
function healthScore(projectRoot) {
  const onto = load(projectRoot);
  if (!onto) return null;
  const scores = {};
  const entityCount = onto.entities.length;
  const relationCount = onto.relations.length;
  if (entityCount === 0) return { total: 0, scores: {}, suggestions: ['Run ontology scan to populate data'] };

  // 1. Connectivity (0-25): ratio of relations to entities
  const connRatio = Math.min(relationCount / Math.max(entityCount, 1), 3);
  scores.connectivity = Math.round((connRatio / 3) * 25);

  // 2. Test Coverage (0-25): % of components with TESTED_BY
  const components = onto.entities.filter(e => e.type === 'Component');
  const tested = components.filter(c => onto.relations.some(r => r.relation === 'TESTED_BY' && r.from === c.id));
  scores.testCoverage = components.length > 0 ? Math.round((tested.length / components.length) * 25) : 0;

  // 3. Documentation (0-25): % of modules with descriptions + domain concepts exist
  const modules = onto.entities.filter(e => e.type === 'Module');
  const documented = modules.filter(m => m.description && m.description.length > 0);
  const domains = onto.entities.filter(e => e.type === 'DomainConcept');
  const docScore = modules.length > 0 ? (documented.length / modules.length) * 15 : 0;
  const domScore = Math.min(domains.length / 5, 1) * 10;
  scores.documentation = Math.round(docScore + domScore);

  // 4. Modularity (0-25): low coupling (few cross-module deps), no orphans
  const orphans = onto.entities.filter(e => !onto.relations.some(r => r.from === e.id || r.to === e.id));
  const orphanPenalty = Math.min(orphans.length / Math.max(entityCount, 1), 0.5) * 25;
  // Detect circular deps
  let cycles = 0;
  for (const e of onto.entities) {
    const visited = new Set();
    const stack = [e.id];
    while (stack.length > 0) {
      const cur = stack.pop();
      if (visited.has(cur)) { if (cur === e.id && visited.size > 1) { cycles++; break; } continue; }
      visited.add(cur);
      const deps = onto.relations.filter(r => r.relation === 'DEPENDS_ON' && r.from === cur).map(r => r.to);
      stack.push(...deps);
      if (visited.size > 20) break; // limit traversal
    }
  }
  const cyclePenalty = Math.min(cycles * 5, 15);
  scores.modularity = Math.max(0, 25 - Math.round(orphanPenalty) - cyclePenalty);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const suggestions = [];
  if (scores.connectivity < 10) suggestions.push('Add more relations (DEPENDS_ON, PART_OF) to improve connectivity');
  if (scores.testCoverage < 10) suggestions.push('Add TESTED_BY relations to improve test coverage visibility');
  if (scores.documentation < 10) suggestions.push('Add DomainConcept entities and module descriptions');
  if (scores.modularity < 15) suggestions.push('Reduce orphan entities and circular dependencies');

  return { total, scores, suggestions, orphanCount: orphans.length, cycleCount: cycles };
}

// ─── Mermaid Diagram ────────────────────────────────────────────────
function generateMermaid(projectRoot, scope = 'modules') {
  const onto = load(projectRoot);
  if (!onto) return null;

  if (scope === 'modules') {
    const lines = ['graph TD'];
    const modules = onto.entities.filter(e => e.type === 'Module');
    for (const m of modules) {
      const safe = m.id.replace(/-/g, '_');
      lines.push(`  ${safe}["${m.name}"]`);
    }
    // Module-to-module deps via component DEPENDS_ON
    const modDeps = new Set();
    for (const r of onto.relations.filter(r => r.relation === 'DEPENDS_ON')) {
      const fromPartOf = onto.relations.find(x => x.relation === 'PART_OF' && x.from === r.from);
      const toPartOf = onto.relations.find(x => x.relation === 'PART_OF' && x.from === r.to);
      if (fromPartOf && toPartOf && fromPartOf.to !== toPartOf.to) {
        modDeps.add(`${fromPartOf.to}|${toPartOf.to}`);
      }
    }
    for (const dep of modDeps) {
      const [from, to] = dep.split('|');
      lines.push(`  ${from.replace(/-/g, '_')} --> ${to.replace(/-/g, '_')}`);
    }
    return lines.join('\n');
  }

  if (scope === 'domain') {
    const lines = ['graph LR'];
    const domains = onto.entities.filter(e => e.type === 'DomainConcept');
    for (const d of domains) {
      const safe = d.id.replace(/-/g, '_');
      lines.push(`  ${safe}(("${d.name}"))`);
    }
    for (const r of onto.relations.filter(r => r.relation === 'IMPLEMENTS')) {
      const comp = onto.entities.find(e => e.id === r.from);
      const dom = onto.entities.find(e => e.id === r.to);
      if (comp && dom) {
        lines.push(`  ${r.from.replace(/-/g, '_')}["${comp.name}"] -.->|implements| ${r.to.replace(/-/g, '_')}`);
      }
    }
    return lines.join('\n');
  }

  // entity-specific: show neighborhood
  const entity = onto.entities.find(e => e.id === scope || (e.name || '').toLowerCase() === scope.toLowerCase());
  if (!entity) return null;
  const related = getRelated(projectRoot, entity.id, { depth: 1 });
  const lines = ['graph TD'];
  const safe = entity.id.replace(/-/g, '_');
  lines.push(`  ${safe}["${entity.name || entity.title}"]:::target`);
  lines.push(`  classDef target fill:#f96,stroke:#333`);
  for (const e of related.entities) {
    lines.push(`  ${e.id.replace(/-/g, '_')}["${e.name || e.title}"]`);
  }
  for (const r of related.relations) {
    lines.push(`  ${r.from.replace(/-/g, '_')} -->|${r.relation}| ${r.to.replace(/-/g, '_')}`);
  }
  return lines.join('\n');
}

// ─── Evolution Tracking ─────────────────────────────────────────────
function evolution(projectRoot, opts = {}) {
  const hp = historyPath(projectRoot);
  if (!fs.existsSync(hp)) return null;
  const lines = fs.readFileSync(hp, 'utf-8').trim().split('\n').filter(Boolean);
  const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (entries.length === 0) return null;

  const period = opts.period || 30; // days
  const since = new Date(Date.now() - period * 86400000);
  const recent = entries.filter(e => new Date(e.timestamp) >= since);

  const actionDist = {};
  for (const e of recent) actionDist[e.action] = (actionDist[e.action] || 0) + 1;

  // Entity growth over time (from merge actions)
  const merges = recent.filter(e => e.action === 'merge');
  const totalAdded = merges.reduce((sum, m) => sum + ((m.details && m.details.added) ? m.details.added.entities || 0 : 0), 0);

  return {
    totalEvents: recent.length,
    period: `${period} days`,
    actionDistribution: actionDist,
    entitiesAdded: totalAdded,
    firstEvent: entries[0].timestamp,
    lastEvent: entries[entries.length - 1].timestamp
  };
}

// ─── History ────────────────────────────────────────────────────────
function logHistory(projectRoot, action, details) {
  try {
    ensureDir(projectRoot);
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), action, details }) + '\n';
    fs.appendFileSync(historyPath(projectRoot), entry);
  } catch { /* silent */ }
}

// ─── CLI ────────────────────────────────────────────────────────────
function cli() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const root = process.cwd();

  if (!cmd || cmd === '--help') {
    console.log('Usage: ontology-engine <command> [options]');
    console.log('Commands: init, summary, query, related, merge, gen-kb, impact, health, diagram, evolution');
    return;
  }

  switch (cmd) {
    case 'init': {
      init(root);
      console.log('Ontology initialized at .shinchan-docs/ontology/ontology.json');
      break;
    }
    case 'summary': {
      const s = summary(root);
      if (!s) { console.log('No ontology found. Run: ontology-engine init'); return; }
      console.log(`Entities: ${s.entityCount} | Relations: ${s.relationCount}`);
      console.log('Type distribution:');
      for (const [t, c] of Object.entries(s.typeDist)) console.log(`  ${t}: ${c}`);
      if (s.topConnected.length > 0) {
        console.log('Top connected:');
        for (const tc of s.topConnected) console.log(`  ${tc.name}: ${tc.connections} connections`);
      }
      break;
    }
    case 'query': {
      const opts = {};
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--type') opts.type = args[i + 1];
        if (args[i] === '--name') opts.name = args[i + 1];
        if (args[i] === '--id') opts.id = args[i + 1];
      }
      const results = query(root, opts);
      console.log(JSON.stringify(results, null, 2));
      break;
    }
    case 'related': {
      const entityId = args[1];
      if (!entityId) { console.log('Usage: ontology-engine related <entityId>'); return; }
      const result = getRelated(root, entityId);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'merge': {
      const file = args[1];
      if (!file) { console.log('Usage: ontology-engine merge <json-file>'); return; }
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const stats = merge(root, data);
        console.log(`Merged: +${stats.added.entities} entities, +${stats.added.relations} relations`);
        console.log(`Skipped: ${stats.skipped.entities} entities, ${stats.skipped.relations} relations`);
      } catch (e) { console.error(`Error: ${e.message}`); }
      break;
    }
    case 'gen-kb': {
      const ok = generateKbSummary(root);
      if (ok) console.log('Generated .shinchan-docs/kb-summary.md from ontology');
      else console.log('No ontology found. Run: ontology-engine init');
      break;
    }
    case 'impact': {
      const entityId = args[1];
      if (!entityId) { console.log('Usage: ontology-engine impact <entityId> [--depth N]'); return; }
      let depth = 2;
      for (let i = 2; i < args.length; i += 2) { if (args[i] === '--depth') depth = parseInt(args[i + 1]) || 2; }
      const result = impactAnalysis(root, entityId, { depth });
      if (!result) { console.log('Entity not found or no ontology.'); return; }
      console.log(`Impact Analysis: ${result.target.name || result.target.title}`);
      console.log(`Risk: ${result.risk} | Direct: ${result.direct.length} | Indirect: ${result.indirect.length} | Fan-in: ${result.fanIn}`);
      if (result.direct.length > 0) { console.log('Direct deps:'); result.direct.forEach(e => console.log(`  ${e.name} (${e.file_path || e.id})`)); }
      if (result.tests.length > 0) { console.log('Tests:'); result.tests.forEach(t => console.log(`  ${t.name}`)); }
      break;
    }
    case 'health': {
      const h = healthScore(root);
      if (!h) { console.log('No ontology found.'); return; }
      console.log(`Health Score: ${h.total}/100`);
      for (const [k, v] of Object.entries(h.scores)) console.log(`  ${k}: ${v}/25`);
      if (h.suggestions.length > 0) { console.log('Suggestions:'); h.suggestions.forEach(s => console.log(`  - ${s}`)); }
      break;
    }
    case 'diagram': {
      const scope = args[1] || 'modules';
      const mermaid = generateMermaid(root, scope);
      if (!mermaid) { console.log('No ontology found or invalid scope.'); return; }
      console.log(mermaid);
      break;
    }
    case 'evolution': {
      const ev = evolution(root);
      if (!ev) { console.log('No history found.'); return; }
      console.log(`Evolution (${ev.period}): ${ev.totalEvents} events, +${ev.entitiesAdded} entities`);
      for (const [a, c] of Object.entries(ev.actionDistribution)) console.log(`  ${a}: ${c}`);
      break;
    }
    default:
      console.log(`Unknown command: ${cmd}. Run with --help for usage.`);
  }
}

if (require.main === module) cli();

module.exports = {
  ENTITY_TYPES, RELATION_TYPES,
  init, load, save,
  addEntity, removeEntity, addRelation, removeRelation,
  query, getRelated, summary,
  merge, generateKbSummary, logHistory,
  impactAnalysis, healthScore, generateMermaid, evolution
};
