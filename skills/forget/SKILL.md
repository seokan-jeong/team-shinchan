---
name: team-shinchan:forget
description: Use when you need to delete specific outdated or incorrect memories.
user-invocable: false
---

# Forget Skill

**Remove outdated or incorrect learnings from memory.**

## Usage

```bash
/team-shinchan:forget                    # Interactive mode
/team-shinchan:forget "Redux"            # Remove learnings containing "Redux"
/team-shinchan:forget --all              # Clear all learnings (with confirmation)
```

## Process

### Interactive Mode (`/forget`)

```
🗑️ [Forget] Current learnings:

1. [preference] Use Zustand over Redux
2. [pattern] Early returns for validation
3. [convention] Use pnpm, not npm
4. [mistake] Always null-check before .map()

Which learning to remove? (Enter number or keyword)
```

### Keyword Mode (`/forget "Redux"`)

```
🗑️ [Forget] Searching for: "Redux"

Found 1 matching learning:
• [preference] Use Zustand over Redux

Remove this learning? (y/n)
```

If confirmed:
```
✅ Removed: "Use Zustand over Redux"

📁 Updated: .shinchan-docs/learnings.md
```

### Clear All Mode (`/forget --all`)

```
⚠️ [Forget] WARNING: This will delete ALL learnings!

Current count: 15 learnings

Are you sure? Type "DELETE ALL" to confirm:
```

If confirmed:
```
✅ Cleared all learnings.

📁 Reset: .shinchan-docs/learnings.md
💡 Start fresh with /team-shinchan:learn or just work!
```

## When to Use

| Situation | Action |
|-----------|--------|
| Learning is outdated | `/forget "old pattern"` |
| Learning was wrong | `/forget "incorrect thing"` |
| Project changed direction | `/forget --all` (careful!) |
| Too many irrelevant learnings | Selective `/forget` |

## Important

- **Be careful** - Removed learnings cannot be recovered
- Prefer selective removal over `--all`
- Learnings file is simply edited (sections removed)
- After forgetting, the system adapts on next session
