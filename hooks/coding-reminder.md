---
name: coding-reminder
description: Remind coding principles before code modifications
event: PreToolUse
---

Before this change, verify:
1. Assumptions stated? Scope clear?
2. Minimum code needed? No unnecessary abstractions?
3. ONLY changing what was requested? No adjacent "improvements"?
4. Success criteria defined? Verification plan?

## Rules Reference
Before modifying code, also review applicable rules:
- Coding rules: `${CLAUDE_PLUGIN_ROOT}/rules/coding.md`
- Security rules: `${CLAUDE_PLUGIN_ROOT}/rules/security.md`
- For git operations, also review: `${CLAUDE_PLUGIN_ROOT}/rules/git.md`
