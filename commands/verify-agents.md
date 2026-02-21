---
description: Validate agent schema compliance and shared reference integrity
---

# Verify-Agents Command

Validates all agent definition files for schema compliance and resolves shared reference integrity.

See `skills/verify-agents/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:verify-agents
```

## When to Run

- After modifying any file in `agents/`
- After adding, removing, or renaming an agent
- As part of the `verify-implementation` workflow

## Validators

| Validator | What it checks |
|-----------|---------------|
| agent-schema | Agent files follow required schema (frontmatter, sections) |
| shared-refs | Shared agent references resolve to existing files |
