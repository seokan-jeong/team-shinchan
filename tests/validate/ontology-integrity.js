#!/usr/bin/env node
/**
 * Ontology Integrity Validator
 * Validates that .shinchan-docs/ontology/ontology.json is well-formed and internally consistent.
 * Skips silently (exit 0) if the ontology file does not exist — ontology is optional.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
// Use CWD for host project ontology, ROOT_DIR for self-test
const ONTO_FILE = path.join(process.cwd(), '.shinchan-docs/ontology/ontology.json');

const VALID_ENTITY_TYPES = [
  'Module',
  'Component',
  'DomainConcept',
  'API',
  'DataModel',
  'Decision',
  'Pattern',
  'Dependency',
  'Configuration',
  'TestSuite',
];

const VALID_RELATION_TYPES = [
  'DEPENDS_ON',
  'IMPLEMENTS',
  'EXPOSES',
  'PERSISTS',
  'DECIDED_BY',
  'FOLLOWS_PATTERN',
  'TESTED_BY',
  'PART_OF',
  'RELATED_TO',
  'CONFIGURED_BY',
];

function runValidation() {
  console.log('========================================');
  console.log('  Ontology Integrity Validation');
  console.log('========================================\n');

  // Skip if no ontology
  if (!fs.existsSync(ONTO_FILE)) {
    console.log('  No ontology found (optional) — skipping\n');
    console.log('----------------------------------------');
    console.log('Errors: 0 | Warnings: 0');
    console.log('----------------------------------------\n');
    return 0;
  }

  const errors = [];
  const warnings = [];

  // 1. JSON is parseable
  console.log('Checking JSON parseability...');
  let ontology;
  try {
    const raw = fs.readFileSync(ONTO_FILE, 'utf-8');
    ontology = JSON.parse(raw);
    console.log('  \x1b[32m✓\x1b[0m Valid JSON');
  } catch (e) {
    errors.push(`JSON parse error: ${e.message}`);
    console.log(`  \x1b[31m✗\x1b[0m JSON parse error: ${e.message}`);
    // Cannot continue if JSON is broken
    console.log('\n----------------------------------------');
    console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
    console.log('----------------------------------------\n');
    console.log('Errors:');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
    console.log();
    return 1;
  }

  // 2. Required top-level fields
  console.log('\nChecking required fields...');
  const requiredFields = ['meta', 'entities', 'relations'];
  requiredFields.forEach(field => {
    if (ontology[field] === undefined) {
      errors.push(`Missing required field: "${field}"`);
      console.log(`  \x1b[31m✗\x1b[0m Missing field: ${field}`);
    } else if (field !== 'meta' && !Array.isArray(ontology[field])) {
      errors.push(`"${field}" must be an array`);
      console.log(`  \x1b[31m✗\x1b[0m ${field} is not an array`);
    } else {
      console.log(`  \x1b[32m✓\x1b[0m ${field}`);
    }
  });

  // If entities or relations are missing/invalid, cannot continue
  if (!Array.isArray(ontology.entities) || !Array.isArray(ontology.relations)) {
    console.log('\n----------------------------------------');
    console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
    console.log('----------------------------------------\n');
    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
      console.log();
    }
    return errors.length > 0 ? 1 : 0;
  }

  const entities = ontology.entities;
  const relations = ontology.relations;

  // 3. All entity IDs are unique
  console.log('\nChecking entity ID uniqueness...');
  const entityIds = new Set();
  const duplicateIds = [];
  entities.forEach(entity => {
    if (!entity.id) {
      errors.push('Entity missing "id" field');
    } else if (entityIds.has(entity.id)) {
      duplicateIds.push(entity.id);
    } else {
      entityIds.add(entity.id);
    }
  });
  if (duplicateIds.length > 0) {
    duplicateIds.forEach(id => {
      errors.push(`Duplicate entity ID: "${id}"`);
      console.log(`  \x1b[31m✗\x1b[0m Duplicate: ${id}`);
    });
  } else {
    console.log(`  \x1b[32m✓\x1b[0m ${entityIds.size} unique entity ID(s)`);
  }

  // 4. All entity types are valid
  console.log('\nChecking entity types...');
  let invalidEntityTypes = 0;
  entities.forEach(entity => {
    if (!entity.type) {
      errors.push(`Entity "${entity.id || '(no id)'}" missing "type" field`);
      invalidEntityTypes++;
    } else if (!VALID_ENTITY_TYPES.includes(entity.type)) {
      errors.push(`Entity "${entity.id}": invalid type "${entity.type}"`);
      console.log(`  \x1b[31m✗\x1b[0m ${entity.id} has invalid type: ${entity.type}`);
      invalidEntityTypes++;
    }
  });
  if (invalidEntityTypes === 0) {
    console.log(`  \x1b[32m✓\x1b[0m All entity types valid`);
  }

  // 5. All relation types are valid
  console.log('\nChecking relation types...');
  let invalidRelationTypes = 0;
  relations.forEach((rel, idx) => {
    if (!rel.type) {
      errors.push(`Relation [${idx}] missing "type" field`);
      invalidRelationTypes++;
    } else if (!VALID_RELATION_TYPES.includes(rel.type)) {
      errors.push(`Relation [${idx}]: invalid type "${rel.type}"`);
      console.log(`  \x1b[31m✗\x1b[0m Relation [${idx}] has invalid type: ${rel.type}`);
      invalidRelationTypes++;
    }
  });
  if (invalidRelationTypes === 0) {
    console.log(`  \x1b[32m✓\x1b[0m All relation types valid`);
  }

  // 6. All relation from/to reference existing entity IDs
  console.log('\nChecking relation references...');
  let brokenRefs = 0;
  relations.forEach((rel, idx) => {
    if (!rel.from) {
      errors.push(`Relation [${idx}] missing "from" field`);
      brokenRefs++;
    } else if (!entityIds.has(rel.from)) {
      errors.push(`Relation [${idx}]: "from" references unknown entity "${rel.from}"`);
      console.log(`  \x1b[31m✗\x1b[0m Relation [${idx}] from "${rel.from}" not found`);
      brokenRefs++;
    }
    if (!rel.to) {
      errors.push(`Relation [${idx}] missing "to" field`);
      brokenRefs++;
    } else if (!entityIds.has(rel.to)) {
      errors.push(`Relation [${idx}]: "to" references unknown entity "${rel.to}"`);
      console.log(`  \x1b[31m✗\x1b[0m Relation [${idx}] to "${rel.to}" not found`);
      brokenRefs++;
    }
  });
  if (brokenRefs === 0) {
    console.log(`  \x1b[32m✓\x1b[0m All relation references valid`);
  }

  // 7. Orphaned entities (warning, not error)
  console.log('\nChecking for orphaned entities...');
  const connectedIds = new Set();
  relations.forEach(rel => {
    if (rel.from) connectedIds.add(rel.from);
    if (rel.to) connectedIds.add(rel.to);
  });
  const orphaned = [];
  entityIds.forEach(id => {
    if (!connectedIds.has(id)) {
      orphaned.push(id);
    }
  });
  if (orphaned.length > 0) {
    orphaned.forEach(id => {
      warnings.push(`Orphaned entity (0 relations): "${id}"`);
      console.log(`  \x1b[33m?\x1b[0m Orphaned: ${id}`);
    });
  } else {
    console.log(`  \x1b[32m✓\x1b[0m No orphaned entities`);
  }

  // Summary
  console.log('\n----------------------------------------');
  console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
  console.log('----------------------------------------\n');

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  \x1b[31m• ${e}\x1b[0m`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  \x1b[33m• ${w}\x1b[0m`));
    console.log();
  }

  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exit(runValidation());
}

module.exports = { runValidation };
