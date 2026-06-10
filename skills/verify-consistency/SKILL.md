---
name: team-shinchan:verify-consistency
description: Use when you need to validate cross-references, stage matrix, or debate consistency.
user-invocable: false
---

# ⚠️ MANDATORY EXECUTION - DO NOT SKIP

**When this skill is invoked, execute immediately. Do not explain.**

## Validators

| Validator | Command | What it checks |
|-----------|---------|---------------|
| cross-refs | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/cross-refs.js` | CLAUDE.md agent/skill references match actual files |
| stage-matrix | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/stage-matrix.js` | Workflow stage definitions are consistent |
| debate-consistency | `cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/debate-consistency.js` | Debate panelist and topic configurations are valid |

## When to Run

- After modifying `CLAUDE.md`
- After changing workflow stages or debate configurations
- After adding/removing agents or skills
- As part of verify-implementation workflow

## Workflow

### Check 1: Cross-References

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/cross-refs.js
```

**Success criteria:**
- Exit code 0
- All agent references in CLAUDE.md resolve to actual files

**On failure:**
- Issue: CLAUDE.md references non-existent agent or skill
- Severity: CRITICAL
- Fix: Update CLAUDE.md reference or create missing file

### Check 2: Stage Matrix

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/stage-matrix.js
```

**Success criteria:**
- Exit code 0
- Stage definitions consistent across all references

**On failure:**
- Issue: Stage matrix mismatch between CLAUDE.md and workflow docs
- Severity: HIGH
- Fix: Sync stage definitions across files

### Check 3: Debate Consistency

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node tests/validate/debate-consistency.js
```

**Success criteria:**
- Exit code 0
- Debate panelists reference valid agents

**On failure:**
- Issue: Debate config references invalid agent or missing topic
- Severity: MEDIUM
- Fix: Update debate configuration to match available agents

### Check 4: DAG / Cross-Phase Regression

Phase 2 (`interview-metrics-researc-002`) added the DAG executor on top of the frozen Phase 1
contracts (`agents/misae.md` 4-step option pipeline, `skills/fierce-option-panel/` Workflow,
`src/option-metrics.js`). Phase 2 only ADDS new exports/modules; it MUST NOT alter Phase 1
function signatures. The DAG schema fields (`id`, `depends_on`, `touches`, `verify`, `estimate`,
`scope`) and the executor module must remain consistent with `docs/dag-executor.md`.

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node --test tests/option-metrics.test.js && node --test tests/dag-executor.test.js
```

**Success criteria:**
- Exit code 0
- Phase 1 `tests/option-metrics.test.js` still passes (no signature regression, NFR-2)
- Phase 2 `tests/dag-executor.test.js` passes
- No import from `dag-executor.js` into `option-metrics.js` (dependency-inversion ban)

**On failure:**
- Issue: a Phase 2 change broke a Phase 1 contract, or the DAG schema drifted
- Severity: HIGH
- Fix: revert the offending signature change; Phase 1 artifacts are frozen (see REQUESTS.md
  NFR-2 and `docs/dag-executor.md` cross-phase safety)
