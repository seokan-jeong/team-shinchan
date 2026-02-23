---
name: team-shinchan:verify-workflow
description: Validate workflow state schema, error handling, part numbering, and quick-fix paths
user-invocable: true
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| workflow-state-schema | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/workflow-state-schema.js` | WORKFLOW_STATE.yaml files follow required schema |
| error-handling | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/error-handling.js` | Error handling patterns are properly defined |
| part-numbering | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/part-numbering.js` | Multi-part agent files have correct numbering |
| quick-fix-path | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/quick-fix-path.js` | Quick-fix (lite mode) workflow path is valid |

## When to Run

- After modifying workflow-related files (`docs/workflow-guide.md`, `hooks/`)
- After changing error handling patterns in agents
- After modifying multi-part agent files
- As part of verify-implementation workflow

## Workflow

### Check 1: Workflow State Schema

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/workflow-state-schema.js
```

**Success criteria:**
- Exit code 0
- All WORKFLOW_STATE.yaml files follow schema

**On failure:**
- Issue: Invalid WORKFLOW_STATE.yaml structure
- Severity: HIGH
- Fix: Follow schema defined in docs/workflow-guide.md

### Check 2: Error Handling

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/error-handling.js
```

**Success criteria:**
- Exit code 0
- Error handling patterns present in required locations

**On failure:**
- Issue: Missing error handling in agent definition
- Severity: MEDIUM
- Fix: Add error handling section per agent template

### Check 3: Part Numbering

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/part-numbering.js
```

**Success criteria:**
- Exit code 0
- Multi-part files numbered sequentially

**On failure:**
- Issue: Gap or duplicate in part numbering
- Severity: MEDIUM
- Fix: Renumber parts sequentially (part-1, part-2, ...)

### Check 4: Quick-Fix Path

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/quick-fix-path.js
```

**Success criteria:**
- Exit code 0
- Lite mode workflow path properly configured

**On failure:**
- Issue: Quick-fix path references invalid stage or agent
- Severity: HIGH
- Fix: Update lite mode workflow to match current agent structure
