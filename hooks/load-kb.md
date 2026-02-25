---
name: load-kb
description: Load knowledge base, learnings, and detect interrupted workflows at session start
event: SessionStart
---

# Load Knowledge Base Hook

At session start, load KB summary, past learnings, and detect any interrupted workflows.

## Process

### 1. Load KB Summary

1. **Check**: If `.shinchan-docs/kb-summary.md` exists, read it. If not, skip silently.
2. **Parse**: Extract pattern count and decision count from content.
3. **Display**:

```
📚 [Team-Shinchan] Knowledge Base loaded ({N} patterns, {M} decisions)
```

### 2. Load Learnings

1. **Check**: If `.shinchan-docs/learnings.md` exists, read it. If not, skip silently.
2. **Load**: Extract last 20 learnings (most recent first, high-confidence prioritized).
3. **Display** (max 5 key items):

```
📚 [Team-Shinchan] Loaded {N} learnings from memory
• [pattern] {most relevant pattern}
• [preference] {most relevant preference}
• [convention] {most relevant convention}
💡 Applying these learnings to this session.
```

### 3. Detect Interrupted Workflows

1. **Scan**: Check `.shinchan-docs/*/WORKFLOW_STATE.yaml` files.
2. **Filter**: Find workflows with `status: active`.
3. **Display** (if found):

```
⚠️ [Team-Shinchan] Interrupted workflow detected!
📁 {doc_id}: Stage {stage}, Phase {phase}
⏰ Last activity: {updated timestamp}
▶️ Resume with: /team-shinchan:resume {doc_id}
```

4. **Silent**: If no interrupted workflows found, skip silently.

### 4. Regression Alert

1. **Check**: If `.shinchan-docs/eval-history.jsonl` exists, scan for regressions.
2. **Quick scan**: Read the file, group records by agent. For each agent with 5+ evaluations, compute a moving average (last 5) for each dimension. Flag if the latest score drops 1+ points below that average.
3. **Display** (if regression found):

```
!! [Team-Shinchan] Performance regression detected:
   Agent: {agent} — {dimension} dropped to {score} (avg: {avg})
   Run /team-shinchan:eval --agent {agent} for details.
```

4. **Silent**: If no eval history or no regressions, skip silently.

## Execution Order

1. KB Summary (first)
2. Learnings (second)
3. Regression Alert (third - warns about declining agents)
4. Interrupted Workflows (last - highest priority alert)

## Apply Rules

During the session, actively apply loaded knowledge:

- **KB Patterns**: Reference past architectural decisions in similar situations
- **Learnings**: Avoid known mistakes, follow discovered patterns
- **Preferences**: Respect user coding style and conventions
- **Conventions**: Apply project-specific standards consistently

## Graceful Degradation

- All files (kb-summary.md, learnings.md, WORKFLOW_STATE.yaml) are optional
- Each step is independent - failure in one step doesn't block others
- No errors if files don't exist - session starts normally
- Silent fallback for missing data

## Examples

### Full Session Start (All Available)

```
📚 [Team-Shinchan] Knowledge Base loaded (12 patterns, 8 decisions)
📚 [Team-Shinchan] Loaded 18 learnings from memory
• [pattern] Use Task tool for all agent invocations
• [preference] Prefer opus for complex analysis tasks
• [convention] Always create REQUESTS.md before execution
• [pattern] Run Action Kamen review after code changes
• [preference] Keep functions under 50 lines
💡 Applying these learnings to this session.
⚠️ [Team-Shinchan] Interrupted workflow detected!
📁 feature-auth-001: Stage execution, Phase 2
⏰ Last activity: 2026-02-07 15:30:42
▶️ Resume with: /team-shinchan:resume feature-auth-001
```

### Partial Session Start (Only Learnings)

```
📚 [Team-Shinchan] Loaded 5 learnings from memory
• [pattern] Always delegate code writing to Bo
• [convention] Use snake_case for Python files
💡 Applying these learnings to this session.
```

### Minimal Session Start (No Data)

(Silent - session starts normally with no output)
