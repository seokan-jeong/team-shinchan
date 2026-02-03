---
name: memories
description: View and manage learned memories (patterns, preferences, mistakes, decisions). Use to check current learnings.
user-invocable: true
---

# Memories Skill

## Features

- View global memories (`~/.team-shinchan/memories/`)
- View project memories (`.team-shinchan/memories/`)
- Search memories by keyword
- Display sorted by confidence

## Usage

```
/memories           # View all memories
/memories search    # Search by keyword
```

## Memory Categories

| Category | Description |
|----------|-------------|
| preference | User preferences |
| pattern | Code patterns |
| context | Project context |
| mistake | Mistakes and solutions |
| decision | Architecture decisions |
| convention | Project conventions |
| insight | Insights |

## Output Information

Displayed for each memory item:
- Category
- Tags
- Created date
- Confidence
