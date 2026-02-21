---
description: Validate cross-references, stage matrix, and debate configuration consistency
---

# Verify-Consistency Command

Validates that CLAUDE.md references, workflow stage definitions, and debate configurations are all consistent and correct.

See `skills/verify-consistency/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:verify-consistency
```

## When to Run

- After modifying `CLAUDE.md`
- After changing workflow stages or debate configurations
- After adding or removing agents or skills
- As part of the `verify-implementation` workflow

## Validators

| Validator | What it checks |
|-----------|---------------|
| cross-refs | CLAUDE.md agent/skill references match actual files |
| stage-matrix | Workflow stage definitions are consistent |
| debate-consistency | Debate panelist and topic configurations are valid |
