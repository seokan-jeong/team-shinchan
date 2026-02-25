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

### 0. Check Session Summary (if available)

Read `.shinchan-docs/{doc_id}/SESSION_SUMMARY.md` or `.shinchan-docs/SESSION_SUMMARY.md` for quantitative data. Use agent counts, file changes, and duration to ground your retrospective in facts.

If a SESSION_SUMMARY.md exists, reference its metrics (duration, agent invocations, files changed, delegations) in your analysis below. If it does not exist, proceed without it.

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

### 5. Agent Evaluation

After completing the retrospective, rate each agent that was used in this session.

**For each agent used**, score on 4 dimensions (1-5 scale):

| Dimension | Description | Scale |
|-----------|-------------|-------|
| `correctness` | Code/result accuracy | 1=wrong, 5=flawless |
| `efficiency` | Turns used vs outcome achieved | 1=wasteful, 5=optimal |
| `compliance` | Rules/principles adherence rate | 1=ignored, 5=perfect |
| `quality` | Code quality (review pass rate) | 1=poor, 5=excellent |

**Process:**

1. Identify all agents invoked in this session (from Session Summary or observation)
2. For each agent, create an evaluation record
3. Append each record as a single JSONL line to `.shinchan-docs/eval-history.jsonl`

**JSONL format** (one line per agent, appended to file):
```
{"ts":"2026-02-25T10:30:00.000Z","agent":"bo","doc_id":"main-031","phase":1,"scores":{"correctness":4,"efficiency":5,"compliance":4,"quality":4},"notes":"Implemented all 6 sub-tasks accurately"}
```

4. Create the file if it does not exist
5. Use the current `doc_id` from the active workflow, or `"session"` if no workflow is active

**Output:**
```
[Auto-Retrospective] Agent evaluations recorded:
  - bo: correctness=4, efficiency=5, compliance=4, quality=4
  - aichan: correctness=4, efficiency=4, compliance=5, quality=4
Saved to: .shinchan-docs/eval-history.jsonl
```

## Rules

- Never skip after meaningful tasks
- Be specific, not vague
- One clear insight per entry
- Include enough context for future reference
- Always record agent evaluations when agents were used
