# Ontology Schema Reference

The ontology system provides a machine-readable knowledge graph of a project's architecture. It maps entities (modules, components, APIs, decisions, etc.) and the relations between them, enabling agents to reason about code structure without scanning the entire codebase.

## Overview

- **Storage**: `.shinchan-docs/ontology/ontology.json` (gitignored, per-project)
- **Format**: Single JSON file with `meta`, `entities`, and `relations` arrays
- **Optional**: The ontology is not required. All features degrade gracefully when it is absent.
- **Auto-build**: The `SessionStart` hook can generate or refresh the ontology on session open.

## Entity Types

| Type | Description |
|------|-------------|
| `Module` | Top-level code module or package (e.g., `agents/`, `hooks/`) |
| `Component` | A discrete unit within a module (e.g., a React component, a class) |
| `DomainConcept` | A business or domain term central to the project (e.g., "Workflow", "Task") |
| `API` | An exposed endpoint or interface (REST route, CLI command, plugin command) |
| `DataModel` | A persisted data structure or schema (database table, JSON schema) |
| `Decision` | An architectural decision record (ADR) or notable design choice |
| `Pattern` | A recurring design pattern used in the codebase (e.g., "Hook pipeline") |
| `Dependency` | An external package or service the project depends on |
| `Configuration` | A config file or environment variable group |
| `TestSuite` | A collection of tests covering a specific area |

### Entity Properties

Every entity must have:

```json
{
  "id": "unique-kebab-case-id",
  "type": "Module",
  "name": "Human-Readable Name",
  "description": "Brief description of what this entity represents."
}
```

Optional fields: `tags` (string array), `path` (file path), `metadata` (free-form object).

## Relation Types

| Type | Direction | Description |
|------|-----------|-------------|
| `DEPENDS_ON` | A -> B | A requires B to function |
| `IMPLEMENTS` | A -> B | A is a concrete implementation of concept/interface B |
| `EXPOSES` | A -> B | A makes B available to external consumers |
| `PERSISTS` | A -> B | A stores or writes data defined by B |
| `DECIDED_BY` | A -> B | A's design is governed by decision B |
| `FOLLOWS_PATTERN` | A -> B | A follows design pattern B |
| `TESTED_BY` | A -> B | A is covered by test suite B |
| `PART_OF` | A -> B | A is a child/member of B |
| `RELATED_TO` | A -> B | General association (use sparingly) |
| `CONFIGURED_BY` | A -> B | A's behavior is controlled by configuration B |

### Relation Properties

Every relation must have:

```json
{
  "from": "entity-id-a",
  "to": "entity-id-b",
  "type": "DEPENDS_ON"
}
```

Optional fields: `label` (string), `weight` (number 0-1), `metadata` (free-form object).

## File Structure

```
.shinchan-docs/
  ontology/
    ontology.json       # The complete ontology graph
```

The entire `.shinchan-docs/` directory is gitignored. Each developer or CI run may produce its own ontology snapshot.

## Auto-Build Flow

1. **SessionStart hook** fires when a new Claude Code session begins.
2. The hook checks whether `.shinchan-docs/ontology/ontology.json` exists and is fresh.
3. If missing or stale, the hook invokes the `ontology` skill with `build` mode.
4. The skill scans the project structure, infers entities and relations, and writes the JSON file.
5. Subsequent agent calls can read the ontology to answer architecture questions without full codebase scans.

Freshness is determined by comparing the ontology file's mtime against the latest git commit timestamp.

## Manual Management

Use the `/team-shinchan:ontology` command with subcommands:

| Subcommand | Description |
|------------|-------------|
| `build` | Scan the project and generate/regenerate the ontology |
| `show` | Print a summary of entities and relations |
| `query <id>` | Show a specific entity and all its relations |
| `validate` | Run integrity checks (same as the validator) |
| `export dot` | Export the graph in Graphviz DOT format |

## Example

A minimal ontology for a small project:

```json
{
  "meta": {
    "version": "1.0",
    "generated": "2026-02-25T09:00:00Z",
    "project": "my-app"
  },
  "entities": [
    {
      "id": "api-server",
      "type": "Module",
      "name": "API Server",
      "description": "Express HTTP server handling REST endpoints."
    },
    {
      "id": "user-model",
      "type": "DataModel",
      "name": "User Model",
      "description": "Mongoose schema for the users collection."
    },
    {
      "id": "auth-middleware",
      "type": "Component",
      "name": "Auth Middleware",
      "description": "JWT verification middleware."
    },
    {
      "id": "auth-tests",
      "type": "TestSuite",
      "name": "Auth Tests",
      "description": "Integration tests for authentication flow."
    }
  ],
  "relations": [
    { "from": "api-server", "to": "auth-middleware", "type": "DEPENDS_ON" },
    { "from": "auth-middleware", "to": "user-model", "type": "DEPENDS_ON" },
    { "from": "api-server", "to": "user-model", "type": "EXPOSES" },
    { "from": "auth-middleware", "to": "auth-tests", "type": "TESTED_BY" },
    { "from": "auth-middleware", "to": "api-server", "type": "PART_OF" }
  ]
}
```

## Integration

Agents use the ontology in several ways:

- **Hiroshi (Analyst)** reads the ontology during the `analyze` skill to map impact when a change is proposed. Tracing `DEPENDS_ON` and `PART_OF` edges reveals affected modules.
- **ActionKamen (Reviewer)** checks that new code has corresponding `TESTED_BY` relations and flags missing test coverage.
- **Bo / Aichan / Bunta (Implementers)** consult entity descriptions and relation paths to understand where to place new code and which modules to import.
- **Shiro (Orchestrator)** uses entity counts and relation density to estimate task complexity and assign the right agent.

The ontology is read-only during normal agent operation. Only the `ontology build` skill or the `SessionStart` hook may write to it.
