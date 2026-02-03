---
name: team-shinchan:start
description: Start a new task with the integrated workflow. Creates documentation folder and begins requirements gathering.
user-invocable: true
---

# Start Skill

**Explicitly start the Team-Shinchan integrated workflow for a new task.**

---

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```
1. Task 도구를 호출합니다
2. subagent_type: "team-shinchan:shinnosuke"
3. model: "opus"
4. prompt: 사용자의 요청 + 컨텍스트 전달
```

**예시:**
```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt="사용자 요청: [요청 내용]\n\n/team-shinchan:start 스킬이 실행되었습니다. 통합 워크플로우를 시작하세요."
)
```

**❌ 절대 하지 마세요:**
- 직접 코드 탐색/수정
- Explore 에이전트 사용
- 문서만 출력하고 끝내기

**✅ 반드시 하세요:**
- Shinnosuke 에이전트를 Task 도구로 소환
- Shinnosuke가 Nene, Shiro, Bo 등을 순차적으로 호출하도록 위임

---

## When to Use

- Starting a new feature or task
- Want to ensure full workflow with documentation
- Need to specify an issue ID

---

## Usage

```bash
/team-shinchan:start                    # Start with auto-generated ID
/team-shinchan:start ISSUE-123          # Start with specific issue ID
/team-shinchan:start "Add user auth"    # Start with task description
```

---

## What Happens

### 1. Generate Document ID

| Input | Result |
|-------|--------|
| `ISSUE-123` | `shinchan-docs/ISSUE-123/` |
| No ID, branch `feature-auth` | `shinchan-docs/feature-auth-001/` |
| No ID, branch `main` | `shinchan-docs/main-001/` |

### 2. Create Documentation Folder

```
shinchan-docs/{DOC_ID}/
├── REQUESTS.md      # Will be created
├── PROGRESS.md      # Will be created
├── RETROSPECTIVE.md # Created on completion
└── IMPLEMENTATION.md # Created on completion
```

### 3. Begin Stage 1: Requirements

```
📋 [Shinnosuke] Starting new task...

📁 [Shinnosuke] Created: shinchan-docs/{DOC_ID}/

🎯 [Nene] Beginning requirements gathering...
   - What is the goal?
   - What are the constraints?
   - What should NOT be included?

💭 [Midori] Design decision needed? → Debate

📝 [Shinnosuke] Creating REQUESTS.md...
```

---

## Workflow Preview

```
/team-shinchan:start
       ↓
┌─────────────────────────┐
│ Stage 1: Requirements   │  ← You are here
│ - Nene interviews       │
│ - Midori debates (if needed)
│ - REQUESTS.md created   │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ Stage 2: Planning       │
│ - Nene breaks into phases
│ - Shiro analyzes impact │
│ - PROGRESS.md created   │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ Stage 3: Execution      │
│ - Per-phase work        │
│ - Bo/Aichan/Bunta/Masao │
│ - Action Kamen reviews  │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ Stage 4: Completion     │
│ - RETROSPECTIVE.md      │
│ - IMPLEMENTATION.md     │
│ - Final verification    │
└─────────────────────────┘
```

---

## Examples

```bash
# Start work on a Jira issue
/team-shinchan:start ISSUE-456

# Start a new feature
/team-shinchan:start "Implement OAuth2 login"

# Start without specifying (will prompt)
/team-shinchan:start
```

---

## Output Format

```
🚀 [Shinnosuke] Starting new task...

📁 Created documentation folder:
   shinchan-docs/ISSUE-456/

📋 Stage 1: Requirements
   Nene will now gather requirements.

❓ What problem are you trying to solve?
```
