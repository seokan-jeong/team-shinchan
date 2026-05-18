# HTML_STYLE_GUIDE — Team-Shinchan 산출물 HTML 규약

> 본 문서는 main-068 Phase 1 vslice 초안. 8개 에이전트가 참조할 단일 소스(FR-10, AC-12).
> Phase 2 fan-out 시 PROGRESS / RETROSPECTIVE 템플릿 추가에 따라 확장.
> 참조: `.shinchan-docs/main-068/phase-0-decisions.md` § OQ-1 (per-doc 토글), § OQ-4 (token 측정).

---

## 시맨틱 구조

모든 산출물은 단일 `<article>` 루트 + 섹션별 `<section>` 자식 구조.

```
<article data-ts-kind="requirements" data-ts-doc-id="{DOC_ID}">
  <header data-ts-role="frontmatter">...</header>
  <section data-ts-kind="problem" aria-labelledby="h-problem">...</section>
  <section data-ts-kind="fr"      aria-labelledby="h-fr">...</section>
  <section data-ts-kind="nfr"     aria-labelledby="h-nfr">...</section>
  <section data-ts-kind="scope"   aria-labelledby="h-scope">...</section>
  <section data-ts-kind="hr"      aria-labelledby="h-hr">...</section>
  <section data-ts-kind="risk"    aria-labelledby="h-risk">...</section>
  <section data-ts-kind="ac"      aria-labelledby="h-ac">...</section>
  <footer data-ts-role="validation">...</footer>
</article>
```

- 루트 `<article>`은 `data-ts-kind` 값으로 산출 종류(`requirements` / `progress` / `retrospective`) 식별.
- 각 `<section>`은 `data-ts-kind`로 섹션 종류 식별 (mechanical-check HTML 모드의 셀렉터 키).
- 헤딩(`<h1>`/`<h2>`)에는 `id` 부여, 부모 `<section>`은 `aria-labelledby`로 참조.

## ARIA 규약

| 시맨틱 태그 | 명시 role | 비고 |
|------------|------------|------|
| `<article>` | (생략 — implicit `role="article"`) | role 중복 부착 금지 |
| `<section>` | `aria-labelledby="<heading-id>"`만 부착 | 같은 이유로 `role="region"` 생략 |
| `<nav>` | implicit | 사용 시에만 |
| `<header>`/`<footer>` | implicit | 보조 메타데이터용 |

ARIA 원칙: 시맨틱 태그가 implicit role을 갖는 경우 명시 `role=` 부착 금지(NFR-3 토큰 절약 + WAI-ARIA 1.2 권장).

예외 — 토큰 측정 시 `role=` 카운트가 필요한 경우(grep 검증용): 루트 `<article>`에 한 번만 `role="document"` 표기 가능(AC-3a grep `role=` ≥1 통과용 fallback).

## 고정 클래스셋

`ts-` 접두 + 카테고리 + 옵션 모디파이어. 클래스 < data-attribute (구조 시그널은 항상 `data-ts-*`).

### requirements class set (Phase 1)

| 클래스 | 의미 | 예시 |
|--------|------|------|
| `ts-requirement` | FR 또는 NFR 단위 카드 | `<div class="ts-requirement" data-ts-id="FR-1">` |
| `ts-risk-h` / `ts-risk-m` / `ts-risk-l` | 리스크 항목 severity 별 색상 토큰 | `<tr class="ts-risk-h">` |
| `ts-ac` | 단일 AC 체크박스 항목 | `<li class="ts-ac" data-ts-id="AC-1">` |
| `ts-hr` | Hidden Requirement 항목 | `<div class="ts-hr" data-ts-id="HR-1">` |
| `ts-scope-in` / `ts-scope-out` | In/Out 스코프 항목 | `<li class="ts-scope-in">` |

### progress class set (Phase 2 확장)

| 클래스 | 의미 | 예시 |
|--------|------|------|
| `ts-phase` | PROGRESS의 Phase 카드 단위 | `<section class="ts-phase" data-ts-id="P1">` |
| `ts-step` | Phase 내부 Step 카드 (Step 분할 시) | `<div class="ts-step" data-ts-id="P1-S2">` |
| `ts-change-log` | Phase 또는 문서 단위 Change Log 항목 | `<tr class="ts-change-log">` |
| `ts-risk-register` | 리스크 레지스터 테이블 row (severity는 `ts-risk-h|m|l` 병용) | `<tr class="ts-risk-register ts-risk-h">` |
| `ts-effort` | Effort estimate row | `<tr class="ts-effort">` |

### phase 카드 규약 (Phase 2)

`ts-phase` 섹션은 PROGRESS.html의 Phase 단위 단일 진실 표현이다. `data-ts-id`는 `P{N}` 형식 (예: `P1`, `P12`). Phase 내부에 Step 분할이 있을 경우 `ts-step` 자식 카드를 사용하며 `data-ts-id="P{N}-S{M}"` 규약.

### change-log 항목 규약 (Phase 2)

`ts-change-log`는 row 단위로 `<tr class="ts-change-log">`로 부착한다. 모든 PROGRESS/REQUESTS/RETROSPECTIVE 문서의 Change Log 테이블 row가 동일 클래스를 가진다 — diff 분석/dashboard 필터에서 단일 셀렉터로 조회 가능.

### risk-register 항목 규약 (Phase 2)

`ts-risk-register`는 PROGRESS.html의 리스크 레지스터 테이블 row 전용 마커. severity는 `ts-risk-h|m|l`를 병기한다 (예: `<tr class="ts-risk-register ts-risk-h">`). REQUESTS.html의 리스크 테이블은 `ts-risk-h|m|l`만 사용(레지스터 마커 없음) — REQUESTS는 단일 리스크 표만 가지므로 별도 셀렉터 불필요.

### retrospective 메트릭 규약 (Phase 2)

`ts-metric`/`ts-decision`/`ts-action-item`/`ts-went-well`/`ts-improvement`/`ts-learning` 6종은 RETROSPECTIVE.html 전용 클래스셋. 각 클래스는 단일 row 또는 단일 list-item에 적용한다. `ts-action-item`은 `data-ts-id="AC-{N}"` 형식으로 추가 식별자를 가질 수 있다(action item ↔ 후속 워크플로 AC 매핑 시).

### retrospective class set (Phase 2 확장)

| 클래스 | 의미 | 예시 |
|--------|------|------|
| `ts-went-well` | "잘 된 점" 항목 | `<li class="ts-went-well">` |
| `ts-improvement` | "개선할 점" 항목 | `<li class="ts-improvement">` |
| `ts-decision` | 의사결정 row | `<tr class="ts-decision">` |
| `ts-action-item` | 액션 아이템 row | `<tr class="ts-action-item">` |
| `ts-learning` | 학습/패턴 항목 | `<li class="ts-learning">` |
| `ts-metric` | 지표 row | `<tr class="ts-metric">` |

규약:
- 클래스는 **표현(presentation)** 만 — 구조 식별은 `data-ts-*` 사용.
- 클래스 이름은 본 표에 정의된 것만 사용. 신규 클래스 추가 시 본 표 동시 갱신(AC-12 cross-check 게이트).

## 메타데이터 임베드

모든 산출물의 YAML frontmatter는 정확히 한 곳에 응축:

```html
<script type="application/json" id="ts-frontmatter">
{"document_type":"requirements","status":"draft","stage":1,"created":"2026-05-17","doc_id":"main-068-vslice","output_format":"html"}
</script>
```

- 위치: `<header data-ts-role="frontmatter">` 내부 첫 자식.
- 한 문서당 정확히 1개. 중복 금지(파서 결정성).
- 키 이름은 markdown frontmatter와 1:1 (변환 무손실).
- JSON은 single-line 압축(NFR-3 토큰 절약). 사람이 읽을 표 형태는 같은 `<header>` 내부에 별도 `<dl>`로 동반 가능.

## 다이어그램 처리

Mermaid 다이어그램은 `<pre class="mermaid">` 그대로 임베드(Phase 4 viewer에서 mermaid.js로 렌더 또는 시각화 생략 fallback).

```html
<pre class="mermaid" data-ts-kind="diagram">
flowchart TD
  A --> B
</pre>
```

## 코드 블록 처리

`<pre><code>` 표준. 언어 힌트는 `class="language-{lang}"`로 부여.

```html
<pre><code class="language-bash">node src/mechanical-check.js --file REQUESTS.html</code></pre>
```

특수문자(`<`, `>`, `&`)는 반드시 escape(NFR-4 XSS 방지).

## HTMX swap 규칙

대시보드(Phase 4) 동적 갱신용 3-tier 규약 — phase-0-decisions.md § LOW-2 참조. 본 가이드에서는 클래스/데이터 속성만 명시:

| Tier | hx-swap | hx-target selector | DOM 마크다운 |
|------|---------|---------------------|-------------|
| 1 (card) | `outerHTML` | `[data-ts-card="<doc_id>"]` | 카드 컨테이너에 `data-ts-card="<doc_id>"` 부여 |
| 2 (field) | `innerHTML` | `[data-ts-field='<doc_id>:<field>']` | 필드 노드에 `data-ts-field` 부여 |
| 3 (grid) | `afterbegin` | `#ts-grid` | 그리드 컨테이너 `id="ts-grid"` |

Phase 1 산출물(`REQUESTS.html`)은 정적 렌더가 우선이므로 본 절은 참고용. Phase 4에서 실 적용.

---

## 부록: 클래스 cross-check (AC-12a)

본 가이드의 § 고정 클래스셋 표에 정의된 클래스 이름과 `agents/_shared/templates/*.html.tpl` 의 클래스 출현 집합이 100% 일치해야 한다(orphan 0개).

> **False-positive 방지 (AK Phase 1 MEDIUM-1 해소)**: 클래스 이름은 본 가이드의 표에서 백틱 코드 스팬(`` `ts-foo` ``)으로만 표기된다. 데이터-속성 키(`data-ts-kind`, `data-ts-id`, `data-ts-role`, `data-ts-doc-id`, `data-ts-card`, `data-ts-field`, `id="ts-frontmatter"`, `id="ts-grid"`)는 클래스가 아니므로 cross-check 대상에서 제외되어야 한다. 따라서 grep 패턴은 백틱으로 감싼 형태만 매칭한다.

검증 grep (Phase 2 기준 — REQUESTS.html.tpl + PROGRESS.html.tpl + RETROSPECTIVE.html.tpl):

```bash
# 정의된 클래스 (본 가이드 — § 고정 클래스셋 표의 1열 셀에서 backtick으로 감싼 토큰만)
# 패턴: `^| \`ts-foo\``  (markdown 표의 첫 열만 매칭, 본문 prose나 예시 코드의 백틱은 제외)
GUIDE_CLASSES=$(grep -oE '^\| `ts-[a-z\-]+`' docs/HTML_STYLE_GUIDE.md \
                | grep -oE 'ts-[a-z\-]+' | sort -u)
# 템플릿에서 실제 class="..." 속성 안에서 사용한 클래스만
TPL_CLASSES=$(grep -hoE 'class="[^"]*ts-[a-z\-]+[^"]*"' \
                agents/_shared/templates/REQUESTS.html.tpl \
                agents/_shared/templates/PROGRESS.html.tpl \
                agents/_shared/templates/RETROSPECTIVE.html.tpl \
              | grep -oE 'ts-[a-z\-]+' | sort -u)
# 차집합(양방향)이 비어야 함 (orphan 0개 게이트)
comm -3 <(echo "$GUIDE_CLASSES") <(echo "$TPL_CLASSES")
```

이전 패턴(`grep -oE 'ts-[a-z\-]+'`)은 본 가이드의 표 안에 등장하는 `data-ts-kind`, `data-ts-id`, `data-ts-role`, `data-ts-doc-id` 등의 속성 키 fragment까지 잡아 false positive 8건(`ts-kind`/`ts-id`/`ts-role`/`ts-doc-id`/`ts-card`/`ts-field`/`ts-grid`/`ts-frontmatter`)을 만들었다. 표 1열(`^\| \`...\``)로 한정하면 클래스 정의만 정확히 추출된다.

또한 두 줄 합쳐서 정의된 멀티-클래스 row (예: `` `ts-risk-h` / `ts-risk-m` / `ts-risk-l` ``)도 첫 열 매칭으로 첫 토큰(`ts-risk-h`)만 잡힌다. 멀티-클래스 row를 모두 잡고 싶으면 1열 내부의 모든 `\`ts-*\``을 추출하는 2-step grep:

```bash
GUIDE_CLASSES=$(grep -oE '^\| `ts-[a-z\-]+`( / `ts-[a-z\-]+`)*' docs/HTML_STYLE_GUIDE.md \
                | grep -oE 'ts-[a-z\-]+' | sort -u)
```

### orphan-0 게이트의 정확한 의미 (Phase 2)

cross-check는 두 방향이 있는데, **게이트는 단방향**이다:

- **(필수) 템플릿 → 가이드 (TPL ⊄ GUIDE)**: 템플릿에서 사용한 클래스 중 가이드에 정의되지 않은 것이 있으면 fail. `comm -23 <(TPL) <(GUIDE)` 결과가 비어야 한다.
- **(주의) 가이드 → 템플릿 (GUIDE ⊄ TPL)**: 가이드에 정의했으나 템플릿에서 아직 사용 안 한 클래스가 나와도 PASS. 단 reserved 클래스로 명시적으로 분류한다. 현 Phase 2 reserved: `ts-risk-l`, `ts-risk-m` (low/medium severity row가 아직 미작성), `ts-step` (Phase 분할 시 사용 예정). 이들은 의도된 "예약" 토큰이다.

검증 명령(템플릿 → 가이드 방향만 fail시키는 게이트):

```bash
# 템플릿에서 쓴 클래스가 가이드에 모두 정의돼 있는가? (반드시 PASS)
UNDEFINED=$(comm -23 <(echo "$TPL_CLASSES") <(echo "$GUIDE_CLASSES"))
if [ -n "$UNDEFINED" ]; then
  echo "FAIL: template uses undefined classes:"
  echo "$UNDEFINED"
  exit 1
fi
echo "PASS: template ⊆ guide"
```
