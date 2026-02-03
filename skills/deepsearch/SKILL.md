---
name: team-shinchan:deepsearch
description: Deep codebase exploration with Shiro(Explorer) and Masumi(Librarian). Used for "find", "where is", "search" requests.
user-invocable: true
---

# Deepsearch Skill

## ⚠️ MANDATORY: Agent Invocation

**이 스킬 실행 시 반드시 다음을 수행하세요:**

```typescript
// 1. 빠른 검색 (Shiro)
Task(
  subagent_type="team-shinchan:shiro",
  model="haiku",
  prompt="사용자 요청: [요청 내용]\n\n코드베이스를 탐색하세요."
)

// 2. 필요시 심층 검색 (Masumi)
Task(
  subagent_type="team-shinchan:masumi",
  model="sonnet",
  prompt="Shiro 검색 결과: [결과]\n\n심층 분석을 수행하세요."
)
```

**❌ Explore 에이전트 또는 직접 Glob/Grep 사용 금지**
**✅ Shiro → Masumi 순서로 위임하세요**

---

## Features

- Shiro(Explorer): Fast filename/keyword search
- Masumi(Librarian): Code content analysis and dependency tracking
- Supports searching files, functions, classes, docs, patterns

## Search Stages

1. **Quick Search (Shiro)**: Filename pattern matching, keyword search, directory structure
2. **Deep Search (Masumi)**: Code content analysis, related doc search, dependency tracking

## Search Targets

| Target | Description |
|--------|-------------|
| Files | Search by filename, path |
| Functions | Search by function name, signature |
| Classes | Search by class name, inheritance |
| Docs | README, comments, documentation |
| Patterns | Search by code patterns |

## Workflow Checklist

```
[ ] Identify search keywords/targets
[ ] Perform Shiro quick search
[ ] Perform Masumi deep search if needed
[ ] Organize and provide results
```

## Result Format

- File paths and line numbers
- Related code snippets
- Context explanation
- Related file list
