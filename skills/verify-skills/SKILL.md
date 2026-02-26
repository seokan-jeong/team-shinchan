---
name: team-shinchan:verify-skills
description: Validate skill schema, format compliance, and input validation rules
user-invocable: false
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| skill-schema | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/skill-schema.js` | Skill files follow required schema (frontmatter, sections) |
| skill-format | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/skill-format.js` | Skill naming conventions and structural format |
| input-validation | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/input-validation.js` | Input validation rules are properly defined |

## When to Run

- After modifying any file in `skills/`
- After adding/removing/renaming a skill
- As part of verify-implementation workflow

## Workflow

### Check 1: Skill Schema

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/skill-schema.js
```

**Success criteria:**
- Exit code 0
- All skill files have valid frontmatter and required sections

**On failure:**
- Issue: Skill file missing required frontmatter fields or sections
- Severity: HIGH
- Fix: Add missing frontmatter (name, description, user-invocable)

### Check 2: Skill Format

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/skill-format.js
```

**Success criteria:**
- Exit code 0
- All skills follow naming conventions

**On failure:**
- Issue: Skill naming or structural format violation
- Severity: MEDIUM
- Fix: Rename skill to follow kebab-case convention

### Check 3: Input Validation

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/input-validation.js
```

**Success criteria:**
- Exit code 0
- Input validation rules properly defined

**On failure:**
- Issue: Missing or incorrect input validation rules
- Severity: MEDIUM
- Fix: Add proper input validation section to skill
