---
name: learn
description: Manually add new learnings (patterns, preferences, rules) to memory. Use when you want to remember specific information.
user-invocable: true
---

# Learn Skill

## Features

- Auto-categorize input content
- Initialize with confidence 0.7
- Save to project memory by default

## Usage

```
/learn "User prefers camelCase for function names"
/learn "This project uses Vitest instead of Jest"
/learn --global "Content to save globally"
```

## Auto Category Classification

| Keyword | Category |
|---------|----------|
| prefer, like | preference |
| pattern, approach | pattern |
| rule, convention | convention |
| error, mistake | mistake |
| decision, architecture | decision |

## Save Location

- Default: `.team-shinchan/memories/` (project)
- `--global` flag: `~/.team-shinchan/memories/` (global)
