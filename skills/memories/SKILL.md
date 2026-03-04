---
name: team-shinchan:memories
description: View and manage learned memories (patterns, preferences, mistakes, decisions). Use to check current learnings.
user-invocable: false
---

# Memories Skill

**View what Team-Shinchan has learned about this project.**

## Usage

```bash
/team-shinchan:memories              # View all learnings
/team-shinchan:memories pattern      # Filter by category
/team-shinchan:memories search auth  # Search for keyword
```

## Process

### Step 1: Read Learning File

Read `.shinchan-docs/learnings.md`

If file doesn't exist:
```
📚 [Memories] No learnings yet.

Start teaching with:
  /team-shinchan:learn "Your learning here"

Or just work - I learn automatically after tasks!
```

### Step 2: Parse and Display

**Full view** (`/memories`):

```
📚 [Memories] {N} learnings stored

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 PREFERENCE TIER ({count}) — always loaded
• Use Zustand over Redux [high] #state-management
• Prefer functional components [high] #react

🔸 PROCEDURAL TIER ({count}) — project-scoped
  📌 PATTERNS ({count})
  • Early returns for validation [high] #typescript
  • Repository pattern for data access [medium] #architecture
  📌 CONVENTIONS ({count})
  • Use pnpm, not npm [high] #tooling
  • camelCase for functions [high] #naming
  📌 MISTAKES ({count})
  • Always null-check before .map() [high] #typescript
  📌 DECISIONS ({count})
  • JWT with refresh token rotation [high] #auth

🔧 TOOL TIER ({count}) — execution-stage only
• Always pass --json to gh CLI [high] #github

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 These learnings are applied automatically.
🗑️ Use /team-shinchan:forget to remove outdated ones.
```

**Filter by tier** (`/memories --tier preference`): Show only entries matching the specified tier.

**Filtered view** (`/memories pattern`):

```
📚 [Memories] Showing: patterns

• Early returns for validation [high]
  Context: Learned from UserService refactor

• Repository pattern for data access [medium]
  Context: Applied during database migration

Found 2 patterns.
```

**Search view** (`/memories search auth`):

```
📚 [Memories] Search: "auth"

1. [decision] JWT with refresh token rotation
   Tags: #auth #security #jwt

2. [pattern] Auth middleware pattern
   Tags: #auth #middleware

Found 2 results.
```

## Memory Categories

| Category | Description | Icon |
|----------|-------------|------|
| `preference` | User preferences | 💜 |
| `pattern` | Reusable code patterns | 🔷 |
| `convention` | Project conventions | 📏 |
| `mistake` | Errors to avoid | ⚠️ |
| `decision` | Architecture decisions | 🏗️ |
| `insight` | General insights | 💡 |

## Important

- Learnings are stored in `.shinchan-docs/learnings.md`
- Automatically loaded at session start
- Higher confidence learnings are prioritized
- Old learnings can be removed with `/forget`
