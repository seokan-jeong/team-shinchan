---
name: team-shinchan:research
description: Research and documentation with Masumi (Librarian). Use for web research, documentation lookup, and knowledge gathering.
user-invocable: true
---

# Research Skill

Invokes **Masumi (Librarian)** for standalone research and documentation tasks.

## When to Use

- Web research on technologies, libraries, or APIs
- Documentation lookup and summarization
- Knowledge gathering before implementation
- External reference collection

## Execution

```typescript
Task(
  subagent_type="team-shinchan:masumi",
  model="sonnet",
  prompt="Research task: {args}

Conduct thorough research and provide:
1. Key findings with sources
2. Relevant documentation links
3. Best practices and recommendations
4. Potential concerns or caveats"
)
```

## Output

Masumi will return a structured research report with findings, sources, and recommendations.
