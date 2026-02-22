/**
 * DelegationBubble.tsx
 *
 * Chat delegation bubble: dashed border, from -> to badges, task text.
 * Mirrors app.js _appendDelegationBubble() (lines 726-775).
 */
import { AGENTS } from '../../lib/constants'

interface DelegationBubbleProps {
  from?: string
  to?: string
  task?: string
}

export function DelegationBubble({ from, to, task }: DelegationBubbleProps) {
  const fromAgent = from
    ? (AGENTS[from as keyof typeof AGENTS] ?? { emoji: '🤖', name: from })
    : { emoji: '🤖', name: '?' }
  const toAgent = to
    ? (AGENTS[to as keyof typeof AGENTS] ?? { emoji: '🤖', name: to })
    : { emoji: '🤖', name: '?' }

  return (
    <div className="bubble-text delegation-bubble">
      <div className="delegation-bubble-inner">
        <span className="delegation-badge">
          {fromAgent.emoji} {fromAgent.name}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <span className="delegation-badge">
          {toAgent.emoji} {toAgent.name}
        </span>
      </div>
      {task && <div className="delegation-task-text">"{task}"</div>}
    </div>
  )
}
