---
name: team-shinchan:debate
description: Specialized agents debate to find optimal solutions. Used for "debate", "pros and cons", "gather opinions" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 0: Validate Input

If args empty: ask user for topic and STOP. If args > 2000 chars: truncate + warn.

**All debates invoke Midori via Task tool.**

## Auto-Trigger Conditions

| Trigger YES | Trigger NO |
|-------------|------------|
| 2+ approaches, architecture change, pattern break, perf vs readability, security, tech stack | Simple CRUD, clear bug fix, user already decided |

On detection: announce "Design decision needed: [situation]", proceed Steps 1-3. Record decision in REQUESTS.md (Stage 1) or PROGRESS.md (Stage 2+).

## Step 1: Invoke Midori

```typescript
Task(subagent_type="team-shinchan:midori", model="sonnet",
  prompt="Debate topic: {topic}\nPanel: {panel list}\nProcedure: Announce, collect opinions (parallel), Hiroshi derives consensus, report decision.")
```

## Step 2: Deliver Results

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate Results
📋 Topic: {topic}
🎤 Opinions: [Agent]: {summary} ...
✅ Decision: {conclusion} | 📝 Rationale: {reasoning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3: Confirm + Finalize

Ask user if they agree. If yes: document and proceed. If no: revise reflecting concerns. **Never proceed without confirmation.**

## Panel Selection

See `agents/midori.md` for full criteria. Quick reference:

| Topic | Panel |
|-------|-------|
| Frontend/UI | Aichan, Hiroshi |
| Backend/API | Bunta, Hiroshi |
| DevOps/Infra | Masao, Hiroshi |
| Architecture | Hiroshi, Nene, Misae |
| Security | Hiroshi, Bunta, Masao |

## Auto-Detection Signals

Keywords: "A or B", "vs", "method1/method2", "schema change", "layer", "structure", "differs from existing pattern", "trade-off", "at the cost of", "auth", "encryption", "permission"
