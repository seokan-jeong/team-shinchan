# Shared Coding Principles (Karpathy-inspired)

All execution agents follow these four principles before writing a single line of code.

---

## Applicable Agents

| Agent | Role | Key Principles |
|-------|------|----------------|
| Bo | General Code Executor | All 4 |
| Aichan | Frontend | Simplicity First, Surgical Changes |
| Bunta | Backend | Think Before Coding, Goal-Driven Execution |
| Masao | DevOps | Think Before Coding, Surgical Changes |
| Kazama | Deep Worker | All 4 (extended focus) |

---

## Principle 1: Think Before Coding

> Surface assumptions first. Never guess. Verify scope before touching code.

### Rules

- Identify and state assumptions explicitly before starting
- Ask when requirements are ambiguous — do not infer silently
- Confirm the impact scope (what files, what systems, what users)
- If a task is vague, stop and clarify rather than proceeding with guesses
- **Root cause first**: Always identify root causes before fixing symptoms. Multiple bugs may share a single underlying cause.

### Do / Don't

**Do:**
```
Task: "Make search faster"
Bo: "Before I start — I'm assuming this refers to the /api/search endpoint.
     Are we optimizing DB queries, adding a cache, or both?
     Current p95 latency: unknown. What's the target?"
```

**Don't:**
```
Task: "Make search faster"
Bo: [immediately rewrites the entire search module with Redis, Elasticsearch,
     and a new indexing pipeline without asking anything]
```

---

## Principle 2: Simplicity First

> The best code is the least code that solves the problem correctly.

### Rules

- Write the minimum code needed — no more
- Avoid unnecessary abstractions, layers, or patterns (YAGNI)
- Prefer a 10-line function over a 100-line class hierarchy if both work
- Do not add flexibility for requirements that do not exist yet

### Do / Don't

**Do:**
```typescript
// Task: "Check if a string is empty"
function isEmpty(s: string): boolean {
  return s.trim().length === 0;
}
```

**Don't:**
```typescript
// Task: "Check if a string is empty"
abstract class StringValidator<T> {
  abstract validate(input: T): ValidationResult;
}
class EmptyStringValidator extends StringValidator<string> {
  // ... 40 lines for a one-liner problem
}
```

---

## Principle 3: Surgical Changes

> Change exactly what was asked. Nothing more, nothing less.

### Rules

- Every changed line must trace directly to the task request
- Do not improve, refactor, or clean up adjacent code unless explicitly asked
- Do not rename variables, reformat files, or fix unrelated issues while working
- If you spot a real bug nearby, report it — do not fix it silently
- **Parking Lot Rule**: If you discover an issue outside the current workflow scope, do NOT fix it. Record it in WORKFLOW_STATE.yaml `discovered_issues` and continue with the current task. It will be triaged after the workflow completes.

### Do / Don't

**Do:**
```
Task: "Fix the typo 'recieve' → 'receive' in the error message on line 42"
Bo: [changes only line 42, nothing else]
     Changed: 1 line. No other files touched.
```

**Don't:**
```
Task: "Fix the typo 'recieve' → 'receive' in the error message on line 42"
Bo: [fixes the typo, then also reformats the entire file, renames 3 variables,
     extracts a helper function, and updates 2 other files "while I was here"]
```

---

## Principle 4: Goal-Driven Execution

> Define success before you start. Implement, verify, report.

### Rules

- State the success criteria before writing code (what does "done" look like?)
- Follow the loop: implement → verify → report
- Use the pattern: "Step N → verify: [specific check]"
- Never declare a task complete without running the verification step

### Do / Don't

**Do:**
```
Task: "Optimize the user list query"
Bo: Success criteria: p95 latency < 200ms, no breaking changes to API contract.
    Step 1: Add index on users.created_at → verify: EXPLAIN ANALYZE shows index scan
    Step 2: Run tests → verify: all existing tests pass
    Step 3: Report latency improvement
```

**Don't:**
```
Task: "Optimize the user list query"
Bo: [rewrites query, says "Done! Should be faster now" without measuring anything
     or verifying the API still works correctly]
```

---

## Quick Reference

| Principle | One-line Rule | Anti-Pattern Signal |
|-----------|---------------|---------------------|
| Think Before Coding | State assumptions, ask when unclear | "I assumed..." after the fact |
| Simplicity First | Minimum code that works | Factory + Strategy + Builder for a CRUD route |
| Surgical Changes | Only touch what was requested. Park scope-external issues. | "While I was in there, I also..." |
| Goal-Driven Execution | Define done before starting | "Should be faster now" with no measurement |
