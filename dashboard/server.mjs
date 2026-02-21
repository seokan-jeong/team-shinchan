/**
 * Team-Shinchan Dashboard Server
 *
 * 순수 Node.js 내장 모듈만 사용 (외부 의존성 0개)
 * - MCP stdio 서버 (JSON-RPC 2.0)
 * - HTTP 서버 (포트 3333)
 * - SSE (Server-Sent Events)
 * - fs.watch() 파일 감시
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as execCmd } from 'child_process';

// ── 경로 설정 ──────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..');

// ── 환경 변수 ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.DASHBOARD_PORT || '3333', 10);
const DOCS_DIR_NAME = process.env.SHINCHAN_DOCS_DIR || '.shinchan-docs';

// SHINCHAN_DOCS_DIR가 절대 경로면 그대로, 아니면 PLUGIN_ROOT 기준으로 설정
const DOCS_DIR = path.isAbsolute(DOCS_DIR_NAME)
  ? DOCS_DIR_NAME
  : path.join(PLUGIN_ROOT, DOCS_DIR_NAME);

// ── stderr 로거 (console.log 금지 - MCP stdio가 stdout 사용) ─────────────────
const log = (...args) => process.stderr.write('[dashboard] ' + args.join(' ') + '\n');

// ── 포트 파일 경로 (포트 디스커버리용) ──────────────────────────────────────────
const PORT_FILE_PATH = path.join(DOCS_DIR, '.dashboard-port');

/**
 * 기존 대시보드 서버 인스턴스가 살아있는지 확인
 * 포트 파일이 존재하면 해당 포트로 /api/health를 요청하여 확인
 * @returns {Promise<number|null>} 살아있는 서버의 포트 번호, 없으면 null
 */
async function checkExistingServer() {
  if (!fs.existsSync(PORT_FILE_PATH)) return null;

  let existingPort;
  try {
    existingPort = parseInt(fs.readFileSync(PORT_FILE_PATH, 'utf-8').trim(), 10);
  } catch {
    return null;
  }

  if (isNaN(existingPort) || existingPort <= 0 || existingPort > 65535) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://localhost:${existingPort}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      // 응답 내용까지 검증: 정상적인 dashboard 서버인지 확인
      try {
        const body = await res.json();
        if (body.status === 'ok') {
          return existingPort; // 기존 서버가 살아있음
        }
        log(`기존 서버 health 응답 이상: ${JSON.stringify(body)}`);
      } catch {
        log('기존 서버 health 응답 파싱 실패');
      }
    }
  } catch {
    // 기존 서버가 죽었거나 응답 없음
  }

  // 포트 파일은 있지만 서버가 응답하지 않음 → stale 포트 파일 삭제
  log('stale 포트 파일 삭제');
  removePortFile();
  return null;
}

/**
 * 현재 프로세스를 제외한 다른 server.mjs 프로세스를 찾아 종료
 * macOS/Linux: pgrep + process.kill 사용
 * @returns {Promise<number>} 종료된 프로세스 수
 */
async function killZombieProcesses() {
  const { exec } = await import('child_process');
  const myPid = process.pid;

  return new Promise((resolve) => {
    // server.mjs를 실행 중인 node 프로세스 찾기
    exec('pgrep -f "node.*server\\.mjs"', (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(0);
        return;
      }

      const pids = stdout.trim().split('\n')
        .map(p => parseInt(p.trim(), 10))
        .filter(pid => !isNaN(pid) && pid !== myPid);

      let killed = 0;
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGTERM');
          killed++;
          log(`좀비 프로세스 종료: PID ${pid}`);
        } catch {
          // 이미 종료되었거나 권한 없음 - 무시
        }
      }

      if (killed > 0) {
        log(`좀비 프로세스 ${killed}개 정리 완료`);
      } else {
        log('좀비 프로세스 없음');
      }
      resolve(killed);
    });
  });
}

/**
 * 포트 파일에 실제 바인딩된 포트를 기록
 * 쓰기 후 읽기 검증(write-back verify) 수행
 * @param {number} port - 실제 바인딩된 포트 번호
 */
function writePortFile(port) {
  try {
    // docs 디렉토리가 없으면 생성
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }
    // 절대 경로 확인
    const absPath = path.resolve(PORT_FILE_PATH);
    fs.writeFileSync(absPath, String(port), 'utf-8');
    // 쓰기 후 읽기 검증 (write-back verify)
    const written = fs.readFileSync(absPath, 'utf-8').trim();
    if (written !== String(port)) {
      log(`포트 파일 검증 실패: 기대=${port}, 실제=${written}`);
    } else {
      log(`포트 파일 기록 검증 완료: ${absPath} (포트: ${port})`);
    }
  } catch (err) {
    log(`포트 파일 기록 실패: ${err.message}`);
  }
}

/**
 * 포트 파일 삭제 (서버 종료 시)
 */
function removePortFile() {
  try {
    if (fs.existsSync(PORT_FILE_PATH)) {
      fs.unlinkSync(PORT_FILE_PATH);
      log('포트 파일 삭제 완료');
    }
  } catch {
    // 삭제 실패해도 무시 (이미 없거나 권한 문제)
  }
}

/**
 * 기본 브라우저에서 URL을 엽니다 (OS별 분기)
 * DASHBOARD_AUTO_OPEN 환경변수로 제어 (기본값: true)
 * @param {string} url - 열 URL
 */
function openBrowser(url) {
  if (process.env.DASHBOARD_AUTO_OPEN === 'false') {
    log('브라우저 자동 열기 비활성화 (DASHBOARD_AUTO_OPEN=false)');
    return;
  }

  const platform = process.platform;
  let cmd;

  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  execCmd(cmd, (err) => {
    if (err) {
      log(`브라우저 열기 실패 (${platform}): ${err.message}`);
    } else {
      log(`브라우저 열기 성공: ${url}`);
    }
  });
}

// ── 에이전트 정적 데이터 ──────────────────────────────────────────────────────
const AGENTS = {
  shinnosuke:  { emoji: '👦', name: 'Shinnosuke',   role: 'Orchestrator',     layer: 'Orchestration', model: 'opus' },
  himawari:    { emoji: '🌸', name: 'Himawari',     role: 'Atlas',            layer: 'Orchestration', model: 'opus' },
  midori:      { emoji: '🌻', name: 'Midori',       role: 'Debate Moderator', layer: 'Orchestration', model: 'sonnet' },
  bo:          { emoji: '😪', name: 'Bo',           role: 'Task Executor',    layer: 'Execution',     model: 'sonnet' },
  kazama:      { emoji: '🎩', name: 'Kazama',       role: 'Deep Worker',      layer: 'Execution',     model: 'opus' },
  aichan:      { emoji: '🎀', name: 'Aichan',       role: 'Frontend',         layer: 'Specialist',    model: 'sonnet' },
  bunta:       { emoji: '🍜', name: 'Bunta',        role: 'Backend',          layer: 'Specialist',    model: 'sonnet' },
  masao:       { emoji: '🍙', name: 'Masao',        role: 'DevOps',           layer: 'Specialist',    model: 'sonnet' },
  hiroshi:     { emoji: '👔', name: 'Hiroshi',      role: 'Oracle',           layer: 'Advisory',      model: 'opus' },
  nene:        { emoji: '📋', name: 'Nene',         role: 'Planner',          layer: 'Advisory',      model: 'opus' },
  misae:       { emoji: '👩', name: 'Misae',        role: 'Pre-Planning',     layer: 'Advisory',      model: 'sonnet' },
  actionkamen: { emoji: '🦸', name: 'Action Kamen', role: 'Reviewer',         layer: 'Advisory',      model: 'opus' },
  shiro:       { emoji: '🐶', name: 'Shiro',        role: 'Explorer',         layer: 'Utility',       model: 'haiku' },
  masumi:      { emoji: '📚', name: 'Masumi',       role: 'Librarian',        layer: 'Utility',       model: 'sonnet' },
  ume:         { emoji: '🖼️', name: 'Ume',          role: 'Multimodal',       layer: 'Utility',       model: 'sonnet' },
};

// ── 인메모리 상태 ──────────────────────────────────────────────────────────────
const state = {
  serverPort: PORT,   // 실제 바인딩된 포트 (자동 변경 시 업데이트)
  serverStartedAt: new Date().toISOString(), // 서버 시작 시각
  workflow: {
    stage:  null, // 현재 워크플로우 스테이지 (requirements / planning / execution / completion)
    phase:  null, // 현재 페이즈
    status: null, // 상태 (active / paused / completed)
    docId:  null, // 문서 ID (예: ISSUE-42, main-1)
  },
  agents:          {}, // 에이전트별 동적 상태 (status, active, lastSeen, lastMessage 등)
  events:          [], // 최근 이벤트 (최대 1000개)
  delegations:     [], // 위임 흐름 (최대 100개)
  messages:        [], // 에이전트 메시지 (최대 200개)
  delegationChain: [], // 현재 활성 위임 체인 (예: [shinnosuke, nene, bo])
  session:         { active: false, startedAt: null }, // 세션 상태
  debate: {
    active:     false,         // 현재 Debate 진행 중 여부
    topic:      null,          // Debate 주제
    panelists:  [],            // 참여 패널리스트 에이전트 ID 목록
    opinions:   [],            // [{ agent, opinion, round, timestamp }]
    conclusion: null,          // 최종 결론 텍스트
    startedAt:  null,          // Debate 시작 시각
    endedAt:    null,          // Debate 종료 시각
  },
};

// ── SSE 클라이언트 관리 ──────────────────────────────────────────────────────
/** @type {http.ServerResponse[]} */
const sseClients = [];

/**
 * 모든 SSE 클라이언트에 이벤트 브로드캐스트
 * @param {string} eventType - SSE 이벤트 타입
 * @param {object} data      - 전송할 데이터 (JSON 직렬화)
 */
function broadcast(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  // 끊어진 클라이언트를 걸러내며 전송
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch {
      // 클라이언트 연결이 끊어진 경우 배열에서 제거
      sseClients.splice(i, 1);
      log(`SSE 클라이언트 제거 (오류). 남은 클라이언트: ${sseClients.length}`);
    }
  }
}

// ── YAML 간이 파서 ─────────────────────────────────────────────────────────────
/**
 * WORKFLOW_STATE.yaml에서 필요한 필드만 정규식으로 추출
 * (외부 yaml 라이브러리 없이 구현)
 * @param {string} content - YAML 파일 내용
 * @returns {{ stage, phase, status, docId }}
 */
function parseWorkflowYaml(content) {
  const extract = (key) => {
    // key: value 또는 key: "value" 형태 모두 처리
    const match = content.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
    return match ? match[1].trim() : null;
  };

  return {
    stage:  extract('stage'),
    phase:  extract('phase'),
    status: extract('status'),
    docId:  extract('doc_id'),
  };
}

/**
 * PROGRESS.md에서 페이즈 진행률 요약 추출
 * @param {string} content - Markdown 파일 내용
 * @returns {{ total: number, completed: number, phases: string[] }}
 */
function parseProgressMd(content) {
  // [x] 또는 [ ] 체크박스 항목 탐색
  const checkedItems   = (content.match(/^\s*-\s*\[x\]/gim) || []).length;
  const uncheckedItems = (content.match(/^\s*-\s*\[\s\]/gim) || []).length;
  const total          = checkedItems + uncheckedItems;

  // ## Phase 헤더 추출
  const phases = (content.match(/^##\s+.+/gm) || []).map((h) => h.replace(/^##\s+/, '').trim());

  return { total, completed: checkedItems, phases };
}

// ── 에이전트 메시지 파싱 ───────────────────────────────────────────────────────

/**
 * 에이전트 출력에서 구조화된 메시지 정보를 추출
 *
 * 지원 패턴:
 *   위임: {emoji} [{From}] → {emoji} [{To}] "{message}"
 *   에이전트: {emoji} [{Agent}] {message}
 *   평문: 그 외 모든 텍스트
 *
 * @param {string} content - 원본 메시지 내용
 * @returns {{ type: string, agent?: string, from?: string, to?: string, content: string }}
 */
function parseAgentMessage(content) {
  if (!content || typeof content !== 'string') {
    return { type: 'plain', content: content || '' };
  }

  // 위임 패턴: [{From}] → ... [{To}] "메시지" (이모지 선택적 허용)
  const delegationMatch = content.match(/\[(\w[\w\s]*)\]\s*→\s*.*?\[(\w[\w\s]*)\]\s*"?(.+)"?/);
  if (delegationMatch) {
    const from    = delegationMatch[1].trim().toLowerCase().replace(/\s+/g, '');
    const to      = delegationMatch[2].trim().toLowerCase().replace(/\s+/g, '');
    const message = delegationMatch[3].trim().replace(/"$/, ''); // 끝 따옴표 제거
    return {
      type:    'delegation_message',
      from,
      to,
      content: message,
    };
  }

  // 에이전트 메시지 패턴: [{Agent}] {message}
  const agentMatch = content.match(/\[(\w[\w\s]*)\]\s+(.+)/s);
  if (agentMatch) {
    const agent   = agentMatch[1].trim().toLowerCase().replace(/\s+/g, '');
    const message = agentMatch[2].trim();
    return {
      type:    'agent_message',
      agent,
      content: message,
    };
  }

  return { type: 'plain', content };
}

/**
 * 메시지 내용에서 Debate 관련 키워드가 포함되어 있는지 감지
 * @param {string} content
 * @returns {boolean}
 */
function isDebateContent(content) {
  if (!content) return false;
  const keywords = ['토론', 'debate', '패널', 'panelist', '찬성', '반대', '결론', 'conclusion',
                    '의견', 'opinion', '라운드', 'round', '중재', 'moderat'];
  const lower = content.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ── 파일 시스템 감시 (fs.watch) ────────────────────────────────────────────────

/** 디바운스 타이머 ID */
let watchDebounceTimer = null;

/**
 * .shinchan-docs/ 내 변경 감지 시 호출
 * - WORKFLOW_STATE.yaml → state.workflow 업데이트
 * - PROGRESS.md        → 진행률 업데이트
 * 500ms 디바운스 적용
 */
function handleDocsChange(eventType, filename) {
  if (!filename) return;
  // YAML / MD 파일만 처리
  if (!filename.endsWith('.yaml') && !filename.endsWith('.yml') && !filename.endsWith('.md')) return;

  clearTimeout(watchDebounceTimer);
  watchDebounceTimer = setTimeout(() => {
    log(`파일 변경 감지: ${filename} (${eventType})`);
    refreshStateFromDocs();
  }, 500);
}

/**
 * .shinchan-docs/ 하위 전체를 스캔하여 최신 WORKFLOW_STATE.yaml + PROGRESS.md 를 읽어
 * 인메모리 state를 갱신하고 SSE broadcast
 */
function refreshStateFromDocs() {
  if (!fs.existsSync(DOCS_DIR)) {
    log(`docs 디렉토리 없음: ${DOCS_DIR}`);
    return;
  }

  let latestWorkflow = null;
  let latestProgress = null;

  try {
    // docs 디렉토리 내 하위 디렉토리 순회
    const entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const subDir = path.join(DOCS_DIR, entry.name);

      // WORKFLOW_STATE.yaml 읽기
      const yamlPath = path.join(subDir, 'WORKFLOW_STATE.yaml');
      if (fs.existsSync(yamlPath)) {
        try {
          const content = fs.readFileSync(yamlPath, 'utf-8');
          // YAML 파싱 실패 시 이전 상태 유지 (예외를 내부에서 처리)
          let parsed;
          try {
            parsed = parseWorkflowYaml(content);
          } catch (parseErr) {
            log(`YAML 파싱 오류 (이전 상태 유지) (${yamlPath}): ${parseErr.message}`);
            parsed = null;
          }
          // doc_id가 있는 항목 우선, 없으면 마지막 것 사용
          if (parsed && (!latestWorkflow || parsed.docId)) {
            latestWorkflow = parsed;
          }
        } catch (err) {
          // 파일 읽기 실패 시 로그만 출력, 이전 상태 유지
          log(`YAML 읽기 오류 (이전 상태 유지) (${yamlPath}): ${err.message}`);
        }
      }

      // PROGRESS.md 읽기
      const progressPath = path.join(subDir, 'PROGRESS.md');
      if (fs.existsSync(progressPath)) {
        try {
          const content = fs.readFileSync(progressPath, 'utf-8');
          latestProgress = parseProgressMd(content);
        } catch (err) {
          // 파일 읽기 실패 시 로그만 출력, 이전 상태 유지
          log(`PROGRESS.md 읽기 오류 (이전 상태 유지) (${progressPath}): ${err.message}`);
        }
      }
    }
  } catch (err) {
    log(`docs 디렉토리 읽기 오류: ${err.message}`);
    return;
  }

  // 상태 업데이트
  if (latestWorkflow) {
    state.workflow = { ...state.workflow, ...latestWorkflow };
  }

  // 이벤트 기록
  const event = {
    id:        Date.now(),
    type:      'state_update',
    timestamp: new Date().toISOString(),
    workflow:  state.workflow,
    progress:  latestProgress,
  };

  // 최근 1000개 유지
  state.events.push(event);
  if (state.events.length > 1000) {
    state.events.shift();
  }

  // SSE 브로드캐스트 (파일 변경 → workflow_status 이벤트)
  broadcast('workflow_status', {
    workflow:  state.workflow,
    progress:  latestProgress,
    timestamp: new Date().toISOString(),
  });

  log(`상태 업데이트 완료: stage=${state.workflow.stage}, phase=${state.workflow.phase}`);
}

/**
 * fs.watch로 .shinchan-docs/ 재귀 감시 시작
 * Node.js 18+ recursive 옵션 사용 (macOS / Windows 지원)
 * @param {number} retryCount - 현재 재시도 횟수
 */
function startFileWatcher(retryCount = 0) {
  const MAX_RETRIES = 30;

  // docs 디렉토리가 없으면 1초마다 재시도 (최대 30회)
  if (!fs.existsSync(DOCS_DIR)) {
    if (retryCount >= MAX_RETRIES) {
      log(`docs 디렉토리 감시 포기 (${MAX_RETRIES}회 재시도 초과): ${DOCS_DIR}`);
      return;
    }
    if (retryCount === 0) {
      log(`docs 디렉토리 없음, 감시 대기: ${DOCS_DIR}`);
    }
    setTimeout(() => startFileWatcher(retryCount + 1), 1000);
    return;
  }

  try {
    const watcher = fs.watch(DOCS_DIR, { recursive: true }, (eventType, filename) => {
      try {
        handleDocsChange(eventType, filename);
      } catch (err) {
        // 파일 읽기 실패 시 로그만 출력, 서버 계속 동작
        log(`파일 변경 처리 오류 (무시): ${err.message}`);
      }
    });

    watcher.on('error', (err) => {
      log(`fs.watch 오류: ${err.message}. 1초 후 재시작 시도...`);
      watcher.close();
      setTimeout(() => startFileWatcher(0), 1000);
    });

    log(`파일 감시 시작: ${DOCS_DIR}`);
    // 초기 상태 로드
    try {
      refreshStateFromDocs();
    } catch (err) {
      log(`초기 상태 로드 오류 (무시): ${err.message}`);
    }
  } catch (err) {
    log(`fs.watch 시작 실패: ${err.message}. 재시도하지 않습니다.`);
  }
}

// ── HTTP 요청 핸들러 ──────────────────────────────────────────────────────────

/**
 * 정적 파일 서빙 (dashboard/public/)
 * @param {http.ServerResponse} res
 * @param {string} filePath
 */
function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  if (!fs.existsSync(filePath)) {
    log(`정적 파일 없음: ${filePath}`);  // 디버그 로그: 어떤 경로를 찾으려 했는지 출력
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

/**
 * JSON 응답 헬퍼
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {object} data
 */
function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type':                'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * POST body를 JSON으로 파싱
 * @param {http.IncomingMessage} req
 * @returns {Promise<object>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const MAX_SIZE = 100 * 1024; // 100KB
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > MAX_SIZE) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end',  () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * 메인 HTTP 요청 핸들러
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleHttpRequest(req, res) {
  const url    = new URL(req.url, `http://localhost:${state.serverPort}`);
  const method = req.method.toUpperCase();

  log(`${method} ${url.pathname}`);

  // ── CORS preflight ──
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ── GET / → index.html 서빙 ──
  if (method === 'GET' && url.pathname === '/') {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    serveStaticFile(res, indexPath);
    return;
  }

  // ── 정적 파일 (public/) ──
  if (method === 'GET' && !url.pathname.startsWith('/api/')) {
    const filePath = path.join(__dirname, 'public', url.pathname);
    // 경로 순회 방지 (Path Traversal 보안)
    const publicDir = path.join(__dirname, 'public');
    if (!filePath.startsWith(publicDir)) {
      jsonResponse(res, 403, { error: 'Forbidden' });
      return;
    }
    serveStaticFile(res, filePath);
    return;
  }

  // ── GET /api/health → 서버 헬스 체크 ──
  if (method === 'GET' && url.pathname === '/api/health') {
    const uptimeSeconds = process.uptime();
    const healthResponse = {
      status: 'ok',
      port:   state.serverPort,
      uptime: uptimeSeconds,
      url:    `http://localhost:${state.serverPort}`,
    };
    if (uptimeSeconds > 86400) { // 24시간 초과 시 경고
      healthResponse.warning = '서버 업타임 24시간 초과. 재시작을 권장합니다.';
    }
    jsonResponse(res, 200, healthResponse);
    return;
  }

  // ── GET /api/status → 워크플로우 상태 반환 ──
  if (method === 'GET' && url.pathname === '/api/status') {
    jsonResponse(res, 200, {
      workflow:        state.workflow,
      session:         state.session,
      delegationChain: state.delegationChain,
      eventCount:      state.events.length,
      delegationCount: state.delegations.length,
      messageCount:    state.messages.length,
      sseClients:      sseClients.length,
      server: {
        port:       state.serverPort,
        uptime:     process.uptime(),
        version:    '1.0.0',
        startedAt:  state.serverStartedAt,
        eventCount: state.events.length,
        sseClients: sseClients.length,
      },
      timestamp:       new Date().toISOString(),
    });
    return;
  }

  // ── GET /api/agents → 에이전트 목록 반환 ──
  if (method === 'GET' && url.pathname === '/api/agents') {
    const agentsWithStatus = Object.entries(AGENTS).map(([id, agent]) => ({
      id,
      ...agent,
      status: state.agents[id] || { active: false, lastSeen: null },
    }));
    jsonResponse(res, 200, { agents: agentsWithStatus });
    return;
  }

  // ── GET /api/events → 최근 이벤트 목록 반환 ──
  if (method === 'GET' && url.pathname === '/api/events') {
    const limit  = parseInt(url.searchParams.get('limit') || '50', 10);
    const events = state.events.slice(-Math.min(limit, 1000));
    jsonResponse(res, 200, { events, total: state.events.length });
    return;
  }

  // ── GET /api/delegations → 최근 위임 흐름 반환 ──
  if (method === 'GET' && url.pathname === '/api/delegations') {
    const limit       = parseInt(url.searchParams.get('limit') || '50', 10);
    const delegations = state.delegations.slice(-Math.min(limit, 100));
    jsonResponse(res, 200, {
      delegations,
      chain: state.delegationChain,
      total: state.delegations.length,
    });
    return;
  }

  // ── GET /api/messages → 최근 에이전트 메시지 반환 ──
  if (method === 'GET' && url.pathname === '/api/messages') {
    const limit    = parseInt(url.searchParams.get('limit') || '50', 10);
    const agent    = url.searchParams.get('agent') || null;
    const type     = url.searchParams.get('type') || null; // 'chat' = 파싱된 에이전트 메시지만
    let   messages = state.messages.slice(-Math.min(limit * 2, 200)); // 필터 전 여유분

    if (agent) {
      messages = messages.filter((m) => m.agent === agent);
    }

    // type=chat → 파싱 결과가 agent_message 또는 delegation_message인 것만
    if (type === 'chat') {
      messages = messages.filter((m) =>
        m.parsed &&
        (m.parsed.type === 'agent_message' || m.parsed.type === 'delegation_message')
      );
    }

    messages = messages.slice(-Math.min(limit, 200));
    jsonResponse(res, 200, { messages, total: state.messages.length });
    return;
  }

  // ── GET /api/debate → 현재 Debate 상태 반환 ──
  if (method === 'GET' && url.pathname === '/api/debate') {
    jsonResponse(res, 200, {
      debate:    state.debate,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // ── GET /api/events/stream → SSE 스트림 ──
  if (method === 'GET' && url.pathname === '/api/events/stream') {
    // 최대 클라이언트 수 제한 (50개)
    const MAX_SSE_CLIENTS = 50;
    if (sseClients.length >= MAX_SSE_CLIENTS) {
      jsonResponse(res, 503, { error: `SSE 클라이언트 수 초과 (최대 ${MAX_SSE_CLIENTS}개)` });
      return;
    }

    res.writeHead(200, {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache',
      'Connection':                  'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering':           'no', // Nginx 버퍼링 비활성화
    });

    // 초기 연결 확인 이벤트 전송
    res.write(`event: connected\ndata: ${JSON.stringify({
      message:    'SSE 연결 성공',
      clientId:   Date.now(),
      timestamp:  new Date().toISOString(),
      workflow:   state.workflow,
    })}\n\n`);

    // 클라이언트 배열에 추가
    sseClients.push(res);
    log(`SSE 클라이언트 연결. 현재 클라이언트 수: ${sseClients.length}`);

    // 30초마다 heartbeat (연결 유지)
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // 연결 종료 시 클라이언트 제거
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
      log(`SSE 클라이언트 연결 해제. 남은 클라이언트: ${sseClients.length}`);
    });

    return;
  }

  // ── POST /api/events → Hook 이벤트 수신 ──
  if (method === 'POST' && url.pathname === '/api/events') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (parseErr) {
      // JSON 파싱 실패 시 400 반환, 서버 크래시 방지
      jsonResponse(res, 400, {
        error:   'Invalid JSON',
        message: parseErr.message,
      });
      log(`JSON 파싱 오류: ${parseErr.message}`);
      return;
    }

    try {
      // 이벤트 유효성 검사 (type 필드 필수)
      if (!body.type) {
        jsonResponse(res, 400, { error: 'type 필드가 필요합니다' });
        return;
      }

      // 이벤트 정규화 및 저장
      const event = {
        id:        Date.now(),
        timestamp: new Date().toISOString(),
        ...body,
      };

      state.events.push(event);
      if (state.events.length > 1000) {
        state.events.shift();
      }

      // ── 이벤트 타입별 처리 ──────────────────────────────────────────────────

      switch (body.type) {

        // 에이전트 작업 시작 → status: working, active: true
        case 'agent_start': {
          if (body.agent && AGENTS[body.agent]) {
            state.agents[body.agent] = {
              ...(state.agents[body.agent] || {}),
              status:   'working',
              active:   true,
              lastSeen: event.timestamp,
            };
            broadcast('agent_status', {
              agent:     body.agent,
              status:    'working',
              active:    true,
              task:      body.task || body.content || null,
              timestamp: event.timestamp,
            });
          }
          break;
        }

        // 에이전트 작업 완료 → status: idle, active: false, 마지막 메시지 저장
        case 'agent_done': {
          if (body.agent && AGENTS[body.agent]) {
            state.agents[body.agent] = {
              ...(state.agents[body.agent] || {}),
              status:      'idle',
              active:      false,
              lastSeen:    event.timestamp,
              lastMessage: body.content || body.result || null,
            };
            broadcast('agent_status', {
              agent:       body.agent,
              status:      'idle',
              active:      false,
              lastMessage: body.content || body.result || null,
              timestamp:   event.timestamp,
            });
          }
          break;
        }

        // 위임 흐름 기록 + 위임 체인 추적
        case 'delegation': {
          if (body.from && body.to) {
            const delegation = {
              from:      body.from,
              to:        body.to,
              task:      body.task || body.content || '',
              timestamp: event.timestamp,
            };
            state.delegations.push(delegation);
            if (state.delegations.length > 100) state.delegations.shift();

            // 위임 체인 추적: 마지막 체인의 끝 에이전트가 현재 from과 같으면 체인에 추가
            const chain = state.delegationChain;
            if (chain.length === 0) {
              state.delegationChain = [body.from, body.to];
            } else if (chain[chain.length - 1] === body.from) {
              // 체인 연장: shinnosuke→nene, nene→bo → [shinnosuke, nene, bo]
              state.delegationChain = [...chain, body.to];
            } else {
              // 새 위임 흐름 시작 (기존 체인과 무관한 새 from)
              state.delegationChain = [body.from, body.to];
            }

            // 양쪽 에이전트 상태 업데이트
            if (AGENTS[body.from]) {
              state.agents[body.from] = {
                ...(state.agents[body.from] || {}),
                status:   'delegating',
                active:   true,
                lastSeen: event.timestamp,
              };
            }
            if (AGENTS[body.to]) {
              state.agents[body.to] = {
                ...(state.agents[body.to] || {}),
                status:   'receiving',
                active:   true,
                lastSeen: event.timestamp,
              };
            }

            broadcast('delegation', {
              from:            body.from,
              to:              body.to,
              task:            delegation.task,
              delegationChain: state.delegationChain,
              timestamp:       event.timestamp,
            });
          }
          break;
        }

        // 에이전트 메시지 저장
        case 'message': {
          if (body.agent && body.content) {
            // 메시지 파싱
            const parsed = parseAgentMessage(body.content);

            const msg = {
              agent:     body.agent,
              content:   body.content,
              parsed,
              timestamp: event.timestamp,
            };
            state.messages.push(msg);
            if (state.messages.length > 200) state.messages.shift();

            // 에이전트 마지막 메시지 업데이트
            if (AGENTS[body.agent]) {
              state.agents[body.agent] = {
                ...(state.agents[body.agent] || {}),
                lastSeen:    event.timestamp,
                lastMessage: body.content,
              };
            }

            // 위임 메시지 감지 → delegation 이벤트 자동 처리
            if (parsed.type === 'delegation_message' && parsed.from && parsed.to) {
              const delegation = {
                from:      parsed.from,
                to:        parsed.to,
                task:      parsed.content,
                timestamp: event.timestamp,
                source:    'message_parse', // 자동 파싱으로 감지됨
              };
              state.delegations.push(delegation);
              if (state.delegations.length > 100) state.delegations.shift();

              const chain = state.delegationChain;
              if (chain.length === 0) {
                state.delegationChain = [parsed.from, parsed.to];
              } else if (chain[chain.length - 1] === parsed.from) {
                state.delegationChain = [...chain, parsed.to];
              } else {
                state.delegationChain = [parsed.from, parsed.to];
              }
            }

            // Debate 자동 감지 (midori 에이전트 또는 키워드)
            if ((body.agent === 'midori' || isDebateContent(body.content)) && !state.debate.active) {
              state.debate.active    = true;
              state.debate.startedAt = event.timestamp;
              // topic은 첫 Debate 메시지에서 추출 (없으면 내용 앞 50자)
              if (!state.debate.topic) {
                state.debate.topic = parsed.content.substring(0, 80) || body.content.substring(0, 80);
              }
              if (!state.debate.panelists.includes(body.agent)) {
                state.debate.panelists.push(body.agent);
              }
              broadcast('debate', {
                subtype:   'start',
                topic:     state.debate.topic,
                panelists: state.debate.panelists,
                timestamp: event.timestamp,
              });
            }

            // 파싱된 chat_message SSE 전송 (구조화 데이터 포함)
            broadcast('chat_message', {
              agent:     body.agent,
              content:   body.content,
              parsed,
              timestamp: event.timestamp,
            });
          }
          broadcast('activity', event);
          break;
        }

        // 사용자 입력 저장
        case 'user_prompt': {
          const userMsg = {
            agent:     'user',
            content:   body.content || body.prompt || '',
            timestamp: event.timestamp,
          };
          state.messages.push(userMsg);
          if (state.messages.length > 200) state.messages.shift();
          broadcast('activity', event);
          break;
        }

        // 메인 응답 완료 → shinnosuke idle로 변경
        case 'stop': {
          if (AGENTS['shinnosuke']) {
            state.agents['shinnosuke'] = {
              ...(state.agents['shinnosuke'] || {}),
              status:   'idle',
              active:   false,
              lastSeen: event.timestamp,
            };
          }
          // 위임 체인 초기화
          state.delegationChain = [];
          broadcast('agent_status', {
            agent:     'shinnosuke',
            status:    'idle',
            active:    false,
            timestamp: event.timestamp,
          });
          break;
        }

        // 세션 시작 → 모든 에이전트 상태 초기화
        case 'session_start': {
          state.agents          = {};
          state.delegationChain = [];
          state.session         = { active: true, startedAt: event.timestamp };
          // workflow 상태 초기화 (ENH-3: 이전 세션의 stale docId 제거)
          state.workflow = {
            stage:  null,
            phase:  null,
            status: null,
            docId:  null,
          };
          // Debate 상태 초기화
          state.debate = {
            active: false, topic: null, panelists: [], opinions: [],
            conclusion: null, startedAt: null, endedAt: null,
          };
          broadcast('agent_status', {
            reset:     true,
            session:   state.session,
            timestamp: event.timestamp,
          });
          break;
        }

        // 세션 종료 표시
        case 'session_end': {
          state.session = { active: false, startedAt: state.session.startedAt, endedAt: event.timestamp };
          state.delegationChain = [];
          broadcast('agent_status', {
            reset:     true,
            session:   state.session,
            timestamp: event.timestamp,
          });
          break;
        }

        // Debate 시작
        case 'debate_start': {
          state.debate = {
            active:     true,
            topic:      body.topic || null,
            panelists:  Array.isArray(body.panelists) ? body.panelists : [],
            opinions:   [],
            conclusion: null,
            startedAt:  event.timestamp,
            endedAt:    null,
          };
          broadcast('debate', {
            subtype:   'start',
            topic:     state.debate.topic,
            panelists: state.debate.panelists,
            timestamp: event.timestamp,
          });
          log(`Debate 시작: topic="${state.debate.topic}"`);
          break;
        }

        // Debate 의견 추가
        case 'debate_opinion': {
          if (body.agent && body.opinion) {
            const opinionEntry = {
              agent:     body.agent,
              opinion:   body.opinion,
              round:     body.round || null,
              timestamp: event.timestamp,
            };
            state.debate.opinions.push(opinionEntry);

            // 패널리스트 자동 추가
            if (!state.debate.panelists.includes(body.agent)) {
              state.debate.panelists.push(body.agent);
            }

            broadcast('debate', {
              subtype:   'opinion',
              agent:     body.agent,
              opinion:   body.opinion,
              round:     body.round || null,
              panelists: state.debate.panelists,
              timestamp: event.timestamp,
            });
          }
          break;
        }

        // Debate 결론
        case 'debate_conclusion': {
          state.debate.active     = false;
          state.debate.conclusion = body.conclusion || body.content || null;
          state.debate.endedAt    = event.timestamp;
          broadcast('debate', {
            subtype:    'conclusion',
            conclusion: state.debate.conclusion,
            topic:      state.debate.topic,
            panelists:  state.debate.panelists,
            timestamp:  event.timestamp,
          });
          log(`Debate 종료: conclusion="${(state.debate.conclusion || '').substring(0, 50)}"`);
          break;
        }

        // 도구 사용 기록 (에이전트 활동 업데이트)
        case 'tool_use': {
          if (body.agent && AGENTS[body.agent]) {
            state.agents[body.agent] = {
              ...(state.agents[body.agent] || {}),
              status:      'working',
              active:      true,
              lastSeen:    event.timestamp,
              currentTool: body.tool || body.content || null,
            };
          }
          broadcast('activity', event);
          break;
        }

        // 워크플로우 상태 변경
        case 'workflow_update': {
          if (body.workflow) {
            state.workflow = { ...state.workflow, ...body.workflow };
          }
          broadcast('workflow_status', {
            workflow:  state.workflow,
            timestamp: event.timestamp,
          });
          break;
        }

        // 기본: 나머지 이벤트
        default: {
          // 에이전트 필드가 있으면 lastSeen 업데이트
          if (body.agent && AGENTS[body.agent]) {
            state.agents[body.agent] = {
              ...(state.agents[body.agent] || {}),
              lastSeen: event.timestamp,
            };
          }
          broadcast('activity', event);
          break;
        }
      }

      jsonResponse(res, 200, { ok: true, id: event.id });
      log(`이벤트 수신: type=${body.type}, agent=${body.agent || 'N/A'}`);
    } catch (err) {
      log(`이벤트 처리 오류: ${err.message}`);
      jsonResponse(res, 500, { error: '이벤트 처리 중 오류가 발생했습니다', message: err.message });
    }
    return;
  }

  // ── 404 ──
  jsonResponse(res, 404, { error: 'Not Found', path: url.pathname });
}

// ── MCP JSON-RPC 2.0 핸들러 ──────────────────────────────────────────────────

/**
 * MCP 도구 정의
 */
const MCP_TOOLS = [
  {
    name:        'get_dashboard_url',
    description: 'Team-Shinchan 대시보드 URL을 반환합니다',
    inputSchema: {
      type:       'object',
      properties: {},
      required:   [],
    },
  },
  {
    name:        'get_workflow_status',
    description: '현재 워크플로우 상태를 반환합니다 (stage, phase, status, docId)',
    inputSchema: {
      type:       'object',
      properties: {},
      required:   [],
    },
  },
  {
    name:        'send_agent_event',
    description: '에이전트 이벤트를 대시보드에 전송합니다',
    inputSchema: {
      type:       'object',
      properties: {
        type:    { type: 'string', description: '이벤트 타입 (예: delegation, message, agent_active)' },
        agent:   { type: 'string', description: '에이전트 ID (예: shinnosuke, bo, bunta)' },
        content: { type: 'string', description: '이벤트 내용 (선택)' },
        from:    { type: 'string', description: '위임 출발 에이전트 (delegation 타입 시)' },
        to:      { type: 'string', description: '위임 도착 에이전트 (delegation 타입 시)' },
        task:    { type: 'string', description: '위임 태스크 설명 (delegation 타입 시)' },
      },
      required: ['type'],
    },
  },
];

/**
 * MCP 도구 실행
 * @param {string} toolName
 * @param {object} args
 * @returns {object} MCP content 결과
 */
function executeMcpTool(toolName, args) {
  switch (toolName) {
    case 'get_dashboard_url':
      return {
        content: [{
          type: 'text',
          text: `Team-Shinchan Dashboard: http://localhost:${state.serverPort}`,
        }],
      };

    case 'get_workflow_status':
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(state.workflow, null, 2),
        }],
      };

    case 'send_agent_event': {
      if (!args.type) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'type 필드가 필요합니다' }],
        };
      }

      const event = {
        id:        Date.now(),
        timestamp: new Date().toISOString(),
        ...args,
      };

      state.events.push(event);
      if (state.events.length > 1000) state.events.shift();

      // 에이전트 상태 업데이트 (타입별)
      if (args.agent && AGENTS[args.agent]) {
        if (args.type === 'agent_start') {
          state.agents[args.agent] = {
            ...(state.agents[args.agent] || {}),
            status: 'working', active: true, lastSeen: event.timestamp,
          };
          broadcast('agent_status', { agent: args.agent, status: 'working', active: true, timestamp: event.timestamp });
        } else if (args.type === 'agent_done') {
          state.agents[args.agent] = {
            ...(state.agents[args.agent] || {}),
            status: 'idle', active: false, lastSeen: event.timestamp,
            lastMessage: args.content || args.result || null,
          };
          broadcast('agent_status', { agent: args.agent, status: 'idle', active: false, timestamp: event.timestamp });
        } else {
          state.agents[args.agent] = {
            ...(state.agents[args.agent] || {}),
            lastSeen: event.timestamp,
          };
          broadcast('activity', event);
        }
      }

      // delegation 타입 처리
      if (args.type === 'delegation' && args.from && args.to) {
        state.delegations.push({ from: args.from, to: args.to, task: args.task || '', timestamp: event.timestamp });
        if (state.delegations.length > 100) state.delegations.shift();
        const chain = state.delegationChain;
        if (chain.length === 0) {
          state.delegationChain = [args.from, args.to];
        } else if (chain[chain.length - 1] === args.from) {
          state.delegationChain = [...chain, args.to];
        } else {
          state.delegationChain = [args.from, args.to];
        }
        broadcast('delegation', { from: args.from, to: args.to, task: args.task || '', delegationChain: state.delegationChain, timestamp: event.timestamp });
      }

      // workflow_update 타입 처리
      if (args.type === 'workflow_update' && args.workflow) {
        state.workflow = { ...state.workflow, ...args.workflow };
        broadcast('workflow_status', { workflow: state.workflow, timestamp: event.timestamp });
      }

      return {
        content: [{ type: 'text', text: `이벤트 전송 완료 (id: ${event.id})` }],
      };
    }

    default:
      return {
        isError: true,
        content: [{ type: 'text', text: `알 수 없는 도구: ${toolName}` }],
      };
  }
}

/**
 * MCP JSON-RPC 요청 처리
 * @param {object} request - 파싱된 JSON-RPC 요청
 * @returns {object} JSON-RPC 응답
 */
function handleMcpRequest(request) {
  const { id, method, params } = request;

  // 응답 헬퍼
  const ok  = (result) => ({ jsonrpc: '2.0', id, result });
  const err = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    // ── initialize ──
    case 'initialize':
      return ok({
        protocolVersion: '2024-11-05',
        capabilities:    { tools: {} },
        serverInfo:      {
          name:    'team-shinchan-dashboard',
          version: '1.0.0',
        },
      });

    // ── initialized (notification, id가 없을 수 있음) ──
    case 'notifications/initialized':
      return null; // 알림에는 응답 없음

    // ── tools/list ──
    case 'tools/list':
      return ok({ tools: MCP_TOOLS });

    // ── tools/call ──
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return err(-32602, 'name 파라미터가 필요합니다');
      }

      const result = executeMcpTool(toolName, toolArgs);
      return ok(result);
    }

    // ── ping ──
    case 'ping':
      return ok({});

    default:
      return err(-32601, `알 수 없는 메서드: ${method}`);
  }
}

// ── MCP stdio 읽기 루프 ────────────────────────────────────────────────────────
/**
 * stdin에서 JSON-RPC 메시지를 읽어 처리
 * Claude Code는 newline-delimited JSON으로 통신
 */
function startMcpServer() {
  let buffer = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    // 줄 단위로 처리 (JSON-RPC는 한 줄씩)
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 마지막 불완전한 줄은 버퍼에 보관

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let request;
      try {
        request = JSON.parse(trimmed);
      } catch {
        log(`JSON 파싱 오류: ${trimmed.substring(0, 100)}`);
        continue;
      }

      log(`MCP 요청: ${request.method} (id: ${request.id})`);

      const response = handleMcpRequest(request);
      if (response !== null) {
        // stdout으로 응답 전송
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
  });

  process.stdin.on('end', () => {
    log('stdin 종료. Claude Code 연결이 끊어졌습니다.');
    // MCP 클라이언트(Claude Code)가 종료되면 gracefulShutdown으로 깨끗하게 종료
    // (포트 파일 삭제 + SSE 클라이언트 정리 포함)
    // (단, HTTP 서버 단독 테스트 시에는 종료하지 않도록 플래그 확인)
    if (!process.env.DASHBOARD_STANDALONE) {
      gracefulShutdown();
    }
  });

  log('MCP stdio 서버 시작됨');
}

// ── 글로벌 HTTP 서버 인스턴스 (graceful shutdown용) ───────────────────────────
let httpServer = null;

// ── HTTP 서버 시작 ─────────────────────────────────────────────────────────────
/**
 * HTTP 서버를 시작합니다. 포트 충돌 시 다음 포트를 자동으로 시도합니다.
 * @param {number} port       - 시도할 포트 번호
 * @param {number} maxRetries - 최대 재시도 횟수
 */
function startHttpServer(port = PORT, maxRetries = 10) {
  const server = http.createServer(handleHttpRequest);
  httpServer = server;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxRetries > 0) {
      const nextPort = port + 1;
      log(`포트 ${port} 사용 중. ${nextPort}번 포트로 재시도... (남은 시도: ${maxRetries - 1})`);
      httpServer = null;
      startHttpServer(nextPort, maxRetries - 1);
    } else if (err.code === 'EADDRINUSE') {
      log(`HTTP 서버 시작 실패: 포트 범위 ${PORT}-${port} 모두 사용 중. DASHBOARD_PORT 환경변수로 포트를 변경하세요.`);
      // HTTP 서버 오류가 발생해도 MCP 서버는 계속 동작
    } else {
      log(`HTTP 서버 오류: ${err.message}`);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    state.serverPort = port; // 실제 사용 포트 저장
    writePortFile(port); // 포트 파일 기록 (포트 디스커버리용)
    log(`HTTP 서버 시작: http://localhost:${port}`);
    log(`- 대시보드:      http://localhost:${port}/`);
    log(`- API 상태:      http://localhost:${port}/api/status`);
    log(`- 에이전트:      http://localhost:${port}/api/agents`);
    log(`- 이벤트 목록:   http://localhost:${port}/api/events?limit=50`);
    log(`- 이벤트 POST:   http://localhost:${port}/api/events`);
    log(`- 이벤트 SSE:    http://localhost:${port}/api/events/stream`);
    log(`- 위임 흐름:     http://localhost:${port}/api/delegations`);
    log(`- 메시지 목록:   http://localhost:${port}/api/messages`);
    log(`- 채팅 메시지:   http://localhost:${port}/api/messages?type=chat`);
    log(`- Debate 상태:   http://localhost:${port}/api/debate`);

    // 브라우저 자동 열기 (새 서버가 시작될 때만 호출)
    openBrowser(`http://localhost:${port}`);
  });
}

// ── Graceful Shutdown ──────────────────────────────────────────────────────────

/**
 * 서버를 정상적으로 종료합니다.
 * - SSE 클라이언트 연결 종료
 * - HTTP 서버 close
 * 프로세스 종료
 */
function gracefulShutdown() {
  log('서버 종료 중...');

  // 포트 파일 삭제
  removePortFile();

  // SSE 클라이언트 연결 종료
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].end();
    } catch {
      // 이미 끊어진 클라이언트는 무시
    }
  }
  sseClients.length = 0;
  log('SSE 클라이언트 연결 종료 완료');

  // HTTP 서버 close
  if (httpServer) {
    httpServer.close(() => {
      log('HTTP 서버 종료 완료');
      process.exit(0);
    });
    // 5초 안에 종료되지 않으면 강제 종료
    setTimeout(() => {
      log('HTTP 서버 강제 종료');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown());
process.on('SIGINT',  () => gracefulShutdown());

// 처리되지 않은 예외 로깅 (서버 크래시 방지)
process.on('uncaughtException', (err) => {
  log(`처리되지 않은 예외 (서버 계속 동작): ${err.message}`);
  log(err.stack || '');
});
process.on('unhandledRejection', (reason) => {
  log(`처리되지 않은 Promise 거부 (서버 계속 동작): ${reason}`);
});

// ── 진입점 ─────────────────────────────────────────────────────────────────────
log('Team-Shinchan Dashboard Server 시작 중...');
log(`Plugin Root: ${PLUGIN_ROOT}`);
log(`Docs Dir:    ${DOCS_DIR}`);

// process.on('exit') 에서도 포트 파일 정리 (비정상 종료 대비)
process.on('exit', () => removePortFile());

// MCP stdio 서버는 항상 시작
startMcpServer();

// 기존 인스턴스 감지 후 HTTP 서버 시작 여부 결정
(async () => {
  // 좀비 프로세스 먼저 정리 (BUG-3, ENH-1)
  await killZombieProcesses();

  // 좀비 종료 후 포트 해제 대기 (SIGTERM 처리 시간)
  await new Promise(r => setTimeout(r, 1000));

  const existingPort = await checkExistingServer();

  if (existingPort) {
    log(`기존 대시보드 서버 감지 (포트: ${existingPort}). HTTP 서버를 시작하지 않습니다.`);
    log(`기존 대시보드 URL: http://localhost:${existingPort}`);
    state.serverPort = existingPort; // 기존 서버 포트를 MCP 응답에 사용
  } else {
    // 기존 서버가 없으면 HTTP 서버 시작
    log('기존 대시보드 서버 없음. HTTP 서버를 시작합니다.');
    startHttpServer();
  }

  startFileWatcher();
})();
