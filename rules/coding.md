# Coding Rules

Operational checklist for all code changes. Derived from [agents/_shared/coding-principles.md](../agents/_shared/coding-principles.md) and [hooks/coding-reminder.md](../hooks/coding-reminder.md).

---

### R-1: State Assumptions Before Coding
Identify and explicitly state all assumptions before writing code. If requirements are ambiguous, ask for clarification rather than guessing.

### R-2: Minimum Code Needed
Write the least amount of code that correctly solves the problem. Avoid unnecessary abstractions, wrapper classes, or indirection layers (YAGNI).

### R-3: Surgical Changes Only
Every changed line must trace directly to the task request. Do not refactor, rename, reformat, or "improve" adjacent code unless explicitly asked.

### R-4: Define Success Criteria First
State what "done" looks like before writing code. Follow the implement -> verify -> report loop. Never declare a task complete without running the verification step.

### R-5: Small Focused Functions
Keep functions under 40 lines. Each function should do one thing well. If a function needs a comment explaining what a section does, that section should be its own function.

### R-6: Consistent Naming Conventions
Use camelCase for variables and functions, PascalCase for classes and types, UPPER_SNAKE_CASE for constants. Names should be descriptive and self-documenting.

### R-7: Explicit Error Handling
Handle errors at the point where you have enough context to do something meaningful. Never silently swallow errors. Use try/catch for async operations and validate inputs at boundaries.

### R-8: No Magic Numbers or Strings
Extract literal values into named constants. Configuration values belong in config files, not scattered throughout code.

### R-9: Single Responsibility Per File
Each file should have a clear, single purpose. If a file grows beyond 300 lines, consider whether it is doing too many things.

### R-10: Prefer Composition Over Inheritance
Use composition and interfaces rather than deep inheritance hierarchies. Favor flat, explicit code structures.

### R-11: Document "Why" Not "What"
Code comments should explain reasoning and intent, not restate what the code does. Complex algorithms, business rules, and non-obvious decisions need comments.

### R-12: Root Cause First
When fixing bugs, always identify the root cause before applying a fix. Multiple symptoms may share a single underlying cause.

### R-13: No Side Effects in Pure Functions
Functions that compute values should not modify external state. Separate data transformation from I/O operations.

### R-14: Fail Fast on Invalid Input
Validate inputs at function boundaries and throw/return early. Do not let invalid data propagate through multiple layers before failing.
