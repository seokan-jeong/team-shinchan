#!/bin/bash
# Team-Shinchan Dashboard Event Forwarder
# stdin에서 Claude Code Hook 이벤트 JSON을 읽어서 대시보드 서버로 전송
#
# 사용법: echo '{"agent_type":"team-shinchan:bo"}' | HOOK_EVENT=SubagentStart bash send-event.sh
#
# 환경변수:
#   HOOK_EVENT      - 이벤트 타입 (hooks.json에서 주입)
#   DASHBOARD_URL   - 대시보드 서버 URL (기본값: http://localhost:3333)

# ── 포트 디스커버리 ──────────────────────────────────────────────────────────
# 서버가 실제 바인딩된 포트를 기록한 파일에서 포트를 읽어옴
# server.mjs는 process.cwd() 기준으로 포트 파일을 저장하므로
# 1) 호스트 프로젝트(PWD) 기준 경로를 먼저 탐색
# 2) 없으면 PLUGIN_ROOT 기준으로 fallback
# 파일이 없으면 DASHBOARD_URL 환경변수 또는 기본값 3333으로 fallback
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 호스트 프로젝트(PWD) 기준 경로 우선 탐색
HOST_PORT_FILE="${PWD}/.shinchan-docs/.dashboard-port"
PLUGIN_PORT_FILE="${PLUGIN_ROOT}/.shinchan-docs/.dashboard-port"

if [ -z "${DASHBOARD_URL}" ]; then
  # 호스트 프로젝트 경로 우선
  if [ -f "$HOST_PORT_FILE" ]; then
    PORT_FILE="$HOST_PORT_FILE"
  elif [ -f "$PLUGIN_PORT_FILE" ]; then
    PORT_FILE="$PLUGIN_PORT_FILE"
  fi

  if [ -n "$PORT_FILE" ]; then
    DISCOVERED_PORT=$(cat "$PORT_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$DISCOVERED_PORT" ]; then
      DASHBOARD_URL="http://localhost:${DISCOVERED_PORT}"
    fi
  fi
fi
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3333}"

# 세션 ID 파일 경로 (호스트 프로젝트 기준)
SESSION_ID_FILE="${PWD}/.shinchan-docs/.session-id"

HOOK_EVENT="${HOOK_EVENT:-unknown}"

# stdin에서 JSON 읽기
INPUT=$(cat)

# 입력이 비어있으면 종료
if [ -z "$INPUT" ]; then
  exit 0
fi

# node가 있으면 node로 변환, 없으면 raw 전달
if command -v node &>/dev/null; then
  PAYLOAD=$(echo "$INPUT" | HOOK_EVENT="$HOOK_EVENT" SESSION_ID_FILE="$SESSION_ID_FILE" node -e "
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      let input;
      try {
        input = JSON.parse(chunks.join(''));
      } catch (e) {
        // JSON 파싱 실패 시 빈 객체로 처리
        input = {};
      }

      const event = process.env.HOOK_EVENT || 'unknown';

      // 세션 ID 읽기: 환경변수 우선, 없으면 파일에서 읽기
      const fs = require('fs');
      const sessionIdFile = process.env.SESSION_ID_FILE || '';
      let currentSessionId = process.env.SHINCHAN_SESSION_ID || null;
      if (!currentSessionId && sessionIdFile) {
        try { currentSessionId = fs.readFileSync(sessionIdFile, 'utf-8').trim(); } catch(e) {}
      }

      // agent_type에서 에이전트 ID 추출
      // 예: 'team-shinchan:bo' -> 'bo'
      const extractAgent = (t) => (t ? t.split(':').pop() : null);

      let output = {};

      switch (event) {
        case 'SubagentStart':
          output = {
            type: 'agent_start',
            agent: extractAgent(input.agent_type),
          };
          break;

        case 'SubagentStop':
          output = {
            type: 'agent_done',
            agent: extractAgent(input.agent_type),
            content: (input.last_assistant_message || '').slice(0, 500),
          };
          break;

        case 'PostToolUse':
          // Task 툴 호출 = 에이전트 위임
          if (input.tool_name === 'Task' && input.tool_input && input.tool_input.subagent_type) {
            output = {
              type: 'delegation',
              from: 'shinnosuke',
              to: extractAgent(input.tool_input.subagent_type),
              content: (input.tool_input.prompt || '').slice(0, 200),
            };
          } else if ((input.tool_name === 'Edit' || input.tool_name === 'Write') && input.tool_input) {
            // Edit/Write 도구 = file_change 이벤트
            const filePath = (input.tool_input.file_path || '').slice(0, 300);
            const action = input.tool_name === 'Write' ? 'create' : 'modify';
            output = {
              type: 'file_change',
              agent: 'unknown',
              file: filePath,
              action: action,
            };
          } else {
            output = {
              type: 'tool_use',
              agent: 'unknown',
              content: input.tool_name || 'unknown',
            };
          }
          break;

        case 'UserPromptSubmit':
          output = {
            type: 'user_prompt',
            content: (input.prompt || '').slice(0, 500),
          };
          break;

        case 'Stop':
          output = {
            type: 'stop',
            content: (input.last_assistant_message || '').slice(0, 500),
          };
          break;

        case 'SessionStart': {
          // 세션 ID 생성: session-{timestamp}-{random4chars}
          const newSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
          // 세션 ID 파일에 기록
          if (sessionIdFile) {
            try { fs.writeFileSync(sessionIdFile, newSessionId); } catch(e) {}
          }
          output = {
            type: 'session_start',
            sessionId: newSessionId,
            content: 'Session started (model: ' + (input.model || 'unknown') + ')',
          };
          // currentSessionId를 새로 생성한 ID로 업데이트 (아래에서 모든 output에 추가)
          currentSessionId = newSessionId;
          break;
        }

        case 'SessionEnd': {
          // 세션 ID 파일에서 읽은 후 삭제
          let endSessionId = currentSessionId;
          if (sessionIdFile) {
            try { endSessionId = fs.readFileSync(sessionIdFile, 'utf-8').trim(); } catch(e) {}
            try { fs.unlinkSync(sessionIdFile); } catch(e) {}
          }
          output = {
            type: 'session_end',
            sessionId: endSessionId,
            content: 'Session ended: ' + (input.reason || 'unknown'),
          };
          break;
        }

        default:
          output = {
            type: event.toLowerCase(),
            content: JSON.stringify(input).slice(0, 200),
          };
      }

      // 모든 이벤트에 sessionId 포함 (SessionStart/SessionEnd는 이미 포함)
      if (currentSessionId && !output.sessionId) {
        output.sessionId = currentSessionId;
      }
      console.log(JSON.stringify(output));
    });
  " 2>/dev/null)
else
  # node 없으면 이벤트 타입과 raw 입력을 그대로 전달
  PAYLOAD="{\"type\":\"${HOOK_EVENT}\",\"content\":$(echo "$INPUT" | head -c 500)}"
fi

# 페이로드가 비어있으면 종료
if [ -z "$PAYLOAD" ]; then
  exit 0
fi

# 비동기로 전송 (실패해도 무시 - 훅 실패가 Claude Code를 방해하면 안 됨)
curl -s -X POST "${DASHBOARD_URL}/api/events" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  --connect-timeout 2 \
  --max-time 4 \
  > /dev/null 2>&1 &

exit 0
