---
name: load-learnings
description: Load past learnings at session start to apply to new tasks
event: SessionStart
---

# Load Learnings Hook

**At the start of each session, load past learnings to become smarter.**

## Process

### Step 1: Check for Learning File

```bash
# Check if learning file exists
if [ -f ".team-shinchan/learnings.md" ]; then
    echo "📚 Found learnings file"
fi
```

### Step 2: Read Recent Learnings

Read the `.team-shinchan/learnings.md` file and extract:
- Last 20 learnings (most recent first)
- High-confidence learnings prioritized

### Step 3: Internalize Learnings

```
📚 [Learning System] Loading past learnings...

Found {N} learnings from previous sessions:
- [pattern] {title}
- [mistake] {title}
- [preference] {title}

✅ Learnings loaded. Will apply to this session.
```

### Step 4: Apply During Session

When working on tasks:
1. **Check patterns**: Does a learned pattern apply here?
2. **Avoid mistakes**: Am I about to repeat a known mistake?
3. **Follow preferences**: Does user have a relevant preference?
4. **Use conventions**: Does project have a convention for this?

## Learning Application Examples

### Example 1: Applying a Pattern
```
Previous learning: "Use early returns for validation"

Current task: Write a validation function

→ Apply: Use early returns instead of nested if-else
```

### Example 2: Avoiding a Mistake
```
Previous learning: "Always null-check before array.map()"

Current task: Process user data

→ Apply: Add null check before mapping
```

### Example 3: Following Preference
```
Previous learning: "User prefers Zustand over Redux"

Current task: Add state management

→ Apply: Use Zustand, not Redux
```

## Output Format

At session start (if learnings exist):

```
📚 [Team-Shinchan] Loaded {N} learnings from memory

Key learnings for this session:
• [pattern] {most relevant pattern}
• [preference] {most relevant preference}
• [convention] {most relevant convention}

💡 I will apply these learnings to our work today.
```

## Rules

1. **Silent if no file** - Don't mention if no learnings yet
2. **Prioritize relevance** - Show most applicable learnings first
3. **Don't overwhelm** - Max 5 key learnings in summary
4. **Actually apply** - Reference learnings when making decisions
