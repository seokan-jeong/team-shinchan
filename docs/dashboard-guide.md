# Team-Shinchan 대시보드 사용 가이드

> 버전: 1.1.0 | 최종 수정: 2026-02-22

---

## 목차

1. [개요](#1-개요)
2. [설치 및 설정](#2-설치-및-설정)
3. [사용법](#3-사용법)
4. [아키텍처](#4-아키텍처)
5. [API 레퍼런스](#5-api-레퍼런스)
6. [트러블슈팅](#6-트러블슈팅)
7. [개발자 참고](#7-개발자-참고)

---

## 1. 개요

### 대시보드란?

Team-Shinchan 대시보드는 Claude Code 세션에서 AI 에이전트들이 어떻게 협력하는지를 **실시간으로 시각화**하는 웹 인터페이스입니다.

Claude Code가 작업을 수행하는 동안:
- 어떤 에이전트가 현재 활동 중인지
- 에이전트 간 위임(delegation) 흐름이 어떻게 진행되는지
- 워크플로우가 4단계 중 어느 단계에 있는지
- 에이전트들이 주고받는 메시지
- Debate(토론) 진행 상황

이 모든 것을 브라우저에서 실시간으로 확인할 수 있습니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| 에이전트 패널 | 15명 에이전트의 실시간 상태 (idle / working / delegating) |
| 워크플로우 프로그레스 바 | Requirements > Planning > Execution > Completion 4단계 진행 상황 |
| 활동 타임라인 | 이벤트를 시간순으로 표시하는 실시간 로그 |
| 대화 뷰 | 에이전트 간 메시지를 채팅 형태로 표시 |
| 위임 흐름 시각화 | 에이전트 위임 체인 (예: Shinnosuke -> Nene -> Bo) |
| Debate 패널 | 토론 진행 시 패널리스트별 의견과 결론 실시간 표시 |
| SSE 실시간 업데이트 | 페이지 새로고침 없이 자동 갱신 |

### 대시보드 레이아웃 (ASCII 다이어그램)

```
+------------------------------------------------------------------+
|  Team-Shinchan Dashboard                    [연결 상태: 녹색 점] |
+------------------------------------------------------------------+
|                |                                                  |
| [에이전트 패널] |  [워크플로우 프로그레스 바]                       |
|                |  Requirements > Planning > Execution > Completion|
| 👦 Shinnosuke  |  ======================>                         |
|  Orchestrator  |                                                  |
|  [working]     |  [타임라인] [대화] [토론]  <-- 탭 전환           |
|                |  +-----------------------------------------+    |
| 🌸 Himawari    |  | [타임라인 탭 - 기본]                    |    |
|  Atlas         |  |                                         |    |
|  [idle]        |  | 14:23:01  👦 Shinnosuke 작업 시작        |    |
|                |  | 14:23:03  👦 -> 📋 Nene 위임            |    |
| 🌻 Midori      |  | 14:23:05  📋 Nene 작업 중               |    |
|  Debate Mod.   |  | 14:23:10  📋 -> 😪 Bo 위임             |    |
|  [idle]        |  |                                         |    |
|                |  +-----------------------------------------+    |
| 😪 Bo          |                                                  |
|  Task Executor |  [위임 흐름]                                     |
|  [working]     |  👦 Shinnosuke -> 📋 Nene -> 😪 Bo               |
|   ...          |                                                  |
+------------------------------------------------------------------+
```

---

## 2. 설치 및 설정

### 사전 요구사항

- **Node.js 18.0.0 이상** (순수 내장 모듈만 사용, 외부 패키지 불필요)
- `curl` 명령어 (Hook 이벤트 전송용)
- Claude Code (플러그인 활성화 환경)

Node.js 버전 확인:

```bash
node --version
# v18.0.0 이상이어야 합니다
```

### 자동 시작 방식 (권장)

대시보드는 **MCP 서버로 자동 실행**됩니다. Claude Code 세션이 시작될 때 `.mcp.json` 설정에 따라 자동으로 기동합니다.

`.mcp.json` 설정 (플러그인 루트에 위치):

```json
{
  "mcpServers": {
    "team-shinchan-dashboard": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dashboard/server.mjs"],
      "env": {
        "DASHBOARD_PORT": "3333",
        "SHINCHAN_DOCS_DIR": ".shinchan-docs"
      }
    }
  }
}
```

Claude Code를 시작하면 자동으로 `http://localhost:3333`에서 대시보드에 접속할 수 있습니다.

### 수동 시작 방식 (테스트용)

개발이나 테스트 목적으로 대시보드를 직접 실행할 수 있습니다:

```bash
# 기본 실행 (포트 3333)
node /path/to/team-shinchan/dashboard/server.mjs

# 포트 변경
DASHBOARD_PORT=3334 node dashboard/server.mjs

# 문서 디렉토리 지정 (절대 경로)
SHINCHAN_DOCS_DIR=/absolute/path/to/.shinchan-docs node dashboard/server.mjs

# 문서 디렉토리 지정 (상대 경로 - 플러그인 루트 기준)
SHINCHAN_DOCS_DIR=.shinchan-docs node dashboard/server.mjs
```

서버 로그는 `stderr`로 출력됩니다 (MCP stdio가 `stdout`을 사용하기 때문):

```
[dashboard] 파일 감시 시작: /path/to/.shinchan-docs
[dashboard] HTTP 서버 시작: http://localhost:3333
[dashboard] MCP stdio 서버 준비 완료
```

### 환경변수 설정

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `DASHBOARD_PORT` | `3333` | HTTP 서버 포트 번호 |
| `SHINCHAN_DOCS_DIR` | `.shinchan-docs` | 워크플로우 문서 디렉토리 경로 (절대 경로 또는 플러그인 루트 기준 상대 경로) |
| `DASHBOARD_URL` | `http://localhost:3333` | Hook 이벤트 전송 대상 URL (send-event.sh에서 사용) |
| `DASHBOARD_STANDALONE` | 미지원 | (향후 예정) 독립 실행 모드 |
| `DASHBOARD_AUTO_OPEN` | `true` | 서버 시작 시 브라우저 자동 열기 (`false`로 비활성화) |

> **참고**: `SHINCHAN_DOCS_DIR`에 절대 경로를 지정하면 그 경로를 그대로 사용하고, 상대 경로를 지정하면 플러그인 루트(`${CLAUDE_PLUGIN_ROOT}`)를 기준으로 해석합니다.

---

## 3. 사용법

### 대시보드 접속

Claude Code 세션이 시작된 후 브라우저에서 접속합니다:

```
http://localhost:3333
```

포트를 변경한 경우:

```
http://localhost:{DASHBOARD_PORT}
```

### 대시보드 레이아웃 설명

#### 헤더 영역

- **제목**: "Team-Shinchan Dashboard"
- **연결 상태 표시기**: SSE 연결 상태를 색상으로 표시
  - 녹색 점: 서버와 실시간 연결 중
  - 빨간 점: 연결 끊김 (자동 재연결 시도)

#### 왼쪽 사이드바 - 에이전트 패널

15명의 에이전트가 레이어별로 표시됩니다:

```
Orchestration:  👦 Shinnosuke  🌸 Himawari  🌻 Midori
Execution:      😪 Bo          🎩 Kazama
Specialist:     🎀 Aichan      🍜 Bunta     🍙 Masao
Advisory:       👔 Hiroshi     📋 Nene      👩 Misae  🦸 Action Kamen
Utility:        🐶 Shiro       📚 Masumi    🖼️ Ume
```

각 에이전트 카드에는 다음 정보가 표시됩니다:
- **이모지 + 이름**: 에이전트 식별
- **역할**: Orchestrator, Planner, Code Executor 등
- **상태 배지**:
  - `idle`: 대기 중 (회색)
  - `working`: 작업 중 (녹색 펄스 애니메이션)
  - `delegating`: 위임 중 (주황색)
  - `receiving`: 위임 받는 중 (파란색)

에이전트 카드를 클릭하면 상세 정보(마지막 메시지, 작업 시간 등)를 확인할 수 있습니다.

#### 중앙 상단 - 워크플로우 프로그레스 바

Team-Shinchan의 4단계 워크플로우 진행 상황을 표시합니다:

```
[1. Requirements] > [2. Planning] > [3. Execution] > [4. Completion]
       완료              완료          진행 중            대기
```

PROGRESS.md 파일을 실시간으로 감시하여 자동 업데이트됩니다.

#### 중앙 하단 - 탭 전환 영역

세 가지 탭으로 다양한 뷰를 제공합니다:

**[타임라인] 탭 (기본)**

이벤트를 시간순으로 표시합니다. 각 항목에는 다음이 포함됩니다:
- 타임스탬프
- 이벤트 아이콘: `SubagentStart(녹색)`, `SubagentStop(빨간)`, `PostToolUse(렌치)`, `UserPrompt(말풍선)`, `Stop(정지)`
- 에이전트 이모지 + 이름
- 이벤트 요약 메시지

**[대화] 탭**

에이전트 간 메시지를 채팅 버블 형태로 표시합니다:
- 에이전트별 색상 구분
- 위임 메시지는 화살표(→)로 강조 표시: `👦 [Shinnosuke] → 😪 [Bo] "태스크 설명"`
- 사용자 입력도 별도 스타일로 표시
- 최신 메시지로 자동 스크롤

**[토론] 탭**

Midori가 Debate를 진행할 때 자동으로 활성화됩니다:
- 토론 주제 표시
- 패널리스트 카드 (각 에이전트의 의견을 라운드별로 표시)
- Debate가 없을 때: "진행 중인 토론이 없습니다"
- Debate 완료 시: 최종 결론 강조 표시

#### 하단 - 위임 흐름

현재 활성 위임 체인을 화살표로 시각화합니다:

```
👦 Shinnosuke -> 📋 Nene -> 😪 Bo
```

---

## 4. 아키텍처

### 시스템 개요

대시보드는 **외부 의존성이 전혀 없는 순수 Node.js** 서버입니다. 단일 프로세스에서 두 가지 프로토콜을 동시에 처리합니다:

1. **MCP stdio 서버** (표준 입출력): Claude Code와 JSON-RPC 2.0으로 통신
2. **HTTP 서버** (포트 3333): 브라우저 및 Hook 이벤트 수신

### 데이터 흐름 다이어그램 (ASCII)

```
+------------------------------------------------------------------+
|                    Claude Code Session                           |
|                                                                  |
|  +-------------+   +------------------------------------------+ |
|  | Prompt Hooks|   | Command Hooks (hooks/hooks.json)          | |
|  | (.md 파일)  |   |                                          | |
|  |             |   | SubagentStart   -> send-event.sh         | |
|  | shinnosuke  |   | SubagentStop    -> send-event.sh         | |
|  | workflow-   |   | PostToolUse     -> send-event.sh         | |
|  | guard       |   | UserPromptSubmit-> send-event.sh         | |
|  | auto-verify |   | Stop            -> send-event.sh         | |
|  | load-kb     |   | SessionStart    -> send-event.sh         | |
|  | auto-retro  |   | SessionEnd      -> send-event.sh         | |
|  +-------------+   +------------------+-----------------------+ |
|                                       | HTTP POST /api/events   |
+---------------------------------------+-------------------------+
                                        |
                                        v
+------------------------------------------------------------------+
|              dashboard/server.mjs (Node.js)                      |
|                                                                  |
|  +-------------+  +--------------+  +------------------------+  |
|  | MCP stdio   |  | HTTP :3333   |  | fs.watch()             |  |
|  | (JSON-RPC)  |  |              |  | .shinchan-docs/ 감시   |  |
|  |             |  | POST /api/   |  |                        |  |
|  | tools:      |  |   events     |  | WORKFLOW_STATE.yaml    |  |
|  |  get_url    |  | GET  /api/   |  | PROGRESS.md            |  |
|  |  get_status |  |   *          |  | REQUESTS.md            |  |
|  |  send_event |  | GET  /       |  |   500ms 디바운스       |  |
|  +-------------+  +-------+------+  +-----------+------------+  |
|                           |                     |                |
|                    +------+---------------------+------+         |
|                    |    In-Memory State (인메모리)     |         |
|                    |                                   |         |
|                    | - workflow: {stage,phase,status}  |         |
|                    | - agents[15]: {status,lastSeen}   |         |
|                    | - events[1000]: 최근 이벤트       |         |
|                    | - delegations[100]: 위임 흐름     |         |
|                    | - messages[200]: 에이전트 메시지  |         |
|                    | - debate: {topic,panelists,...}   |         |
|                    | - session: {active,startedAt}     |         |
|                    +------+----------------------------+         |
|                           | SSE broadcast                        |
+---------------------------+--------------------------------------+
                            |
                            v
+------------------------------------------------------------------+
|              브라우저 (http://localhost:3333)                     |
|              dashboard/public/index.html                         |
|                                                                  |
|  EventSource('/api/events/stream')                               |
|  fetch('/api/status')  fetch('/api/agents')                      |
|                                                                  |
|  SSE 이벤트 수신 -> DOM 업데이트 -> 실시간 반영                  |
+------------------------------------------------------------------+
```

### 핵심 설계 결정

| 항목 | 선택 | 이유 |
|------|------|------|
| 런타임 | Node.js 순수 내장 모듈 | 외부 패키지 설치 불필요, Claude Code 사용자는 Node.js 보유 |
| 실시간 통신 | SSE (Server-Sent Events) | WebSocket보다 구현 단순, 서버->클라이언트 단방향으로 충분 |
| 데이터 저장 | In-Memory Array | SQLite 불필요, 세션 중에만 유효한 데이터 |
| 프론트엔드 | 단일 HTML (인라인 JS/CSS) | 빌드 도구 불필요, 바닐라 JS |
| Hook 전송 | curl + HTTP POST | 범용적, 모든 OS에서 사용 가능 |
| 로깅 | `process.stderr` 전용 | MCP stdio가 `stdout`을 사용하므로 `console.log` 금지 |

### 파일 구조

```
team-shinchan/
├── .mcp.json                     # MCP 서버 등록 (Claude Code가 자동으로 읽음)
├── hooks/
│   ├── hooks.json                # Command Hook 정의 (7가지 이벤트)
│   └── send-event.sh             # Hook 이벤트 -> HTTP POST 변환 스크립트
└── dashboard/
    ├── server.mjs                # MCP stdio + HTTP 서버 (단일 파일)
    ├── package.json              # 메타데이터만 (의존성 없음)
    └── public/
        └── index.html            # 단일 HTML 대시보드 (인라인 CSS/JS)
```

---

## 5. API 레퍼런스

모든 API는 `http://localhost:3333` (또는 설정된 포트)를 기준으로 합니다. CORS는 모든 출처(`*`)에 허용됩니다.

---

### GET /api/status

서버 및 워크플로우 전체 상태를 반환합니다.

**응답 예시:**

```json
{
  "workflow": {
    "stage": "execution",
    "phase": "Phase 2",
    "status": "active",
    "docId": "haze-001"
  },
  "session": {
    "active": true,
    "startedAt": "2026-02-19T14:00:00.000Z"
  },
  "delegationChain": ["shinnosuke", "nene", "bo"],
  "eventCount": 42,
  "delegationCount": 7,
  "messageCount": 15,
  "sseClients": 1,
  "server": {
    "port": 3333,
    "uptime": 3600.5,
    "version": "1.0.0",
    "startedAt": "2026-02-19T13:00:00.000Z"
  },
  "timestamp": "2026-02-19T14:23:00.000Z"
}
```

---

### GET /api/agents

15명 에이전트의 정적 정보 및 동적 상태를 반환합니다.

**응답 예시:**

```json
{
  "agents": [
    {
      "id": "shinnosuke",
      "emoji": "👦",
      "name": "Shinnosuke",
      "role": "Orchestrator",
      "layer": "Orchestration",
      "model": "opus",
      "status": {
        "active": true,
        "status": "working",
        "lastSeen": "2026-02-19T14:23:00.000Z",
        "lastMessage": "작업을 시작합니다..."
      }
    }
  ]
}
```

---

### GET /api/events

최근 이벤트 목록을 반환합니다.

**쿼리 파라미터:**

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `limit` | `50` | 반환할 최대 이벤트 수 (최대 1000) |

**응답 예시:**

```json
{
  "events": [
    {
      "id": 1708358580000,
      "type": "agent_start",
      "agent": "bo",
      "timestamp": "2026-02-19T14:23:00.000Z"
    }
  ],
  "total": 42
}
```

---

### GET /api/delegations

위임 흐름 기록과 현재 위임 체인을 반환합니다.

**쿼리 파라미터:**

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `limit` | `50` | 반환할 최대 위임 수 (최대 100) |

**응답 예시:**

```json
{
  "delegations": [
    {
      "from": "shinnosuke",
      "to": "nene",
      "task": "요구사항 분석 시작",
      "timestamp": "2026-02-19T14:23:00.000Z"
    }
  ],
  "chain": ["shinnosuke", "nene", "bo"],
  "total": 7
}
```

---

### GET /api/messages

에이전트 메시지 히스토리를 반환합니다.

**쿼리 파라미터:**

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `limit` | `50` | 반환할 최대 메시지 수 (최대 200) |
| `agent` | (없음) | 특정 에이전트의 메시지만 필터링 |
| `type` | (없음) | `chat` 지정 시 파싱된 에이전트 메시지만 반환 |

**응답 예시:**

```json
{
  "messages": [
    {
      "agent": "bo",
      "content": "😪 [Bo] 구현을 시작하겠습니다.",
      "parsed": {
        "type": "agent_message",
        "agent": "bo",
        "content": "구현을 시작하겠습니다."
      },
      "timestamp": "2026-02-19T14:23:05.000Z"
    }
  ],
  "total": 15
}
```

---

### GET /api/debate

현재 Debate(토론) 상태를 반환합니다.

**응답 예시:**

```json
{
  "debate": {
    "active": true,
    "topic": "REST vs GraphQL 선택",
    "panelists": ["hiroshi", "bunta", "aichan"],
    "opinions": [
      {
        "agent": "hiroshi",
        "opinion": "REST가 더 단순하고 캐싱이 용이합니다.",
        "round": 1,
        "timestamp": "2026-02-19T14:23:10.000Z"
      }
    ],
    "conclusion": null,
    "startedAt": "2026-02-19T14:23:00.000Z",
    "endedAt": null
  },
  "timestamp": "2026-02-19T14:23:15.000Z"
}
```

---

### POST /api/events

Hook 스크립트 또는 외부 도구에서 이벤트를 전송합니다.

**요청 헤더:**

```
Content-Type: application/json
```

**요청 본문:**

`type` 필드는 필수입니다. 나머지는 이벤트 타입에 따라 다릅니다 (아래 이벤트 타입 참조).

```json
{
  "type": "agent_start",
  "agent": "bo"
}
```

**응답 예시:**

```json
{
  "ok": true,
  "id": 1708358580123
}
```

**오류 응답:**

```json
{
  "error": "type 필드가 필요합니다"
}
```

---

### GET /api/events/stream

SSE(Server-Sent Events) 스트림입니다. 브라우저의 `EventSource` API로 연결합니다.

**연결 방법:**

```javascript
const source = new EventSource('http://localhost:3333/api/events/stream');
```

**응답 헤더:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**초기 연결 시 이벤트:**

```
event: connected
data: {"message":"SSE 연결 성공","clientId":...,"timestamp":"...","workflow":{...}}
```

**Heartbeat (30초마다):**

```
: heartbeat 2026-02-19T14:23:00.000Z
```

연결이 끊어지면 브라우저가 자동으로 재연결을 시도합니다.

---

## 6. 트러블슈팅

### 포트 충돌

**증상:** 서버 시작 시 `EADDRINUSE: address already in use :::3333` 오류가 발생합니다.

**해결 방법:**

1. 사용 중인 프로세스 확인 및 종료:

```bash
# 포트 3333 사용 프로세스 확인
lsof -i :3333

# 또는
netstat -tlnp | grep 3333

# 해당 프로세스 종료
kill -9 <PID>
```

2. 다른 포트 사용:

```bash
# .mcp.json에서 포트 변경
DASHBOARD_PORT=3334 node dashboard/server.mjs
```

3. `DASHBOARD_PORT` 환경변수를 변경한 경우, `DASHBOARD_URL`도 함께 변경해야 Hook 이벤트가 올바른 포트로 전송됩니다:

```bash
DASHBOARD_URL=http://localhost:3334 DASHBOARD_PORT=3334 node dashboard/server.mjs
```

---

### 대시보드가 뜨지 않을 때

**증상:** `http://localhost:3333`에 접속해도 페이지가 로드되지 않습니다.

**확인 사항:**

1. 서버가 실행 중인지 확인:

```bash
ps aux | grep "server.mjs"
```

2. MCP 서버가 정상 등록됐는지 확인:
   - Claude Code에서 `/mcp` 명령으로 MCP 서버 목록 확인
   - `team-shinchan-dashboard`가 목록에 있어야 합니다

3. `dashboard/public/index.html` 파일 존재 여부 확인:

```bash
ls dashboard/public/index.html
```

4. Node.js 버전 확인:

```bash
node --version
# v18.0.0 이상이어야 합니다
```

5. stderr 로그 확인:
   - MCP 서버를 수동으로 실행하면 stderr에서 오류 확인 가능:

```bash
node dashboard/server.mjs 2>&1 | grep '\[dashboard\]'
```

---

### 이벤트가 표시되지 않을 때

**증상:** 대시보드는 열렸지만 에이전트 상태가 변하지 않고 타임라인이 비어있습니다.

**확인 사항:**

1. SSE 연결 상태 확인:
   - 헤더의 연결 상태 표시기가 녹색인지 확인
   - 빨간색이면 SSE 연결이 끊어진 것 (자동 재연결 대기 중)

2. Hook이 활성화됐는지 확인:
   - `hooks/hooks.json`이 Claude Code에 올바르게 로드됐는지 확인
   - Claude Code의 Settings > Hooks에서 활성 Hook 목록 확인

3. `send-event.sh` 권한 확인:

```bash
ls -la hooks/send-event.sh
# -rwxr-xr-x 이어야 합니다 (실행 권한 필요)

# 권한 부여
chmod +x hooks/send-event.sh
```

4. curl 직접 테스트:

```bash
# 이벤트 수동 전송 테스트
curl -X POST http://localhost:3333/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"agent_start","agent":"bo"}'

# 응답: {"ok":true,"id":...}
```

5. Hook 스크립트 직접 실행 테스트:

```bash
echo '{"agent_type":"team-shinchan:bo"}' | \
  HOOK_EVENT=SubagentStart \
  bash hooks/send-event.sh
```

---

### 워크플로우 상태가 업데이트되지 않을 때

**증상:** 대시보드의 워크플로우 프로그레스 바가 변하지 않습니다.

**확인 사항:**

1. `.shinchan-docs/` 디렉토리 경로 확인:
   - `SHINCHAN_DOCS_DIR`가 올바른 경로를 가리키는지 확인
   - 절대 경로 또는 플러그인 루트 기준 상대 경로 둘 다 지원

```bash
# 서버 시작 시 로그에서 경로 확인
[dashboard] 파일 감시 시작: /path/to/.shinchan-docs
```

2. `WORKFLOW_STATE.yaml` 파일 존재 여부 확인:

```bash
ls .shinchan-docs/*/WORKFLOW_STATE.yaml
```

3. YAML 파일 형식 확인:
   - 서버는 정규식으로 `stage:`, `phase:`, `status:`, `doc_id:` 필드를 추출합니다
   - `key: value` 또는 `key: "value"` 형식 모두 지원

---

### 좀비 프로세스가 남아있을 때

**증상:** Claude Code 세션 재시작 후에도 이전 대시보드 서버 프로세스가 포트를 점유하고 있습니다.

**해결 방법:**

서버는 시작 시 자동으로 다른 `server.mjs` 프로세스를 감지하고 종료합니다 (`killZombieProcesses()`). 자동 정리가 실패한 경우 수동으로 처리합니다:

```bash
# 실행 중인 server.mjs 프로세스 확인
pgrep -f "node.*server\.mjs"

# 해당 PID 종료 (PID를 실제 값으로 교체)
kill -TERM <PID>

# 또는 일괄 종료
pkill -f "node.*server\.mjs"
```

---

### 브라우저가 자동으로 열리지 않을 때

**증상:** 서버 로그에 `브라우저 열기 실패` 메시지가 표시되거나, 브라우저가 열리지 않습니다.

**확인 사항:**

1. `DASHBOARD_AUTO_OPEN` 환경변수 확인:

```bash
# 비활성화 여부 확인
echo $DASHBOARD_AUTO_OPEN
# false면 브라우저가 열리지 않도록 설정된 것

# 활성화 (기본값)
DASHBOARD_AUTO_OPEN=true node dashboard/server.mjs
```

2. headless/SSH 환경에서는 브라우저 열기가 불가능합니다. 서버 로그에서 URL을 확인하고 수동으로 접속합니다:

```bash
# 서버 로그에서 URL 확인
# [dashboard] HTTP 서버 시작: http://localhost:3333

# 수동 접속
open http://localhost:3333        # macOS
xdg-open http://localhost:3333    # Linux
```

3. 서버 로그에서 오류 확인:

```bash
node dashboard/server.mjs 2>&1 | grep "브라우저"
# [dashboard] 브라우저 열기 성공: http://localhost:3333
# 또는
# [dashboard] 브라우저 열기 실패 (darwin): ...
```

---

### Node.js 버전 문제

**증상:** `SyntaxError: Cannot use import statement` 또는 `fs.watch recursive option not supported` 오류.

**원인 및 해결:**

| 오류 | 원인 | 해결 |
|------|------|------|
| `import` 구문 오류 | Node.js 12 이하 | Node.js 18+ 설치 |
| `fs.watch recursive` 오류 | Node.js 18 미만 | Node.js 18+ 설치 |
| `URL` 객체 오류 | Node.js 10 이하 | Node.js 18+ 설치 |

```bash
# Node.js 버전 업그레이드 (nvm 사용)
nvm install 18
nvm use 18

# 또는 공식 사이트에서 다운로드
# https://nodejs.org/
```

---

## 7. 개발자 참고

### 이벤트 타입 목록 (POST /api/events)

`POST /api/events`로 전송할 수 있는 이벤트 타입입니다.

| 타입 | 필수 필드 | 선택 필드 | 설명 |
|------|----------|----------|------|
| `agent_start` | `agent` | `task`, `content` | 에이전트 작업 시작 (status: working) |
| `agent_done` | `agent` | `content`, `result` | 에이전트 작업 완료 (status: idle) |
| `delegation` | `from`, `to` | `task`, `content` | 에이전트 간 위임 발생 |
| `message` | `agent`, `content` | - | 에이전트 메시지 (채팅 뷰에 표시) |
| `user_prompt` | `content` | `prompt` | 사용자 입력 |
| `stop` | - | `content` | 메인 응답 완료 (shinnosuke idle) |
| `session_start` | - | `content` | 세션 시작 (전체 상태 초기화) |
| `session_end` | - | `content` | 세션 종료 |
| `debate_start` | - | `topic`, `panelists` | Debate 시작 |
| `debate_opinion` | `agent`, `opinion` | `round` | Debate 의견 추가 |
| `debate_conclusion` | - | `conclusion`, `content` | Debate 결론 |
| `tool_use` | - | `agent`, `tool`, `content` | 도구 사용 기록 |
| `workflow_update` | `workflow` | - | 워크플로우 상태 직접 변경 |

**예시:**

```bash
# 에이전트 작업 시작
curl -X POST http://localhost:3333/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"agent_start","agent":"bo","task":"코드 구현 중"}'

# 위임 이벤트
curl -X POST http://localhost:3333/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"delegation","from":"shinnosuke","to":"nene","task":"요구사항 분석"}'

# Debate 시작
curl -X POST http://localhost:3333/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"debate_start","topic":"REST vs GraphQL","panelists":["hiroshi","bunta"]}'
```

---

### SSE 이벤트 타입 목록 (GET /api/events/stream)

서버에서 브라우저로 브로드캐스트되는 SSE 이벤트 타입입니다.

| SSE 이벤트 타입 | 트리거 조건 | data 구조 |
|----------------|------------|----------|
| `connected` | SSE 연결 시 | `{message, clientId, timestamp, workflow}` |
| `agent_status` | 에이전트 상태 변경 | `{agent, status, active, timestamp, [task], [lastMessage]}` |
| `delegation` | 위임 이벤트 발생 | `{from, to, task, delegationChain, timestamp}` |
| `activity` | 일반 이벤트 발생 | 이벤트 원본 객체 |
| `chat_message` | message 이벤트 수신 | `{agent, content, parsed, timestamp}` |
| `debate` | Debate 관련 이벤트 | `{subtype: 'start'|'opinion'|'conclusion', ...}` |
| `workflow_status` | 워크플로우 상태 변경 | `{workflow, progress, timestamp}` |

**브라우저에서 수신 예시:**

```javascript
const source = new EventSource('http://localhost:3333/api/events/stream');

// 에이전트 상태 변경 감지
source.addEventListener('agent_status', (e) => {
  const data = JSON.parse(e.data);
  console.log(`${data.agent}: ${data.status}`);
  // 예: "bo: working"
});

// 위임 이벤트 감지
source.addEventListener('delegation', (e) => {
  const data = JSON.parse(e.data);
  console.log(`${data.from} -> ${data.to}: ${data.task}`);
});

// Debate 이벤트 감지
source.addEventListener('debate', (e) => {
  const data = JSON.parse(e.data);
  if (data.subtype === 'conclusion') {
    console.log(`결론: ${data.conclusion}`);
  }
});

// 연결 끊김 처리 (자동 재연결)
source.onerror = (e) => {
  console.log('SSE 연결 끊김, 재연결 중...');
};
```

---

### 커스텀 이벤트 보내기

대시보드에 커스텀 이벤트를 보내는 방법입니다.

#### curl로 직접 전송

```bash
# 커스텀 에이전트 활동 알림
curl -X POST http://localhost:3333/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "agent": "shinnosuke",
    "content": "📚 [Masumi] 문서 작성 완료"
  }'
```

#### MCP 도구로 전송 (Claude Code 내에서)

Claude Code 세션 내에서 `send_agent_event` MCP 도구를 사용합니다:

```
send_agent_event 도구 호출:
  type: delegation
  from: shinnosuke
  to: bo
  task: 구현 시작
```

#### send-event.sh 스크립트 재활용

```bash
# 환경변수로 이벤트 타입 지정, stdin으로 Hook 데이터 전송
echo '{"agent_type":"team-shinchan:aichan"}' | \
  HOOK_EVENT=SubagentStart \
  DASHBOARD_URL=http://localhost:3333 \
  bash hooks/send-event.sh
```

---

### 에이전트 메시지 파싱 패턴

서버는 에이전트 메시지에서 두 가지 패턴을 자동으로 감지합니다:

**1. 위임 패턴** (자동으로 delegation 이벤트 생성):

```
{emoji} [{From}] -> {emoji} [{To}] "{message}"

예: 👦 [Shinnosuke] -> 😪 [Bo] "코드 구현을 시작해주세요"
```

**2. 에이전트 메시지 패턴** (채팅 뷰에 표시):

```
{emoji} [{Agent}] {message}

예: 😪 [Bo] 구현을 완료했습니다.
```

이 패턴이 감지되면 `chat_message` SSE 이벤트에 `parsed` 필드가 포함됩니다:

```json
{
  "type": "delegation_message",
  "from": "shinnosuke",
  "to": "bo",
  "content": "코드 구현을 시작해주세요"
}
```

또는:

```json
{
  "type": "agent_message",
  "agent": "bo",
  "content": "구현을 완료했습니다."
}
```

---

*이 문서는 Team-Shinchan 대시보드 v1.0.0 기준으로 작성되었습니다.*
