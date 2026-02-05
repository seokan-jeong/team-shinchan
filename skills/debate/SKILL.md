---
name: team-shinchan:debate
description: Specialized agents debate to find optimal solutions. Used for "debate", "pros and cons", "gather opinions" requests.
user-invocable: true
---

# EXECUTE IMMEDIATELY - Midori에게 위임

**Midori를 Task 도구로 호출하여 Debate를 진행하세요.**

---

## 🔔 자동 트리거 조건 (Auto-Trigger)

**Shinnosuke가 다음 상황을 감지하면 즉시 Debate를 시작합니다:**

| 상황 | Auto-Debate | 예시 |
|------|------------|------|
| 2+ 구현 접근법 존재 | ✅ | REST vs GraphQL, Monolith vs Microservices |
| 아키텍처 변경 | ✅ | DB 스키마 재설계, 레이어 구조 변경 |
| 기존 패턴 깨뜨림 | ✅ | 기존 컨벤션과 다른 방식 제안 |
| 성능 vs 가독성 트레이드오프 | ✅ | 최적화 vs 유지보수성 |
| 보안에 민감한 결정 | ✅ | 인증 방식, 데이터 암호화 방식 |
| Simple CRUD | ❌ | 단순 CRUD 엔드포인트 |
| Clear bug fix | ❌ | 명확한 버그 수정 |
| User explicitly decided | ❌ | 사용자가 이미 결정함 |

### 자동 트리거 시 동작

1. **즉시 Debate 시작 공지**
   ```
   ⚠️ 설계 결정 필요: [감지된 상황]
   → Debate 자동 시작
   ```

2. **수동 호출과 동일한 프로세스 실행**
   - 아래 Step 1~3과 동일하게 진행
   - 차이점: 사용자가 명시적으로 호출하지 않았으므로 배경 설명 추가

3. **결정 사항을 REQUESTS.md에 기록**
   - Stage 1: 요구사항에 결정 사항 추가
   - Stage 2+: PROGRESS.md의 해당 Phase에 기록

---

## Step 1: Midori 호출

```typescript
Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt="Debate를 진행해주세요.

## 주제
{토론 주제}

## 패널
{패널 목록}

## 진행 방식
1. Debate 시작 공지
2. 패널 의견 수집 (병렬 Task)
3. 의견 실시간 출력
4. Hiroshi 합의 도출
5. 최종 결정 보고"
)
```

## Step 2: 결과를 사용자에게 전달

Midori로부터 결과를 받으면 다음 형식으로 사용자에게 정리해서 전달:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: {주제}

🎤 전문가 의견:
- [Hiroshi]: {의견 요약}
- [Nene]: {의견 요약}

✅ 권장 결정: {Midori의 결론}
📝 근거: {근거}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3: 사용자 의견 확인

결과를 전달한 후 사용자에게 질문:

"위 권장 결정에 동의하시나요? 다른 의견이나 추가로 고려할 사항이 있으시면 말씀해주세요."

## Step 4: 최종 결정

- 사용자 동의 시: 결정 사항 문서화 후 진행
- 사용자 이견 시: 우려사항 반영하여 결정 수정
- **사용자 확인 없이는 절대 진행하지 않음**

## 패널 선정 기준

| 주제 | 패널 |
|------|------|
| UI/Frontend | Aichan, Hiroshi |
| API/Backend | Bunta, Hiroshi |
| DevOps/Infra | Masao, Hiroshi |
| Architecture | Hiroshi, Nene, Misae |

---

## 📖 자동 트리거 예시

### 예시 1: 2+ 구현 접근법 감지

```
[Shinnosuke가 분석 중...]
감지: 인증 구현에 JWT와 Session 두 가지 접근법 가능

⚠️ 설계 결정 필요: 인증 방식 선택 (JWT vs Session)
→ Debate 자동 시작

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 시작 (자동)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: 인증 방식 선택
👥 패널: Hiroshi, Bunta
🎯 목표: JWT와 Session 중 최적 선택

[이후 일반 Debate 프로세스 진행...]
```

### 예시 2: 아키텍처 변경 감지

```
[Bo가 제안...]
"User 테이블에 roles 필드를 추가하는 대신, 별도 Role 테이블 생성을 제안합니다."

[Shinnosuke 감지]
감지: DB 스키마 변경 → 아키텍처 영향 검토 필요

⚠️ 설계 결정 필요: Role 관리 방식 (단일 테이블 vs 정규화)
→ Debate 자동 시작

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 시작 (자동)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: Role 관리 DB 설계
👥 패널: Hiroshi, Bunta, Nene
🎯 목표: 확장성과 유지보수성 고려한 최적 스키마 결정
```

### 예시 3: 성능 vs 가독성 트레이드오프

```
[Action Kamen 리뷰 중...]
"현재 코드는 가독성이 좋으나 N+1 쿼리 문제 존재. 최적화하면 복잡도 증가."

[Shinnosuke 감지]
감지: 성능 최적화 vs 코드 가독성 트레이드오프

⚠️ 설계 결정 필요: 쿼리 최적화 수준 결정
→ Debate 자동 시작
```

---

## ⚙️ Shinnosuke의 자동 감지 로직

**Shinnosuke는 다음 신호를 감지합니다:**

| 신호 | 감지 방법 |
|------|----------|
| 2+ 접근법 언급 | "A 또는 B", "vs", "방법1/방법2" 등의 표현 |
| 아키텍처 키워드 | "schema change", "layer", "structure", "architecture" |
| 패턴 위반 | Action Kamen이 "기존 패턴과 다름" 경고 |
| 트레이드오프 언급 | "but", "however", "trade-off", "at the cost of" |
| 보안 키워드 | "auth", "security", "encryption", "permission" |

**자동 감지 후 즉시:**
1. 상황 공지
2. Debate 시작 (위 프로세스와 동일)
3. 결정 사항 문서화
