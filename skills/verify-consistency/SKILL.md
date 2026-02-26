---
name: team-shinchan:verify-consistency
description: Validate cross-references, stage matrix, and debate configuration consistency
user-invocable: false
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| cross-refs | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/cross-refs.js` | CLAUDE.md agent/skill references match actual files |
| stage-matrix | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/stage-matrix.js` | Workflow stage definitions are consistent |
| debate-consistency | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/debate-consistency.js` | Debate panelist and topic configurations are valid |

## When to Run

- After modifying `CLAUDE.md`
- After changing workflow stages or debate configurations
- After adding/removing agents or skills
- As part of verify-implementation workflow

## Workflow

### Check 1: Cross-References

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/cross-refs.js
```

**Success criteria:**
- Exit code 0
- All agent references in CLAUDE.md resolve to actual files

**On failure:**
- Issue: CLAUDE.md references non-existent agent or skill
- Severity: CRITICAL
- Fix: Update CLAUDE.md reference or create missing file

### Check 2: Stage Matrix

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/stage-matrix.js
```

**Success criteria:**
- Exit code 0
- Stage definitions consistent across all references

**On failure:**
- Issue: Stage matrix mismatch between CLAUDE.md and workflow docs
- Severity: HIGH
- Fix: Sync stage definitions across files

### Check 3: Debate Consistency

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/debate-consistency.js
```

**Success criteria:**
- Exit code 0
- Debate panelists reference valid agents

**On failure:**
- Issue: Debate config references invalid agent or missing topic
- Severity: MEDIUM
- Fix: Update debate configuration to match available agents
