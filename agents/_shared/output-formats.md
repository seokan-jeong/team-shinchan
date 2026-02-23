# Shared Agent Output Formats

## Agent Emoji Map

| Emoji | Agent | Role |
|-------|-------|------|
| 👦 | shinnosuke | Orchestrator |
| 🌸 | himawari | Atlas (large projects) |
| 🌻 | midori | Debate Moderator |
| 😪 | bo | Code Executor |
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
