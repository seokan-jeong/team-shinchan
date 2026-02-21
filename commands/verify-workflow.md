---
description: Validate workflow state schema, error handling, part numbering, and quick-fix paths
---

# Verify-Workflow Command

Validates workflow state schema, error handling patterns, multi-part agent file numbering, and the lite mode quick-fix path.

See `skills/verify-workflow/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:verify-workflow
```

## When to Run

- After modifying workflow-related files (`docs/workflow-guide.md`, `hooks/`)
- After changing error handling patterns in agents
- After modifying multi-part agent files
- As part of the `verify-implementation` workflow

## Validators

| Validator | What it checks |
|-----------|---------------|
| workflow-state-schema | WORKFLOW_STATE.yaml files follow required schema |
| error-handling | Error handling patterns are properly defined |
| part-numbering | Multi-part agent files have correct numbering |
| quick-fix-path | Quick-fix (lite mode) workflow path is valid |
