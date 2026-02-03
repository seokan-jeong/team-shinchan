---
name: team-shinchan:debate
description: Specialized agents debate to find optimal solutions. Used for "debate", "pros and cons", "gather opinions" requests.
user-invocable: true
---

# Debate Skill

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```typescript
Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt=`토론 주제: [주제]

Midori(Moderator)로서 토론을 진행하세요:
1. 주제에 맞는 전문가 패널 선정
2. 각 전문가의 의견 수집 (병렬)
3. 토론 라운드 진행 (최대 3회)
4. Hiroshi가 합의 도출
5. Action Kamen 검증`
)
```

**❌ 직접 의견을 제시하지 마세요**
**✅ Midori가 토론을 조율하도록 위임**

---

## Features

- Auto-summons expert agents based on topic
- Conducts structured discussions up to 3 rounds
- Hiroshi(Oracle) synthesizes final recommendation
- Action Kamen(Reviewer) verifies consensus

## Discussion Patterns

| Pattern | Description | Best For |
|---------|-------------|----------|
| Round Table | Sequential opinions with mutual feedback | General decisions |
| Dialectic | Thesis ↔ Antithesis → Synthesis | Opposing viewpoints |
| Expert Panel | Domain-specific perspectives | Multi-domain topics |

## Automatic Participant Selection

| Topic | Summoned Agents |
|-------|-----------------|
| UI, Frontend | Aichan, Hiroshi |
| API, Backend, DB | Bunta, Hiroshi |
| Deploy, Infrastructure | Masao, Hiroshi |
| Architecture, Design | Hiroshi, Nene, Misae |
| Full System | Aichan, Bunta, Masao, Hiroshi |

## Workflow Checklist

```
[ ] Phase 1: Define problem and summon panel
[ ] Phase 2: Collect opinions (parallel)
[ ] Phase 3: Discussion rounds (max 3)
[ ] Phase 4: Reach consensus (Hiroshi)
[ ] Phase 5: Verify (Action Kamen)
```

## Discussion Rules

- Max rounds: 3
- Token limit: 500 tokens per agent per turn
- No consensus: Vote or escalate
- Moderator intervention: Midori(Moderator) mediates deadlocks

See [WORKFLOW.md](./WORKFLOW.md) for detailed workflow
