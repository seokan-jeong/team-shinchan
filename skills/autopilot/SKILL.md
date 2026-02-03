---
name: team-shinchan:autopilot
description: Autonomously completes from requirements analysis to verification without user intervention. Used for "auto", "automatically", "autopilot" requests.
user-invocable: true
---

# Autopilot Skill

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`사용자 요청: [요청 내용]

/team-shinchan:autopilot 모드로 실행합니다.
사용자 개입 없이 자율적으로 완료하세요:
1. Misae로 요구사항 분석
2. Nene로 계획 수립
3. 적절한 에이전트에게 작업 분배
4. Action Kamen 검증
5. 문제 발견 시 자동 수정`
)
```

**❌ 직접 작업하지 마세요**
**✅ Shinnosuke가 전체 워크플로우를 자율 실행하도록 위임**

---

## Features

- Misae(Metis) auto-analyzes requirements
- Nene(Planner) creates work plan
- Shinnosuke(Orchestrator) distributes tasks to agents
- Multiple agents execute in parallel
- Action Kamen(Reviewer) verifies results
- Auto-fixes on issues found

## Agent Collaboration Flow

1. **Misae** → Requirements analysis
2. **Nene** → Plan creation
3. **Shinnosuke** → Task distribution
4. **Bo/Aichan/Bunta** → Parallel execution
5. **Action Kamen** → Verification

## Workflow Checklist

```
[ ] Requirements analysis (Misae)
[ ] Work plan creation (Nene)
[ ] Task distribution (Shinnosuke)
[ ] Parallel execution (Specialists)
[ ] Quality verification (Action Kamen)
[ ] Auto-fix (if needed)
```

## Completion Notification

When all tasks complete:
- Show completed task list
- Show modified files list
- Suggest next steps
