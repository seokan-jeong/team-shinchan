---
name: team-shinchan:manage-skills
description: Analyze changes and ensure verify-* skill coverage. Maintains verification pipeline integrity.
user-invocable: true
---

# MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Step 1: Collect Changes

```
git status --porcelain && git diff --name-only HEAD~1
```

**Exempt paths** (not verification targets): `.shinchan-docs/**`, `docs/**`, `WORKFLOW_STATE.yaml`, `tests/validate/**`, `node_modules/**`, `.git/**`

**Verification targets**: agents/*.md, skills/*/SKILL.md, hooks/*.md, CLAUDE.md, tests/** (except validators)

## Step 2: Map Changes to Validators

| Changed Path | Verify Skill | Validators |
|---|---|---|
| `agents/*.md`, `agents/_shared/*.md` | verify-agents | agent-schema, shared-refs |
| `skills/*/SKILL.md` | verify-skills | skill-schema, skill-format, input-validation |
| `CLAUDE.md` | verify-consistency | cross-refs, stage-matrix, debate-consistency |
| `docs/workflow-guide.md`, `hooks/*.md` | verify-workflow | workflow-state-schema, error-handling, quick-fix-path |
| `agents/*-part-*.md` | verify-workflow | part-numbering |
| Memory-related sections | verify-memory | memory-system |
| Any file creation/expansion | verify-budget | token-budget |
| `hooks/hooks.json`, `plugin.json` | verify-hooks | hook-registration |
| `skills/*/SKILL.md`, `commands/*.md` | verify-skills | skill-command-parity |
| `plugin.json`, `marketplace.json`, `README.md`, `CHANGELOG.md` | verify-consistency | version-consistency |

Total: 17 validators across 7 verify-* skills.

## Step 3: Report Coverage

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 [Skill Manager] Coverage Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Changed files: {count}
✅ Covered: {file → verify-skill (validators)}
⚠️ Uncovered: {file → No matching skill}
📋 Run: cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/index.js
```

## Step 4: Gap Resolution

- **Fits existing category**: report which verify-* should add coverage
- **New category needed**: report to user with recommendation
- **Should be exempt**: suggest adding to exempt list

## Prohibited

- Excluding `*.md` from analysis (they ARE the codebase)
- Looking for `src/` directories (markdown plugin)
- Auto-creating verify-* skills without user approval
- Modifying validators in `tests/validate/`

## Success Criteria

All changed files analyzed, each mapped to verify-* skill, gaps identified, validator commands listed.
