---
name: team-shinchan:verify-memory
description: Validate memory system configuration and file structure
user-invocable: true
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| memory-system | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/memory-system.js` | Memory system files and configuration are valid |

## When to Run

- After modifying memory-related agent sections
- After changing `.shinchan-docs/learnings.md` structure
- As part of verify-implementation workflow

## Workflow

### Check 1: Memory System

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/memory-system.js
```

**Success criteria:**
- Exit code 0
- Memory system configuration is valid

**On failure:**
- Issue: Memory system misconfiguration
- Severity: MEDIUM
- Fix: Verify memory file paths and agent memory references
