---
name: learn
description: 수동으로 새로운 학습 내용을 추가합니다
user-invocable: true
---

# Learn Skill

수동으로 새로운 학습 내용을 메모리에 추가합니다.

## 사용법

```
/learn "사용자는 함수명에 camelCase를 선호함"
/learn "이 프로젝트는 Jest 대신 Vitest를 사용"
```

## 학습 저장

1. 입력받은 내용을 분석
2. 적절한 카테고리 자동 분류
3. 신뢰도 0.7로 초기화
4. 프로젝트 메모리에 저장

## 카테고리 자동 분류

| 키워드 | 카테고리 |
|--------|----------|
| 선호, prefer, like | preference |
| 패턴, pattern, 방식 | pattern |
| 규칙, rule, convention | convention |
| 실수, error, mistake | mistake |
| 결정, decision, 아키텍처 | decision |

## 저장 위치

- 기본: `.team-seokan/memories/` (프로젝트)
- 옵션: `--global` 플래그로 전역 저장
