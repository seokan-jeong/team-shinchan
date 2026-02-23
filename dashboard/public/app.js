/* DEPRECATED: This legacy dashboard JS is a fallback for when dist/ is not built.
   Use the React app (npm run build) for the full-featured dashboard.
   This file will be removed in a future version. */

/* ════════════════════════════════════════════════════
   에이전트 정적 데이터
════════════════════════════════════════════════════ */
const AGENTS = {
  shinnosuke:  { emoji: '👦', name: 'Shinnosuke',   role: 'Orchestrator',    layer: 'Orchestration', model: 'opus' },
  himawari:    { emoji: '🌸', name: 'Himawari',     role: 'Atlas',           layer: 'Orchestration', model: 'opus' },
  midori:      { emoji: '🌻', name: 'Midori',       role: 'Debate Moderator',layer: 'Orchestration', model: 'sonnet' },
  bo:          { emoji: '😪', name: 'Bo',           role: 'Task Executor',   layer: 'Execution',     model: 'sonnet' },
  kazama:      { emoji: '🎩', name: 'Kazama',       role: 'Deep Worker',     layer: 'Execution',     model: 'opus' },
  aichan:      { emoji: '🎀', name: 'Aichan',       role: 'Frontend',        layer: 'Specialist',    model: 'sonnet' },
  bunta:       { emoji: '🍜', name: 'Bunta',        role: 'Backend',         layer: 'Specialist',    model: 'sonnet' },
  masao:       { emoji: '🍙', name: 'Masao',        role: 'DevOps',          layer: 'Specialist',    model: 'sonnet' },
  hiroshi:     { emoji: '👔', name: 'Hiroshi',      role: 'Oracle',          layer: 'Advisory',      model: 'opus' },
  nene:        { emoji: '📋', name: 'Nene',         role: 'Planner',         layer: 'Advisory',      model: 'opus' },
  misae:       { emoji: '👩', name: 'Misae',        role: 'Pre-Planning',    layer: 'Advisory',      model: 'sonnet' },
  actionkamen: { emoji: '🦸', name: 'Action Kamen', role: 'Reviewer',        layer: 'Advisory',      model: 'opus' },
  shiro:       { emoji: '🐶', name: 'Shiro',        role: 'Explorer',        layer: 'Utility',       model: 'haiku' },
  masumi:      { emoji: '📚', name: 'Masumi',       role: 'Librarian',       layer: 'Utility',       model: 'sonnet' },
  ume:         { emoji: '🖼️', name: 'Ume',          role: 'Multimodal',      layer: 'Utility',       model: 'sonnet' },
};

/* 레이어 순서 정의 */
const LAYER_ORDER = ['Orchestration', 'Execution', 'Specialist', 'Advisory', 'Utility'];

/* 워크플로우 4-스테이지 정의 */
const STAGES = [
  { id: 'requirements', label: 'Requirements', num: 1 },
  { id: 'planning',     label: 'Planning',     num: 2 },
  { id: 'execution',    label: 'Execution',    num: 3 },
  { id: 'completion',   label: 'Completion',   num: 4 },
];

/* ════════════════════════════════════════════════════
   애플리케이션 상태
════════════════════════════════════════════════════ */
const state = {
  connected:         false,
  currentStage:      null,    /* 현재 워크플로우 스테이지 ID */
  currentPhase:      null,    /* "1/4" 형태 */
  currentPhaseTitle: null,    /* Phase 제목 (선택적) */
  agentStatuses:    {},      /* { agentId: 'idle'|'working'|'completed' } */
  events:           [],      /* 이벤트 목록 (최신순) */
  eventSource:      null,
  delegationChain:  [],      /* 현재 위임 체인 [agentId, agentId, ...] */
  activeAgentId:    null,    /* 현재 작업 중인 에이전트 ID */
  MAX_EVENTS:       100,     /* DOM에 유지할 최대 이벤트 수 */
  /* ── 채팅 상태 ── */
  chatMessages:     [],      /* 채팅 메시지 목록 */
  MAX_CHAT:         200,     /* 최대 채팅 메시지 수 */
  /* ── Debate 상태 ── */
  debateState:      'inactive', /* inactive | active | concluded */
  debateTopic:      null,
  debateRounds:     [],      /* [{ label, panelists: [{ agentId, opinion }] }] */
  debateConclusion: null,
  currentRoundIdx:  -1,
  /* ── 메트릭 상태 ── */
  sessionStartedAt: null,    /* 세션 시작 시각 (Date 객체 또는 null) */
  progressData:     null,    /* 최신 progress 데이터 { total, completed, percentage, phases } */
};

/* ════════════════════════════════════════════════════
   초기화
════════════════════════════════════════════════════ */
function init() {
  renderSidebar();
  renderStages();
  startClock();
  startMetricsTicker();
  updateFooterEndpoint();
  updateFooterVersion();
  initTabs();
  loadInitialData();
  connectSSE();
}

/* ════════════════════════════════════════════════════
   탭 시스템
════════════════════════════════════════════════════ */

/* 탭 초기화: 클릭 이벤트 등록 */
function initTabs() {
  const tabs = document.querySelectorAll('.tab-bar .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });
}

/* 탭 전환 함수 */
function switchTab(tabId) {
  /* 탭 버튼 활성 상태 및 aria-selected 변경 */
  const tabs = document.querySelectorAll('.tab-bar .tab');
  tabs.forEach(tab => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  /* 탭 콘텐츠 표시/숨김 - hidden 제거 시 fadeIn 애니메이션 재실행 */
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => {
    const isVisible = content.id === `tab-${tabId}`;
    if (isVisible && content.classList.contains('hidden')) {
      /* hidden 제거 후 애니메이션 재실행을 위해 reflow 강제 */
      content.classList.remove('hidden');
      void content.offsetWidth; /* reflow trigger */
    } else if (!isVisible) {
      content.classList.add('hidden');
    }
  });

  /* docs 탭 전환 시 문서 목록 로드 */
  if (tabId === 'docs') {
    loadDocs();
  }
}

/* ── 시계 ───────────────────────────────────────── */
function startClock() {
  const el = document.getElementById('footer-clock');
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

/* ── 푸터 엔드포인트 ─────────────────────────────── */
function updateFooterEndpoint() {
  const el = document.getElementById('footer-endpoint');
  el.textContent = window.location.host || 'localhost';
}

/* ── 푸터 버전 (서버에서 동적 조회) ──────────────── */
function updateFooterVersion() {
  fetch('/api/health')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('footer-version');
      if (el && data.version) el.textContent = data.version;
    })
    .catch(() => { /* 실패 시 — 표시 유지 */ });
}

/* ════════════════════════════════════════════════════
   사이드바 렌더링
════════════════════════════════════════════════════ */
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';

  /* 레이어별 그룹화 */
  const byLayer = {};
  LAYER_ORDER.forEach(l => (byLayer[l] = []));
  Object.entries(AGENTS).forEach(([id, ag]) => {
    if (byLayer[ag.layer]) byLayer[ag.layer].push({ id, ...ag });
  });

  LAYER_ORDER.forEach(layer => {
    const agents = byLayer[layer];
    if (!agents.length) return;

    const group = document.createElement('div');
    group.className = 'layer-group';

    const label = document.createElement('div');
    label.className = 'layer-label';
    label.textContent = layer;
    group.appendChild(label);

    agents.forEach(ag => {
      const card = document.createElement('div');
      card.className = 'agent-card';
      card.id = `agent-${ag.id}`;
      card.dataset.status = state.agentStatuses[ag.id] || 'idle';
      card.title = `${ag.name} (${ag.role}) — ${ag.model}`;

      card.innerHTML = `
        <div class="agent-emoji">${ag.emoji}</div>
        <div class="agent-info">
          <div class="agent-name">${ag.name}</div>
          <div class="agent-role">${ag.role}</div>
          <div class="agent-preview" id="preview-${ag.id}"></div>
        </div>
        <div class="agent-status"></div>
        <div class="agent-check" id="check-${ag.id}">✓</div>
      `;
      group.appendChild(card);
    });

    sidebar.appendChild(group);
  });
}

/* 에이전트 상태 업데이트 */
function updateAgentStatus(agentId, status, previewMsg) {
  state.agentStatuses[agentId] = status;
  const card = document.getElementById(`agent-${agentId}`);
  if (!card) return;

  card.dataset.status = status;

  /* agent_start: 작업 시작 → 상태 텍스트 표시 */
  const roleEl = card.querySelector('.agent-role');
  if (roleEl) {
    if (status === 'working') {
      roleEl.textContent = 'Working...';
      state.activeAgentId = agentId;
    } else {
      /* idle / completed 시 원래 role 복원 */
      const agentData = AGENTS[agentId];
      if (agentData) roleEl.textContent = agentData.role;
      if (status !== 'working' && state.activeAgentId === agentId) {
        state.activeAgentId = null;
      }
    }
  }

  /* 메시지 미리보기 업데이트 */
  if (previewMsg) {
    const previewEl = document.getElementById(`preview-${agentId}`);
    if (previewEl) {
      previewEl.textContent = previewMsg;
      previewEl.classList.add('visible');
    }
  }

  /* agent_done: 체크마크 2초 후 idle 전환 */
  if (status === 'completed') {
    const checkEl = document.getElementById(`check-${agentId}`);
    if (checkEl) {
      checkEl.classList.add('show');
      setTimeout(() => {
        checkEl.classList.remove('show');
        const freshCard = document.getElementById(`agent-${agentId}`);
        if (freshCard) {
          freshCard.dataset.status = 'idle';
          state.agentStatuses[agentId] = 'idle';
          /* idle 전환 시 role 복원 */
          const agentData = AGENTS[agentId];
          const freshRoleEl = freshCard.querySelector('.agent-role');
          if (agentData && freshRoleEl) freshRoleEl.textContent = agentData.role;
        }
      }, 2000);
    }
  }
}

/* ════════════════════════════════════════════════════
   워크플로우 스테이지 렌더링
════════════════════════════════════════════════════ */
function renderStages() {
  const container = document.getElementById('stages');
  container.innerHTML = '';

  const currentIdx = STAGES.findIndex(s => s.id === state.currentStage);

  STAGES.forEach((stage, idx) => {
    /* 스테이지 상태 결정 */
    let stageState = 'pending';
    if (state.currentStage === null) {
      stageState = 'pending';
    } else if (idx < currentIdx) {
      stageState = 'done';
    } else if (idx === currentIdx) {
      stageState = 'active';
    }

    /* 연결선 (첫 스테이지 제외) */
    if (idx > 0) {
      const conn = document.createElement('div');
      conn.className = `stage-connector${idx <= currentIdx && currentIdx > 0 ? ' done' : ''}`;
      container.appendChild(conn);
    }

    /* 스테이지 아이템 */
    const stageEl = document.createElement('div');
    stageEl.className = `stage ${stageState}`;
    stageEl.innerHTML = `
      <div class="stage-inner">
        <div class="stage-icon">
          ${stageState === 'done'
            ? '✓'
            : stageState === 'active'
              ? stage.num
              : stage.num}
        </div>
        <div class="stage-text">
          <div class="stage-num">Stage ${stage.num}</div>
          <div class="stage-name">${stage.label}</div>
        </div>
      </div>
    `;
    container.appendChild(stageEl);
  });
}

/* 스테이지 + 페이즈 업데이트
   progressData: { total, completed, percentage, phases } (선택적) */
function updateWorkflow(stageId, phase, phaseTitle, progressData) {
  state.currentStage      = stageId || null;
  state.currentPhase      = phase || null;
  state.currentPhaseTitle = phaseTitle || null;
  if (progressData) state.progressData = progressData;

  renderStages();

  /* 워크플로우 바의 phase-info 배지 업데이트 */
  const phaseEl = document.getElementById('phase-info');
  if (phase) {
    phaseEl.textContent = `Phase ${phase}`;
    phaseEl.style.display = '';
  } else {
    phaseEl.style.display = 'none';
  }

  /* Phase 진행률 섹션 렌더링 */
  renderPhaseProgress(phase, phaseTitle, progressData || state.progressData);
}

/* Phase 진행률 도트 + 프로그레스 바 렌더링
   phase 형태: "2/4" (현재/전체)
   progressData 형태: { total, completed, percentage, phases: [{title, total, completed, percentage}] } */
function renderPhaseProgress(phase, phaseTitle, progressData) {
  const bar = document.getElementById('phase-progress-bar');

  if (!phase) {
    bar.classList.remove('visible');
    return;
  }

  /* "2/4" 형태 파싱 */
  const parts   = String(phase).split('/');
  const current = parseInt(parts[0], 10) || 1;
  const total   = parseInt(parts[1], 10) || 4;

  /* Phase 카운터 텍스트 */
  document.getElementById('phase-counter').textContent = `Phase ${current} / ${total}`;

  /* Phase 제목 표시 */
  const titleEl = document.getElementById('phase-title');
  if (phaseTitle) {
    titleEl.textContent = phaseTitle;
    titleEl.style.display = '';
  } else {
    titleEl.style.display = 'none';
  }

  /* Phase 도트 생성 */
  const dotsEl = document.getElementById('phase-dots');
  dotsEl.innerHTML = '';

  for (let i = 1; i <= total; i++) {
    const dot = document.createElement('div');
    dot.className = 'phase-dot';
    dot.setAttribute('role', 'listitem');

    if (i < current) {
      dot.classList.add('done');
      dot.title = `Phase ${i} - 완료`;
      dot.setAttribute('aria-label', `Phase ${i} 완료`);
    } else if (i === current) {
      dot.classList.add('current');
      dot.title = `Phase ${i} - 진행 중${phaseTitle ? ': ' + phaseTitle : ''}`;
      dot.setAttribute('aria-label', `Phase ${i} 진행 중`);
    } else {
      dot.classList.add('future');
      dot.title = `Phase ${i} - 대기`;
      dot.setAttribute('aria-label', `Phase ${i} 대기`);
    }

    dotsEl.appendChild(dot);
  }

  /* ── 전체 퍼센트 바 렌더링 ── */
  const overallBar  = document.getElementById('overall-progress-bar');
  const overallFill = document.getElementById('overall-progress-fill');
  const pctLabel    = document.getElementById('progress-pct');

  if (progressData && typeof progressData.percentage === 'number') {
    const pct = progressData.percentage;
    overallFill.style.width = `${pct}%`;
    pctLabel.textContent    = `${pct}%`;
    pctLabel.style.display  = '';
    overallBar.style.display = '';
  } else {
    overallBar.style.display = 'none';
    pctLabel.style.display   = 'none';
  }

  /* ── Phase별 미니 프로그레스 바 렌더링 ── */
  const miniBarsEl = document.getElementById('phase-mini-bars');
  miniBarsEl.innerHTML = '';

  if (progressData && Array.isArray(progressData.phases) && progressData.phases.length > 0) {
    progressData.phases.forEach((ph, idx) => {
      if (ph.total === 0) return; /* 체크박스 없는 Phase는 건너뜀 */

      const row = document.createElement('div');
      row.className = 'phase-mini-row';

      const label = document.createElement('div');
      label.className = 'phase-mini-label';
      /* Phase 번호 + 제목 축약 표시 */
      const shortTitle = ph.title.length > 18 ? ph.title.substring(0, 16) + '…' : ph.title;
      label.textContent = `P${idx + 1}: ${shortTitle}`;
      label.title = ph.title;

      const miniBar = document.createElement('div');
      miniBar.className = 'phase-mini-bar';

      const miniFill = document.createElement('div');
      miniFill.className = 'phase-mini-fill';
      miniFill.style.width = `${ph.percentage}%`;
      /* 100% 완료 시 success 색상, 진행 중은 accent 색상 */
      if (ph.percentage >= 100) {
        miniFill.style.background = 'var(--success)';
      } else if (ph.percentage > 0) {
        miniFill.style.background = 'var(--accent)';
      }
      miniBar.appendChild(miniFill);

      const pctEl = document.createElement('div');
      pctEl.className = 'phase-mini-pct';
      pctEl.textContent = `${ph.percentage}%`;

      row.appendChild(label);
      row.appendChild(miniBar);
      row.appendChild(pctEl);
      miniBarsEl.appendChild(row);
    });
  }

  bar.classList.add('visible');
}

/* ════════════════════════════════════════════════════
   실시간 메트릭 위젯
════════════════════════════════════════════════════ */

/* 1초 간격으로 메트릭 업데이트 */
function startMetricsTicker() {
  function tick() {
    /* 활성 에이전트 수 */
    const activeCount = Object.values(state.agentStatuses).filter(s => s === 'working').length;
    const activeEl    = document.getElementById('metric-active');
    if (activeEl) {
      activeEl.textContent = activeCount;
      activeEl.classList.toggle('active', activeCount > 0);
    }

    /* 세션 경과 시간 (mm:ss) */
    const elapsedEl = document.getElementById('metric-elapsed');
    if (elapsedEl) {
      if (state.sessionStartedAt) {
        const diffMs  = Date.now() - state.sessionStartedAt.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const mm      = String(Math.floor(diffSec / 60)).padStart(2, '0');
        const ss      = String(diffSec % 60).padStart(2, '0');
        elapsedEl.textContent = `${mm}:${ss}`;
      } else {
        elapsedEl.textContent = '--:--';
      }
    }

    /* 이벤트 처리 수 */
    const eventsEl = document.getElementById('metric-events');
    if (eventsEl) {
      eventsEl.textContent = state.events.length;
    }
  }

  tick();
  setInterval(tick, 1000);
}

/* ════════════════════════════════════════════════════
   타임라인 (이벤트 로그)
════════════════════════════════════════════════════ */

/* 시간 포맷: HH:MM:SS */
function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* SSE 이벤트 종류별 아이콘 반환 */
function getEventIcon(etype, data) {
  const icons = {
    agent_start:     '🟢',
    agent_done:      '🔴',
    delegation:      '➡️',
    message:         '💬',
    user_prompt:     '👤',
    tool_use:        '🔧',
    stop:            '⏹️',
    session_start:   '🚀',
    session_end:     '🏁',
    workflow_update: '📋',
    file_change:     '📄',
    plan_step:       '📋',
    progress_update: '📊',
    review_result:   (() => {
      if (!data) return '✅';
      const r = data.result || data.review_result;
      if (r === 'fail')    return '❌';
      if (r === 'warning') return '⚠️';
      return '✅';
    })(),
  };
  return icons[etype] || null; /* null이면 에이전트 이모지 사용 */
}

/* delegation 이벤트 전용 HTML 생성 */
function buildDelegationHtml(data) {
  const fromAgent = AGENTS[data.from] || { emoji: '🤖', name: data.from || '?' };
  const toAgent   = AGENTS[data.to]   || { emoji: '🤖', name: data.to   || '?' };
  return `
    <div class="event-delegation">
      <span class="delegation-from">${fromAgent.emoji} ${escapeHtml(fromAgent.name)}</span>
      <span class="delegation-arrow">→</span>
      <span class="delegation-to">${toAgent.emoji} ${escapeHtml(toAgent.name)}</span>
      ${data.task ? `<div class="delegation-task">"${escapeHtml(data.task)}"</div>` : ''}
    </div>
  `;
}

/* 이벤트 추가 (최신 이벤트가 상단)
   data 형태: { agentId, message, type, etype, timestamp, from, to, task, ... } */
function addTimelineEvent(data) {
  const {
    agentId,
    message,
    type                = 'info',
    etype               = null,   /* SSE 이벤트 종류 (agent_start, delegation 등) */
    timestamp           = new Date(),
    from,
    to,
    task,
    fromPreviousSession = false,  /* 이전 세션에서 복원된 이벤트 여부 */
  } = data;

  const agent     = AGENTS[agentId] || { emoji: '🤖', name: agentId || 'System' };
  const icon      = getEventIcon(etype, data) || agent.emoji;
  const agentName = agent.name;

  /* 빈 상태 숨김 */
  const emptyEl = document.getElementById('timeline-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  /* 이벤트 아이템 생성 */
  const item = document.createElement('div');
  item.className = fromPreviousSession ? 'event-item prev-session' : 'event-item';

  /* 이벤트 타입 속성 설정 */
  if (etype) item.dataset.etype = etype;
  else       item.dataset.type  = type;

  /* review_result: data-review-result 속성 설정 (CSS 색상 제어용) */
  if (etype === 'review_result' && data.result) {
    item.dataset.reviewResult = data.result;
  }

  /* 이전 세션 마커 */
  const prevSessionBadge = fromPreviousSession
    ? '<span class="prev-session-label">Previous Session</span>'
    : '';

  /* 이벤트 타입별 특별 렌더링 */
  let bodyHtml;
  if (etype === 'delegation' && (from || to)) {
    /* delegation: 기존 from→to 렌더링 */
    bodyHtml = buildDelegationHtml({ from, to, task });
    if (fromPreviousSession) bodyHtml += prevSessionBadge;
  } else if (etype === 'file_change') {
    /* file_change: 파일명 + 액션 표시 */
    const fileAction = data.action || 'modify';
    const filePath   = data.file || data.content || '';
    const fileName   = filePath ? filePath.split('/').pop() : '(unknown)';
    const actionColors = { create: '#3fb950', modify: '#58a6ff', delete: '#f85149' };
    const actionColor  = actionColors[fileAction] || '#8b949e';
    bodyHtml = `
      <div class="event-agent">${escapeHtml(agentName)}${prevSessionBadge}</div>
      <div class="event-msg">
        <span style="color:${actionColor};font-weight:600;text-transform:uppercase;font-size:11px;">${escapeHtml(fileAction)}</span>
        <span style="margin-left:6px;font-family:monospace;font-size:12px;">${escapeHtml(fileName)}</span>
        ${filePath && filePath !== fileName ? `<span style="color:var(--text-muted);font-size:11px;margin-left:4px;">${escapeHtml(filePath)}</span>` : ''}
      </div>
    `;
  } else if (etype === 'review_result') {
    /* review_result: pass/fail/warning 배지 표시 */
    const result = data.result || 'pass';
    const details = data.details || data.content || message || '';
    bodyHtml = `
      <div class="event-agent">
        ${escapeHtml(agentName)}
        <span class="review-badge ${escapeHtml(result)}">${escapeHtml(result.toUpperCase())}</span>
        ${prevSessionBadge}
      </div>
      ${details ? `<div class="event-msg">${escapeHtml(details)}</div>` : ''}
    `;
  } else {
    bodyHtml = `
      <div class="event-agent">${escapeHtml(agentName)}${prevSessionBadge}</div>
      ${message ? `<div class="event-msg">${escapeHtml(message)}</div>` : ''}
    `;
  }

  item.innerHTML = `
    <div class="event-time">${formatTime(timestamp)}</div>
    <div class="event-emoji">${icon}</div>
    <div class="event-body">${bodyHtml}</div>
  `;

  /* 타임라인 최상단에 삽입 (최신순) */
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  timeline.insertBefore(item, timeline.firstChild);

  /* 이벤트 배열 업데이트 */
  state.events.unshift(data);

  /* 최대 100개 이상이면 오래된 DOM 요소 제거 */
  if (state.events.length > state.MAX_EVENTS) {
    state.events.splice(state.MAX_EVENTS);
    /* DOM에서 마지막 항목 제거 (emptyEl 이후의 마지막 event-item) */
    const items = timeline.querySelectorAll('.event-item');
    if (items.length > state.MAX_EVENTS) {
      items[items.length - 1].remove();
    }
  }

  /* 이벤트 카운트 업데이트 */
  const countEl = document.getElementById('event-count');
  countEl.textContent = `${state.events.length} event${state.events.length !== 1 ? 's' : ''}`;
}

/* 하위 호환: 기존 addEvent() 래퍼 */
function addEvent({ agentId, message, type = 'info', timestamp = new Date() }) {
  addTimelineEvent({ agentId, message, type, timestamp });
}

/* ════════════════════════════════════════════════════
   채팅 뷰
════════════════════════════════════════════════════ */

/* 채팅 메시지 추가
   data 형태: { agentId, message, etype, from, to, task, timestamp, isUser } */
function addChatMessage(data) {
  const {
    agentId,
    message,
    etype     = null,
    from,
    to,
    task,
    timestamp = new Date(),
    isUser    = false,
  } = data;

  /* 채팅 빈 상태 숨김 */
  const emptyEl = document.getElementById('chat-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  /* 채팅 컨테이너 */
  const container = document.getElementById('chat-container');

  /* 위임 메시지 처리 */
  if (etype === 'delegation' && (from || to)) {
    _appendDelegationBubble(container, { from, to, task, timestamp });
    return;
  }

  /* 메시지가 없으면 추가하지 않음 */
  if (!message) return;

  /* 에이전트 정보 조회 */
  const agent = isUser
    ? { emoji: '👤', name: '사용자', layer: 'user' }
    : (AGENTS[agentId] || { emoji: '🤖', name: agentId || 'System', layer: 'Utility' });

  const group = document.createElement('div');
  group.className = 'chat-group';

  /* 타임스탬프 */
  const tsEl = document.createElement('div');
  tsEl.className = 'chat-timestamp';
  tsEl.textContent = formatTime(timestamp instanceof Date ? timestamp : new Date(timestamp));
  group.appendChild(tsEl);

  /* 버블 래퍼 */
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble${isUser ? ' user-msg' : ''}`;

  /* 아바타 */
  const avatar = document.createElement('div');
  avatar.className = 'bubble-avatar';
  avatar.textContent = agent.emoji;

  /* 버블 본문 */
  const content = document.createElement('div');
  content.className = 'bubble-content';

  const header = document.createElement('div');
  header.className = 'bubble-header';
  header.innerHTML = `
    <span class="bubble-name">${escapeHtml(agent.name)}</span>
    <span class="bubble-layer">${escapeHtml(agent.layer)}</span>
  `;

  const text = document.createElement('div');
  text.className = `bubble-text layer-${agent.layer.replace(/\s+/g, '')}`;
  text.textContent = message;

  content.appendChild(header);
  content.appendChild(text);
  bubble.appendChild(avatar);
  bubble.appendChild(content);
  group.appendChild(bubble);

  container.appendChild(group);

  /* 메시지 상태 저장 */
  state.chatMessages.push(data);
  if (state.chatMessages.length > state.MAX_CHAT) {
    state.chatMessages.shift();
    /* 오래된 DOM 요소 제거 */
    const groups = container.querySelectorAll('.chat-group');
    if (groups.length > state.MAX_CHAT) {
      groups[0].remove();
    }
  }

  /* 최신 메시지로 자동 스크롤 */
  container.scrollTop = container.scrollHeight;
}

/* 위임 버블 렌더링 */
function _appendDelegationBubble(container, { from, to, task, timestamp }) {
  const fromAgent = AGENTS[from] || { emoji: '🤖', name: from || '?' };
  const toAgent   = AGENTS[to]   || { emoji: '🤖', name: to   || '?' };

  const group = document.createElement('div');
  group.className = 'chat-group';

  const tsEl = document.createElement('div');
  tsEl.className = 'chat-timestamp';
  tsEl.textContent = formatTime(timestamp instanceof Date ? timestamp : new Date(timestamp));
  group.appendChild(tsEl);

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  const avatar = document.createElement('div');
  avatar.className = 'bubble-avatar';
  avatar.textContent = fromAgent.emoji;

  const content = document.createElement('div');
  content.className = 'bubble-content';

  const text = document.createElement('div');
  text.className = 'bubble-text delegation-bubble';

  const inner = document.createElement('div');
  inner.className = 'delegation-bubble-inner';
  inner.innerHTML = `
    <span class="delegation-badge">${fromAgent.emoji} ${escapeHtml(fromAgent.name)}</span>
    <span style="color:var(--text-muted);font-size:12px;">→</span>
    <span class="delegation-badge">${toAgent.emoji} ${escapeHtml(toAgent.name)}</span>
  `;
  if (task) {
    const taskEl = document.createElement('div');
    taskEl.className = 'delegation-task-text';
    taskEl.textContent = `"${task}"`;
    text.appendChild(inner);
    text.appendChild(taskEl);
  } else {
    text.appendChild(inner);
  }

  content.appendChild(text);
  bubble.appendChild(avatar);
  bubble.appendChild(content);
  group.appendChild(bubble);

  container.appendChild(group);
  container.scrollTop = container.scrollHeight;
}

/* ════════════════════════════════════════════════════
   위임 흐름 시각화
════════════════════════════════════════════════════ */

/* delegation 이벤트 수신 시 체인 업데이트 */
function updateDelegationFlow({ from, to, activeAgentId: activeId }) {
  /* 체인에 from이 없으면 추가 */
  if (from && !state.delegationChain.includes(from)) {
    state.delegationChain.push(from);
  }
  /* to 추가 */
  if (to && !state.delegationChain.includes(to)) {
    state.delegationChain.push(to);
  }

  /* 현재 활성 에이전트 업데이트 */
  if (activeId) state.activeAgentId = activeId;
  else if (to)  state.activeAgentId = to;

  renderDelegationChain();
}

/* 위임 체인 DOM 렌더링 */
function renderDelegationChain() {
  const section = document.getElementById('delegation-section');
  const chain   = document.getElementById('delegation-chain');

  if (!state.delegationChain.length) {
    section.classList.remove('visible');
    return;
  }

  section.classList.add('visible');
  chain.innerHTML = '';

  state.delegationChain.forEach((agentId, idx) => {
    /* 화살표 (첫 항목 제외) */
    if (idx > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'chain-arrow';
      arrow.textContent = '→';
      chain.appendChild(arrow);
    }

    /* 에이전트 노드 */
    const agentData = AGENTS[agentId] || { emoji: '🤖', name: agentId };
    const node      = document.createElement('div');
    node.className  = 'chain-node';

    /* 현재 작업 중인 에이전트 하이라이트 */
    if (agentId === state.activeAgentId) {
      node.classList.add('active');
    }

    node.innerHTML = `
      <span class="chain-emoji">${agentData.emoji}</span>
      <span class="chain-name">${escapeHtml(agentData.name)}</span>
    `;
    chain.appendChild(node);
  });
}

/* ════════════════════════════════════════════════════
   Debate 시각화
════════════════════════════════════════════════════ */

/* Debate 이벤트 처리
   data 형태: {
     debate_type: 'start' | 'opinion' | 'conclude',
     topic:        string,         // debate_type === 'start' 시 토론 주제
     agentId:      string,         // debate_type === 'opinion' 시 발언 에이전트
     opinion:      string,         // 발언 내용
     round:        number,         // 라운드 번호 (1부터)
     conclusion:   string,         // debate_type === 'conclude' 시 결론
   }
*/
function handleDebateEvent(data) {
  const debateType = data.debate_type || data.type;

  if (debateType === 'start') {
    /* 새 토론 시작 */
    state.debateState      = 'active';
    state.debateTopic      = data.topic || '토론 주제';
    state.debateRounds     = [];
    state.debateConclusion = null;
    state.currentRoundIdx  = -1;

    renderDebate();

    /* 자동으로 토론 탭 전환 */
    switchTab('debate');
    return;
  }

  if (debateType === 'opinion') {
    /* 라운드 번호 결정 */
    const roundNum = data.round || 1;
    const roundIdx = roundNum - 1;

    /* 라운드가 없으면 생성 */
    while (state.debateRounds.length <= roundIdx) {
      state.debateRounds.push({
        label:     `Round ${state.debateRounds.length + 1}`,
        panelists: [],
      });
    }

    state.debateRounds[roundIdx].panelists.push({
      agentId: data.agentId,
      opinion: data.opinion || data.message || '',
    });

    state.currentRoundIdx = roundIdx;
    renderDebate();
    return;
  }

  if (debateType === 'conclude') {
    /* 토론 결론 */
    state.debateState      = 'concluded';
    state.debateConclusion = data.conclusion || data.message || '';
    renderDebate();
    return;
  }
}

/* Debate DOM 렌더링 */
function renderDebate() {
  const container = document.getElementById('debate-container');
  const emptyEl   = document.getElementById('debate-empty');

  if (state.debateState === 'inactive') {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  /* 기존 내용 초기화 후 재렌더링 */
  container.innerHTML = '';

  /* Debate 헤더 */
  const header = document.createElement('div');
  header.className = 'debate-header';
  const statusBadge = state.debateState === 'concluded'
    ? `<span class="debate-status-badge concluded">결론 도출</span>`
    : `<span class="debate-status-badge active">진행 중</span>`;

  header.innerHTML = `
    <div class="debate-header-emoji">🌻</div>
    <div class="debate-header-info">
      <div class="debate-label">Debate</div>
      <div class="debate-topic">${escapeHtml(state.debateTopic || '')}</div>
    </div>
    ${statusBadge}
  `;
  container.appendChild(header);

  /* 라운드별 패널리스트 카드 */
  state.debateRounds.forEach(round => {
    const roundEl = document.createElement('div');
    roundEl.className = 'debate-round';

    const roundLabel = document.createElement('div');
    roundLabel.className = 'debate-round-label';
    roundLabel.textContent = round.label;
    roundEl.appendChild(roundLabel);

    const panelistsEl = document.createElement('div');
    panelistsEl.className = 'debate-panelists';

    round.panelists.forEach(p => {
      const agentData = AGENTS[p.agentId] || { emoji: '🤖', name: p.agentId || '?' };
      const card = document.createElement('div');
      card.className = 'panelist-card';
      card.innerHTML = `
        <div class="panelist-header">
          <span class="panelist-emoji">${agentData.emoji}</span>
          <span class="panelist-name">${escapeHtml(agentData.name)}</span>
        </div>
        <div class="panelist-opinion">${escapeHtml(p.opinion)}</div>
      `;
      panelistsEl.appendChild(card);
    });

    roundEl.appendChild(panelistsEl);
    container.appendChild(roundEl);
  });

  /* 결론 카드 (concluded 상태일 때) */
  if (state.debateState === 'concluded' && state.debateConclusion) {
    const conclusionEl = document.createElement('div');
    conclusionEl.className = 'debate-conclusion';
    conclusionEl.innerHTML = `
      <div class="debate-conclusion-label">🏆 결론</div>
      <div class="debate-conclusion-text">${escapeHtml(state.debateConclusion)}</div>
    `;
    container.appendChild(conclusionEl);
  }

  /* 최하단으로 스크롤 */
  container.scrollTop = container.scrollHeight;
}

/* HTML 이스케이프 (XSS 방지) */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ════════════════════════════════════════════════════
   경량 마크다운 파서 (Step 4.4)
   XSS 방지: 입력 텍스트를 먼저 HTML 이스케이프 후 마크다운 변환
════════════════════════════════════════════════════ */

/**
 * YAML frontmatter (--- ... ---) 를 추출하여 { frontmatter, body } 반환
 * frontmatter가 없으면 { frontmatter: null, body: 원본 텍스트 }
 */
function extractFrontmatter(mdText) {
  const match = mdText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (match) {
    return { frontmatter: match[1].trim(), body: match[2] };
  }
  return { frontmatter: null, body: mdText };
}

/**
 * 경량 마크다운 파서
 * @param {string} mdText - 마크다운 원문
 * @returns {string} HTML 문자열
 */
function renderMarkdown(mdText) {
  if (!mdText) return '';

  // YAML frontmatter 분리
  const { frontmatter, body } = extractFrontmatter(mdText);

  let html = '';

  // frontmatter가 있으면 메타 블록으로 렌더링
  if (frontmatter) {
    html += `<div class="md-frontmatter"><div class="md-frontmatter-label">Frontmatter</div>${escapeHtml(frontmatter)}</div>`;
  }

  html += _parseMarkdownBody(body);
  return html;
}

/**
 * 마크다운 본문 파싱 (내부 함수)
 * XSS 방지를 위해 먼저 이스케이프 후 마크다운 패턴 적용
 */
function _parseMarkdownBody(text) {
  const lines = text.split('\n');
  let result = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── 코드블록 (``` ... ```) ──
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      result += `<pre><code${lang ? ` class="lang-${escapeHtml(lang)}"` : ''}>${codeLines.join('\n')}</code></pre>`;
      i++;
      continue;
    }

    // ── 수평선 (--- or ***) ──
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      result += '<hr>';
      i++;
      continue;
    }

    // ── 제목 (# ~ ######) ──
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = _inlineMarkdown(escapeHtml(headingMatch[2]));
      result += `<h${level}>${content}</h${level}>`;
      i++;
      continue;
    }

    // ── 테이블 (| col | col |) ──
    if (line.includes('|') && line.trimStart().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      result += _parseTable(tableLines);
      continue;
    }

    // ── 목록 항목 (- item 또는 - [ ] / - [x]) ──
    const listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (listMatch) {
      // 연속된 목록 항목들을 하나의 <ul>로 묶음
      result += '<ul>';
      while (i < lines.length) {
        const lm = lines[i].match(/^(\s*)[-*+]\s+(.*)$/);
        if (!lm) break;
        const itemContent = lm[2];
        // 체크박스 패턴: - [ ] 또는 - [x]
        const checkboxMatch = itemContent.match(/^\[([ xX])\]\s+(.*)$/);
        if (checkboxMatch) {
          const checked = checkboxMatch[1].toLowerCase() === 'x';
          const label = _inlineMarkdown(escapeHtml(checkboxMatch[2]));
          result += `<li class="task-list-item"><input type="checkbox" class="task-checkbox"${checked ? ' checked' : ''} disabled><span>${label}</span></li>`;
        } else {
          result += `<li>${_inlineMarkdown(escapeHtml(itemContent))}</li>`;
        }
        i++;
      }
      result += '</ul>';
      continue;
    }

    // ── 빈 줄 ──
    if (line.trim() === '') {
      // 연속 빈 줄은 단락 구분으로 처리
      result += '<p></p>';
      i++;
      continue;
    }

    // ── 일반 단락 ──
    result += `<p>${_inlineMarkdown(escapeHtml(line))}</p>`;
    i++;
  }

  return result;
}

/**
 * 테이블 파싱
 * @param {string[]} lines - 테이블 줄 배열 (| 로 시작)
 * @returns {string} HTML 테이블
 */
function _parseTable(lines) {
  if (lines.length < 2) {
    return `<p>${escapeHtml(lines.join('\n'))}</p>`;
  }

  // 구분선(두 번째 줄: |---|---|) 체크
  const isSeparator = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);

  let headerLine = lines[0];
  let hasHeader = lines.length >= 2 && isSeparator(lines[1]);

  const parseRow = (rowLine) => {
    return rowLine
      .replace(/^\s*\|/, '')  // 앞 | 제거
      .replace(/\|\s*$/, '')  // 뒤 | 제거
      .split('|')
      .map(cell => cell.trim());
  };

  let html = '<table>';

  if (hasHeader) {
    const headers = parseRow(headerLine);
    html += '<thead><tr>';
    headers.forEach(h => {
      html += `<th>${_inlineMarkdown(escapeHtml(h))}</th>`;
    });
    html += '</tr></thead>';

    html += '<tbody>';
    for (let j = 2; j < lines.length; j++) {
      if (isSeparator(lines[j])) continue;
      const cells = parseRow(lines[j]);
      html += '<tr>';
      cells.forEach(c => {
        html += `<td>${_inlineMarkdown(escapeHtml(c))}</td>`;
      });
      html += '</tr>';
    }
    html += '</tbody>';
  } else {
    html += '<tbody>';
    lines.forEach(l => {
      if (isSeparator(l)) return;
      const cells = parseRow(l);
      html += '<tr>';
      cells.forEach(c => {
        html += `<td>${_inlineMarkdown(escapeHtml(c))}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
  }

  html += '</table>';
  return html;
}

/**
 * 인라인 마크다운 변환 (이미 escapeHtml 처리된 텍스트에 적용)
 * - **bold**, *italic*, `code`
 * NOTE: 이미 escapeHtml이 적용된 문자열을 받으므로 추가 이스케이프 불필요
 */
function _inlineMarkdown(escapedText) {
  return escapedText
    // **bold** 또는 __bold__
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
    // *italic* 또는 _italic_
    .replace(/\*(.+?)\*|_(.+?)_/g, (_, a, b) => `<em>${a || b}</em>`)
    // `inline code` (백틱으로 둘러싸인 코드)
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
}

/* ════════════════════════════════════════════════════
   문서 뷰어 (Step 4.5)
════════════════════════════════════════════════════ */

/* 현재 열린 문서 파일명 추적 */
const docsState = {
  currentFile: null,
};

/**
 * 문서 목록 로드 (GET /api/docs)
 * docs 탭 전환 시 호출
 */
async function loadDocs() {
  const fileListEl = document.getElementById('docs-file-list');
  if (!fileListEl) return;

  fileListEl.innerHTML = '<div style="padding:8px 6px;font-size:11px;color:var(--text-muted);">로딩 중...</div>';

  try {
    const res = await fetch('/api/docs');
    if (!res.ok) {
      fileListEl.innerHTML = '<div style="padding:8px 6px;font-size:11px;color:var(--error);">목록 로드 실패</div>';
      return;
    }

    const data = await res.json();
    renderDocFileList(data.docs || []);

    // 목록 로드 후 기존에 열린 파일이 있으면 유지, 없으면 첫 번째 존재 파일 자동 로드
    if (!docsState.currentFile) {
      const firstExisting = (data.docs || []).find(d => d.exists);
      if (firstExisting) {
        loadDocContent(firstExisting.name);
      }
    }
  } catch (_e) {
    fileListEl.innerHTML = '<div style="padding:8px 6px;font-size:11px;color:var(--error);">서버 연결 실패</div>';
  }
}

/**
 * 파일 목록 렌더링
 * @param {Array<{name, exists}>} docs
 */
function renderDocFileList(docs) {
  const fileListEl = document.getElementById('docs-file-list');
  if (!fileListEl) return;

  fileListEl.innerHTML = '';

  if (docs.length === 0) {
    fileListEl.innerHTML = '<div style="padding:8px 6px;font-size:11px;color:var(--text-muted);">문서 없음</div>';
    return;
  }

  docs.forEach(doc => {
    const item = document.createElement('div');
    item.className = `docs-file-item${!doc.exists ? ' missing' : ''}${docsState.currentFile === doc.name ? ' active' : ''}`;
    item.dataset.filename = doc.name;

    const icon = doc.exists ? '📄' : '📋';
    item.innerHTML = `<span class="docs-file-icon">${icon}</span><span>${escapeHtml(doc.name)}</span>`;

    if (doc.exists) {
      item.addEventListener('click', () => loadDocContent(doc.name));
    }

    fileListEl.appendChild(item);
  });
}

/**
 * 문서 내용 로드 및 렌더링 (GET /api/docs/:filename)
 * @param {string} filename
 */
async function loadDocContent(filename) {
  const bodyEl = document.getElementById('docs-body');
  const emptyEl = document.getElementById('docs-empty');
  if (!bodyEl) return;

  // 로딩 표시
  if (emptyEl) emptyEl.style.display = 'none';
  bodyEl.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:12px;">로딩 중...</div>';

  // 파일 목록에서 활성 상태 업데이트
  docsState.currentFile = filename;
  _updateActiveDocItem(filename);

  try {
    const res = await fetch(`/api/docs/${encodeURIComponent(filename)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      bodyEl.innerHTML = `<div style="padding:20px;color:var(--error);font-size:13px;">오류: ${escapeHtml(errData.message || '파일을 불러올 수 없습니다')}</div>`;
      return;
    }

    const data = await res.json();
    _renderDocContent(data);
  } catch (_e) {
    bodyEl.innerHTML = '<div style="padding:20px;color:var(--error);font-size:13px;">서버 연결 실패</div>';
  }
}

/**
 * 문서 내용 DOM 렌더링
 * @param {{ filename, content, lastModified }} data
 */
function _renderDocContent(data) {
  const bodyEl = document.getElementById('docs-body');
  if (!bodyEl) return;

  const modifiedStr = data.lastModified
    ? new Date(data.lastModified).toLocaleString('ko-KR')
    : '';

  const renderedHtml = renderMarkdown(data.content || '');

  bodyEl.innerHTML = `
    <div class="docs-meta">
      <span class="docs-meta-filename">📄 ${escapeHtml(data.filename)}</span>
      ${modifiedStr ? `<span class="docs-meta-modified">수정: ${escapeHtml(modifiedStr)}</span>` : ''}
    </div>
    <div class="md-content">${renderedHtml}</div>
  `;

  // 최상단으로 스크롤
  bodyEl.scrollTop = 0;
}

/**
 * 파일 목록에서 활성 항목 업데이트
 * @param {string} filename
 */
function _updateActiveDocItem(filename) {
  const items = document.querySelectorAll('.docs-file-item');
  items.forEach(item => {
    item.classList.toggle('active', item.dataset.filename === filename);
  });
}

/* ════════════════════════════════════════════════════
   연결 상태 UI
════════════════════════════════════════════════════ */

/* connected: true = 연결됨, false = 끊김, 'reconnecting' = 재연결 중 */
function setConnected(connected) {
  state.connected = connected === true;
  const badge    = document.getElementById('conn-badge');
  const label    = document.getElementById('conn-label');
  const alertBar = document.getElementById('conn-alert-bar');
  const alertTxt = document.getElementById('conn-alert-text');
  const alertIco = document.getElementById('conn-alert-icon');

  if (connected === true) {
    /* 연결 성공 */
    badge.className = 'conn-badge connected';
    badge.setAttribute('aria-label', '연결 상태: 연결됨');
    label.textContent = 'Connected';
    /* 알림 바 숨김 */
    alertBar.classList.remove('visible', 'reconnecting-bar');
  } else if (connected === 'reconnecting') {
    /* 재연결 시도 중 */
    badge.className = 'conn-badge reconnecting';
    badge.setAttribute('aria-label', '연결 상태: 재연결 중');
    label.textContent = 'Reconnecting...';
    /* 알림 바 표시 (재연결 스타일) */
    alertIco.textContent = '🔄';
    alertTxt.textContent = '대시보드 연결이 끊어졌습니다. 자동 재연결 중...';
    alertBar.classList.add('visible', 'reconnecting-bar');
  } else {
    /* 연결 끊김 */
    badge.className = 'conn-badge disconnected';
    badge.setAttribute('aria-label', '연결 상태: 연결 끊김');
    label.textContent = 'Disconnected';
    /* 알림 바 표시 (에러 스타일) */
    alertIco.textContent = '⚠️';
    alertTxt.textContent = '대시보드 연결이 끊어졌습니다. 자동 재연결 중...';
    alertBar.classList.remove('reconnecting-bar');
    alertBar.classList.add('visible');
  }
}

/* ════════════════════════════════════════════════════
   초기 데이터 로드 (REST API)
════════════════════════════════════════════════════ */
async function loadInitialData() {
  /* 워크플로우 상태 로드 */
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      /*
        M-4: 실제 응답 형태:
        {
          workflow: { stage, phase, ... },
          server: { ... }
        }
        하위 호환을 위해 data.stage도 지원
      */
      const stage        = data.workflow?.stage || data.stage;
      const phase        = data.workflow?.phase || data.phase;
      const phaseTitle   = data.workflow?.phase_title || data.phase_title;
      const progressData = data.progress || null;
      if (stage) updateWorkflow(stage, phase, phaseTitle, progressData);
      /* 세션 시작 시각 복원 */
      if (data.session?.startedAt) {
        state.sessionStartedAt = new Date(data.session.startedAt);
      }
    }
  } catch (_e) {
    /* 서버 미연결 시 무시 (정적 모드) */
  }

  /* 에이전트 상태 로드 */
  try {
    const res = await fetch('/api/agents');
    if (res.ok) {
      const data = await res.json();
      /*
        M-4: 실제 응답 형태:
        {
          agents: [ { id, emoji, name, role, status: { active } }, ... ]
        }
        하위 호환을 위해 기존 객체 형태 { id: statusString } 도 지원
      */
      if (Array.isArray(data.agents)) {
        data.agents.forEach(agent => {
          const status = agent.status?.active ? 'working' : 'idle';
          updateAgentStatus(agent.id, status);
        });
      } else {
        /* 하위 호환: { shinnosuke: 'working', bo: 'completed', ... } 형태 */
        Object.entries(data).forEach(([id, status]) => {
          updateAgentStatus(id, status);
        });
      }
    }
  } catch (_e) {
    /* 서버 미연결 시 무시 (정적 모드) */
  }

  /* 이전 세션 이벤트 복원 */
  try {
    const res = await fetch('/api/events?limit=200');
    if (res.ok) {
      const data = await res.json();
      if (data.hasPreviousSession && Array.isArray(data.events) && data.events.length > 0) {
        const prevEvents = data.events.filter(ev => ev.fromPreviousSession === true);
        if (prevEvents.length > 0) {
          /* 이전 세션 이벤트를 타임라인에 추가 (최신이 위로) */
          /* addTimelineEvent는 insertBefore(firstChild)이므로
             정순으로 추가하면 마지막(최신)이 맨 위에 위치 */
          for (let i = 0; i < prevEvents.length; i++) {
            const ev = prevEvents[i];
            addTimelineEvent({
              agentId:             ev.agent || null,
              message:             ev.content || ev.task || ev.message || '',
              type:                ev.type || 'info',
              etype:               ev.type || null,
              timestamp:           ev.timestamp ? new Date(ev.timestamp) : new Date(),
              from:                ev.from || null,
              to:                  ev.to || null,
              task:                ev.task || null,
              fromPreviousSession: true,
            });
          }

          /* 세션 구분 줄 추가 (이전 세션 이벤트들의 위, 즉 타임라인 맨 위) */
          const timeline = document.getElementById('timeline');
          const breakEl  = document.createElement('div');
          breakEl.className = 'session-break';
          breakEl.textContent = 'Session Break';
          breakEl.setAttribute('aria-label', '이전 세션과 현재 세션 구분');
          /* 가장 최상단(firstChild)에 삽입 */
          timeline.insertBefore(breakEl, timeline.firstChild);
        }
      }
    }
  } catch (_e) {
    /* 서버 미연결 시 무시 (정적 모드) */
  }
}

/* ════════════════════════════════════════════════════
   SSE 연결 (Server-Sent Events)
════════════════════════════════════════════════════ */
function connectSSE() {
  /* 이미 연결 중이면 스킵 */
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  try {
    const es = new EventSource('/api/events/stream');
    state.eventSource = es;

    /* 연결 성공 */
    es.addEventListener('open', () => {
      setConnected(true);
      /* 최초 연결 시 sessionStartedAt 초기화 (아직 없으면) */
      if (!state.sessionStartedAt) {
        state.sessionStartedAt = new Date();
      }
      addEvent({
        agentId: null,
        message: 'SSE 스트림에 연결되었습니다.',
        type: 'success',
      });
    });

    /*
      일반 메시지 수신
      서버는 다음 형태의 JSON을 data 필드로 전송:
      {
        type:      'event',               // 이벤트 종류
        agentId:   'shinnosuke',          // 에이전트 ID
        message:   '작업을 시작합니다.', // 표시할 메시지
        eventType: 'info',               // info | success | warning | error
        timestamp: '2026-02-19T12:00:00Z',
        // 선택적 필드:
        status:    'working',            // 에이전트 상태 변경 시
        stage:     'execution',          // 워크플로우 스테이지 변경 시
        phase:     '1/4',               // 페이즈 변경 시
      }
    */
    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleSSEMessage(data);
      } catch (err) {
        /* JSON 파싱 실패 시 텍스트 메시지로 처리 */
        if (e.data && e.data.trim()) {
          addEvent({ agentId: null, message: e.data, type: 'info' });
        }
      }
    });

    /* 커스텀 이벤트: 에이전트 상태 변경 */
    es.addEventListener('agent_status', (e) => {
      try {
        const data = JSON.parse(e.data);

        /* 세션 리셋 이벤트 (session_start / session_end) */
        if (data.reset) {
          /* session_start: 세션 시작 시각 기록 */
          if (data.session && data.session.active) {
            state.sessionStartedAt = data.session.startedAt
              ? new Date(data.session.startedAt)
              : new Date();
          }
          return;
        }

        /* M-2: 서버는 `agent` 필드를 보냄, 하위 호환을 위해 agentId도 지원 */
        const agentId = data.agent || data.agentId;
        if (agentId && data.status) {
          /* 서버가 보내는 status 값: 'working' (시작), 'idle' (완료), 'completed' (완료)
             UI 표시용 status로 변환: working → working, idle/completed → completed */
          const mappedStatus = data.status === 'working' ? 'working' : 'completed';
          updateAgentStatus(agentId, mappedStatus, data.message);
          /* 타임라인 etype 결정: working → agent_start, 그 외 → agent_done */
          addTimelineEvent({
            agentId:   agentId,
            message:   data.message || (mappedStatus === 'working' ? 'Working...' : 'Done'),
            etype:     data.status === 'working' ? 'agent_start' : 'agent_done',
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          });
        }
      } catch (err) { console.warn('[SSE] event parse error:', err); }
    });

    /* 커스텀 이벤트: 위임 */
    es.addEventListener('delegation', (e) => {
      try {
        const data = JSON.parse(e.data);
        updateDelegationFlow({ from: data.from, to: data.to });
        addTimelineEvent({
          agentId:   data.from,
          etype:     'delegation',
          from:      data.from,
          to:        data.to,
          task:      data.task || data.message,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        });
      } catch (err) { console.warn('[SSE] event parse error:', err); }
    });

    /* 커스텀 이벤트: 채팅 메시지 */
    es.addEventListener('chat_message', (e) => {
      try {
        const data = JSON.parse(e.data);
        /* L-3: 서버는 `agent` 필드를 보냄, 하위 호환을 위해 agentId도 지원 */
        addChatMessage({
          agentId:   data.agent || data.agentId,
          message:   data.message,
          etype:     data.type,
          from:      data.from,
          to:        data.to,
          task:      data.task,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          isUser:    data.isUser || false,
        });
      } catch (err) { console.warn('[SSE] event parse error:', err); }
    });

    /* 커스텀 이벤트: Debate */
    es.addEventListener('debate', (e) => {
      try {
        const data = JSON.parse(e.data);
        handleDebateEvent(data);
        /* Debate 시작 시 타임라인 이벤트도 추가 */
        if (data.debate_type === 'start' || data.type === 'start') {
          addTimelineEvent({
            agentId:   'midori',
            message:   `토론 시작: ${data.topic || ''}`,
            etype:     'message',
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          });
        }
      } catch (err) { console.warn('[SSE] event parse error:', err); }
    });

    /* 커스텀 이벤트: 워크플로우 상태 변경 */
    es.addEventListener('workflow_status', (e) => {
      try {
        const data = JSON.parse(e.data);
        /* M-3: 서버는 { workflow: { stage, phase, status } } 형태로 보냄, 하위 호환을 위해 data.stage도 지원 */
        const stage        = data.workflow?.stage || data.stage;
        const phase        = data.workflow?.phase || data.phase;
        const phaseTitle   = data.workflow?.phase_title || data.phase_title;
        const progressData = data.progress || null;
        if (stage) updateWorkflow(stage, phase, phaseTitle, progressData);
        else if (progressData) {
          /* stage가 없어도 progress 데이터가 있으면 진행률 업데이트 */
          state.progressData = progressData;
          renderPhaseProgress(state.currentPhase, state.currentPhaseTitle, progressData);
        }
        /* workflow_update 타임라인 이벤트 */
        if (data.message) {
          addTimelineEvent({
            agentId:   null,
            message:   data.message,
            etype:     'workflow_update',
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          });
        }
      } catch (err) { console.warn('[SSE] event parse error:', err); }
    });

    /* 커스텀 이벤트: 서버 연결 확인 */
    es.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[SSE] Server connected event:', data);
      } catch(err) {
        console.log('[SSE] Connected event received');
      }
    });

    /* 커스텀 이벤트: 문서 변경 알림 (Step 4.3) */
    es.addEventListener('doc_updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        // docs 탭이 활성화된 상태이면 목록 새로고침
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.dataset.tab === 'docs') {
          // 목록 새로고침
          loadDocs();
          // 현재 열린 파일과 변경된 파일이 동일하면 내용 새로고침
          if (docsState.currentFile && data.filename && docsState.currentFile === data.filename) {
            loadDocContent(docsState.currentFile);
          }
        }
      } catch (err) { console.warn('[SSE] event parse error:', err); }
    });

    /* 커스텀 이벤트: 활동 이벤트
       서버가 보내는 필드: agent, content (addEvent가 기대하는 필드: agentId, message) */
    es.addEventListener('activity', (e) => {
      try {
        const data = JSON.parse(e.data);
        /* 필드명 정규화: agent -> agentId, content -> message */
        const normalized = {
          ...data,
          agentId:   data.agentId  || data.agent  || null,
          message:   data.message  || data.content || null,
          etype:     data.etype    || data.type    || null,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        };
        addTimelineEvent(normalized);
      } catch(err) {
        console.error('[SSE] Activity parse error:', err);
      }
    });

    /* 연결 오류 - EventSource는 자동 재연결을 시도하므로 'reconnecting' 상태 표시 */
    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        /* 완전히 닫힌 경우 */
        setConnected(false);
      } else {
        /* CONNECTING 상태: 재연결 시도 중 */
        setConnected('reconnecting');
      }
    });

  } catch (err) {
    /* EventSource를 지원하지 않는 환경 */
    setConnected(false);
  }
}

/* SSE 일반 메시지 처리 (onmessage 핸들러용)
   data 예상 형태:
   {
     type:      'agent_start' | 'agent_done' | 'delegation' | 'message' | 'user_prompt' |
                'tool_use' | 'stop' | 'session_start' | 'session_end' | 'workflow_update',
     agentId:   'shinnosuke',
     message:   '작업을 시작합니다.',
     eventType: 'info',         // 기존 호환 타입
     timestamp: '...',
     // delegation 전용:
     from:      'shinnosuke',
     to:        'nene',
     task:      '요구사항 분석',
     // 에이전트 상태 전용:
     status:    'working',
     // 워크플로우 전용:
     stage:     'execution',
     phase:     '1/4',
   }
*/
function handleSSEMessage(data) {
  const etype     = data.type || null;
  const ts        = data.timestamp ? new Date(data.timestamp) : new Date();

  /* 에이전트 상태 변경 처리 */
  if (etype === 'agent_start' && data.agentId) {
    updateAgentStatus(data.agentId, 'working', data.message);
    addTimelineEvent({ agentId: data.agentId, message: data.message, etype: 'agent_start', timestamp: ts });
    /* 채팅 뷰에도 반영 */
    if (data.message) {
      addChatMessage({ agentId: data.agentId, message: data.message, timestamp: ts });
    }
    return;
  }

  if (etype === 'agent_done' && data.agentId) {
    updateAgentStatus(data.agentId, 'completed', data.message);
    addTimelineEvent({ agentId: data.agentId, message: data.message, etype: 'agent_done', timestamp: ts });
    return;
  }

  /* 위임 이벤트 처리 */
  if (etype === 'delegation') {
    updateDelegationFlow({ from: data.from, to: data.to });
    addTimelineEvent({
      agentId: data.from,
      etype:   'delegation',
      from:    data.from,
      to:      data.to,
      task:    data.task || data.message,
      timestamp: ts,
    });
    /* 채팅 뷰에 위임 버블 추가 */
    addChatMessage({
      agentId:   data.from,
      etype:     'delegation',
      from:      data.from,
      to:        data.to,
      task:      data.task || data.message,
      timestamp: ts,
    });
    return;
  }

  /* 채팅 메시지 이벤트 처리 */
  if (etype === 'chat_message') {
    addChatMessage({
      agentId:   data.agentId,
      message:   data.message,
      from:      data.from,
      to:        data.to,
      task:      data.task,
      timestamp: ts,
      isUser:    data.isUser || false,
    });
    return;
  }

  /* Debate 이벤트 처리 */
  if (etype === 'debate' || data.debate_type) {
    handleDebateEvent(data);
    if (data.debate_type === 'start' || data.type === 'start') {
      addTimelineEvent({
        agentId:   'midori',
        message:   `토론 시작: ${data.topic || ''}`,
        etype:     'message',
        timestamp: ts,
      });
    }
    return;
  }

  /* 사용자 프롬프트 이벤트 처리 */
  if (etype === 'user_prompt') {
    addTimelineEvent({ agentId: null, message: data.message, etype: 'user_prompt', timestamp: ts });
    /* 채팅 뷰에 사용자 메시지 추가 */
    if (data.message) {
      addChatMessage({ agentId: null, message: data.message, timestamp: ts, isUser: true });
    }
    return;
  }

  /* 워크플로우 상태 변경 처리 */
  if (data.stage) {
    updateWorkflow(data.stage, data.phase, data.phase_title);
  }

  /* 기존 status 필드 호환 처리 */
  if (data.agentId && data.status) {
    const statusMap = { agent_start: 'working', agent_done: 'completed' };
    const mappedStatus = statusMap[data.status] || data.status;
    updateAgentStatus(data.agentId, mappedStatus, data.message);
  }

  /* 타임라인 이벤트 추가 */
  if (data.message || etype) {
    addTimelineEvent({
      agentId:   data.agentId || null,
      message:   data.message,
      type:      data.eventType || 'info',
      etype:     etype,
      timestamp: ts,
    });
    /* message 이벤트는 채팅 뷰에도 추가 */
    if (etype === 'message' && data.message && data.agentId) {
      addChatMessage({ agentId: data.agentId, message: data.message, timestamp: ts });
    }
  }
}

/* ════════════════════════════════════════════════════
   진입점
════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
