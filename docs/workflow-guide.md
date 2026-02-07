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

## Stage 4: Completion

```python
# Auto-proceed without user confirmation
delegate_to("masumi", "Write RETROSPECTIVE.md")
delegate_to("masumi", "Write IMPLEMENTATION.md")

final_review = delegate_to("actionkamen", "Final verification")
if final_review.approved:
    report_completion()
else:
    fix_and_retry()  # See PART 13 in CLAUDE.md
```
