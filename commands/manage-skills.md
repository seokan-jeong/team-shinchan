---
description: Analyze changed files and ensure verify-* skill coverage integrity
---

# Manage-Skills Command

Analyzes changed files in the team-shinchan plugin and maps them to the appropriate verify-* skills. Detects coverage gaps and reports uncovered areas.

See `skills/manage-skills/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:manage-skills
```

## When to Use

- After completing a significant feature or refactor
- When `verify-implementation` reports many uncovered files
- Periodically to maintain skill coverage

## What It Does

1. Collects recently changed files (via `git status` and `git diff`)
2. Maps each file to its corresponding verify-* skill
3. Reports coverage gaps
4. Lists recommended validator commands to run
