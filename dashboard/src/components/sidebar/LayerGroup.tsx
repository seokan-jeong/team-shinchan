/**
 * LayerGroup.tsx
 *
 * Collapsible group of agent cards grouped by layer.
 * Shows active (working) agent count badge next to layer label.
 */
import { useState } from 'react'
import type { AgentId } from '../../lib/constants'
import { useDashboardStore } from '../../stores/dashboard-store'
import { AgentCard } from './AgentCard'

interface LayerGroupProps {
  layer: string
  agentIds: AgentId[]
}

export function LayerGroup({ layer, agentIds }: LayerGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const agentStatuses = useDashboardStore((s) => s.agentStatuses)

  if (agentIds.length === 0) return null

  // Count working agents in this layer
  const activeInLayer = agentIds.filter(
    (id) => agentStatuses[id] === 'working'
  ).length

  return (
    <div className="layer-group" role="group" aria-label={`${layer} layer`}>
      <button
        type="button"
        className="layer-label"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
        aria-label={`${layer} layer group`}
      >
        <span>
          {layer}
          {activeInLayer > 0 && (
            <span className="layer-active-badge">{activeInLayer}</span>
          )}
        </span>
        <span className="layer-collapse-icon">{collapsed ? '\u25B6' : '\u25BC'}</span>
      </button>

      {!collapsed && agentIds.map((id) => <AgentCard key={id} agentId={id} />)}
    </div>
  )
}
