# 🎭 Team-Seokan

**짱구 캐릭터 기반 멀티 에이전트 오케스트레이션 시스템**

Claude Code를 위한 플러그인으로, oh-my-opencode에서 영감을 받아 제작되었습니다.

## 🌟 특징

- **14개 전문 에이전트**: 짱구 캐릭터들이 각자의 역할 수행
- **3티어 모델 라우팅**: Opus/Sonnet/Haiku 자동 선택
- **병렬 실행**: 여러 에이전트 동시 실행
- **완료 보장**: Ralph 모드로 작업 완료까지 자동 반복
- **품질 검증**: 액션가면(Reviewer)의 필수 검증

## 🎭 에이전트 팀

### 오케스트레이션
| 캐릭터 | 역할 | 모델 |
|--------|------|------|
| **짱구** | Orchestrator | Opus |
| **짱아** | Atlas | Opus |

### 실행
| 캐릭터 | 역할 | 모델 |
|--------|------|------|
| **맹구** | Executor | Sonnet |
| **철수** | Hephaestus | Opus |

### 전문가
| 캐릭터 | 역할 | 모델 |
|--------|------|------|
| **수지** | Frontend | Sonnet |
| **흑곰** | Backend | Sonnet |
| **훈이** | DevOps | Sonnet |

### 조언 (읽기 전용)
| 캐릭터 | 역할 | 모델 |
|--------|------|------|
| **신형만** | Oracle | Opus |
| **유리** | Planner | Opus |
| **봉미선** | Metis | Sonnet |
| **액션가면** | Reviewer | Opus |

### 탐색 (읽기 전용)
| 캐릭터 | 역할 | 모델 |
|--------|------|------|
| **흰둥이** | Explorer | Haiku |
| **채성아** | Librarian | Sonnet |
| **나미리** | Multimodal | Sonnet |

## 🚀 설치

```bash
# 저장소 클론
git clone https://github.com/seokan/team-seokan.git
cd team-seokan

# 의존성 설치
bun install

# 빌드
bun run build

# Claude Code에 플러그인 설치
bun run install-plugin
```

## 📖 사용법

### 에이전트 위임

```typescript
// 맹구에게 코드 작성 위임
delegate_task(agent="maenggu", task="Button 컴포넌트 생성")

// 흰둥이에게 코드 탐색 위임
delegate_task(agent="heendungi", task="API 엔드포인트 찾기")

// 배경에서 실행
background_task(agent="chaesunga", task="관련 문서 검색")
```

### 스킬 사용

| 스킬 | 트리거 | 설명 |
|------|--------|------|
| `ultrawork` | "ulw", "병렬" | 병렬 실행 모드 |
| `ralph` | "끝까지", "완료할 때까지" | 완료까지 반복 |
| `autopilot` | "자동으로", "알아서" | 자율 실행 |
| `plan` | "계획", "설계" | 계획 세션 |
| `analyze` | "분석", "디버깅" | 심층 분석 |
| `deepsearch` | "찾아줘", "검색" | 심층 검색 |

### 예시

```
# Ultrawork 모드로 빠르게 작업
ulw 이 기능 구현해줘

# Ralph 모드로 완료까지
끝까지 해줘: TODO 리스트 전부 완료

# Autopilot으로 자율 실행
autopilot: REST API 만들어줘
```

## ⚙️ 설정

`~/.config/team-seokan/config.json` 또는 프로젝트 루트의 `.team-seokan/config.json`:

```json
{
  "defaultModel": "sonnet",
  "maxConcurrentAgents": 5,
  "maxRetries": 3,
  "contextWarningThreshold": 50,
  "enableRalphLoop": true,
  "enableTodoEnforcer": true,
  "enableIntentGate": true,
  "enableReviewerCheck": true,
  "language": "ko"
}
```

## 🏗️ 프로젝트 구조

```
team-seokan/
├── src/
│   ├── agents/          # 14개 에이전트
│   ├── hooks/           # 25개 훅
│   ├── tools/           # 15개 도구
│   ├── features/        # 기능 모듈
│   │   └── builtin-skills/  # 10개 스킬
│   ├── config/          # 설정
│   ├── shared/          # 공유 유틸리티
│   └── types/           # 타입 정의
├── CLAUDE.md            # 시스템 프롬프트
├── plugin.json          # 플러그인 매니페스트
└── package.json
```

## 🤝 영감

이 프로젝트는 다음에서 영감을 받았습니다:

- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) - OpenCode 플러그인
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) - Claude Code 플러그인

## 📄 라이선스

MIT License

---

**Team-Seokan** - 짱구와 친구들이 당신의 코딩을 도와드립니다! 🖍️
