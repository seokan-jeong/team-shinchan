---
description: Validate token budget compliance for all configuration files
---

# Verify-Budget Command

Validates that all plugin files stay within their token budget limits.

See `skills/verify-budget/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:verify-budget
```

## When to Run

- After adding or significantly expanding any file
- After creating new agents or skills
- Before committing large changes
- As part of the `verify-implementation` workflow

## Validators

| Validator | What it checks |
|-----------|---------------|
| token-budget | All files stay within token budget limits |
