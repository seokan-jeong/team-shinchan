/**
 * ChatBubble.tsx
 *
 * A single chat message bubble:
 *   - Avatar (agent emoji) + agent name + layer badge
 *   - Layer-specific background colors (6 layers including 'user')
 *   - User messages: right-aligned (flex-direction: row-reverse)
 *   - slideUp entrance animation
 *
 * Mirrors app.js addChatMessage() (lines 636-723).
 */
import { memo } from 'react'
import { AGENTS, LAYER_COLORS } from '../../lib/constants'
import { Avatar } from '../ui/avatar'
import { formatTime } from '../../lib/utils'
import { DelegationBubble } from './DelegationBubble'
import type { ChatMessage } from '../../lib/types'

// ── Layer background colours (mirrors styles.css .bubble-text.layer-*) ────────

const LAYER_BG: Record<string, string> = {
  Orchestration: '#1a365d',
  Execution:     '#1a3a2a',
  Specialist:    '#3a2a1a',
  Advisory:      '#2a1a3a',
  Utility:       '#1a2a2a',
  user:          '#1e2a1a',
}

const LAYER_BORDER: Record<string, string> = {
  Orchestration: 'rgba(88,132,255,0.25)',
  Execution:     'rgba(63,185,80,0.25)',
  Specialist:    'rgba(249,115,22,0.25)',
  Advisory:      'rgba(168,85,247,0.25)',
  Utility:       'rgba(20,184,166,0.25)',
  user:          'rgba(63,185,80,0.35)',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  message: ChatMessage
  /** Whether this is a user (human) message */
  isUser?: boolean
  /** Whether this is a delegation event */
  isDelegation?: boolean
  delegationFrom?: string
  delegationTo?: string
  delegationTask?: string
}

export const ChatBubble = memo(function ChatBubble({
  message,
  isUser = false,
  isDelegation = false,
  delegationFrom,
  delegationTo,
  delegationTask,
}: ChatBubbleProps) {
  const agentId = message.agent
  const agentData = isUser
    ? { emoji: '👤', name: '사용자', layer: 'user' as const, role: 'User', model: 'sonnet' as const }
    : agentId
      ? (AGENTS[agentId as keyof typeof AGENTS] ?? { emoji: '🤖', name: agentId, layer: 'Utility', role: 'System', model: 'sonnet' as const })
      : { emoji: '🤖', name: 'System', layer: 'Utility', role: 'System', model: 'sonnet' as const }

  const layer    = agentData.layer as string
  const bg       = LAYER_BG[layer]     ?? LAYER_BG.Utility
  const border   = LAYER_BORDER[layer] ?? LAYER_BORDER.Utility
  const layerBadgeClass = LAYER_COLORS[layer] ?? ''
  const ts       = message.timestamp ? formatTime(message.timestamp) : ''

  return (
    <div className="chat-group">
      {/* Timestamp */}
      {ts && <div className="chat-timestamp">{ts}</div>}

      {/* Bubble row */}
      <div className={`chat-bubble${isUser ? ' user-msg' : ''}`}>
        {/* Avatar */}
        <Avatar
          className="bubble-avatar"
          aria-label={`${agentData.name} avatar`}
        >
          {agentData.emoji}
        </Avatar>

        {/* Content */}
        <div className="bubble-content">
          <div className="bubble-header">
            <span className="bubble-name">{agentData.name}</span>
            <span className={`bubble-layer ${layerBadgeClass}`}>{layer}</span>
          </div>

          {isDelegation ? (
            <DelegationBubble
              from={delegationFrom}
              to={delegationTo}
              task={delegationTask}
            />
          ) : (
            <div
              className="bubble-text"
              style={{
                background: bg,
                border: `1px solid ${border}`,
              }}
            >
              {message.content ?? ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
