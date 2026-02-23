# Dogfooding Guide

How to use Team-Shinchan on real projects and collect feedback.

---

## Setup

1. Install team-shinchan in your project
2. Run `/team-shinchan:start "your task"`
3. Complete the full workflow (Stages 1-4)
4. Review the auto-generated metrics in WORKFLOW_STATE.yaml
5. Fill out the feedback checklist below

---

## Feedback Checklist

After completing a workflow, evaluate these areas:

### Workflow Flow
- [ ] /start created folder and WORKFLOW_STATE.yaml correctly
- [ ] Requirements stage (Nene) asked useful questions
- [ ] Planning stage produced actionable phases
- [ ] Execution agents (Bo/Aichan/Bunta/Masao) chose correctly
- [ ] Action Kamen reviews were meaningful
- [ ] Completion docs (Masumi) were accurate

### Friction Points
- [ ] Any stage felt unnecessary for this task? Which one?
- [ ] Did the agent selection feel wrong at any point?
- [ ] Were there unnecessary delays or repeated questions?
- [ ] Did the workflow guard block something it shouldn't have?

### Metrics Quality
- [ ] Stage durations were captured in WORKFLOW_STATE.yaml
- [ ] Agent invocation counts are accurate
- [ ] Review pass rate reflects actual reviews

### Overall
- Rating: {1-5} (1=painful, 5=smooth)
- Would skip workflow and do it manually? (Y/N)
- Biggest friction point: {describe}
- Best part: {describe}

---

## Collecting Feedback

Save feedback to `.shinchan-docs/feedback.md`:

```markdown
## Feedback - {DOC_ID} ({date})

### Task: {brief description}
### Rating: {1-5}
### Duration: {total minutes from metrics}

### What Worked
- {item}

### Friction Points
- {item}

### Suggestions
- {item}
```

---

## Analyzing Feedback

After 3+ workflows, look for patterns:
1. Which stages are consistently skipped or feel unnecessary?
2. Which agents are underutilized or misassigned?
3. What types of tasks benefit most from the full workflow?
4. What types should use the quick-fix path instead?
