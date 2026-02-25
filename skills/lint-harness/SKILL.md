---
name: team-shinchan:lint-harness
description: Run plugin consistency checks — agent frontmatter, structural integrity, drift detection.
user-invocable: true
---

# Lint Harness Skill

**Check plugin consistency and detect configuration drift.**

## Usage

```bash
/team-shinchan:lint-harness                    # Full check (JSON)
/team-shinchan:lint-harness --category agents   # Agent consistency only
/team-shinchan:lint-harness --category structure # Structural integrity only
/team-shinchan:lint-harness --category drift     # Drift detection only
/team-shinchan:lint-harness --format table       # Colored text table
```

## Arguments

| Arg | Default | Description |
|-----|---------|-------------|
| `--category {name}` | (all) | Check only: `agents`, `structure`, or `drift` |
| `--format {fmt}` | json | Output format: `json` or `table` |

## Process

### Step 1: Run Lint Script

Execute the harness lint script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/src/harness-lint.js [args]
```

### Step 2: Display Results

Show the output from the lint script directly to the user.

- JSON format: structured report with categories, checks, pass/fail, details
- Table format: colored text table with PASS/FAIL indicators

### Step 3: Summarize

After displaying results, provide a brief summary:

```
Harness Lint: {passed}/{total} checks passed
{list any FAIL items with recommended fixes}
```

## Categories

| Category | What it checks |
|----------|---------------|
| **agents** | Required frontmatter, coding-principles refs, maxTurns, permissionMode |
| **structure** | Skill-command parity, hook registration, cross-refs, layer-map |
| **drift** | Output-formats refs, self-check refs, version consistency |

## Important

- Script writes `.shinchan-docs/.last-lint` timestamp after running
- Recommended to run at least once per week
- Zero external dependencies — uses only Node.js built-in modules
