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

3. **Ontology Reminder** (if `.shinchan-docs/ontology/ontology.json` exists):
   - If a NEW file was created: Consider if it should be added as a Component entity
   - If an EXISTING file was significantly refactored (renamed exports, changed class structure): The ontology may need updating
   - Display: `🔬 [Ontology] {file} modified — ontology may need incremental update at next session start`
   - Do NOT auto-update the ontology during editing — the SessionStart hook handles this
