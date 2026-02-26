---
name: team-shinchan:vision
description: Image and PDF analysis with Ume. Used for "analyze this image", "read this PDF", "screenshot", "mockup" requests.
user-invocable: false
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What image or PDF would you like me to analyze? (provide file path or describe)"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Execute Task

**Do not read further. Execute this Task NOW:**

```typescript
Task(
  subagent_type="team-shinchan:ume",
  model="sonnet",
  prompt=`/team-shinchan:vision has been invoked.

## Visual Content Analysis Request

Analyze visual content including:

| Type | Capabilities |
|------|-------------|
| Screenshots | UI analysis, layout, components |
| Mockups | Design patterns, specifications |
| Diagrams | Architecture, flowcharts, ERDs |
| PDFs | Document extraction, summaries |
| Images | General visual content analysis |

## Analysis Requirements

- Describe visual elements in detail
- Identify UI components and patterns
- Extract text content where applicable
- Note design patterns used
- Connect with codebase (search for related files)

## Output Format

- Visual element breakdown
- Component identification
- Text extraction (if any)
- Related code references (if found)
- Actionable insights

User request: ${args || '(Please describe what to analyze)'}
`
)
```

**STOP HERE. The above Task handles everything.**
