---
name: team-shinchan:ultrawork
description: Complete tasks quickly with parallel agent execution. Used for "fast", "parallel", "ulw" requests.
user-invocable: true
---

# Ultrawork Skill

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt=`작업 요청: [요청 내용]

/team-shinchan:ultrawork 모드로 실행합니다.
최대 병렬 실행으로 빠르게 완료하세요:
1. 작업을 독립적인 단위로 분해
2. 각 단위를 적절한 에이전트에게 병렬 할당
   - run_in_background=true 사용
3. 순차적 작업은 큐에 대기
4. 모든 작업 완료 대기
5. 결과 통합 및 Action Kamen 검증`
)
```

**❌ 순차적으로 작업하지 마세요**
**✅ Shinnosuke가 병렬 실행을 조율하도록 위임**

---

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
