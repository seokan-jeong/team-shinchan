/**
 * LayerGroup.tsx
 *
 * Collapsible group of agent cards grouped by layer.
 * Mirrors app.js renderSidebar() layer-group HTML (lines 154-183).
 * CSS: styles.css .layer-group, .layer-label (lines 163-177).
 */
import { useState } from 'react'
import type { AgentId } from '../../lib/constants'
import { AgentCard } from './AgentCard'

interface LayerGroupProps {
  layer: string
  agentIds: AgentId[]
}

export function LayerGroup({ layer, agentIds }: LayerGroupProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (agentIds.length === 0) return null

  return (
    <div className="layer-group" role="group" aria-label={`${layer} layer`}>
      {/* Layer label — clickable to toggle collapse */}
      <button
        type="button"
        className="layer-label"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 6px 6px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '6px',
          color: 'var(--text-muted)',
          font: 'inherit',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
        aria-label={`${layer} layer group`}
      >
        <span>{layer}</span>
        <span style={{ fontSize: '9px', opacity: 0.6 }}>{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && agentIds.map((id) => <AgentCard key={id} agentId={id} />)}
    </div>
  )
}
