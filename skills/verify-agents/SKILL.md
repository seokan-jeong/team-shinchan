---
name: team-shinchan:verify-agents
description: Validate agent schema compliance and shared reference integrity
user-invocable: false
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| agent-schema | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/agent-schema.js` | Agent files follow required schema (frontmatter, sections) |
| shared-refs | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/shared-refs.js` | Shared agent references resolve to existing files |

## When to Run

- After modifying any file in `agents/`
- After adding/removing/renaming an agent
- As part of verify-implementation workflow

## Workflow

### Check 1: Agent Schema

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/agent-schema.js
```

**Success criteria:**
- Exit code 0
- All agent files pass schema validation

**On failure:**
- Issue: Agent file missing required sections or invalid frontmatter
- Severity: HIGH
- Fix: Follow agent template structure in agents/_shared/

### Check 2: Shared References

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/shared-refs.js
```

**Success criteria:**
- Exit code 0
- All shared ref paths resolve correctly

**On failure:**
- Issue: Broken reference to shared agent file
- Severity: HIGH
- Fix: Update or remove stale shared references
