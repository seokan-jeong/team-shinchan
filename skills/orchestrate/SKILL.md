---
name: team-shinchan:orchestrate
description: Explicitly invoke Shinnosuke to orchestrate through the integrated workflow. Creates documentation folder and guides through requirements → planning → execution → completion stages.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

```
If args is empty or only whitespace:
  Ask user: "What task would you like to orchestrate?"
  STOP and wait for user response

If args length > 2000 characters:
  Truncate to 2000 characters
  Warn user: "Request was truncated to 2000 characters"
```

## Step 2: Redirect to /team-shinchan:start

**This skill is fully merged into `/team-shinchan:start`. Execute the start skill with identical behavior.**

**Output immediately:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👦 [Shinnosuke] Orchestrating your task~ 🎯
   → Redirecting to /start workflow...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Then execute the EXACT same steps as /team-shinchan:start:**

1. Step 0: Pause Active Workflows
2. Step 1: Setup (Folder + State)
3. Step 2A-pre: Visual Input Detection (if applicable)
4. Step 2A: Nene direct invocation for Stage 1
5. Step 2A-post: Misae hidden requirements analysis
6. Step 2B: Shinnosuke for Stage 2-4

**Follow every step in skills/start/SKILL.md exactly. Do NOT invoke Shinnosuke directly for Stage 1.**

User request: {args}
