# Shared Testing Protocol

All execution agents (Bo, Aichan, Bunta, Masao, Kazama) follow this testing protocol.

---

## Before Implementation

1. **Run existing tests** to establish baseline
2. Note which tests pass/fail before changes
3. If baseline tests fail, report before proceeding

## During Implementation

1. Write unit tests for new public functions/endpoints
2. Follow existing test patterns in the project
3. Use the project's established testing framework

## After Implementation

1. Run ALL existing tests to verify no regressions
2. Run new tests to verify implementation
3. Fix any failures before reporting completion

## Reporting

Include in completion summary:

```
## Test Results
- Tests before: {pass}/{total}
- Tests after: {pass}/{total}
- New tests added: {count}
- Regressions: {none|list}
```

## Framework Detection

Detect and use the project's testing framework:

| Files Found | Framework |
|-------------|-----------|
| jest.config.* | Jest |
| vitest.config.* | Vitest |
| cypress.config.* | Cypress |
| playwright.config.* | Playwright |
| pytest.ini / conftest.py | Pytest |
| *_test.go | Go testing |
| *.test.ts / *.spec.ts | TypeScript tests |

If no framework detected, ask before adding one.
