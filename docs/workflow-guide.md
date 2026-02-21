# Workflow Stage Guide

Detailed stage-by-stage reference for the Team-Shinchan 4-stage workflow.

> This document is extracted from CLAUDE.md for maintainability. CLAUDE.md references this file.

---

## Stage 1: Requirements

```python
# Pseudo-workflow
if request_is_unclear:
    delegate_to("nene", "Interview user for requirements")
    # OR
    delegate_to("misae", "Analyze hidden requirements")

if design_decision_needed:
    trigger_debate(topic=design_question)

create_or_update("REQUESTS.md")
```

**REQUESTS.md Quality Checklist:**
- [ ] Clear problem statement
- [ ] Acceptance criteria defined
- [ ] Scope boundaries (what's NOT included)
- [ ] Edge cases identified
- [ ] User approved

## Stage 2: Planning

```python
delegate_to("nene", "Break into phases with acceptance criteria")
delegate_to("shiro", "Analyze impact across codebase")
create("PROGRESS.md")
```

**PROGRESS.md Quality Checklist:**
- [ ] Each Phase has a "Rationale" section explaining WHY this approach
- [ ] Large Phases (4+ files) are split into Steps
- [ ] Each Phase has testable acceptance criteria
- [ ] Change Log section exists (filled during execution)

## Stage 3: Execution (Per Phase)

```python
for phase in phases:
    # 1. Impact analysis
    impact = delegate_to("shiro", f"Analyze impact for {phase}")

    # 2. Design decisions
    if needs_design_decision(phase):
        decision = trigger_debate(phase.design_question)

    # 3. Implementation
    if phase.type == "frontend":
        delegate_to("aichan", phase.task)
    elif phase.type == "backend":
        delegate_to("bunta", phase.task)
    elif phase.type == "devops":
        delegate_to("masao", phase.task)
    else:
        delegate_to("bo", phase.task)

    # 4. Review (MANDATORY)
    review = delegate_to("actionkamen", f"Review {phase}")
    if review.has_critical_issues:
        fix_and_retry()  # See PART 13 in CLAUDE.md

    # 5. Phase retrospective
    update("PROGRESS.md", phase.retrospective)
```

### Goal-Driven Execution Pattern

Every phase in Stage 3 follows the **Goal-Driven Execution** pattern.
Agents must define success before writing code, then verify after.

**Pattern: Imperative Task → Declarative Goal**

| Imperative (bad) | Declarative Goal (good) |
|---|---|
| "Add caching to the search endpoint" | "p95 latency < 100ms, cache hit rate > 80%, no breaking changes" |
| "Fix the login bug" | "Login with valid credentials returns 200, invalid returns 401, session persists across reload" |
| "Refactor the UserService" | "All methods follow camelCase, 0 callers broken, all 47 tests pass" |

**Step → Verify Pattern (required in all phase reports):**

```
Bo: Success criteria: [specific, measurable outcome]

Step 1: [action] → verify: [specific check]
Step 2: [action] → verify: [specific check]
Step 3: Run all tests → verify: [N]/[N] pass
```

**Example:**
```
😪 [Bo] Starting: "Add index on users.email"

Success criteria: query time < 50ms on 1M rows, no existing tests broken.

Step 1: Add index migration → verify: migration runs without error ✅
Step 2: Run EXPLAIN ANALYZE → verify: shows Index Scan (not Seq Scan) ✅
Step 3: Run test suite → verify: 47/47 pass ✅
```

**Rule**: Never report a phase complete without running the verification step.
If verification fails, fix the issue — do not skip and report done anyway.

> See concrete good/bad examples: [EXAMPLES.md](../EXAMPLES.md)

### Phase Rationale Pattern (required in all phases)

Every Phase MUST include a Rationale section answering:
1. **Why this approach?** - What problem does it solve?
2. **What alternatives were considered?** - At least 1 alternative
3. **Why were alternatives rejected?** - Concrete reasoning

**Example:**
```
### Rationale (결정 사유)

**왜 prompt hook인가?**
- command hook은 프롬프트에 텍스트를 주입할 수 없음
- prompt hook은 에이전트가 직접 읽을 수 있는 형태로 주입됨
- 대안: CLAUDE.md에 직접 삽입 → 항상 로딩되어 토큰 낭비
- 대안: 에이전트 MD에 인라인 → 코딩하지 않는 상황에서도 로딩됨
```

### Phase Rollback

When a phase introduces regressions or must be reverted:

1. **Identify the scope**: Which files were changed in the failed phase?
2. **Git-based rollback**: Use `git stash` or `git revert` for the phase's commits
3. **Update PROGRESS.md**: Mark the phase as "rolled back" with reason
4. **Re-approach**: Create a new plan for the phase, optionally triggering a debate

```markdown
🎩 [Kazama] Phase 2 rolled back due to regression.
Reason: API changes broke 3 existing tests.
Next: Re-planning Phase 2 with backward-compatible approach.
```

## Stage 4: Completion

```python
# Auto-proceed without user confirmation

# 1. Run verify-implementation (auto-triggered by hooks/auto-verify.md)
verify_result = run_skill("verify-implementation")
if verify_result.has_failures:
    fix_issues_or_skip()  # User chooses: fix / review / skip

# 2. Optionally update verification skills
if has_uncovered_changes:
    run_skill("manage-skills")  # Creates/updates verify-* skills

# 3. Write documentation
delegate_to("masumi", "Write RETROSPECTIVE.md")
delegate_to("masumi", "Write IMPLEMENTATION.md")

# 4. Final review
final_review = delegate_to("actionkamen", "Final verification")
if final_review.approved:
    report_completion()
else:
    fix_and_retry()  # See PART 13 in CLAUDE.md
```

### Completion Gate (Updated)

All must pass before workflow completion:
- [ ] verify-implementation passed (or skipped with override)
- [ ] RETROSPECTIVE.md written
- [ ] IMPLEMENTATION.md written
- [ ] Action Kamen final review passed
