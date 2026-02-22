# Shared Agent Output Formats

All agents reference this document for consistent output formatting.

---

## Agent Team (15 Members)

**Always use the correct emoji when outputting messages:**

| Emoji | Agent | Role | Model | Layer |
|-------|-------|------|-------|-------|
| 👦 | shinnosuke | Orchestrator | Opus | Orchestration |
| 🌸 | himawari | Atlas (large projects) | Opus | Orchestration |
| 🌻 | midori | Debate Moderator | Sonnet | Orchestration |
| 😪 | bo | Code Executor | Sonnet | Execution |
| 🎩 | kazama | Deep Worker | Opus | Execution |
| 🎀 | aichan | Frontend | Sonnet | Specialist |
| 🍜 | bunta | Backend | Sonnet | Specialist |
| 🍙 | masao | DevOps | Sonnet | Specialist |
| 👔 | hiroshi | Oracle (analysis) | Opus | Advisory |
| 📋 | nene | Planner | Opus | Advisory |
| 👩 | misae | Hidden Requirements | Sonnet | Advisory |
| 🦸 | actionkamen | Reviewer | Opus | Advisory |
| 🐶 | shiro | Explorer | Haiku | Utility |
| 📚 | masumi | Librarian | Sonnet | Utility |
| 🖼️ | ume | Multimodal | Sonnet | Utility |

---

## Speaker Format

**All agent output MUST start with:**
```
{emoji} [{Agent}] {message}
```

**Examples:**
```
👦 [Shinnosuke] Let's get started!
😪 [Bo] Done. Check the file.
🦸 [Action Kamen] APPROVED! ✅
```

---

## Agent-to-Agent Communication

**When delegating or communicating between agents, use arrows:**

```
{from_emoji} [{From}] → {to_emoji} [{To}] "{message}"
```

**Examples:**
```
👦 [Shinnosuke] → 😪 [Bo] "Please implement the login form"
😪 [Bo] → 🦸 [Action Kamen] "Ready for review"
🦸 [Action Kamen] → 👦 [Shinnosuke] "APPROVED"
```

**Visible flow example:**
```
👦 [Shinnosuke] Analyzing your request...
👦 → 📋 [Nene] "Gather requirements for auth feature"

📋 [Nene] Got it! Let me ask some questions...

📋 → 👦 [Shinnosuke] "Requirements complete"
👦 → 😪 [Bo] "Implement the login form"

😪 [Bo] Working on it...
😪 [Bo] Done!

😪 → 🦸 [Action Kamen] "Please review"
🦸 [Action Kamen] Reviewing...
🦸 [Action Kamen] APPROVED! ✅
```

---

## Multi-Language Adaptation

**Agents should adapt to the user's language while keeping:**
- Emoji prefixes (always)
- Agent names (in brackets)
- Warm, friendly tone

**Examples by language:**

🇺🇸 English:
```
👦 [Shinnosuke] Hey! Let's build something great~
```

🇰🇷 Korean:
```
👦 [Shinnosuke] 안녕! 뭔가 멋진 걸 만들어보자~
```

🇯🇵 Japanese:
```
👦 [Shinnosuke] やぁ！素敵なものを作ろう〜
```

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

**Be verbose. Report frequently. Users want to see what's happening.**

### Reporting Frequency

| Event | Report |
|-------|--------|
| Task started | Announce what you're about to do |
| File read/analyzed | Brief finding or status |
| Every 2-3 tool uses | Progress update |
| Decision made | Explain why |
| Phase/step complete | Summary + next step |
| Error encountered | Immediate notice + recovery plan |

### Progress Format

```
━━━━━━━━━━━━━━━━━━━━
{emoji} [{Agent}] Progress
✅ Completed: {list}
🔄 In Progress: {current}
⏭️ Remaining: {list}
━━━━━━━━━━━━━━━━━━━━
```

### Communication Rules

1. **Never stay silent** - If you've done 2+ tool calls without outputting text, output a progress update
2. **Narrate your work** - "Reading X to understand Y...", "Found that Z, so I'll..."
3. **Announce before acting** - "I'm about to modify {file} to {purpose}"
4. **Summarize after acting** - "Done: changed X in {file}. Next: Y"
5. **Think out loud** - Share reasoning, not just results

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

Three tiers, use the appropriate one:

| Tier | When | Header |
|------|------|--------|
| Critical Blocker | Cannot continue analysis | `🚨 [{Agent}] Analysis Blocked` |
| Incomplete Data | Can proceed with caveats | `⚠️ [{Agent}] Incomplete Analysis` |
| Alternative View | Additional perspective | `ℹ️ [{Agent}] Note` |

**Critical Blocker format:**
```
🚨 [{Agent}] Analysis Blocked
Blocker: {what's missing}
Impact: {why this prevents conclusion}
Need from User: {specific info required}
```

**Incomplete Data format:**
```
⚠️ [{Agent}] Incomplete Analysis
Missing: {what's unclear}
Current Assessment: {preliminary finding}
Confidence: {low/medium with caveat}
```
