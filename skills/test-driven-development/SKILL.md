---
name: team-shinchan:test-driven-development
description: Use when writing new code or fixing bugs during Stage 3 execution. Enforces RED-GREEN-REFACTOR cycle.
user-invocable: false
---

# TDD Enforcement: RED-GREEN-REFACTOR

## The Iron Law

**No production code without a failing test first.**

Every line of production code must be justified by a test that failed without it. No exceptions unless explicitly approved by a human.

## The Cycle

### 1. RED -- Write a Failing Test

Write a test for the behavior you need. Run it. **It MUST fail.** If it passes, your test is wrong or the behavior already exists.

```
verify-RED: Run test → confirm FAIL
If test passes → STOP. Investigate why.
```

### 2. GREEN -- Write Minimal Code

Write the **minimum** production code to make the test pass. Nothing more.

```
verify-GREEN: Run test → confirm PASS
If test fails → fix production code (not the test)
```

### 3. REFACTOR -- Clean Up

Improve code structure while keeping tests green. Run tests after every change.

## Rationalization Table

Do NOT skip TDD. Every excuse has a counter:

| Excuse | Counter |
|--------|---------|
| "It's too simple to test" | Simple code has simple tests. Write it in 30 seconds. |
| "I'll add tests after" | You won't. And if you do, they'll test your implementation, not your intent. |
| "This is just a config change" | Config changes break things. Write a test that loads the config. |
| "Tests will slow me down" | Debugging without tests is slower. TDD prevents 80% of debugging. |
| "I need to prototype first" | Prototypes become production. Start with a test or get explicit human approval to skip. |
| "The existing code has no tests" | Add a test for the behavior you're changing. Don't perpetuate the gap. |
| "It's a one-line fix" | One-line fixes cause production outages. A one-line test prevents them. |

## Testing Anti-Patterns

- **Shotgun debugging**: Trying random fixes without understanding the failure. Write a failing test first.
- **Test-after rationalization**: "I'll test it later" is never later. Test first or never.
- **Mocking everything**: If you mock the world, you test nothing. Mock boundaries, not internals.
- **Testing implementation details**: Test behavior (what), not implementation (how). Tests should survive refactoring.

## Exceptions

TDD may be skipped ONLY with **explicit human approval** for:
- Throwaway prototypes (marked as such, with a plan to rewrite with TDD)
- Pure documentation or configuration with no behavioral impact

If in doubt, write the test. It takes less time than debating whether to skip it.
