---
name: debate
description: Specialized agents debate to find optimal solutions. Used for "debate", "pros and cons", "gather opinions" requests.
user-invocable: true
---

# Debate Skill

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
