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
