---
name: impact-analysis
description: Analyze cascade impact of changing a component using the ontology dependency graph
user-invocable: true
---

# Impact Analysis Skill

Analyze the cascade impact of modifying a component using the project ontology's dependency graph.

## Usage

/team-shinchan:impact-analysis <target> [options]

## Parameters

- `<target>` — Entity name, ID, or file path to analyze
- `--depth <N>` — Traversal depth (default: 2, max: 5)
- `--direction outgoing|incoming|both` — Direction of analysis (default: both)

## Process

### 1. Locate Target Entity

1. Check if `.shinchan-docs/ontology/ontology.json` exists
2. If not: "No ontology found. Run `/team-shinchan:ontology scan` first."
3. Search for target by:
   - Exact entity ID match
   - Entity name substring match
   - File path match (for Component entities)
4. If multiple matches, list them and ask user to clarify

### 2. Cascade Analysis

Run `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js related <entityId>` with the specified depth.

Analyze the result:
- **Direct dependencies** (depth 1): Components that directly depend on target
- **Indirect dependencies** (depth 2+): Cascade through transitive relations
- **Test coverage**: TESTED_BY relations for affected components
- **Pattern compliance**: FOLLOWS_PATTERN relations that may be affected

### 3. Risk Assessment

Calculate risk level based on:
- **HIGH**: 10+ affected entities OR target has 5+ incoming DEPENDS_ON
- **MEDIUM**: 5-9 affected entities OR target has 3-4 incoming DEPENDS_ON
- **LOW**: 1-4 affected entities OR target has 0-2 incoming DEPENDS_ON

### 4. Output Format

Display:

```
Impact Analysis: {target name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Risk Level: {HIGH|MEDIUM|LOW}

Direct Dependencies ({N}):
  - {component name} ({file_path}) — {relation type}
  ...

Indirect Dependencies ({N}):
  - {component name} ({file_path}) — via {intermediate}
  ...

Test Coverage:
  - {test suite name} ({file_path}) — covers {component}
  ...

Affected Modules:
  - {module name} ({N} components affected)
  ...

Recommendations:
  - {recommendation based on risk level}
```

## Graceful Degradation

If ontology doesn't exist or target not found, suggest running scan first.
