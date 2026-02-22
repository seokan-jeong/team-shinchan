/**
 * DebateRound.tsx
 *
 * Renders a single debate round with a label and 2-column panelist grid.
 * Mirrors app.js renderDebate() round section (lines 936-963).
 */
import { PanelistCard } from './PanelistCard'
import type { DebateRound as DebateRoundData } from '../../stores/dashboard-store'

interface DebateRoundProps {
  round: DebateRoundData
}

export function DebateRound({ round }: DebateRoundProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Round label with decorative line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--muted-foreground)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
        }}
      >
        <span>{round.label}</span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: 'var(--border)',
            opacity: 0.5,
          }}
        />
      </div>

      {/* Panelists grid: 2 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}
      >
        {round.panelists.map((p, idx) => (
          <PanelistCard
            key={`${p.agentId}-${idx}`}
            agentId={p.agentId}
            opinion={p.opinion}
          />
        ))}
      </div>
    </div>
  )
}
