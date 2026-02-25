---
name: ontology
description: Query, manage, and visualize the project-level ontology
user-invocable: true
---

# Ontology Skill

Query, manage, and visualize the project's ontology.

## Usage

/team-shinchan:ontology [subcommand] [args]

## Subcommands

### show (default)
Display ontology summary with key metrics.
- Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js summary`
- Show: entity count, relation count, type distribution, top connected entities

### query <term>
Search for entities by name or type.
- Usage: `/team-shinchan:ontology query Payment`
- Usage: `/team-shinchan:ontology query --type Component`
- Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js query --name <term>` or `--type <type>`
- Display matching entities with their relations

### add <type> <name> [properties]
Manually add an entity (for domain concepts, decisions, patterns).
- Usage: `/team-shinchan:ontology add DomainConcept "User Authentication"`
- Usage: `/team-shinchan:ontology add Decision "Use REST over GraphQL" --rationale "Simpler for our team size"`
- Create entity via ontology-engine.js addEntity

### remove <entity-id>
Remove an entity and its relations.
- Usage: `/team-shinchan:ontology remove comp-a3f2`
- Cascade removes all connected relations

### scan
Trigger a full re-scan of the project.
- Usage: `/team-shinchan:ontology scan`
- Usage: `/team-shinchan:ontology scan --module src/services`
- Run scanner and merge results

### gen-kb
Regenerate kb-summary.md from ontology.
- Usage: `/team-shinchan:ontology gen-kb`
- Run: `node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js gen-kb`

### diagram [scope]
Generate a Mermaid diagram.
- Usage: `/team-shinchan:ontology diagram modules` — Module dependency graph
- Usage: `/team-shinchan:ontology diagram domain` — Domain concept map
- Usage: `/team-shinchan:ontology diagram entity <id>` — Entity neighborhood

## Graceful Degradation

If no ontology exists:
- Display: "No ontology found. Run `/team-shinchan:ontology scan` or wait for next session start to auto-build."
- All subcommands should handle missing ontology gracefully
