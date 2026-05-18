---
document_type: requirements
status: draft
stage: 1
created: "2026-05-17"
doc_id: "main-068-vslice"
source: user
tag: feature
output_format: markdown
---

# Requirements: 샘플 워크플로 vslice

## 1. Problem Statement

팀신짱 워크플로의 작업 가시성이 낮고 진행 상태 파악이 번거롭다. 사용자는 현재 `.shinchan-docs/{doc_id}/` 폴더로 직접 들어가서 개별 파일을 열어봐야 하며, 여러 워크플로를 동시에 진행할 때 통합 조회 수단이 없다. 본 vslice는 단일 워크플로(main-068-vslice)를 대상으로 HTML 산출 파이프라인이 end-to-end로 동작하는지 증명한다.

## 2. Functional Requirements

**FR-1: HTML 산출 (Phase D 분기)**
모든 신규 워크플로 산출물(REQUESTS / PROGRESS / RETROSPECTIVE)을 시맨틱 HTML로 생성한다. 기존 마크다운 템플릿과 1:1 의미 동등을 유지하며, `output_format: html | markdown` 토글로 분기한다. 기존 마크다운 경로는 보존(회귀 안전).

**FR-2: 대시보드 통합 조회**
로컬 단일 진입점(예: `http://localhost:8765/`)에서 모든 active 워크플로를 카드 그리드로 표시한다. 카드는 doc_id, 현재 stage/phase, 담당 에이전트, 진행률을 노출하며, 실시간 SSE로 갱신된다. 새 이벤트가 들어오면 해당 카드만 부분 갱신(HTMX swap)된다.

## 3. Non-Functional Requirements

**NFR-1: 토큰 효율 (HTML ≤ 2× markdown)**
동일 의미의 HTML 문서가 마크다운 대비 토큰 2배를 넘지 않도록 시맨틱 태그/클래스를 절제한다. AK 리뷰가 받는 HTML이 마크다운 대비 2배를 넘으면 알림 + Phase 1 회귀 트리거.

## 4. Scope

### In Scope

- 단일 에이전트(misae) Phase D 분기 — `output_format` 토글 적용
- 신규 워크플로 산출물 HTML 생성 (`REQUESTS.html`)
- mechanical-check HTML 입력 모드 (확장자 분기)
- 로컬 대시보드 정적 viewer (Phase 1 mini, 서버 X)

### Out of Scope

- 8개 에이전트 일괄 변환 (Phase 2)
- 대시보드 백엔드/SSE/HTMX 실시간 갱신 (Phase 3/4)
- archived `*.md` 일괄 HTML 변환 (보존만)
- 외부 네트워크 노출, 인증/사용자 관리 (localhost 전용)

## 5. Hidden Requirements

**HR-1: 부트스트랩 분리 (bootstrap paradox)**
인프라 미완성 단계의 산출물은 마크다운 유지, 다음 워크플로부터 HTML 적용. 본 main-068 워크플로 자체의 frontmatter는 `output_format: markdown`이며, main-069부터 global default가 html로 flip된다.

## 6. Risks

| ID | Item | Risk | Severity | Mitigation |
|----|------|------|----------|------------|
| R-1 | HTML 토큰 비용 | 마크다운 대비 2~4배 토큰 → AK 리뷰/후속 에이전트 컨텍스트 압박, 비용 상승 | H | NFR-1로 2배 상한 강제, 시맨틱 태그/클래스 절제, frontmatter는 `<script type="application/json">` 1곳에 집중 |

## 7. Acceptance Criteria

- [ ] AC-1: REQUESTS.html이 시맨틱 구조(article + section + aria-labelledby + role 속성)를 포함
- [ ] AC-2: 토큰 비율 ≤ 2.0 (html-token-estimator 측정, NFR-1 게이트)
- [ ] AC-3: mechanical-check HTML 모드가 정상 통과 (DOM 셀렉터 기반 5케이스)
- [ ] AC-4: viewer.html이 REQUESTS.html을 로드하여 표시 (정적, 서버 없음)

## 8. Validation Checklist

- [x] Problem Statement — defined
- [x] FR/NFR — defined
- [x] Scope (In/Out) — defined
- [x] HR — analyzed via bootstrap paradox elicitation
- [x] Risks — defined with H severity + mitigation
- [x] AC — testable checkboxes
- [ ] User approval — pending (Phase 1 vslice golden, no real user)
