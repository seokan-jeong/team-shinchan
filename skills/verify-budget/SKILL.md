---
name: team-shinchan:verify-budget
description: Validate token budget compliance for all configuration files
user-invocable: false
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| token-budget | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/token-budget.js` | All files stay within token budget limits |

## When to Run

- After adding or significantly expanding any file
- After creating new agents or skills
- Before committing large changes
- As part of verify-implementation workflow

## Workflow

### Check 1: Token Budget

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/token-budget.js
```

**Success criteria:**
- Exit code 0
- All files within their token budget limits

**On failure:**
- Issue: File exceeds token budget
- Severity: HIGH
- Fix: Reduce file size by removing redundancy, using references, or splitting into parts
