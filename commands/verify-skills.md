---
description: Validate skill schema, format compliance, and input validation rules
---

# Verify-Skills Command

Validates all skill definition files for schema compliance, naming conventions, and input validation rules.

See `skills/verify-skills/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:verify-skills
```

## When to Run

- After modifying any file in `skills/`
- After adding, removing, or renaming a skill
- As part of the `verify-implementation` workflow

## Validators

| Validator | What it checks |
|-----------|---------------|
| skill-schema | Skill files follow required schema (frontmatter, sections) |
| skill-format | Skill naming conventions and structural format |
| input-validation | Input validation rules are properly defined |
