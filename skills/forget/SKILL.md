---
name: forget
description: Delete specific memories. Use to remove outdated or incorrect learnings.
user-invocable: true
---

# Forget Skill

## Features

- Delete specific memory by ID
- Show content before deletion
- Execute after user confirmation

## Usage

```
/forget <memory-id>
/forget all          # Delete all (confirmation required)
```

## Operation Sequence

1. Find file by memory ID
2. Show content before deletion
3. Request user confirmation
4. Deletion complete message

## Caution

- Deleted memories cannot be recovered
- Use `all` option carefully
