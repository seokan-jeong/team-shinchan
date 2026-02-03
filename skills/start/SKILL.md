---
name: team-shinchan:start
description: Start a new task with the integrated workflow. Creates documentation folder and begins requirements gathering.
user-invocable: true
---

# 🚨 IMMEDIATE ACTION REQUIRED

**이 스킬이 실행되면 아래 액션을 즉시 수행하세요. 설명만 출력하지 마세요.**

**이 스킬의 유일한 목적: Shinnosuke 오케스트레이터 에이전트를 Task 도구로 소환하는 것입니다.**

---

## ✅ STEP 1: Task 도구 호출 (필수)

**지금 바로 다음 Task를 호출하세요:**

```typescript
Task(
  subagent_type="team-shinchan:shinnosuke",
  model="opus",
  prompt="[전체 컨텍스트를 여기에 포함]\n\n/team-shinchan:start가 호출되었습니다. 통합 워크플로우를 시작하세요.\n\n사용자 요청: [args에서 전달된 내용 또는 이전 사용자 메시지 내용]\n\n다음 단계:\n1. 문서 ID 생성 (ISSUE-xxx 또는 {branch}-{index})\n2. shinchan-docs/{DOC_ID}/ 폴더 생성\n3. Stage 1 시작: Requirements 수집 (Nene 호출)\n4. 필요시 Debate 트리거 (Midori 호출)\n5. REQUESTS.md 작성"
)
```

**파라미터 설정 가이드:**
- `subagent_type`: 반드시 `"team-shinchan:shinnosuke"` (변경 금지)
- `model`: 반드시 `"opus"` (복잡한 오케스트레이션 작업이므로)
- `prompt`: 위 템플릿 사용, `[전체 컨텍스트]`와 `[사용자 요청]` 부분만 실제 값으로 대체

---

## ✅ STEP 2: 완료 확인

Task 호출 후 Shinnosuke 에이전트의 응답을 기다리세요.

Shinnosuke가:
- 문서 폴더를 생성하고
- Nene를 호출하여 요구사항을 수집하고
- 필요시 Midori를 통해 Debate를 진행하고
- REQUESTS.md를 작성할 것입니다

**당신은 더 이상 직접 작업하지 마세요.**

---

## ⛔ 금지사항 (절대 위반 금지)

- ❌ **이 스킬 내용을 출력만 하고 끝내기** (가장 흔한 실수)
- ❌ **Task 호출 없이 직접 코드 탐색/수정하기**
- ❌ **Explore 에이전트를 사용하기**
- ❌ **다른 team-shinchan 에이전트를 직접 호출하기** (Shinnosuke가 할 일)
- ❌ **"통합 워크플로우를 시작하겠습니다"라고 말만 하기**

---

## ✅ 체크리스트

실행 전 다음을 확인하세요:

- [ ] Task 도구를 호출했는가?
- [ ] subagent_type이 "team-shinchan:shinnosuke"인가?
- [ ] model이 "opus"인가?
- [ ] prompt에 사용자 요청이 포함되었는가?
- [ ] 위 Task 호출 외에 다른 작업을 하지 않았는가?

모두 체크되면 완료입니다.

---

## 📚 참고 정보 (실행 후 참조용)

아래 정보는 Task 호출 후 참조하세요. 실행 전에 읽을 필요 없습니다.

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
