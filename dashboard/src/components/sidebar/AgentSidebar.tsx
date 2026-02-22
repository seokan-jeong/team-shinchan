/**
 * AgentSidebar.tsx
 *
 * Full sidebar component that groups 15 agents by layer using LAYER_ORDER.
 * Mirrors app.js renderSidebar() (lines 139-184).
 * CSS: styles.css .sidebar (lines 148-161).
 */
import { memo, useMemo } from 'react'
import { AGENTS, LAYER_ORDER } from '../../lib/constants'
import type { AgentId } from '../../lib/constants'
import { LayerGroup } from './LayerGroup'

// Build a map of layer -> agentIds, preserving LAYER_ORDER
// This is computed once at module level since AGENTS is static
function buildLayerMap(): Record<string, AgentId[]> {
  const map: Record<string, AgentId[]> = {}
  for (const layer of LAYER_ORDER) {
    map[layer] = []
  }
  for (const [id, agent] of Object.entries(AGENTS)) {
    if (map[agent.layer]) {
      map[agent.layer].push(id as AgentId)
    }
  }
  return map
}

const LAYER_MAP = buildLayerMap()

export const AgentSidebar = memo(function AgentSidebar() {
  // useMemo on the layer entries so the array reference is stable
  const layerEntries = useMemo(
    () => LAYER_ORDER.map((layer) => ({ layer, agentIds: LAYER_MAP[layer] })),
    [],
  )

  return (
    <>
      {layerEntries.map(({ layer, agentIds }) => (
        <LayerGroup key={layer} layer={layer} agentIds={agentIds} />
      ))}
    </>
  )
})
