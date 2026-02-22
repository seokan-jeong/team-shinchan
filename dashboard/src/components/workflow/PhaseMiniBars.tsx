/**
 * PhaseMiniBars.tsx
 *
 * Per-phase mini progress bars rendered below the main phase progress.
 * Mirrors app.js renderPhaseProgress() mini bars section (lines 378-418).
 * Styles from styles.css .phase-mini-* (lines 508-554).
 *
 * Each row: label + mini bar + percentage.
 * Current phase row gets a subtle background highlight.
 */
import { memo } from 'react'
import type { ProgressPhase } from '../../lib/types'

interface PhaseMiniBarsProps {
  phases: ProgressPhase[]
  currentPhaseIdx: number
}

export const PhaseMiniBars = memo(function PhaseMiniBars({ phases, currentPhaseIdx }: PhaseMiniBarsProps) {
  const rows = phases.filter((ph) => ph.total > 0)
  if (rows.length === 0) return null

  return (
    <div className="phase-mini-bars" id="phase-mini-bars">
      {phases.map((ph, idx) => {
        if (ph.total === 0) return null

        const shortTitle =
          ph.title.length > 18 ? ph.title.substring(0, 16) + '\u2026' : ph.title

        const isCurrentPhase = idx === currentPhaseIdx

        // Fill color: success for 100%, accent for in-progress, default otherwise
        let fillBackground: string | undefined
        if (ph.percentage >= 100) {
          fillBackground = 'var(--success)'
        } else if (ph.percentage > 0) {
          fillBackground = 'var(--accent)'
        }

        return (
          <div
            key={idx}
            className="phase-mini-row"
            style={
              isCurrentPhase
                ? {
                    background: 'rgba(88,166,255,0.06)',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    margin: '0 -4px',
                  }
                : undefined
            }
          >
            <div
              className="phase-mini-label"
              title={ph.title}
            >
              P{idx + 1}: {shortTitle}
            </div>
            <div className="phase-mini-bar">
              <div
                className="phase-mini-fill"
                style={{
                  width: `${ph.percentage}%`,
                  background: fillBackground,
                }}
              />
            </div>
            <div className="phase-mini-pct">{ph.percentage}%</div>
          </div>
        )
      })}
    </div>
  )
})
