---
name: auto-retrospective
description: Automatically reflect and learn after task completion
event: Stop
---

# Auto-Retrospective Hook

**After EVERY significant task completion, automatically reflect and save learnings.**

## When to Trigger

- Task involved code changes (not just questions)
- Task took more than 2 agent delegations
- Task involved debugging or problem-solving

## Reflection Process

### Step 1: Analyze What Happened

```
🔄 [Auto-Retrospective] Analyzing completed task...
```

Ask yourself:
1. What was the task?
2. What approach worked?
3. What mistakes were made?
4. What patterns were discovered?
5. What would I do differently?

### Step 2: Extract Learnings

Categorize findings:

| Category | What to Extract |
|----------|-----------------|
| `pattern` | Reusable code patterns, architectural approaches |
| `mistake` | Errors made and how to avoid them |
| `preference` | User preferences discovered |
| `convention` | Project conventions found |
| `insight` | Technical insights gained |

### Step 3: Save to Memory File

**File location**: `.team-shinchan/learnings.md`

**Format for each learning**:

```markdown
## [YYYY-MM-DD HH:MM] Category: Title

**Context**: Brief description of when this was learned
**Learning**: The actual insight or pattern
**Confidence**: high/medium/low
**Tags**: #tag1 #tag2

---
```

### Step 4: Output Summary

```
🧠 [Auto-Retrospective] Learnings saved:
   - [pattern] Discovered: {brief description}
   - [mistake] Avoided: {brief description}

📁 Saved to: .team-shinchan/learnings.md
```

## Example

After fixing a bug:

```markdown
## [2024-02-03 15:30] mistake: Null check before array access

**Context**: Fixed crash in UserService.getUsers()
**Learning**: Always check if array exists before using .map() or .filter()
**Confidence**: high
**Tags**: #typescript #null-safety #arrays

---
```

## Rules

1. **DO NOT skip** - Always reflect after meaningful tasks
2. **Be specific** - Vague learnings are useless
3. **Be concise** - One clear insight per entry
4. **Include context** - Future you needs to understand when this applies
5. **Create file if missing** - Initialize `.team-shinchan/learnings.md` if it doesn't exist
