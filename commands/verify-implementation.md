---
description: Run all verify-* skills sequentially for comprehensive validation
---

# Verify-Implementation Command

Orchestrates all verify-* skills to generate a consolidated validation report. Discovers available skills, executes them sequentially, and optionally applies fixes.

See `skills/verify-implementation/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:verify-implementation
```

## What It Does

1. Runs all 14 validators via `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/index.js` (fast path)
2. If failures found, executes each verify-* skill individually
3. Generates a consolidated pass/fail report
4. Prompts user before applying any fixes
5. Re-validates after fixes to confirm resolution

## Verify Skills Covered

| Skill | Validators |
|-------|-----------|
| verify-agents | agent-schema, shared-refs |
| verify-skills | skill-schema, skill-format, input-validation |
| verify-consistency | cross-refs, stage-matrix, debate-consistency |
| verify-workflow | workflow-state-schema, error-handling, part-numbering, quick-fix-path |
| verify-memory | memory-system |
| verify-budget | token-budget |
