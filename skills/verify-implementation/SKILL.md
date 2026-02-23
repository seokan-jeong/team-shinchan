---
name: team-shinchan:verify-implementation
description: Execute all verify-* skills sequentially to generate integrated validation report.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Fast Path

Run all validators at once (from plugin root):
```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/index.js
```
If all pass, report success and stop. If any fail, continue to detailed execution below.

## Step 1: Discovery

Glob `skills/verify-*/SKILL.md`, filter out self. Announce discovered count and list.

## Step 2: Sequential Execution

For each verify-* skill (alphabetical):
1. Read SKILL.md to extract validator commands
2. Announce: "Running: {skill-name}..."
3. Execute validators, capture status (PASS/FAIL) and output
4. On missing SKILL.md: skip with warning. On failure: mark FAIL, continue.

## Step 3: Consolidated Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🦸 [Action Kamen] Validation Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Skill | Status | Validators |
|-------|--------|-----------|
| verify-agents | PASS/FAIL | agent-schema, shared-refs |
| verify-skills | PASS/FAIL | skill-schema, skill-format, input-validation |
| verify-consistency | PASS/FAIL | cross-refs, stage-matrix, debate-consistency |
| verify-workflow | PASS/FAIL | workflow-state-schema, error-handling, part-numbering, quick-fix-path |
| verify-memory | PASS/FAIL | memory-system |
| verify-budget | PASS/FAIL | token-budget |

Overall: {passed}/{total} passed
{Failed validator output if any}
```

## Step 4: User Action

If issues: ask user "Fix all automatically", "Review individually", or "Skip fixes".
If no issues: report all passed and stop.

## Step 5: Fix + Revalidate

For each approved fix: announce, apply, report result. Then re-run only previously-failed validators and show before/after comparison.

## Integration

- Called via `/team-shinchan:review` (Action Kamen runs as part of review)
- Called standalone via `/team-shinchan:verify-implementation`
- Gaps detected here can be resolved via manage-skills

## Prohibited

- Only explaining without executing
- Skipping discovery phase
- Applying fixes without user confirmation
- Not re-validating after fixes

## Success Criteria

All verify-* discovered and executed, consolidated report generated, user confirmation before fixes, post-fix revalidation completed.
