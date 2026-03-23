---
name: team-shinchan:verification-before-completion
description: Use when claiming a task is complete, before commits, or before PR creation.
user-invocable: false
---

# Verification-Before-Completion Gate

Never claim a task is complete without running a verification command and reading its output. "I believe it works" is not evidence.

## Verification Checkpoints

You MUST verify at each of these triggers:

1. **Before commits** -- run tests/linter, confirm pass
2. **Before PR creation** -- run full validation suite, confirm zero errors
3. **Before task completion** -- run the specific success criteria commands from the task plan
4. **Before moving to next task** -- confirm current task's tests still pass after any late edits

## Required Evidence

Every completion claim must include:

- **Command**: The exact command you ran (copy-paste, not paraphrased)
- **Output**: The actual output (or relevant excerpt for long output)
- **Verdict**: PASS or FAIL based on the output

If you cannot provide all three, you have NOT verified. Go back and run the command.

## Red Flags List

If your completion report contains ANY of these phrases, you have NOT verified -- STOP and actually run a command:

| Red Flag Phrase | What To Do Instead |
|-----------------|--------------------|
| "should work" | Run the test and show it passes |
| "probably fine" | Run the linter/build and show zero errors |
| "seems to" | Read the actual output and report what it says |
| "looks correct" | Run a validator or test that proves correctness |
| "I believe" | Replace belief with evidence -- run a command |
| "likely" | Remove doubt -- execute and observe |
| "I think" | Verify instead of thinking |
| "no issues expected" | Prove it -- run the check |

## Verification Template

Use this format in your completion report:

```
### Verification
- **Command**: `node tests/validate/index.js`
- **Expected**: All validators pass, 0 errors
- **Actual**: 23 validators passed, 0 errors, 0 warnings
- **Verdict**: PASS
```

If the verdict is FAIL, fix the issue before claiming completion. Do not report a task as done with a FAIL verdict.
