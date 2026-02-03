---
name: team-shinchan:ultrawork
description: Complete tasks quickly with parallel agent execution. Used for "fast", "parallel", "ulw" requests.
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

/ultrawork 스킬이 호출되었습니다. 병렬 실행 모드를 시작하세요.

최대 병렬 실행으로 빠르게 완료하세요:
1. 작업을 독립적인 단위로 분해
2. 각 단위를 적절한 에이전트에게 병렬 할당
   - run_in_background=true 사용
3. 순차적 작업은 큐에 대기
4. 모든 작업 완료 대기
5. 결과 통합 및 Action Kamen 검증"
)
```

## STEP 2: 완료 확인

Task 호출 후 에이전트의 응답을 기다리세요.

---

## ⛔ 금지사항

- ❌ 이 스킬 내용을 출력만 하고 끝내기 ← 가장 흔한 실수!
- ❌ 직접 코드 탐색/수정
- ❌ Task 호출 없이 진행
- ❌ 순차적으로 작업하기

---

## 참고 정보

## Features

- Multiple agents process independent tasks simultaneously
- Immediate routing to specialized agents
- Long tasks run in background
- Continues until all tasks complete and verify

## Agent Routing

| Domain | Haiku | Sonnet | Opus |
|--------|-------|--------|------|
| Analysis | Shiro | Misae | Hiroshi |
| Execution | - | Bo | Kazama |
| Frontend | - | Aichan | - |
| Backend | - | Bunta | - |
| DevOps | - | Masao | - |
| Review | - | - | Action Kamen |

## Workflow Checklist

```
[ ] Analyze and decompose tasks
[ ] Assign independent tasks in parallel
[ ] Queue sequential tasks
[ ] Wait for all tasks to complete
[ ] Integrate results and verify
```

## Completion Criteria

- TODO list: No remaining tasks
- Features: All requested features work
- Tests: All tests pass
- Errors: No unresolved errors

**If any criteria not met → continue working!**
