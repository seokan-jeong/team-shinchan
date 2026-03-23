---
name: team-shinchan:design-review
description: Use when you need to compare design mockups against implementation for UI fidelity.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "Please provide the design mockup image path and the implementation file/directory path.
  Example: /team-shinchan:design-review './mockup.png' './src/components/Login.tsx'"
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
  prompt=`/team-shinchan:design-review has been invoked.

## Design-Implementation Comparison Request

You are performing a **Design Fidelity Review** — comparing a design mockup against its implementation to find mismatches.

### Workflow

1. **Analyze the design mockup image**: Read the image file provided. Extract a full Design Spec using your Design Spec Extraction workflow (Components, Colors, Typography, Layout, Interactions with confidence levels).

2. **Analyze the implementation**: Read the implementation source code (or screenshot if provided). Identify the implemented components, styles, layout structure, and interaction handlers.

3. **Compare and report mismatches**: For each Design Spec category, compare against the implementation and report:

### Output Format

\`\`\`markdown
## Design Fidelity Report

### Design Spec (from mockup)
{Full Design Spec output}

### Implementation Analysis
- Files analyzed: {list}
- Framework detected: {React/Vue/Angular/HTML/etc.}
- Components found: {list}

### Comparison Results

| Category | Design Spec | Implementation | Status |
|----------|-------------|----------------|--------|
| Components | {from spec} | {from code} | MATCH / MISMATCH / PARTIAL |
| Colors | {from spec} | {from code} | MATCH / MISMATCH / PARTIAL |
| Typography | {from spec} | {from code} | MATCH / MISMATCH / PARTIAL |
| Layout | {from spec} | {from code} | MATCH / MISMATCH / PARTIAL |
| Interactions | {from spec} | {from code} | MATCH / MISMATCH / PARTIAL |

### Mismatches Found
1. **{Category}**: Expected {spec value} but found {implementation value}
   - File: {path:line}
   - Suggested fix: {actionable suggestion}

### Summary
- Total categories: 5
- Matches: {N}
- Mismatches: {N}
- Partial: {N}
- Overall fidelity: {FAITHFUL / MINOR_DEVIATIONS / NEEDS_REVISION}
\`\`\`

### Important Notes
- For low-confidence Design Spec values, note them as "approximate — verify with designer"
- Search the codebase with Grep to find related component files
- If only a design image is provided (no implementation path), just produce the Design Spec
- If only implementation code is provided (no design image), report what you can analyze

User request: ${args || '(Please provide design mockup and implementation paths)'}
`
)
```

**STOP HERE. The above Task handles everything.**
