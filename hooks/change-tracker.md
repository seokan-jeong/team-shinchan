---
name: change-tracker
description: Remind to track changes after code modifications
event: PostToolUse
---

# Change Tracking Reminder

You just modified a file. Please record this change:

1. **If PROGRESS.md exists** for the current workflow:
   - Add an entry to the "Change Log" section of the current Phase
   - Format: `- [{file}] {what changed} — {why}`

2. **If no active workflow**: Skip this step.

Keep entries concise (1 line per change).
