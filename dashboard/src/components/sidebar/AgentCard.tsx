/**
 * AgentCard.tsx
 *
 * Individual agent card in the sidebar.
 * Shows model badge (O/S/H) next to name and status-specific role text.
 *
 * Status visuals:
 *   idle       — grey dot, shows role
 *   working    — green dot + pulse-ring + "Working..."
 *   delegating — yellow dot + "Delegating..."
 *   receiving  — blue dot + "Receiving..."
 *   completed  — blue dot + checkmark (2s, then auto-reverts to idle)
 */
import { memo } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { AGENTS } from '../../lib/constants'
import type { AgentId } from '../../lib/constants'

interface AgentCardProps {
  agentId: AgentId
}

const MODEL_LABEL: Record<string, string> = {
  opus: 'O',
  sonnet: 'S',
  haiku: 'H',
}

const STATUS_ROLE_TEXT: Record<string, string> = {
  working: 'Working...',
  delegating: 'Delegating...',
  receiving: 'Receiving...',
}

export const AgentCard = memo(function AgentCard({ agentId }: AgentCardProps) {
  const agent = AGENTS[agentId]
  const status = useDashboardStore((s) => s.agentStatuses[agentId] ?? 'idle')
  const previewMsg = useDashboardStore((s) => {
    const latest = s.events.find((e) => e.agent === agentId || e.agentId === agentId)
    return latest ? (latest.content || latest.message || undefined) : undefined
  })

  const roleText = STATUS_ROLE_TEXT[status] ?? agent.role
  const title = `${agent.name} (${agent.role}) — ${agent.model}`

  return (
    <div
      className="agent-card"
      data-status={status}
      id={`agent-${agentId}`}
      title={title}
    >
      <div className="agent-emoji">{agent.emoji}</div>
      <div className="agent-info">
        <div className="agent-name">
          {agent.name}
          <span className={`agent-model-badge model-${agent.model}`}>
            {MODEL_LABEL[agent.model] ?? '?'}
          </span>
        </div>
        <div className="agent-role">{roleText}</div>
        {previewMsg && (
          <div className="agent-preview visible">{previewMsg}</div>
        )}
      </div>
      <div className="agent-status" />
      <div
        className={`agent-check${status === 'completed' ? ' show' : ''}`}
        id={`check-${agentId}`}
      >
        ✓
      </div>
    </div>
  )
})
