---
name: impact-analysis
description: >-
  Use when the user asks about dependency analysis, ripple effects, breaking changes,
  refactor impact, or what depends on a code module, API endpoint, or service.
  Traces dependencies across modules using the project ontology graph, identifies
  all affected files and tests, calculates risk level, and generates a structured
  impact report showing direct/indirect dependents and test coverage gaps.
---

# Impact Analysis Skill

Analyze the cascade impact of modifying a code module, API endpoint, or service by traversing the project ontology's dependency graph. Produces a risk-rated impact report listing all affected files, transitive dependents, test coverage, and actionable recommendations.

## Parameters

- `<target>` — Entity name, ID, or file path (e.g. `AuthService`, `comp_auth_001`, `src/auth/service.ts`)
- `--depth <N>` — Traversal depth (default: 2, max: 5)
- `--direction outgoing|incoming|both` — Direction of analysis (default: both)

## Process

### 1. Locate Target Entity

Read `.shinchan-docs/ontology/ontology.json`. If missing, stop and tell the user: "No ontology found. Run `/team-shinchan:ontology scan` first."

Search for target in `entities` array by matching, in order:
1. Exact `id` match
2. Case-insensitive `name` substring match
3. `file_path` match (for Component entities)

If multiple entities match, list them with their IDs and names and ask the user to pick one. If zero match, suggest running ontology scan.

### 2. Run Cascade Analysis

Execute:

```bash
node ${CLAUDE_PLUGIN_ROOT}/src/ontology-engine.js related <entityId> --depth <N> --direction <dir>
```

This returns a JSON object with `direct` and `indirect` arrays of related entities. Parse the output and categorize:
- **Direct dependents** (depth 1): entities with `DEPENDS_ON` pointing to target
- **Indirect dependents** (depth 2+): transitive dependents via intermediate entities
- **Test coverage**: entities linked by `TESTED_BY` relations
- **Pattern compliance**: entities linked by `FOLLOWS_PATTERN` relations

### 3. Calculate Risk Level

| Risk | Condition |
|------|-----------|
| HIGH | 10+ affected entities OR 5+ incoming `DEPENDS_ON` on target |
| MEDIUM | 5-9 affected entities OR 3-4 incoming `DEPENDS_ON` |
| LOW | <5 affected entities AND <3 incoming `DEPENDS_ON` |

### 4. Produce Report

Output a structured report. Example for `AuthService`:

```
Impact Analysis: AuthService (src/auth/service.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Risk Level: HIGH

Direct Dependencies (3):
  - UserController (src/controllers/user.ts) — DEPENDS_ON
  - SessionManager (src/session/manager.ts) — DEPENDS_ON
  - AuthMiddleware (src/middleware/auth.ts) — DEPENDS_ON

Indirect Dependencies (2):
  - ProfilePage (src/pages/profile.tsx) — via UserController
  - AdminDashboard (src/pages/admin.tsx) — via UserController

Test Coverage:
  ✔ AuthService — auth.test.ts
  ✔ UserController — user.controller.test.ts
  ✘ SessionManager — NO TESTS

Affected Modules:
  - auth (1 component affected)
  - controllers (1 component affected)
  - session (1 component affected)

Recommendations:
  - HIGH risk: add tests for SessionManager before changing AuthService
  - Review AuthMiddleware contract — 3 direct consumers
  - Run full integration test suite after changes
```

For LOW risk, recommend targeted unit tests. For MEDIUM, recommend integration tests for affected modules. For HIGH, recommend full regression testing and adding missing test coverage first.

## Error Handling

- **Ontology missing**: Tell user to run `/team-shinchan:ontology scan` first
- **Target not found**: Show available entities with similar names and suggest ontology rescan
- **Engine command fails**: Show the error output and suggest checking that `ontology-engine.js` is installed
