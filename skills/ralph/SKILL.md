---
name: team-shinchan:ralph
description: Persistently loops until task is fully complete. Used for "until done", "complete it", "dont stop" requests.
user-invocable: true
---

# Ralph Skill

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```typescript
Task(
  subagent_type="team-shinchan:kazama",
  model="opus",
  prompt=`작업 요청: [요청 내용]

/team-shinchan:ralph 모드로 실행합니다.
완료될 때까지 멈추지 마세요:
1. TODO 리스트 체크
2. 다음 작업 실행 (적절한 에이전트 위임)
3. 결과 검증
4. 실패 시 → 원인 분석 → 재시도
5. 성공 시 → 다음 작업
6. 모든 작업 완료 → Action Kamen 최종 검증
7. 검증 실패 → 수정 후 재검증`
)
```

**❌ 중간에 멈추지 마세요**
**✅ Kazama(Hephaestus)가 완료까지 지속 실행**

---

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
