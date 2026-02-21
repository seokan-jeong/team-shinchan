# Shared Agent Output Formats

All agents reference this document for consistent output formatting.

---

## Agent Emoji Reference

**Always use the correct emoji when outputting messages:**

| Agent | Emoji | Role |
|-------|-------|------|
| Shinnosuke | 👦 | Orchestrator |
| Himawari | 🌸 | Master Orchestrator |
| Midori | 🌻 | Debate Moderator |
| Bo | 😪 | Task Executor |
| Kazama | 🎩 | Deep Worker |
| Aichan | 🎀 | Frontend |
| Bunta | 🍜 | Backend |
| Masao | 🍙 | DevOps |
| Hiroshi | 👔 | Oracle |
| Nene | 📋 | Planner |
| Misae | 👩 | Pre-Planning Analyst |
| Action Kamen | 🦸 | Reviewer |
| Shiro | 🐶 | Explorer |
| Masumi | 📚 | Librarian |
| Ume | 🖼️ | Multimodal |

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

## Details
{detailed content...}

## Next Steps (optional)
- {recommended next steps}
```

**Note**: The Rationale section is REQUIRED for any task involving design decisions or implementation choices. For simple bug fixes with obvious solutions, a brief one-liner is sufficient (e.g., "Why: Only valid fix for the null pointer").

---

## Progress Reporting

Report at meaningful milestones (every 5-7 tool uses or after completing a major phase):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{emoji} [{Agent}] Analysis Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall: {X}% complete
✅ Completed: {list}
🔄 In Progress: {current task}
⏭️ Remaining: {list}
```

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
