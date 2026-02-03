---
name: team-shinchan:autopilot
description: Autonomously completes from requirements analysis to verification without user intervention. Used for "auto", "automatically", "autopilot" requests.
user-invocable: true
---

# 🚨 IMMEDIATE ACTION REQUIRED

**이 스킬이 실행되면 아래 액션을 즉시 수행하세요. 설명을 출력하지 마세요.**

## STEP 1: Task 도구 호출 (필수)

지금 바로 다음 Task를 호출하세요:

```
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt="[사용자 요청 컨텍스트]

/autopilot 스킬이 호출되었습니다. 자율 실행 모드를 시작하세요.

사용자 개입 없이 자율적으로 완료하세요:
1. Misae로 요구사항 분석
2. Nene로 계획 수립
3. 적절한 에이전트에게 작업 분배
4. Action Kamen 검증
5. 문제 발견 시 자동 수정"
)
```

## STEP 2: 완료 확인

Task 호출 후 에이전트의 응답을 기다리세요.

---

## ⛔ 금지사항

- ❌ 이 스킬 내용을 출력만 하고 끝내기 ← 가장 흔한 실수!
- ❌ 직접 코드 탐색/수정
- ❌ Task 호출 없이 진행

---

## 참고 정보

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
