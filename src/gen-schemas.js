#!/usr/bin/env node
// Team-Shinchan JSON Schema Generator
// Generates JSON Schemas for WORKFLOW_STATE.yaml, layer-map.json, intent-map.json
// Usage: node src/gen-schemas.js [--check] [--write]
// --check: verify schemas are up to date (exit 1 if outdated)
// --write: generate/overwrite schema files (default behavior)
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SCHEMA_DIR = path.join(PROJECT_ROOT, 'schemas');
const CHECK_MODE = process.argv.includes('--check');

if (!fs.existsSync(SCHEMA_DIR)) {
  fs.mkdirSync(SCHEMA_DIR, { recursive: true });
}

// Schema 1: WORKFLOW_STATE.yaml
const workflowStateSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Team-Shinchan Workflow State",
  "description": "Tracks the current state of a Team-Shinchan workflow instance",
  "type": "object",
  "properties": {
    "schema_version": { "type": "number", "description": "Schema version for migration" },
    "doc_id": { "type": "string", "description": "Unique workflow document ID (e.g., main-052)" },
    "created": { "type": "string", "format": "date-time" },
    "updated": { "type": "string", "format": "date-time" },
    "context_budget": { "type": "number", "description": "Maximum context tokens for this workflow" },
    "current": {
      "type": "object",
      "properties": {
        "stage": { "enum": ["requirements", "planning", "execution", "completion"] },
        "phase": { "type": ["number", "string", "null"] },
        "owner": { "type": "string", "description": "Current agent responsible" },
        "status": { "enum": ["active", "paused", "completed", "blocked"] }
      },
      "required": ["stage", "owner", "status"]
    },
    "stage_rules": {
      "type": "object",
      "description": "Tool permissions per stage",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "allowed_tools": { "type": "array", "items": { "type": "string" } },
          "blocked_tools": { "type": "array", "items": { "type": "string" } },
          "interpretation": { "type": "string" }
        }
      }
    },
    "interview": { "type": "object" },
    "history": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "event": { "type": "string" },
          "agent": { "type": "string" },
          "from": { "type": "string" },
          "to": { "type": "string" },
          "note": { "type": "string" }
        },
        "required": ["timestamp", "event"]
      }
    },
    "detected_intent": { "type": ["string", "null"], "description": "IntentGate detected skill keyword" },
    "plan_validation_passed": { "type": "boolean", "description": "Whether Plan Validation Gate passed" },
    "warnings": {
      "type": "object",
      "properties": {
        "slop_comments": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "file": { "type": "string" },
              "line": { "type": "number" },
              "pattern": { "type": "string" }
            }
          }
        }
      }
    },
    "discovered_issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "status": { "enum": ["open", "resolved", "wontfix", "promoted"] }
        }
      }
    }
  },
  "required": ["schema_version", "doc_id", "current"]
};

// Schema 2: layer-map.json
const layerMapSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Team-Shinchan Layer Map",
  "description": "Defines agent layers and allowed cross-layer calls",
  "type": "object",
  "properties": {
    "layers": {
      "type": "object",
      "description": "Maps layer names to arrays of agent names",
      "additionalProperties": { "type": "array", "items": { "type": "string" } }
    },
    "allowed_calls": {
      "type": "object",
      "description": "Maps 'from_layer' to arrays of allowed 'to_layer' names",
      "additionalProperties": { "type": "array", "items": { "type": "string" } }
    },
    "exceptions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "agent": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    }
  }
};

// Schema 3: intent-map.json
const intentMapSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Team-Shinchan Intent Map",
  "description": "Maps keywords to skill names for IntentGate auto-routing",
  "type": "object",
  "properties": {
    "_schema": { "type": "string" },
    "_description": { "type": "string" },
    "mappings": {
      "type": "object",
      "description": "Keyword (lowercase) → skill name (without team-shinchan: prefix)",
      "additionalProperties": { "type": "string" }
    },
    "fallback": { "type": "string", "description": "Action when no keyword matches" },
    "test_cases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "input": { "type": "string" },
          "expected": { "type": "string" }
        },
        "required": ["input", "expected"]
      }
    }
  },
  "required": ["mappings"]
};

const schemas = [
  { name: 'workflow-state.schema.json', content: workflowStateSchema },
  { name: 'layer-map.schema.json', content: layerMapSchema },
  { name: 'intent-map.schema.json', content: intentMapSchema }
];

const outdated = [];

for (const schema of schemas) {
  const schemaPath = path.join(SCHEMA_DIR, schema.name);
  const schemaStr = JSON.stringify(schema.content, null, 2) + '\n';

  if (fs.existsSync(schemaPath)) {
    const existing = fs.readFileSync(schemaPath, 'utf-8');
    if (existing !== schemaStr) {
      outdated.push(schema.name);
    }
  } else {
    outdated.push(schema.name);
  }

  if (!CHECK_MODE) {
    fs.writeFileSync(schemaPath, schemaStr, 'utf-8');
    console.log('GENERATED: schemas/' + schema.name);
  }
}

if (CHECK_MODE && outdated.length > 0) {
  console.error('OUTDATED SCHEMAS: ' + outdated.join(', '));
  console.error('Run: node src/gen-schemas.js to regenerate');
  process.exit(1);
}

if (CHECK_MODE && outdated.length === 0) {
  console.log('All schemas up to date.');
}
