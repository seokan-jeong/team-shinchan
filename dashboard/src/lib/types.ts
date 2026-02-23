import type { AgentId, StageId } from './constants'

// ── Agent ──────────────────────────────────────────────────────────────────────

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'delegating'
  | 'receiving'
  | 'completed'

export interface AgentDynamicState {
  status: AgentStatus
  active: boolean
  lastSeen: string | null
  lastMessage: string | null
  currentTool?: string | null
}

export interface Agent {
  id: AgentId
  emoji: string
  name: string
  role: string
  layer: string
  model: 'opus' | 'sonnet' | 'haiku'
  status?: AgentDynamicState
}

// ── Workflow ───────────────────────────────────────────────────────────────────

export interface WorkflowState {
  stage: StageId | null
  phase: string | null
  status: 'active' | 'paused' | 'completed' | null
  docId: string | null
}

export interface ProgressPhase {
  title: string
  total: number
  completed: number
  percentage: number
}

export interface Progress {
  total: number
  completed: number
  percentage: number
  phases: ProgressPhase[]
}

// ── Events ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'agent_start'
  | 'agent_done'
  | 'delegation'
  | 'message'
  | 'user_prompt'
  | 'stop'
  | 'session_start'
  | 'session_end'
  | 'debate_start'
  | 'debate_opinion'
  | 'debate_conclusion'
  | 'tool_use'
  | 'file_change'
  | 'plan_step'
  | 'review_result'
  | 'progress_update'
  | 'workflow_update'
  | 'state_update'

export interface TimelineEvent {
  id: number
  type: EventType | string
  timestamp: string
  agent?: string
  agentId?: string
  from?: string
  to?: string
  content?: string
  message?: string
  task?: string
  etype?: string
  fromPreviousSession?: boolean
  [key: string]: unknown
}

// ── Chat / Messages ───────────────────────────────────────────────────────────

export type ParsedMessageType = 'agent_message' | 'delegation_message' | 'plain'

export interface ParsedMessage {
  type: ParsedMessageType
  agent?: string
  from?: string
  to?: string
  content: string
}

export interface ChatMessage {
  agent: string
  content: string
  parsed?: ParsedMessage
  timestamp: string
}

// ── Delegation ────────────────────────────────────────────────────────────────

export interface Delegation {
  from: string
  to: string
  task: string
  timestamp: string
  source?: string
}

// ── Debate ────────────────────────────────────────────────────────────────────

export interface DebateOpinion {
  agent: string
  opinion: string
  round: number | null
  timestamp: string
}

export interface DebateState {
  active: boolean
  topic: string | null
  panelists: string[]
  opinions: DebateOpinion[]
  conclusion: string | null
  startedAt: string | null
  endedAt: string | null
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface SessionState {
  active: boolean
  startedAt: string | null
  endedAt?: string | null
}

// ── SSE Event Payloads ────────────────────────────────────────────────────────

export interface SseConnectedPayload {
  message: string
  clientId: number
  timestamp: string
  workflow: WorkflowState
}

export interface SseAgentStatusPayload {
  agent?: string
  status?: AgentStatus
  active?: boolean
  task?: string | null
  lastMessage?: string | null
  timestamp: string
  reset?: boolean
  session?: SessionState
}

export interface SseDelegationPayload {
  from: string
  to: string
  task: string
  delegationChain: string[]
  timestamp: string
}

export interface SseChatMessagePayload {
  agent: string
  content: string
  parsed: ParsedMessage
  timestamp: string
}

export interface SseWorkflowStatusPayload {
  workflow: WorkflowState
  progress?: Progress | null
  timestamp: string
}

export interface SseDebatePayload {
  subtype: 'start' | 'opinion' | 'conclusion'
  topic?: string | null
  panelists?: string[]
  agent?: string
  opinion?: string
  round?: number | null
  conclusion?: string | null
  timestamp: string
}

export interface SseDocUpdatedPayload {
  filename: string
  docId: string | null
  timestamp: string
}

// ── Session Management ───────────────────────────────────────────────────────

export interface SessionInfo {
  sessionId: string
  startedAt: string
  endedAt: string | null
  active: boolean
  eventCount: number
}
