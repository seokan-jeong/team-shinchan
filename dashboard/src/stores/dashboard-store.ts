/**
 * dashboard-store.ts
 *
 * Zustand store that mirrors the `state` object from legacy app.js.
 * Each action faithfully replicates the corresponding app.js function's
 * state-mutation logic (DOM rendering is NOT handled here; that belongs
 * to React components).
 */
import { create } from 'zustand'
import type {
  AgentStatus,
  ChatMessage,
  Progress,
  SessionInfo,
  TimelineEvent,
} from '../lib/types'
import type { StageId } from '../lib/constants'

// ── Debate round (internal shape mirroring app.js debateRounds[]) ────────────

export interface DebateRound {
  label: string
  panelists: Array<{ agentId: string; opinion: string }>
}

// ── Docs state (mirroring app.js docsState) ──────────────────────────────────

export interface DocFile {
  filename: string
  displayName?: string
  size?: number
  modified?: string
}

export interface DocsState {
  files: DocFile[]
  currentFile: string | null
  content: string | null
  loading: boolean
}

// ── Full store shape ──────────────────────────────────────────────────────────

export interface DashboardState {
  // Connection
  connected: boolean | 'reconnecting'

  // Workflow
  currentStage: StageId | null
  currentPhase: string | null            // "1/4" form
  currentPhaseTitle: string | null
  progressData: Progress | null

  // Agents
  agentStatuses: Record<string, AgentStatus>
  activeAgentId: string | null

  // Timeline events (newest first, capped at MAX_EVENTS)
  events: TimelineEvent[]
  MAX_EVENTS: 100

  // Chat messages (chronological, capped at MAX_CHAT)
  chatMessages: ChatMessage[]
  MAX_CHAT: 200

  // Debate
  debateState: 'inactive' | 'active' | 'concluded'
  debateTopic: string | null
  debateRounds: DebateRound[]
  debateConclusion: string | null
  currentRoundIdx: number

  // Delegation
  delegationChain: string[]

  // Session
  sessionStartedAt: Date | null

  // Docs
  docs: DocsState

  // Active tab
  activeTab: string

  // Session selection
  currentSessionId: string | null
  availableSessions: SessionInfo[]

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Mirror of app.js setConnected() */
  setConnected: (connected: boolean | 'reconnecting') => void

  /** Mirror of app.js updateAgentStatus() — state-mutation portion only */
  updateAgentStatus: (agentId: string, status: AgentStatus, previewMsg?: string) => void

  /** Mirror of app.js addTimelineEvent() — state-mutation portion only */
  addTimelineEvent: (data: Omit<TimelineEvent, 'id' | 'type'> & { type?: string; timestamp?: string }) => void

  /** Mirror of app.js addChatMessage() — state-mutation portion only */
  addChatMessage: (data: Omit<ChatMessage, 'parsed' | 'timestamp'> & { parsed?: ChatMessage['parsed']; timestamp?: string }) => void

  /** Mirror of app.js updateWorkflow() — state-mutation portion only */
  updateWorkflow: (
    stageId: StageId | string | null,
    phase?: string | null,
    phaseTitle?: string | null,
    progressData?: Progress | null,
  ) => void

  /** Mirror of app.js updateDelegationFlow() — state-mutation portion only */
  updateDelegationFlow: (params: { from?: string; to?: string; activeAgentId?: string }) => void

  /** Mirror of app.js handleDebateEvent() — state-mutation portion only */
  handleDebateEvent: (data: {
    debate_type?: string
    subtype?: string
    type?: string
    topic?: string
    agentId?: string
    agent?: string
    opinion?: string
    message?: string
    round?: number
    conclusion?: string
  }) => void

  /** Reset all session-level state (delegation chain, active agent, etc.) */
  resetSession: () => void

  /** Update docs state */
  setDocs: (updater: Partial<DocsState> | ((prev: DocsState) => Partial<DocsState>)) => void

  /** Update session start time */
  setSessionStartedAt: (date: Date | null) => void

  /** Switch the active tab */
  setActiveTab: (tabId: string) => void

  /** Set current session ID for filtering */
  setCurrentSessionId: (sessionId: string | null) => void

  /** Set available sessions list */
  setAvailableSessions: (sessions: SessionInfo[]) => void

  /** Fetch sessions from API */
  fetchSessions: () => Promise<void>
}

// ── Store implementation ──────────────────────────────────────────────────────

let _eventIdCounter = 0

export const useDashboardStore = create<DashboardState>((set) => ({
  // ── Initial state ─────────────────────────────────────────────────────────

  connected: false,
  currentStage: null,
  currentPhase: null,
  currentPhaseTitle: null,
  progressData: null,
  agentStatuses: {},
  activeAgentId: null,
  events: [],
  MAX_EVENTS: 100,
  chatMessages: [],
  MAX_CHAT: 200,
  debateState: 'inactive',
  debateTopic: null,
  debateRounds: [],
  debateConclusion: null,
  currentRoundIdx: -1,
  delegationChain: [],
  sessionStartedAt: null,
  docs: {
    files: [],
    currentFile: null,
    content: null,
    loading: false,
  },
  activeTab: 'timeline',

  // Session selection
  currentSessionId: null,
  availableSessions: [],

  // ── setConnected ─────────────────────────────────────────────────────────
  // app.js lines 1348-1383
  // Only the state mutation is reproduced; DOM manipulation is done by components.

  setConnected: (connected) => {
    set({ connected: connected === true ? true : connected === 'reconnecting' ? 'reconnecting' : false })
  },

  // ── updateAgentStatus ────────────────────────────────────────────────────
  // app.js lines 187-234
  // State side: update agentStatuses map and activeAgentId.
  // The 2-second idle transition for 'completed' is handled by the component
  // layer (or within the SSE hook via setTimeout) so we expose a simple setter.

  updateAgentStatus: (agentId, status, _previewMsg) => {
    set((state) => {
      const agentStatuses = { ...state.agentStatuses, [agentId]: status }

      let activeAgentId = state.activeAgentId
      if (status === 'working') {
        activeAgentId = agentId
      } else if (activeAgentId === agentId) {
        activeAgentId = null
      }

      return { agentStatuses, activeAgentId }
    })

    // Mirror the 2-second idle transition for 'completed' (app.js lines 220-233)
    if (status === 'completed') {
      setTimeout(() => {
        set((state) => {
          const agentStatuses = { ...state.agentStatuses }
          if (agentStatuses[agentId] === 'completed') {
            agentStatuses[agentId] = 'idle'
          }
          const activeAgentId =
            state.activeAgentId === agentId ? null : state.activeAgentId
          return { agentStatuses, activeAgentId }
        })
      }, 2000)
    }
  },

  // ── addTimelineEvent ─────────────────────────────────────────────────────
  // app.js lines 518-623 (state-mutation portion: lines 607-618)

  addTimelineEvent: (data) => {
    set((state) => {
      const event: TimelineEvent = {
        ...data,
        id: ++_eventIdCounter,
        type: data.type ?? 'info',
        timestamp: data.timestamp ?? new Date().toISOString(),
      }

      // Newest first (matches app.js insertBefore(firstChild))
      const events = [event, ...state.events]
      if (events.length > state.MAX_EVENTS) {
        events.splice(state.MAX_EVENTS)
      }

      return { events }
    })
  },

  // ── addChatMessage ───────────────────────────────────────────────────────
  // app.js lines 636-723 (state-mutation portion: lines 710-722)

  addChatMessage: (data) => {
    set((state) => {
      const message: ChatMessage = {
        agent: data.agent,
        content: data.content,
        parsed: data.parsed,
        timestamp: data.timestamp ?? new Date().toISOString(),
      }

      const chatMessages = [...state.chatMessages, message]
      if (chatMessages.length > state.MAX_CHAT) {
        chatMessages.shift()
      }

      return { chatMessages }
    })
  },

  // ── updateWorkflow ───────────────────────────────────────────────────────
  // app.js lines 287-306

  updateWorkflow: (stageId, phase, phaseTitle, progressData) => {
    set((state) => ({
      currentStage: (stageId as StageId) || null,
      currentPhase: phase ?? null,
      currentPhaseTitle: phaseTitle ?? null,
      progressData: progressData !== undefined ? progressData : state.progressData,
    }))
  },

  // ── updateDelegationFlow ─────────────────────────────────────────────────
  // app.js lines 782-797

  updateDelegationFlow: ({ from, to, activeAgentId: activeId }) => {
    set((state) => {
      const chain = [...state.delegationChain]

      if (from && !chain.includes(from)) chain.push(from)
      if (to && !chain.includes(to)) chain.push(to)

      let activeAgentId = state.activeAgentId
      if (activeId) activeAgentId = activeId
      else if (to) activeAgentId = to

      return { delegationChain: chain, activeAgentId }
    })
  },

  // ── handleDebateEvent ────────────────────────────────────────────────────
  // app.js lines 853-901

  handleDebateEvent: (data) => {
    // server sends `subtype`; legacy formats use `debate_type` or `type`
    const debateType = data.subtype || data.debate_type || data.type
    // server sends `agent`; legacy format uses `agentId`
    const agentId = data.agentId || data.agent || ''

    if (debateType === 'start') {
      set({
        debateState: 'active',
        debateTopic: data.topic ?? '토론 주제',
        debateRounds: [],
        debateConclusion: null,
        currentRoundIdx: -1,
      })
      return
    }

    if (debateType === 'opinion') {
      set((state) => {
        const roundNum = data.round ?? 1
        const roundIdx = roundNum - 1

        const rounds = [...state.debateRounds]
        while (rounds.length <= roundIdx) {
          rounds.push({
            label: `Round ${rounds.length + 1}`,
            panelists: [],
          })
        }

        rounds[roundIdx] = {
          ...rounds[roundIdx],
          panelists: [
            ...rounds[roundIdx].panelists,
            {
              agentId,
              opinion: data.opinion ?? data.message ?? '',
            },
          ],
        }

        return {
          debateRounds: rounds,
          currentRoundIdx: roundIdx,
        }
      })
      return
    }

    // server sends 'conclusion'; legacy code used 'conclude'
    if (debateType === 'conclusion' || debateType === 'conclude') {
      set({
        debateState: 'concluded',
        debateConclusion: data.conclusion ?? data.message ?? '',
      })
      return
    }
  },

  // ── resetSession ─────────────────────────────────────────────────────────

  resetSession: () => {
    set({
      delegationChain: [],
      activeAgentId: null,
      debateState: 'inactive',
      debateTopic: null,
      debateRounds: [],
      debateConclusion: null,
      currentRoundIdx: -1,
      events: [],
      chatMessages: [],
    })
  },

  // ── setDocs ───────────────────────────────────────────────────────────────

  setDocs: (updater) => {
    set((state) => {
      const patch =
        typeof updater === 'function' ? updater(state.docs) : updater
      return { docs: { ...state.docs, ...patch } }
    })
  },

  // ── setSessionStartedAt ──────────────────────────────────────────────────

  setSessionStartedAt: (date) => {
    set({ sessionStartedAt: date })
  },

  // ── setActiveTab ─────────────────────────────────────────────────────────

  setActiveTab: (tabId) => {
    set({ activeTab: tabId })
  },

  // ── setCurrentSessionId ────────────────────────────────────────────────

  setCurrentSessionId: (sessionId) => {
    set({ currentSessionId: sessionId })
  },

  // ── setAvailableSessions ───────────────────────────────────────────────

  setAvailableSessions: (sessions) => {
    set({ availableSessions: sessions })
  },

  // ── fetchSessions ──────────────────────────────────────────────────────

  fetchSessions: async () => {
    try {
      const res = await fetch('/api/sessions')
      if (res.ok) {
        const data = (await res.json()) as { sessions?: SessionInfo[] }
        set({ availableSessions: data.sessions || [] })
      }
    } catch {
      // ignore - server may not be running
    }
  },
}))
