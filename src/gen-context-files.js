#!/usr/bin/env node
// Team-Shinchan Hierarchical Context Generator
// Generates .context.md files for key directories (agents/, hooks/, skills/, src/).
// Each .context.md summarizes the directory's purpose, files, and ontology entities.
// Usage: node src/gen-context-files.js [--target <dir>]
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const ONTOLOGY_PATH = path.join(PROJECT_ROOT, '.shinchan-docs/ontology/ontology.json');
const DEFAULT_DIRS = ['src', 'agents', 'hooks', 'skills'];

const targetIdx = process.argv.indexOf('--target');
const TARGET_DIRS = targetIdx !== -1
  ? [process.argv[targetIdx + 1]]
  : DEFAULT_DIRS;

function loadOntology() {
  if (!fs.existsSync(ONTOLOGY_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(ONTOLOGY_PATH, 'utf-8'));
  } catch (e) { return null; }
}

const DIR_PURPOSES = {
  src: 'Node.js scripts for plugin automation (ontology, schemas, analytics, architecture generation, etc.)',
  agents: 'Agent definition files (.md) with YAML frontmatter, personality prompts, and workflow rules',
  hooks: 'Command hooks (.sh) for SessionStart, PreToolUse, PostToolUse lifecycle events',
  skills: 'User-invocable skills with YAML frontmatter and step-by-step execution logic'
};

function generateContextForDir(dir) {
  const fullPath = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${dir}/ does not exist`);
    return;
  }

  let files;
  try {
    files = fs.readdirSync(fullPath).filter(f => !f.startsWith('.'));
  } catch (e) {
    console.log(`SKIP: ${dir}/ not readable`);
    return;
  }

  const ontology = loadOntology();
  const entities = ontology && ontology.entities
    ? ontology.entities.filter(e => {
        const ep = e.file_path || e.path || '';
        return ep.startsWith(dir + '/') || ep.startsWith('./' + dir + '/');
      })
    : [];

  const purpose = DIR_PURPOSES[dir] || 'Team-Shinchan plugin directory';
  const fileList = files.slice(0, 25).map(f => `- ${f}`).join('\n');
  const moreFiles = files.length > 25 ? `\n... and ${files.length - 25} more` : '';

  const entityList = entities.length > 0
    ? entities.slice(0, 12).map(e => `- **${e.name}** (${e.type || 'unknown'})`).join('\n')
    : 'No ontology entities found for this directory.';

  const content = `# ${dir}/ Directory Context

**Auto-generated**: ${new Date().toISOString().split('T')[0]}
**Do not edit** — regenerated on each session start.

## Purpose

${purpose}

## Files (${files.length})

${fileList}${moreFiles}

## Key Entities (from ontology)

${entityList}
`;

  fs.writeFileSync(path.join(fullPath, '.context.md'), content, 'utf-8');
  console.log(`GENERATED: ${dir}/.context.md (${files.length} files, ${entities.length} entities)`);
}

TARGET_DIRS.forEach(generateContextForDir);
