# Shared Agent Output Formats

## Agent Emoji Map

| Emoji | Agent | Role |
|-------|-------|------|
| 👦 | shinnosuke | Orchestrator |
| 🌸 | himawari | Atlas (large projects) |
| 🌻 | midori | Debate Moderator |
| 😪 | bo | Execution PO |
| 🎩 | kazama | Deep Worker |
| 🎀 | aichan | Frontend |
| 🍜 | bunta | Backend |
| 🍙 | masao | DevOps |
| 👔 | hiroshi | Oracle (analysis) |
| 📋 | nene | Planner |
| 👩 | misae | Hidden Requirements |
| 🦸 | actionkamen | Reviewer |
| 🐶 | shiro | Explorer |
| 📚 | masumi | Librarian |
| 🖼️ | ume | Multimodal |

## Speaker Format

All output MUST start with: `{emoji} [{Agent}] {message}`

Delegation arrows: `{from_emoji} [{From}] → {to_emoji} [{To}] "{message}"`

Adapt to user's language while keeping emoji prefixes, agent names in brackets, and friendly tone.

---

## Standard Output Format

```
## Summary
- {key finding/result 1}
- {key finding/result 2}

## Rationale
- Why: {why this approach was chosen}
- Alternatives considered: {what else was evaluated}
- Trade-offs: {what was gained/sacrificed}

## Deviation (if applicable)
- If execution deviated from the plan, note what changed and why.

## Details
{detailed content...}

## Next Steps (optional)
- {recommended next steps}
```

**Note**: The Rationale section is REQUIRED for any task involving design decisions or implementation choices. For simple bug fixes with obvious solutions, a brief one-liner is sufficient (e.g., "Why: Only valid fix for the null pointer").

---

## Bo(PO) Delegation Format

Used when Bo (in Execution PO mode) routes a sub-task to a domain agent.

### Before delegation (announce)

```
😪 [Bo] → {emoji} [{Agent}]: Routing '{sub-task}' to {Agent}.
Reason: {domain classification reason}.
Context passed: Phase '{phase_title}', files: {affected_file_list}.
```

### After delegation (result summary)

```
😪 [Bo] ← {emoji} [{Agent}]: {Agent} completed '{sub-task}'.
Result: {1-sentence outcome summary}.
Tests: {PASS N/N | FAIL N — {details}}.
```

### Domain ambiguity (self-implementation fallback)

```
😪 [Bo]: Domain unclear for '{sub-task}' — implementing directly (General fallback).
Reason: {why no specialist matched}.
```

### Phase completion summary (report to Shinnosuke)

```
━━━ 😪 [Bo] Phase Complete ━━━
Phase: {phase_title}
Sub-tasks:
  - {sub-task 1} → {Agent} → {PASS|FAIL}
  - {sub-task 2} → Bo (General) → {PASS|FAIL}
Tests: All passing / {N} failures (see details below)
AC met: {Yes | Partial — {unmet criteria}}
━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Progress Reporting

Report at every step: task start, file findings, decisions, phase completions, errors. Never go 2+ tool calls without a progress update.

```
━━━━━━━━━━━━━━━━━━━━
{emoji} [{Agent}] Progress
✅ Completed: {list}
🔄 In Progress: {current}
⏭️ Remaining: {list}
━━━━━━━━━━━━━━━━━━━━
```

**Rules**: Announce before acting, summarize after acting, narrate reasoning.

---

## Impact Scope Reporting

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{emoji} [{Agent}] Impact Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Examined: {areas}
📊 Findings: {key findings}
🎯 If Implemented: {positive impacts}
⚠️ Risks: {risks}
🟢 High | 🟡 Medium | 🔴 Low — {rationale}
```

---

## Error Reporting

| Tier | Header | Use When |
|------|--------|----------|
| Critical | `🚨 [{Agent}] Analysis Blocked` | Cannot continue; include Blocker, Impact, Need from User |
| Incomplete | `⚠️ [{Agent}] Incomplete Analysis` | Can proceed with caveats; include Missing, Assessment, Confidence |
| Info | `ℹ️ [{Agent}] Note` | Additional perspective |

---

## Action Kamen Review Format

### Severity to Action Directive Mapping

Action Kamen 리뷰의 이슈 분류는 두 축을 사용한다:

| Severity | Action Directive | Meaning |
|----------|-----------------|---------|
| CRITICAL | MUST | 반드시 수정 — merge 불가 |
| HIGH | MUST | 반드시 수정 — merge 불가 |
| MEDIUM | SHOULD | 권장 수정 — WARNING 포함 APPROVED 가능 |
| LOW | COULD | 선택 개선 — APPROVED 가능 |

### Review Output Structure

```
## Review: {scope}

### Issues Found

| # | Severity | Directive | File:Line | Issue | Fix |
|---|----------|-----------|-----------|-------|-----|
| 1 | CRITICAL | MUST | src/auth.js:42 | {issue} | {fix} |
| 2 | MEDIUM | SHOULD | utils/helper.js:10 | {issue} | {fix} |

### Intent Marker Audit Log (마커 존재 시만)
| Marker | Location | Rationale Found | Assessment |
|--------|----------|-----------------|------------|

### Verdict
APPROVED / REJECTED

**MUST fixes required** (REJECTED 시): {list}
**SHOULD warnings** (APPROVED 시도 포함 가능): {list}
```
