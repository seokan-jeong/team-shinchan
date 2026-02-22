/**
 * DebateConclusion.tsx
 *
 * Renders the debate conclusion with a trophy icon and highlighted block.
 * Mirrors app.js renderDebate() conclusion section (lines 966-975).
 * Uses success-color left-border + subtle background.
 */
import { useDashboardStore } from '../../stores/dashboard-store'

export function DebateConclusion() {
  const debateConclusion = useDashboardStore((s) => s.debateConclusion)

  if (!debateConclusion) return null

  return (
    <div
      style={{
        borderLeft: '3px solid var(--success)',
        background: 'rgba(63, 185, 80, 0.06)',
        borderRadius: '0 8px 8px 0',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: 'var(--success)',
        }}
      >
        🏆 결론
      </div>

      {/* Conclusion text */}
      <div
        style={{
          fontSize: 13,
          color: 'var(--foreground)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {debateConclusion}
      </div>
    </div>
  )
}
