# Workflow Stages Diagram

This is the integrated main workflow for all non-trivial tasks in Team-Shinchan.

```
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: Requirements (REQUESTS.md)                        │
│  ├─ Analyze user request                                    │
│  ├─ Unclear → Nene interview / Misae analysis               │
│  ├─ Design decision needed → Trigger Debate                 │
│  └─ Create/update REQUESTS.md                               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: Planning (PROGRESS.md init)                       │
│  ├─ Nene: Break down into Phases                            │
│  ├─ Shiro: Impact analysis                                  │
│  └─ Create PROGRESS.md with Phase plan                      │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: Execution (Phase loop)                            │
│  ┌───────────────────────────────────────────────────┐      │
│  │  For each Phase:                                  │      │
│  │  1. Shiro: Impact analysis for this phase         │      │
│  │  2. Design needed? → Debate                       │      │
│  │  3. Delegate: Bo/Aichan/Buriburi/Masao              │      │
│  │  4. Action Kamen: Review                          │      │
│  │  5. Update PROGRESS.md with retrospective         │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 4: Completion (Auto-proceed, no user prompt)         │
│  ├─ Masumi: Write RETROSPECTIVE.md                          │
│  ├─ Masumi: Write IMPLEMENTATION.md                         │
│  └─ Action Kamen: Final verification                        │
└─────────────────────────────────────────────────────────────┘
```
