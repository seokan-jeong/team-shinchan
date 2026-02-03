---
name: memories
description: 학습된 메모리를 조회합니다
user-invocable: true
---

# Memories Skill

학습된 메모리를 조회하고 관리합니다.

## 사용법

```
/memories           # 전체 메모리 조회
/memories search    # 키워드로 검색
```

## 메모리 조회 방법

1. **전역 메모리**: `~/.team-seokan/memories/` 에서 조회
2. **프로젝트 메모리**: `.team-seokan/memories/` 에서 조회

## 메모리 카테고리

| 카테고리 | 설명 |
|----------|------|
| preference | 사용자 선호도 |
| pattern | 코드 패턴 |
| context | 프로젝트 컨텍스트 |
| mistake | 실수와 해결법 |
| decision | 아키텍처 결정 |
| convention | 프로젝트 컨벤션 |
| insight | 인사이트 |

## 동작

이 스킬이 활성화되면:

1. 전역 및 프로젝트 메모리 디렉토리 스캔
2. 메모리 파일들을 읽어서 정리
3. 신뢰도 순으로 정렬하여 표시
4. 각 메모리의 카테고리, 태그, 생성일 표시
