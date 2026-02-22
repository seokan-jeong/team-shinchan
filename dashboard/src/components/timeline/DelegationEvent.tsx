/**
 * DelegationEvent.tsx
 *
 * Renders the delegation-specific layout: from -> to badges + task text.
 * Mirrors app.js buildDelegationHtml() (lines 503-514).
 */
import { AGENTS } from '../../lib/constants'

interface DelegationEventProps {
  from?: string
  to?: string
  task?: string
}

export function DelegationEvent({ from, to, task }: DelegationEventProps) {
  const fromAgent = from
    ? (AGENTS[from as keyof typeof AGENTS] ?? { emoji: '🤖', name: from })
    : { emoji: '🤖', name: '?' }
  const toAgent = to
    ? (AGENTS[to as keyof typeof AGENTS] ?? { emoji: '🤖', name: to })
    : { emoji: '🤖', name: '?' }

  return (
    <div className="event-delegation">
      <span className="delegation-from">
        {fromAgent.emoji} {fromAgent.name}
      </span>
      <span className="delegation-arrow">→</span>
      <span className="delegation-to">
        {toAgent.emoji} {toAgent.name}
      </span>
      {task && <div className="delegation-task">"{task}"</div>}
    </div>
  )
}
