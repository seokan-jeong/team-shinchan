---
name: team-shinchan:skill-feedback
description: View accumulated skill feedback and improvement suggestions
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Steps

1. Read `.shinchan-docs/skill-feedback.jsonl`
2. If file doesn't exist, report "No skill feedback collected yet. Feedback is gathered during Stage 4 retrospectives."
3. Group entries by skill name
4. For each skill, show:
   - Total invocations assessed
   - Verdict distribution (yes/partial/no)
   - Top suggestions (sorted by recency)
5. Highlight skills with 3+ negative verdicts as candidates for `/team-shinchan:writing-skills`
6. Output as a formatted table
