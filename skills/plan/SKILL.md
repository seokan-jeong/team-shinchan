---
name: team-shinchan:plan
description: Create systematic work plans with Nene(Planner). Used for "plan", "design" requests.
user-invocable: true
---

# Plan Skill

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```typescript
Task(
  subagent_type="team-shinchan:nene",
  model="opus",
  prompt="사용자 요청: [요청 내용]\n\n체계적인 작업 계획을 수립하세요."
)
```

**❌ 직접 계획을 작성하지 마세요**
**✅ Nene 에이전트에게 위임하세요**

---

## Features

- Nene(Planner) clarifies requirements through interview
- Misae(Metis) analyzes hidden requirements and risks
- Creates plan with testable acceptance criteria
- Action Kamen(Reviewer) reviews plan

## Planning Process

1. **Requirements Interview**: Identify goals, constraints, priorities
2. **Analysis**: Identify hidden requirements and risks
3. **Plan Writing**: Include implementation steps, file references, verification steps
4. **Review**: Action Kamen provides feedback

## Workflow Checklist

```
[ ] Complete requirements interview
[ ] Complete Misae analysis
[ ] Draft plan document
[ ] Pass Action Kamen review
```

## Plan Quality Criteria

- 80%+ of claims include file/line references
- 90%+ of acceptance criteria are testable
- No ambiguous terms
- All risks have mitigation plans
