---
name: team-shinchan:learn
description: Manually add new learnings (patterns, preferences, rules) to memory. Use when you want to remember specific information.
user-invocable: true
---

# Learn Skill

**Teach Team-Shinchan something to remember.**

## Usage

```bash
/team-shinchan:learn "Always use TypeScript strict mode in this project"
/team-shinchan:learn "User prefers functional components over class components"
```

## Process

1. **Auto-Categorize** based on keywords:

| Keywords | Category |
|----------|----------|
| prefer, like, want | `preference` |
| pattern, approach, way | `pattern` |
| always, never, rule, use | `convention` |
| error, mistake, avoid | `mistake` |
| decided, architecture | `decision` |
| other | `insight` |

2. **Append** to `.shinchan-docs/learnings.md` (create if missing):

```markdown
## [YYYY-MM-DD HH:MM] {category}: {title}

**Context**: Manually taught by user
**Learning**: {content}
**Confidence**: high
**Tags**: #{auto-generated tags}

---
```

3. **Confirm**:

```
🧠 [Learn] Saved to memory:
Category: {category}
Learning: "{content}"
📁 Location: .shinchan-docs/learnings.md
```

## Important

- Learnings are **project-specific** (saved in `.shinchan-docs/`)
- High confidence because user explicitly taught it
- Loaded at every session start via `load-kb` hook
- Remove with `/team-shinchan:forget`
