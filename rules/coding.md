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

### R-15: Temporal Contamination Rule
코드 주석과 인라인 문서에 시간 의존적 표현을 사용하지 않는다.

**금지 패턴** (코드 주석 한정 — commit message/CHANGELOG 제외):
- "이전에는", "원래", "기존 코드를", "변경함", "새로 추가", "최근에"
- "previously", "originally", "recently added", "newly", "used to be"

**이유**: 코드가 발전하면 "새로 추가"가 더 이상 새롭지 않다. 주석은 현재 상태를 설명해야 한다.

**올바른 대안**: 이유와 현재 동작을 서술한다.
- 잘못된 예: `// 기존에는 단순 배열이었으나 Map으로 변경함`
- 올바른 예: `// Map 사용 — O(1) 조회가 필요한 빈번한 키 접근 패턴`

### R-16: IK Proximity Rule (Information/Knowledge Proximity)
관련 지식(주석, 설명)은 사용되는 곳 가까이 배치한다.

**근접성 우선순위** (높을수록 우선):
1. 함수/블록 바로 위 주석
2. 파일 상단 주석 (파일 전역 개념에 한함)
3. 별도 문서 (README, docs/)

**이유**: 멀리 떨어진 지식은 발견되지 않는다. 코드를 읽는 시점에 관련 지식이 시야에 있어야 한다.

**적용 방법**: 함수 동작의 비자명한 이유는 함수 위에, 모듈 전체에 적용되는 제약은 파일 상단에 배치한다.

### R-17: Confidence-parameterized Steps
작업 복잡도에 따라 실행 깊이와 검증 수준을 조정한다.

**복잡도 기준**:

| 복잡도 | 기준 | 실행 방식 |
|--------|------|----------|
| Low | 단일 파일, 명확한 변경, 영향 범위 1개 | 빠른 실행 + 최소 검증 (smoke test) |
| High | 다중 파일, 인터페이스 변경, 영향 범위 3개 이상 | 단계별 검증 + 세분화된 sub-task |

**이유**: 과도한 검증은 저복잡도 작업의 속도를 불필요하게 낮춘다. 반대로 고복잡도 작업의 검증 생략은 회귀를 유발한다.

**적용 방법**: 작업 시작 시 복잡도를 명시적으로 선언하고, 그에 맞는 검증 계획을 수립한다.
