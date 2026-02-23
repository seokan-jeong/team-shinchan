---
name: auto-retrospective
description: Automatically reflect and learn after task completion
event: Stop
---

# Auto-Retrospective

**After significant task completion, reflect and save learnings.**

## When to Trigger

- Task involved code changes (not just questions)
- Task took 2+ agent delegations
- Task involved debugging or problem-solving

## Process

### 1. Analyze

Answer briefly: What was the task? What worked? What mistakes? What patterns? What would you change?

### 2. Categorize

| Category | Extract |
|----------|---------|
| `pattern` | Reusable code/architecture approaches |
| `mistake` | Errors made and prevention |
| `preference` | User preferences discovered |
| `convention` | Project conventions found |
| `insight` | Technical insights gained |

### 3. Save to `.shinchan-docs/learnings.md`

Create file if missing with header: `# Team-Shinchan Learnings`

**Format per entry:**
```markdown
### [{category}] {title}
- **Date**: {YYYY-MM-DD}
- **Source**: {DOC_ID}
- **Confidence**: {high|medium|low}
- **Tags**: {comma-separated}
- **Insight**: {description}

---
```

### 4. Output Summary

```
[Auto-Retrospective] Learnings saved:
  - [{category}] {brief description}
Saved to: .shinchan-docs/learnings.md
```

## Deduplication

Before appending:
1. Read existing learnings.md
2. If similar content exists (same tags + similar title) → update confidence, skip duplicate
3. If no duplicate → append

## Rules

- Never skip after meaningful tasks
- Be specific, not vague
- One clear insight per entry
- Include enough context for future reference
