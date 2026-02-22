/**
 * AgentCard.tsx
 *
 * Individual agent card in the sidebar.
 * Mirrors app.js renderSidebar() card HTML (lines 169-178) and
 * updateAgentStatus() DOM side (lines 187-234).
 * CSS: styles.css .agent-card (lines 179-293).
 *
 * Status visuals:
 *   idle      — grey dot
 *   working   — green dot + pulse-ring + background highlight + "Working..."
 *   completed — blue dot + checkmark overlay (2s, then auto-reverts to idle in store)
 */
import { memo } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { AGENTS } from '../../lib/constants'
import type { AgentId } from '../../lib/constants'

interface AgentCardProps {
  agentId: AgentId
}

export const AgentCard = memo(function AgentCard({ agentId }: AgentCardProps) {
  const agent = AGENTS[agentId]
  const status = useDashboardStore((s) => s.agentStatuses[agentId] ?? 'idle')
  const previewMsg = useDashboardStore((s) => {
    // Find the latest timeline event for this agent to use as preview
    const events = s.events
    const latest = events.find((e) => e.agent === agentId || (e as Record<string, unknown>).agentId === agentId)
    return latest ? ((latest.content as string) || (latest as Record<string, unknown>).message as string | undefined) : undefined
  })

  // The role text shown below the name — "Working..." when active
  const roleText = status === 'working' ? 'Working...' : agent.role

  // Card tooltip
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
        <div className="agent-name">{agent.name}</div>
        <div className="agent-role">{roleText}</div>
        {previewMsg && (
          <div className="agent-preview visible">{previewMsg}</div>
        )}
      </div>
      <div className="agent-status" />
      {/* Checkmark overlay — visible when status === 'completed' via CSS .agent-check.show */}
      <div
        className={`agent-check${status === 'completed' ? ' show' : ''}`}
        id={`check-${agentId}`}
      >
        ✓
      </div>
    </div>
  )
})
