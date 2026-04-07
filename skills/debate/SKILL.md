---
name: team-shinchan:debate
description: Use when you want multiple agents to debate and find optimal solutions.
user-invocable: false
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

## Competitive Code Mode Detection

**Triggers**: args contains any of: "경쟁 구현", "competitive", "best of N", "best of", "parallel implementation", "competitive-code"

If competitive-code trigger detected:
1. Parse: N = number of implementations (default 2, max 3). Extract from "best of N" pattern or use default.
2. Extract implementation request = args after trigger keyword removal.
3. Proceed to Step 1-CC (Competitive Code routing).

## Step 1-CC: Invoke Midori for Competitive Code

```typescript
Task(
  subagent_type="team-shinchan:midori",
  model="sonnet",
  prompt=`Competitive Code mode invoked.

## Request
${implementation_request}

## Parameters
- N implementations: ${N} (max 3)
- Mode: competitive-code

## Instructions
Run the competitive-code workflow:
1. ToolSearch for EnterWorktree schema before starting (HR-3)
2. Set .current-agent to midori before parallel Task calls (HR-1)
3. Dispatch N Bo subagents each in an isolated worktree via EnterWorktree
4. Collect implementation reports from all Bo agents
5. Dispatch Action Kamen to judge all implementations using rubric scoring (FR-2.1)
6. Announce winner and score comparison table
7. Merge winner worktree to main, ExitWorktree all others
8. Guarantee cleanup on error (NFR-3)
9. Record decision in .shinchan-docs/debate-decisions.md

See agents/midori.md ## Competitive Code Workflow for full procedure.`
)
```

## Step 2-CC: Deliver Competitive Code Results

After Midori returns:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Competitive Code Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Request: {implementation_request}
👥 Implementations: {N}
🥇 Winner: Bo-{N} | Score: {score}/15
📊 Score Comparison: [all Bo scores]
✅ Merged: winner changes applied
🧹 Cleanup: all worktrees removed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3-CC: Confirm

Ask user if they accept the winner's implementation. If yes: proceed to completion. If no: offer to run competitive-code again or accept a specific implementation.

**STOP. Steps 1-CC through 3-CC handle the full competitive-code workflow. Do NOT proceed to Step 1 (standard debate) when competitive-code mode was detected.**

---

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

- After decision recording, Midori archives the full debate transcript to `.shinchan-docs/debates/DECISION-{NNN}.json` for traceability

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
