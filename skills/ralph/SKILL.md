---
name: team-shinchan:ralph
description: Persistently loops until task is fully complete. Used for "until done", "complete it", "dont stop" requests.
user-invocable: true
---

# 🚨 IMMEDIATE ACTION REQUIRED

**이 스킬이 실행되면 아래 액션을 즉시 수행하세요. 설명을 출력하지 마세요.**

## STEP 1: Task 도구 호출 (필수)

지금 바로 다음 Task를 호출하세요:

```
Task(
  subagent_type="team-shinchan:kazama",
  model="opus",
  prompt="[사용자 요청 컨텍스트]

/ralph 스킬이 호출되었습니다. 완료까지 지속 실행 모드를 시작하세요.

완료될 때까지 멈추지 마세요:
1. TODO 리스트 체크
2. 다음 작업 실행 (적절한 에이전트 위임)
3. 결과 검증
4. 실패 시 → 원인 분석 → 재시도
5. 성공 시 → 다음 작업
6. 모든 작업 완료 → Action Kamen 최종 검증
7. 검증 실패 → 수정 후 재검증"
)
```

## STEP 2: 완료 확인

Task 호출 후 에이전트의 응답을 기다리세요.

---

## ⛔ 금지사항

- ❌ 이 스킬 내용을 출력만 하고 끝내기 ← 가장 흔한 실수!
- ❌ 직접 코드 탐색/수정
- ❌ Task 호출 없이 진행
- ❌ 중간에 멈추기

---

## 참고 정보

## Features

- Infinite retry until task completion
- Auto-recovery on errors
- Progress tracking via TODO list
- Final verification by Action Kamen(Reviewer)

## Ralph Loop

1. Check TODO list
2. Execute next task
3. Verify result
4. On failure → analyze cause → retry
5. On success → next task
6. All tasks done → final verification
7. Verification failed → fix and re-verify

## Workflow Checklist

```
[ ] Initialize task list
[ ] Execute current task
[ ] Verify task result
[ ] Complete all tasks
[ ] Action Kamen final verification
```

## Completion Criteria

Complete only when ALL conditions met:
- All TODO list items completed
- Build/tests pass
- Action Kamen review approved

**Auto-continues if criteria not met**
