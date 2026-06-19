---
name: team-shinchan:skill-feedback
description: Use when the user wants to review accumulated skill feedback, verdict trends, or improvement candidates collected during Stage 4 retrospectives. Trigger on "show skill feedback", "스킬 피드백 보여줘", or finding which skills need /writing-skills work.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Steps

1. Read the **global** ledger `~/.shinchan/skill-feedback.jsonl` — skill feedback is global because team-shinchan SKILLS are global plugin code, so it aggregates ACROSS every project. Also read the legacy per-project `.shinchan-docs/skill-feedback.jsonl` if it exists (pre-v4.50 data) and merge the entries.
2. If neither exists, report "No skill feedback collected yet. Feedback is gathered during Stage 4 retrospectives."
3. Group entries by skill name (across projects).
4. For each skill, show:
   - Total invocations assessed + which projects contributed (from each entry's `project` field)
   - Verdict distribution (yes/partial/no)
   - Top suggestions (sorted by recency)
5. Highlight skills with 3+ negative verdicts (counted across all projects) as candidates for `/team-shinchan:writing-skills`
6. Output as a formatted table. If the user asks about one project only, filter entries by the `project` field first.
