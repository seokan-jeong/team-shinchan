---
name: team-shinchan:learn
description: Manually add new learnings (patterns, preferences, rules) to memory. Use when you want to remember specific information.
user-invocable: true
---

# Learn Skill

**Manually teach Team-Shinchan something to remember.**

## Usage

```bash
/team-shinchan:learn "Always use TypeScript strict mode in this project"
/team-shinchan:learn "User prefers functional components over class components"
/team-shinchan:learn "This project uses pnpm, not npm"
```

## Process

### Step 1: Receive Learning Input

User provides something to remember.

### Step 2: Auto-Categorize

| Keywords in Input | Category |
|-------------------|----------|
| prefer, like, want | `preference` |
| pattern, approach, way | `pattern` |
| always, never, rule | `convention` |
| error, mistake, bug, avoid | `mistake` |
| decided, architecture, design | `decision` |
| use, using, project uses | `convention` |
| other | `insight` |

### Step 3: Save to Learning File

**File**: `.team-shinchan/learnings.md`

**Create file if it doesn't exist**, then append:

```markdown
## [YYYY-MM-DD HH:MM] {category}: {title}

**Context**: Manually taught by user
**Learning**: {full learning content}
**Confidence**: high
**Tags**: #{auto-generated tags}

---
```

### Step 4: Confirm

```
🧠 [Learn] Saved to memory:

Category: {category}
Learning: "{content}"
Confidence: high

📁 Location: .team-shinchan/learnings.md
💡 This will be applied in future sessions.
```

## Examples

**Input**: `/learn "Use Zustand for state management, not Redux"`

**Output**:
```
🧠 [Learn] Saved to memory:

Category: preference
Learning: "Use Zustand for state management, not Redux"
Confidence: high

📁 Location: .team-shinchan/learnings.md
💡 This will be applied in future sessions.
```

**Saved to file**:
```markdown
## [2024-02-03 16:00] preference: Use Zustand over Redux

**Context**: Manually taught by user
**Learning**: Use Zustand for state management, not Redux
**Confidence**: high
**Tags**: #state-management #zustand #redux #preference

---
```

## Important

- Learnings are **project-specific** (saved in `.team-shinchan/`)
- High confidence because user explicitly taught it
- Will be loaded at every session start
- Can be removed with `/team-shinchan:forget`
