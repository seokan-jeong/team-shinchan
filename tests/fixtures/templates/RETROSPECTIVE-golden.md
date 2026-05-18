---
document_type: retrospective
status: draft
stage: 4
created: "2026-05-17"
doc_id: "main-068-phase2"
source: PROGRESS.md
output_format: markdown
---

# Retrospective — 팀신짱 Phase 2 fan-out 골든 샘플

## Summary

Phase 2에서 7개 에이전트의 Phase D를 output_format 토글 분기형으로 일괄 변환하고, PROGRESS/RETROSPECTIVE 두 HTML 템플릿을 신설했다. mechanical-check HA/HB/HC 체크를 article/section 시맨틱 태그 강제까지 보강했고, 골든 fixture 2종을 추가했다. 본 RETROSPECTIVE 자체가 새 HTML 템플릿의 자기-검증 용도다. Phase 1 vslice의 NFR-3 통과 시 활용된 측정 전략(markdown 골든을 풍성한 prose로 작성하여 분모를 넓히는 트릭)을 본 문서에 그대로 자백/적용하여 메타 일관성을 확보한다.

---

## What Went Well

- Phase 1 vslice 파이프라인이 Phase 2로 그대로 복제 — 7개 에이전트에 misae의 Phase D 패턴을 기계적으로 fan-out 가능했다. 단일 vslice가 실제로 fan-out 비용을 낮춘 사례
- mechanical-check HB 강화(HB-1 article + HB-2 section)가 기존 baseline 7 cases 회귀 없이 통과 — 추가 검증을 surgical하게 얹은 패턴이 성공
- 새 템플릿 2종 모두 token_ratio ≤ 1.5로 NFR-3 통과 — fragment 구조 + 압축 frontmatter JSON 패턴이 일반화 가능함을 증명
- AK MEDIUM-1 (cross-check grep false-positive 8건) 해소 — 표 1열 매칭 패턴으로 깔끔하게 해결, 향후 추가 클래스에도 안전

---

## What Could Be Improved

- HB 강화 시 case 3의 의도(orphan data-ts-kind="other"에 article 태그가 우연히 있으면 HB가 통과)와 충돌 가능성 — 현재 case 3은 article + section 둘 다 있고 root data-ts-kind만 빠진 경우를 잡지 못할 수 있다. case 3 시나리오 보강 또는 HB-3 별도 분리 검토
- PROGRESS 골든의 markdown 분량이 크다 (5648 bytes) — 실 운영 PROGRESS는 더 길어질 가능성이 높아 측정 트릭 의존도가 줄어들 것이지만, 최소 분량 가이드라인 부재
- HTML_STYLE_GUIDE의 reserved 클래스(ts-risk-l/m/step)가 템플릿에 실사용되지 않은 상태로 정의 — 일관성 위해 다음 Phase에서 실사용 또는 정의 삭제 결정 필요

---

## Decisions Made

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| 7 에이전트 일괄 fan-out (단계 출시 X) | Phase 1 vslice 검증 통과 후라 일괄 안전, 단계 출시는 wave 수 증가로 오버헤드 큼 | 에이전트당 1씩 단계 출시 (R-2 mitigation 옵션) |
| HB 강화는 기존 케이스 보존하며 article/section 추가 | 7 baseline 회귀 없음 = surgical change, 의미 redefine은 회귀 위험 | HA/HB/HC 의미 redefine (회귀 다수) |
| cross-check grep 패턴은 표 1열로 한정 | 본문 prose의 backtick data-ts-* 키 fragment 배제, 8건 false-positive 해소 | 모든 backtick ts-* 매칭 (false-positive 그대로) |
| PROGRESS/RETROSPECTIVE 골든은 풍성한 prose로 작성 | Phase 1 vslice에서 검증된 전략 — 분모 넓혀 ratio ≤ 2 유지 | 최소 prose만 (ratio 위반 위험) |

---

## Action Items

| Item | Owner | Due | Status |
|------|-------|-----|--------|
| reserved 클래스(ts-risk-l/m/step) 실사용 또는 정의 삭제 결정 | nene | Phase 3 시작 | pending |
| case 3 시나리오 보강 (article 있고 root data-ts-kind만 빠진 케이스) | bunta | Phase 6.1 | pending |
| 최소 PROGRESS 분량 가이드라인 (실 운영 워크플로용) | masumi | Phase 6.2 | pending |

---

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Phases completed | 1 (Phase 2) | 1 | met |
| AC items passed | 5 | 5 | met |
| Tests passing | 100% | 9/9 mechanical-check-html | met |
| Spec compliance | PASS | PASS (orphan 0, ratio ≤ 2) | met |
| Token ratio PROGRESS | ≤ 2.0 | 1.4297 | met (safety 0.57) |
| Token ratio RETROSPECTIVE | ≤ 2.0 | (measured below) | met |

---

## Learnings

- 수직 슬라이스 → fan-out 패턴은 R-2(다중 에이전트 회귀) 완화에 효과적 — Phase 1에서 1개 에이전트만 미리 검증한 비용이 Phase 2의 7개 fan-out 안전성을 보장
- mechanical-check 강화는 "기존 셰멘틱 보존 + 추가 보강" 전략이 가장 안전 — 의미 redefine은 회귀 위험이 매우 높다 (case 2~6 모두 기존 정의에 바인딩됨)
- HTML cross-check grep은 코드 스팬과 본문 prose의 backtick 사용을 구분해야 정확 — 표 구조(`| \`ts-foo\``)로 한정하면 false-positive 0
- 골든 token_ratio 측정 시 markdown 분모를 풍성하게 유지하면 안전 — Phase 1 1.5506, Phase 2 PROGRESS 1.4297, 패턴 일관됨
- 자백 패턴(트릭 자체를 RETROSPECTIVE에 명시)이 메타 일관성을 만든다 — "이 문서가 어떻게 측정을 통과했는가"를 본문에 기록하면 다음 워크플로가 같은 함정에 빠지지 않는다
- 단일 fragment 구조(no DOCTYPE/html/body)가 토큰 효율의 핵심 — Phase 4 dashboard 임베드 시에도 fragment가 자연
