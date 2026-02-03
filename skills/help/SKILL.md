---
name: help
description: Team-Seokan 사용법을 안내합니다
user-invocable: true
---

# Help Skill

Team-Seokan 플러그인 사용법을 안내합니다.

## 에이전트 팀

### 오케스트레이션
- **짱구** (Orchestrator) - 작업 분석 및 위임
- **짱아** (Atlas) - 복잡한 작업 분해

### 실행
- **맹구** (Executor) - 코드 작성/수정
- **철수** (Hephaestus) - 복잡한 구현

### 전문가
- **수지** (Frontend) - UI/UX 개발
- **흑곰** (Backend) - 서버/API 개발
- **훈이** (DevOps) - 인프라/배포

### 조언 (읽기 전용)
- **신형만** (Oracle) - 아키텍처 조언
- **유리** (Planner) - 전략적 계획
- **봉미선** (Metis) - 요구사항 분석
- **액션가면** (Reviewer) - 코드 리뷰

### 탐색 (읽기 전용)
- **흰둥이** (Explorer) - 빠른 코드 탐색
- **채성아** (Librarian) - 문서 검색
- **나미리** (Multimodal) - 이미지 분석

## 스킬 목록

| 스킬 | 트리거 | 설명 |
|------|--------|------|
| `/ultrawork` | ulw, 병렬 | 병렬 실행 |
| `/ralph` | 끝까지 | 완료까지 반복 |
| `/autopilot` | 자동으로 | 자율 실행 |
| `/plan` | 계획 | 계획 수립 |
| `/analyze` | 분석 | 심층 분석 |
| `/deepsearch` | 찾아줘 | 코드 탐색 |
| `/memories` | - | 메모리 조회 |
| `/learn` | - | 학습 추가 |
| `/forget` | - | 메모리 삭제 |

## 메모리 시스템

Team-Seokan은 사용할수록 똑똑해집니다:
- 자동으로 패턴, 선호도, 실수를 학습
- 학습된 내용을 다음 작업에 활용
- `/memories`로 학습 내용 확인
- `/learn`으로 수동 학습 추가
