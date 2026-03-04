---
name: team-shinchan:systematic-debugging
description: Use when a test fails, a bug is reported, or unexpected behavior occurs. 4-phase root-cause process.
user-invocable: false
---

# Systematic Debugging

> Never guess. Investigate, analyze, hypothesize, then fix -- one variable at a time.

## Phase 1: Root Cause Investigation

1. **Reproduce the bug** -- get a reliable, repeatable failure before anything else
2. **Read error messages carefully** -- the full stack trace, not just the last line
3. **Check recent changes** -- `git diff` and `git log` for what changed since it last worked
4. **Trace data flow** -- follow the input from entry point to failure point, logging intermediate values

Do NOT attempt any fix until you can answer: "What exactly is failing and where?"

## Phase 2: Pattern Analysis

1. **Find a working example** -- locate similar code in the codebase that works correctly
2. **Compare working vs broken** -- diff the two paths side by side
3. **Identify the delta** -- what is different? Missing argument, wrong type, different order, missing initialization?

The bug is in the delta. If you cannot find the delta, your mental model of the system is wrong -- go back to Phase 1.

## Phase 3: Hypothesis and Testing

1. **State your hypothesis explicitly** before making any change: "I believe X causes Y because Z"
2. **Test ONE variable at a time** -- never change multiple things simultaneously
3. **Predict the outcome** before running the test -- if the result surprises you, your hypothesis is wrong
4. **Log each attempt** -- hypothesis, change made, expected result, actual result

## Phase 4: Implementation

1. **Write a failing test** that captures the bug before fixing it
2. **Apply a single, minimal fix** -- the smallest change that resolves the root cause
3. **Verify the fix** -- the failing test now passes
4. **Verify no regressions** -- run the full test suite, not just the new test

## Escalation Rule

**3+ fixes failed** -- you are likely wrong about the root cause. Stop. Question every assumption you have made. Return to Phase 1 and start the investigation from scratch with fresh eyes.

## Supporting Techniques

| Technique | When to Use | Method |
|-----------|-------------|--------|
| Root-cause tracing (5 Whys) | Symptom is clear but cause is not | Ask "why?" iteratively until you reach the origin |
| Defense-in-depth | Fix found but similar bugs could recur | Apply the fix AND add a guard (assertion, validation, type check) |
| Condition-based waiting | Timing-related failures | Replace arbitrary sleeps with explicit condition checks (poll, event, callback) |

## Anti-Pattern: Shotgun Debugging

Trying random changes hoping something works. Signs you are doing this:

- Changing code without a hypothesis
- Reverting and trying something else without understanding why it failed
- "Maybe this will work" thinking
- Multiple unrelated changes in a single attempt

**If you catch yourself shotgun debugging, STOP immediately and return to Phase 1.**
