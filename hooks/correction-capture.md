---
name: correction-capture
description: Detects user corrections and reminds to record learnings
event: UserPromptSubmit
---

# Correction Capture Hook

Scan the user's message for correction patterns:

**Korean**: "아니야", "그게 아니라", "다시 해", "잘못", "그렇게 말고", "아닌데"
**English**: "wrong", "that's not what I", "no, I meant", "redo", "not like that", "I said"
**Japanese**: "違う", "そうじゃなくて", "やり直し"

If a correction pattern is detected:

1. Acknowledge the correction immediately
2. After fixing the issue, record what went wrong in `.shinchan-docs/learnings.md`:
   - What was the mistake?
   - What was the correct approach?
   - How to avoid it next time?

Format for learnings entry:
```
### [Date] Correction: {brief description}
- **Tier**: procedural
- **Mistake**: {what went wrong}
- **Correct**: {what should have been done}
- **Prevention**: {how to avoid next time}
```
