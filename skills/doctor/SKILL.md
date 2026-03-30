---
name: team-shinchan:doctor
description: Use when you need to diagnose the health of a team-shinchan project setup. Runs 7 deterministic checks (workflow state, hooks config, core scripts, runtime files, test directory) and reports PASS/WARN/FAIL per check with remediation hints.
user-invocable: true
---

# EXECUTE IMMEDIATELY

## Step 1: Validate Input

No required arguments. If args are provided, they are ignored.

## Step 2: Run Diagnostic

Run the doctor script from the project root:

```
node src/doctor.js
```

Report the output verbatim to the user. Do not summarize, paraphrase, or omit any lines.

## Step 3: Act on Results

- If summary shows `ERRORS`: flag the FAIL items to the user and suggest running the listed remediation commands.
- If summary shows `WARNINGS`: note the WARN items but indicate the workflow can still proceed.
- If summary shows `OK`: confirm that the project setup looks healthy.

**STOP HERE. No further action needed.**
